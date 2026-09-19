# 条件类型与分发

条件类型是**类型层的 if/else**，也是唯一能"做判断"的语法。分发是它最强大也最容易踩坑的特性。

## 基本形式

```ts twoslash
type IsString<T> = T extends string ? true : false

type A = IsString<string>
//   ^?
type B = IsString<number>
//   ^?
```

读作："如果 `T` 可以赋值给 `string`，那么结果是 `true`，否则 `false`。"

注意 `extends` 在这里是**判断**（能不能赋值），不是继承也不是约束。

## 分发（Distributive Conditional Types）

当 `extends` 左边是**裸类型参数**时，如果传入的是联合类型，TS 会把联合**拆开逐个计算**，再把结果合并。

```ts twoslash
type ToArray<T> = T extends any ? T[] : never

type A = ToArray<string | number>
//   ^?
```

不是 `(string | number)[]`，而是 `string[] | number[]`——因为分发了。

### 分发的条件

**只有裸类型参数才会分发。** 包一层就失效：

```ts twoslash
type Dist<T> = T extends 'a' ? 1 : 2
type NoDist1<T> = [T] extends ['a'] ? 1 : 2
type NoDist2<T> = T[] extends 'a'[] ? 1 : 2

type A = Dist<'a' | 'b'>
//   ^?
type B = NoDist1<'a' | 'b'>
//   ^?
type C = NoDist2<'a' | 'b'>
//   ^?
```

### 用分发做过滤

联合类型编程的核心技巧：

```ts twoslash
type Exclude<T, U> = T extends U ? never : T
type Extract<T, U> = T extends U ? T : never
type NonNullable<T> = T extends null | undefined ? never : T
```

原理：分发后不满足条件的成员变成 `never`，而 **`never` 在联合里会自动消失**。

```ts twoslash
type A = string | never
//   ^?
type B = string | never | number
//   ^?
```

## 判断 never 的经典陷阱

```ts twoslash
type Bad<T> = T extends never ? true : false
type Good<T> = [T] extends [never] ? true : false

type A = Bad<never>
//   ^?
type B = Good<never>
//   ^?
```

`Bad<never>` 返回 `never` 而不是 `true`——因为 `never` 被当成**空联合**，分发到 0 个成员，结果就是 `never`。

**判断 `never` 必须用 `[T] extends [never]` 阻止分发。**

## any 的特殊行为

```ts twoslash
type F<T> = T extends string ? 1 : 2

type A = F<any>
//   ^?
```

`any` 在条件类型里会**同时走两个分支**，结果是两个分支的联合。

## 阻止分发的三种写法

```ts twoslash
type A1<T> = [T] extends [string] ? 1 : 2
type A2<T> = T[] extends string[] ? 1 : 2
type A3<T> = { v: T } extends { v: string } ? 1 : 2
```

`[T] extends [U]` 是最常用的，记住它。

## 嵌套条件类型

条件类型可以嵌套，相当于 `else if`：

```ts twoslash
type TypeName<T> = T extends string
  ? 'string'
  : T extends number
    ? 'number'
    : T extends boolean
      ? 'boolean'
      : T extends undefined
        ? 'undefined'
        : T extends Function
          ? 'function'
          : 'object'

type A = TypeName<string>
//   ^?
type B = TypeName<() => void>
//   ^?
type C = TypeName<string[]>
//   ^?
```

## 与 infer 配合

条件类型最强的用法是配合 `infer` 提取信息，见[infer 模式匹配](./infer)。

```ts twoslash
type Flatten<T> = T extends Array<infer U> ? U : T
type A = Flatten<string[][]>
//   ^?
```

## 实用模式

### 1. 条件返回类型

```ts twoslash
type Unwrap<T> = T extends Promise<infer U> ? U : T
declare function maybeAwait<T>(x: T): Unwrap<T>

declare const p: Promise<string>
const a = maybeAwait(p)
type A = typeof a
//   ^?
declare const n: number
const b = maybeAwait(n)
type B = typeof b
//   ^?
```

### 2. 约束 + 报错信息

```ts twoslash
type RequireKeys<T, K extends keyof T> = T extends Record<K, unknown> ? T : never
```

### 3. 互斥属性

```ts twoslash
type Either<A, B> =
  | (A & { [K in Exclude<keyof B, keyof A>]?: never })
  | (B & { [K in Exclude<keyof A, keyof B>]?: never })

type Props = Either<{ a: string }, { b: number }>

const x: Props = { a: '1' }
const y: Props = { b: 2 }
```

## 下一步

- [infer 模式匹配](./infer)
