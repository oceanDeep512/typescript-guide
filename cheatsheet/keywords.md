# 关键字与语法

类型层全部的"语法关键字"。数量很少——背熟之后看任何库源码都不会有生词。

## 取与查

<TypeCard name="keyof" badge="关键字">

取类型的所有键，返回字面量联合。

```ts twoslash
interface Todo {
  title: string
  done: boolean
}
type K = keyof Todo
//   ^?
type KExpanded = Exclude<K, never> // 让它参与一次运算，才会展开成真实联合
//   ^?
type A = keyof any
//   ^?
```

带索引签名时会多出 `number`：`keyof { [k: string]: number }` → `string | number`。

</TypeCard>

<TypeCard name="typeof" badge="关键字">

把值提升成类型，是值层通往类型层的唯一入口。

```ts twoslash
const cfg = { host: 'a.com', port: 443 } as const
type Cfg = typeof cfg
//   ^?
type Host = typeof cfg['host']
//   ^?
```

</TypeCard>

<TypeCard name="索引访问 T[K]" badge="语法">

类型层的查表。K 是联合时得到值的联合。

```ts twoslash
interface Todo {
  title: string
  done: boolean
}
type A = Todo['title']
//   ^?
type B = Todo['title' | 'done']
//   ^?
type C = [1, 2, 3]['length']
//   ^?
type D = string[]['length']
//   ^?
```

</TypeCard>

## 推导与遍历

<TypeCard name="infer" badge="关键字">

在条件类型的 `extends` 子句里声明待推断变量——类型层的解构。

```ts twoslash
type Return<T> = T extends (...a: any[]) => infer R ? R : never
type First<T extends unknown[]> = T extends [infer F, ...infer _] ? F : never
type Unwrap<T> = T extends Promise<infer U> ? U : T

type A = First<[1, 2, 3]>
//   ^?
```

TS 4.8+ 支持带约束：`infer R extends string`。

</TypeCard>

<TypeCard name="in（映射类型）" badge="关键字">

类型层唯一的循环。

```ts twoslash
type Obj<K extends string> = { [P in K]: number }
type A = Obj<'a' | 'b'>
//   ^?

type Nullable<T> = { [K in keyof T]: T[K] | null }
```

用在元组上会保持长度。

</TypeCard>

<TypeCard name="as（键重映射）" badge="TS 4.1">

改写键名；返回 `never` 可丢弃该键。

```ts twoslash
type Getters<T> = {
  [K in keyof T as `get${Capitalize<K & string>}`]: () => T[K]
}
type A = Getters<{ name: string }>
//   ^?
```

</TypeCard>

## 修饰与断言

<TypeCard name="as const" badge="语法">

把字面量收窄到最窄并加 readonly。

```ts twoslash
const a = { x: 1, y: 'p' }
const b = { x: 1, y: 'p' } as const
type TA = typeof a
//   ^?
type TB = typeof b
//   ^?
```

</TypeCard>

<TypeCard name="satisfies" badge="TS 4.9">

校验但保留推导结果，解决标注擦宽 / 断言不校验的两难。

```ts twoslash
const r = { home: '/', about: '/about' } satisfies Record<string, string>
type H = typeof r.home
//   ^?
```

与 `as const` 组合时顺序固定：`as const satisfies T`。

</TypeCard>

<TypeCard name="修饰符 + / -" badge="语法">

```ts twoslash
type Partial<T>  = { [K in keyof T]?: T[K] }              // 加 ?
type Required<T> = { [K in keyof T]-?: T[K] }             // 删 ?
type Readonly<T> = { readonly [K in keyof T]: T[K] }      // 加 readonly
type Mutable<T>  = { -readonly [K in keyof T]: T[K] }     // 删 readonly

type P = Partial<{ a: number; b: string }>
//   ^?
```

修饰符是**保留**的，不是覆盖的。

</TypeCard>

<TypeCard name="is（类型谓词）" badge="关键字">

让函数在返回 boolean 的同时收窄调用方。

```ts twoslash
function isStr(x: unknown): x is string {
  return typeof x === 'string'
}
declare const v: unknown
if (isStr(v)) {
  v.toUpperCase()
}
```

更强版本是 `asserts x is T`（断言函数），收窄整个后续作用域。

</TypeCard>

<TypeCard name="模板字面量类型" badge="TS 4.1">

```ts twoslash
type World = `hello ${'world' | 'ts'}`
//   ^?
type Split<S extends string> = S extends `${infer A}-${infer B}` ? [A, B] : [S]
type R = Split<'a-b'>
//   ^?
```

`${infer X}` 是非贪婪匹配。

</TypeCard>

## 进阶

<TypeCard name="in / out 变型注解" badge="TS 4.7">

```ts twoslash
interface Producer<out T> { get(): T }   // 只出现在输出位置
interface Consumer<in T>  { put(x: T): void } // 只出现在输入位置

declare const ps: Producer<string>
const ps2: Producer<unknown> = ps // out → 协变：string 可赋给 unknown
//    ^?
```

标反会报错；标注正确能让 TS 跳过结构化比较，检查更快。

</TypeCard>

<TypeCard name="const 类型参数" badge="TS 5.0">

```ts twoslash
declare function f1<T>(x: T[]): T[]
declare function f2<const T>(x: T[]): T[]

const a = f1(['x', 'y'])
type A = typeof a
//   ^?
const b = f2(['x', 'y'])
type B = typeof b
//   ^?
```

</TypeCard>

<TypeCard name="NoInfer<T>" badge="TS 5.4">

阻止类型参数参与推断，只用于校验。

```ts twoslash
declare function f<T>(items: T[], init: NoInfer<T>): T
// init 不会把 T 推宽，只做校验
```

</TypeCard>

<TypeCard name="unique symbol" badge="关键字">

配合交叉类型做 branded type。

```ts twoslash
declare const brand: unique symbol
type UserId = string & { readonly [brand]: 'UserId' }
type PostId = string & { readonly [brand]: 'PostId' }
declare const uid: UserId
declare const pid: PostId
// uid = pid 会报错
```

</TypeCard>

## 下一步

- [内置工具类型](./utility)
