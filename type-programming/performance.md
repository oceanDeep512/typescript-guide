# 编译性能

复杂类型会让 `tsc` 和 IDE 变慢。这节讲哪些写法贵、怎么优化。

## 性能的来源

TS 的类型检查本质上是在**对类型做结构化比较**。开销主要来自：

1. **类型实例化的数量**：每个泛型调用都会产生一个实例
2. **结构化比较的深度**：嵌套越深、字段越多，比较越贵
3. **联合的规模**：联合成员数量会影响分发的次数

这三条**和你用哪个版本的编译器无关**。TS 7 把发动机换成 Go 之后整体快了 8～12 倍，但它优化的是"每个单位工作跑得更快 + 能并行跑"，不会让一个指数爆炸的递归条件类型变便宜。**写法层面的优化在 TS 7 下依然有意义，而且依然是最有效的那部分。**

::: tip 🆕 TS7：多了一个新维度
5.x 时代你只能优化"工作量"（减少实例化）。TS 7 之后你还能调"并发度"：`--checkers` / `--builders`。两者是相乘的，见 [下方](#ts-7-带来的性能变量)。
:::

## 昂贵的写法

### 1. 深层递归 + 映射类型

```ts
// 贵：每层都重新映射整个对象
type DeepPartial<T> = {
  [K in keyof T]?: DeepPartial<T[K]>
}
```

嵌套 10 层、每层 20 个字段，就会产生几百个类型实例。

### 2. 大规模模板字面量联合

```ts
type Big = `${'a' | 'b' | 'c'}-${'x' | 'y' | 'z'}-${'1' | '2' | '3'}-${'p' | 'q'}`
```

笛卡尔积是 3×3×3×2 = 54 个。上限大概是 10 万个成员，超过就报：

```
Expression produces a union type that is too complex to represent
```

### 3. 元组计数大数

```ts
type Tuple<N extends number, Acc extends unknown[] = []> =
  Acc['length'] extends N ? Acc : Tuple<N, [...Acc, unknown]>
```

`Tuple<500>` 要构造 500 个元素的元组类型。别在真实项目里这么做。

### 4. 循环引用的条件类型

```ts
// 每次使用都要重新求值，且容易爆深度
type Recursive<T> = T extends object ? { [K in keyof T]: Recursive<T[K]> } : T
```

## 优化手段

### 1. 用 `interface` 代替交叉类型

```ts twoslash
// 慢：每次比较都要展开交叉
type A = { a: string } & { b: number } & { c: boolean }

// 快：interface 有缓存
interface B {
  a: string
  b: number
  c: boolean
}
```

TS 对 `interface` 的比较做了缓存优化，交叉类型每次都要重新展开。这是官方明确建议的优化。

### 2. 加 `in` / `out` 变型注解

```ts twoslash
// 慢：每次比较都要递归结构
interface Producer<T> {
  get(): T
}

// 快：直接查变型，跳过结构比较
interface FastProducer<out T> {
  get(): T
}
```

见[变型](../type-system/variance)。对 ORM schema 这类大类型收益明显。

### 3. 开 `skipLibCheck`

```jsonc
{ "compilerOptions": { "skipLibCheck": true } }
```

通常能让 `tsc` 快 2-5 倍，因为跳过了 `node_modules` 里几万个 `.d.ts` 的检查。

### 4. 收窄 `include`

```jsonc
{ "include": ["src"], "exclude": ["**/*.test.ts", "dist"] }
```

别把测试文件、构建产物算进来。

### 5. 拆中间类型

```ts twoslash
// 慢：每次用都要重新算
type Slow<T> = { [K in keyof T]: SomeHeavyType<T[K]> }

// 快：中间结果被缓存
type Step1<T> = SomeHeavyType<T>
type Fast<T> = { [K in keyof T]: Step1<T>[K] }

type SomeHeavyType<T> = { [K in keyof T]: T[K] }
```

TS 会缓存具名类型，匿名的不会。

### 6. 限制递归深度

```ts twoslash
// 用计数器限制深度，而不是无限递归
type DeepPartial<T, Depth extends number = 3> = Depth extends 0
  ? T
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K], Prev<Depth>> }
    : T

type Prev<N extends number> = N extends 3 ? 2 : N extends 2 ? 1 : 0
```

真实业务里递归 3 层通常够了，比无限递归快得多也安全得多。

## TS 7 带来的性能变量

前面六条是"减少工作量"，TS 7 之后多了一类完全不同的手段：**调并发**。

| 开关 | 默认 | 怎么用 |
| --- | --- | --- |
| `--checkers <n>` | `4` | 类型检查线程数。核多就加大；内存吃紧就减小；`1` 表示单线程检查 |
| `--builders <n>` | — | `tsc -b` 时并行构建的项目数。monorepo 用，与 `--checkers` **相乘** |
| `--singleThreaded` | off | 全部单线程。做性能对比或排查并发相关问题时用 |

```bash
# 8 核 CI：直接开满
tsc --noEmit --checkers 8

# monorepo：4 个包并行 × 每包 4 线程 = 最多 16 个并发线程
tsc -b --builders 4 --checkers 4

# 小内存容器：用内存换不了速度，就反过来
tsc --noEmit --checkers 2
```

**怎么选 `--checkers` 的值**：它和内存是正相关（每个检查线程要驻留自己的那部分类型数据）。经验起点是「物理核数的一半」，然后压测：

```bash
for n in 2 4 6 8; do
  echo -n "checkers=$n  "
  /usr/bin/time -p tsc --noEmit --checkers $n 2>&1 | grep real
done
```

::: warning 并发改变了类型排序
并行化之后，某些涉及**类型顺序**的行为（比如报错里联合成员的排列顺序、`.d.ts` 里声明的顺序）可能和单线程时不同。6.0 起 `stableTypeOrdering` 默认 `true`，7.0 起**不可关闭**，就是为了保证这个顺序确定。

如果你发现升级后 `.d.ts` 的 diff 很大但语义没变，大概率是这个原因，不是 bug。
:::

### 一个被忽略的提速项：`isolatedDeclarations`

它不在上面的列表里，因为它不是"让检查更快"，而是**让 `.d.ts` 生成可以脱离完整的类型检查程序**（单文件推导）。开了它：

- 导出的成员必须有显式类型标注（写起来更啰嗦）
- 但声明生成不必再跑一次完整的 program，也不必依赖 TypeScript 的 API

在 TS 7 的语境下这一点格外重要 —— 因为 7.0 **没有 API**，所有"调 TS API 生成 d.ts"的工具都得绕道。详见 [工具链篇](../engineering/toolchain)。

## 诊断手段

### 看编译耗时

```bash
# 打印各阶段耗时
tsc --noEmit --extendedDiagnostics

# 只看总时间
time tsc --noEmit

# 🆕 TS7：对比不同并发度
tsc --noEmit --checkers 8
tsc --noEmit --singleThreaded     # 单线程基线，用来看并发到底提速多少
```

`--extendedDiagnostics` 会输出：

```
Files:                          1234
Instantiations:               456789   ← 关键指标
Check time:                    3.45s
Total time:                    5.67s
```

**`Instantiations` 是最有用的指标**——它表示类型实例化的总次数。优化的目标就是降低它。它也是**跨版本可比**的：升级 TS 7 前后各测一次，如果 `Instantiations` 没变而 `Total time` 掉了 10 倍，说明提速全来自引擎；如果 `Instantiations` 本身能降下来，那是额外的收益。

### 找出罪魁祸首

```bash
# 生成 trace，用 chrome://tracing 打开分析
tsc --noEmit --generateTrace ./trace
```

会生成 `trace.json`，拖进 Chrome 的 `chrome://tracing` 或 Perfetto 就能看到每个文件的检查耗时。

### IDE 侧

VS Code 里：

```
TypeScript: Open TS Server log
```

可以看语言服务的响应时间。如果某个文件 hover 卡顿，通常是那里面有超重的类型。

## 什么时候该放弃类型精度

这是最重要的判断。**类型带来的价值 vs 编译耗时**，是要权衡的：

| 情况 | 建议 |
| --- | --- |
| 递归超过 3 层 | 截断递归深度 |
| 联合超过几千个成员 | 放宽成 `string` |
| 编译超过 30 秒 | 用 `--generateTrace` 定位并简化 |
| 🆕 编译慢但类型已经很克制 | 先确认是不是还在用 `tsc` 6.0；升 TS 7 + 调 `--checkers` |
| 团队里没人看得懂 | 直接写简单类型 + 运行时校验 |

最后一条很关键：**一个没人能维护的精确类型，价值不如一个简单类型 + 一处运行时校验。**

::: tip 🆕 换编译器不解决所有问题
TS 7 的 8～12 倍是**常数因子的提升**。如果你的慢是「一个递归条件类型实例化了 50 万次」这种**算法复杂度问题**，换编译器只会把 60 秒变成 6 秒 —— 还是慢，而且哪天类型再复杂一点又会炸。

优先级永远是：**先修写法（`Instantiations` 降下来），再换引擎，最后调并发。**
:::

## 速查清单

- [ ] `skipLibCheck: true`
- [ ] `include` 只含源码
- [ ] 大对象用 `interface` 不用交叉
- [ ] 泛型加 `in` / `out` 注解
- [ ] 递归限深度、改尾递归
- [ ] 复杂表达式拆成具名中间类型
- [ ] 定期跑 `tsc --extendedDiagnostics` 看 `Instantiations`
- [ ] 🆕 升级到 TS 7，并按 CI 机器核数调 `--checkers` / `--builders`
- [ ] 🆕 库项目考虑开 `isolatedDeclarations`，把 d.ts 生成从类型检查里拆出来

## 下一步

- [TypeScript 6 与 7](../guide/typescript-7)
- [工程实践概览](../engineering/)
