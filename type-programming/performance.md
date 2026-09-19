# 编译性能

复杂类型会让 `tsc` 和 IDE 变慢。这节讲哪些写法贵、怎么优化。

## 性能的来源

TS 的类型检查本质上是在**对类型做结构化比较**。开销主要来自：

1. **类型实例化的数量**：每个泛型调用都会产生一个实例
2. **结构化比较的深度**：嵌套越深、字段越多，比较越贵
3. **联合的规模**：联合成员数量会影响分发的次数

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

## 诊断手段

### 看编译耗时

```bash
# 打印各阶段耗时
tsc --noEmit --extendedDiagnostics

# 只看总时间
time tsc --noEmit
```

`--extendedDiagnostics` 会输出：

```
Files:                          1234
Instantiations:               456789   ← 关键指标
Check time:                    3.45s
Total time:                    5.67s
```

**`Instantiations` 是最有用的指标**——它表示类型实例化的总次数。优化的目标就是降低它。

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
| 团队里没人看得懂 | 直接写简单类型 + 运行时校验 |

最后一条很关键：**一个没人能维护的精确类型，价值不如一个简单类型 + 一处运行时校验。**

## 速查清单

- [ ] `skipLibCheck: true`
- [ ] `include` 只含源码
- [ ] 大对象用 `interface` 不用交叉
- [ ] 泛型加 `in` / `out` 注解
- [ ] 递归限深度、改尾递归
- [ ] 复杂表达式拆成具名中间类型
- [ ] 定期跑 `tsc --extendedDiagnostics` 看 `Instantiations`

## 下一步

- [工程实践概览](../engineering/)
