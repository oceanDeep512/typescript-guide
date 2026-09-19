# 变型与调试

## 变型

<TypeCard name="速判口诀" badge="记忆">

> **返回值位置 → 协变；参数位置 → 逆变；只读属性 → 协变；可写属性 → 不变。**

```ts twoslash
type Cov<T> = () => T // 协变
type Con<T> = (x: T) => void // 逆变
type Inv<T> = (x: T) => T // 不变

type A = Cov<'x'> extends Cov<string> ? true : false
//   ^?
type B = Con<string> extends Con<'x'> ? true : false
//   ^?
type C = Inv<'x'> extends Inv<string> ? true : false
//   ^?
```

</TypeCard>

<TypeCard name="in / out 注解" badge="TS 4.7">

```ts
interface Producer<out T> { get(): T }
interface Consumer<in T>  { put(x: T): void }
interface Both<in out T>  { v: T }
```

两个好处：写反会报错；标注正确能让 TS 跳过结构化比较，检查更快。

</TypeCard>

<TypeCard name="strictFunctionTypes 的例外" badge="历史包袱">

它**只作用于函数类型字面量，不作用于方法简写**：

```ts twoslash
interface WithMethod {
  m(x: string): void // 方法简写：双变
}
interface WithProp {
  m: (x: string) => void // 函数属性：逆变
}

const a: WithMethod = { m: (x: 'literal') => {} } // 合法
```

</TypeCard>

<TypeCard name="数组是协变的" badge="有意为之">

```ts twoslash
const strs: string[] = ['a']
const arr: (string | number)[] = strs
arr.push(1) // 严格来说不安全，但 TS 允许
```

</TypeCard>

## 调试

<TypeCard name="Prettify / Expand" badge="拍平">

```ts twoslash
type Prettify<T> = { [K in keyof T]: T[K] } & {}
type A = Prettify<{ a: string } & { b: number }>
//   ^?
```

</TypeCard>

<TypeCard name="分步看中间态" badge="方法">

别把长表达式写在一行里，拆成 `Step1` / `Step2` 逐个 hover —— 这就是类型层的"打断点"。

```ts twoslash
type Step1<T> = keyof T
type Step2<K> = K extends `on${infer E}` ? E : never
type Step3<T> = { [K in keyof T as Step2<K>]: T[K] }

interface Events {
  onClick: () => void
  value: string
}
type S3 = Step3<Events>
//   ^?
```

</TypeCard>

<TypeCard name="手动传累加器" badge="递归调试">

递归类型的唯一有效调试手段：

```ts twoslash
type Tuple<N extends number, Acc extends unknown[] = []> =
  Acc['length'] extends N ? Acc : Tuple<N, [...Acc, unknown]>

type S1 = Tuple<3, [unknown]>
//   ^?
type S2 = Tuple<3, [unknown, unknown]>
//   ^?
```

</TypeCard>

<TypeCard name="Equal / Expect" badge="类型测试">

```ts twoslash
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y
  ? 1
  : 2
  ? true
  : false
type Expect<T extends true> = T

type A = Equal<{ a: 1 }, { a?: 1 }>
//   ^?
type B = Equal<{ a: 1 }, { a: 1 }>
//   ^?
```

利用函数签名的恒等比较，比 `extends` 严格得多。

</TypeCard>

## tsc 开关

```bash
# 完整显示被截断的类型（调试复杂类型必开）
tsc --noEmit --noErrorTruncation

# 解释每个文件为什么被包含
tsc --noEmit --explainFiles

# 打印最终生效的配置
tsc --showConfig

# 性能诊断（看 Instantiations 数量）
tsc --noEmit --extendedDiagnostics

# 生成 trace 用 chrome://tracing 分析
tsc --noEmit --generateTrace ./trace
```

## 注释指令

```ts
// @ts-expect-error —— 该行必须报错，否则注释自己会报错（推荐）
// @ts-ignore     —— 静默忽略，会腐烂（不推荐）
```

**永远优先 `@ts-expect-error`。**

## 常见报错速查

| 报错 | 常见原因 |
| --- | --- |
| `Type instantiation is excessively deep` | 递归太深，改尾递归或限深度 |
| `Expression produces a union type that is too complex` | 联合成员超限，简化模板字面量 |
| `Type 'X' is not assignable to type 'Y'` | 开 `--noErrorTruncation` 看完整 |
| `Property 'x' does not exist on type 'Y'` | 联合没收窄 |
| `Object is possibly 'undefined'` | `strictNullChecks` / `noUncheckedIndexedAccess` |
| `Cannot find module 'x'` | `moduleResolution` 配错 |
| `Argument of type 'x' is not assignable to parameter of type 'never'` | 分发把结果变成 `never` 了 |

## 调试流程

1. 报错先看完整信息（`--noErrorTruncation`）
2. 套 `Prettify` 看真实形状
3. 拆成中间类型逐个 hover
4. 递归的话手动传累加器
5. 判断边界：`any` / `never` / 分发
6. 写 `Equal` 断言锁定结论

## 下一步

- 回到[速查表总览](./)
