# 调试与类型测试

类型层没有 `console.log`。这一节的工具就是你的调试器。

## 1. 拍平类型：Expand / Prettify

交叉类型、`Omit` 之后的类型往往显示为 `A & B & { ... }`，看不清真实形状。

```ts twoslash
type Prettify<T> = { [K in keyof T]: T[K] } & {}

type Raw = { a: string } & { b: number } & { c?: boolean }
type A = Prettify<Raw>
//   ^?
```

用了 `Prettify` 之后 hover 会显示完整展开的对象字面量。

递归版（处理嵌套）：

```ts twoslash
type DeepPrettify<T> = T extends (infer U)[]
  ? DeepPrettify<U>[]
  : T extends Function
    ? T
    : T extends object
      ? { [K in keyof T]: DeepPrettify<T[K]> } & {}
      : T
```

## 2. 分步看中间态

不要把长表达式写在一行里。拆开逐个 hover —— 这就是类型层的"打断点"。

```ts twoslash
// 别这样写（错了根本看不出哪一步错）
type Bad<T> = { [K in keyof T as K extends `on${infer E}` ? E : never]: T[K] }

// 拆开
type Step1<T> = keyof T
type Step2<K> = K extends `on${infer E}` ? E : never
type Step3<T> = { [K in keyof T as Step2<K>]: T[K] }

interface Events {
  onClick: () => void
  onMove: () => void
  value: string
}
type S1 = Step1<Events>
//   ^?
type S2 = Step2<'onClick'>
//   ^?
type S3 = Step3<Events>
//   ^?
```

## 3. hover 与 `//^?`

IDE 里鼠标悬停是最快的手段。文档里则用 `//^?` 把结果直接写出来——本教程大量使用，你也可以在任何支持 Twoslash 的地方用。

## 4. 手动传累加器看递归过程

递归类型调试的唯一有效手段：

```ts twoslash
type Tuple<N extends number, Acc extends unknown[] = []> =
  Acc['length'] extends N ? Acc : Tuple<N, [...Acc, unknown]>

type S0 = Tuple<3, []>
//   ^?
type S1 = Tuple<3, [unknown]>
//   ^?
type S2 = Tuple<3, [unknown, unknown]>
//   ^?
type S3 = Tuple<3, [unknown, unknown, unknown]>
//   ^?
```

## 5. tsc 命令行开关

```bash
# 完整显示被截断的类型（调试复杂类型时必开）
tsc --noEmit --noErrorTruncation

# 解释每个文件为什么被包含进编译
tsc --noEmit --explainFiles

# 打印最终生效的配置
tsc --showConfig

# 只看某个文件的诊断
tsc --noEmit src/suspect.ts
```

`--noErrorTruncation` 请记牢。类型复杂之后报错会被折叠成：

```
Type 'X' is not assignable to type 'DeepPartial<Omit<Config, "plugins">>'.
```

开了它才能看到具体是哪个字段不匹配。

## 6. 类型单元测试

type-challenges 的标准写法。给类型写"断言"，改坏了立刻报错。

### 严格相等

```ts twoslash
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends
  (<T>() => T extends Y ? 1 : 2) ? true : false

type Expect<T extends true> = T

type A = Equal<{ a: 1 }, { a: 1 }>
//   ^?
type B = Equal<{ a: 1 }, { a?: 1 }>
//   ^?
```

`Equal` 的原理：TS 比较两个**函数签名**时会做恒等（identity）比较，而条件类型 `T extends X ? 1 : 2` 把 `X` 嵌在函数体里，所以只有当 `X` 和 `Y` 完全相同（不只是互相兼容）时，两个签名才恒等。

用 `extends` 判断是不够的：

```ts twoslash
type A = { a: 1 } extends { a: number } ? true : false
//   ^?
```

`{a: 1}` 能赋值给 `{a: number}` 但它们不相等。

### 写成断言

```ts twoslash
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y
  ? 1
  : 2
  ? true
  : false
type Expect<T extends true> = T

type MyPick<T, K extends keyof T> = { [P in K]: T[P] }

// 测试
type _1 = Expect<Equal<MyPick<{ a: 1; b: 2 }, 'a'>, { a: 1 }>>
type _2 = Expect<Equal<MyPick<{ a: 1 }, never>, {}>>
```

`Expect<T extends true>` 在 `T` 不是 `true` 时会报错，起到断言作用。

### 宽松断言

只判断是否可赋值：

```ts twoslash
type Assignable<A, B> = A extends B ? true : false

type A = Assignable<'a', string>
//   ^?
```

## 7. @ts-expect-error vs @ts-ignore

```ts twoslash
// @ts-expect-error 故意传错类型
const a: number = 'x'
```

**永远优先 `@ts-expect-error`**：如果那一行后来不报错了，`@ts-expect-error` 自己会报错，提醒你注释过期。

`@ts-ignore` 则会静默失效，变成没人敢删的垃圾注释。

## 8. 常见报错速查

| 报错 | 常见原因 |
| --- | --- |
| `Type instantiation is excessively deep` | 递归太深，改尾递归 |
| `Expression produces a union type that is too complex` | 联合成员超过 10 万，简化模板字面量 |
| `Type 'X' is not assignable to type 'Y'` | 用 `--noErrorTruncation` 看完整信息 |
| `Property 'x' does not exist on type 'Y'` | 忘记收窄联合 |
| `Object is possibly 'undefined'` | `strictNullChecks` / `noUncheckedIndexedAccess` |
| `Cannot find module 'x'` | `moduleResolution` 配错 |
| `Argument of type 'x' is not assignable to parameter of type 'never'` | 分发导致结果是 `never` |

最后一条是类型编程里的高频信号：某个位置变成了 `never`，通常意味着你的条件类型把输入全过滤掉了。

## 9. 调试流程总结

1. 报错先看完整信息（`--noErrorTruncation`）
2. 套 `Prettify` 看真实形状
3. 拆成中间类型逐个 hover
4. 递归的话手动传累加器
5. 判断边界：`any` / `never` / 联合分发
6. 写 `Equal` 断言锁定结论

## 下一步

- [递归与元组计数](./recursion)
