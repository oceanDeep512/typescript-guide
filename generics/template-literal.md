# 模板字面量类型

TS 4.1 引入。它是**类型层的字符串拼接与匹配**，让类型系统第一次能"处理字符串"。

## 基本拼接

```ts twoslash
type World = 'world' | 'TS'
type Greeting = `hello ${World}`
//   ^?
```

联合会自动**展开成笛卡尔积**：

```ts twoslash
type A = 'top' | 'bottom'
type B = 'left' | 'right'
type Position = `${A}-${B}`
//   ^?
```

## 内置字符串工具类型

四个编译器内置的类型（没有 TS 源码，是 intrinsic）：

```ts twoslash
type A = Uppercase<'abc'>
//   ^?
type B = Lowercase<'ABC'>
//   ^?
type C = Capitalize<'abc'>
//   ^?
type D = Uncapitalize<'Abc'>
//   ^?
```

## 模式匹配：`${infer X}`

这是它最有用的地方——能"解析"字符串。

```ts twoslash
type SplitFirst<S extends string> = S extends `${infer A}.${infer B}` ? [A, B] : [S]

type X = SplitFirst<'user.name'>
//   ^?
type Y = SplitFirst<'username'>
//   ^?
```

匹配规则：**`${infer A}` 是非贪婪的**，匹配到第一个分隔符就停。

```ts twoslash
type A = 'a-b-c' extends `${infer X}-${infer Y}` ? [X, Y] : never
//   ^?
```

## 递归处理字符串

类型层没有循环，处理任意长度的字符串只能递归：

```ts twoslash
type ReplaceAll<
  S extends string,
  From extends string,
  To extends string
> = From extends ''
  ? S
  : S extends `${infer L}${From}${infer R}`
    ? `${L}${To}${ReplaceAll<R, From, To>}`
    : S

type A = ReplaceAll<'a-b-c', '-', '/'>
//   ^?
```

要点：

1. 先处理边界（空 `From` 会无限递归）
2. 每次递归**缩短**输入（`R` 一定比 `S` 短）
3. 已经不含 `From` 时落到 false 分支，递归结束

### 数字符串长度

```ts twoslash
type StrLen<
  S extends string,
  Acc extends unknown[] = []
> = S extends `${infer _}${infer Rest}` ? StrLen<Rest, [...Acc, unknown]> : Acc['length']

type A = StrLen<'hello'>
//   ^?
```

用元组长度当计数器——这是类型层做算术的唯一手段，见[递归与元组计数](../type-programming/recursion)。

## 实用场景

### 1. 键名转换

```ts twoslash
type Getters<T> = {
  [K in keyof T as `get${Capitalize<K & string>}`]: () => T[K]
}

interface Todo {
  title: string
  done: boolean
}
type G = Getters<Todo>
//   ^?
```

### 2. 事件名

```ts twoslash
type EventName<T extends string> = `on${Capitalize<T>}`
type Handler<T extends string> = {
  [K in EventName<T>]: (payload: unknown) => void
}

type H = Handler<'click' | 'change'>
//   ^?
```

### 3. 路径参数校验

```ts twoslash
type Route = `/${string}`
const a: Route = '/home'
```

### 4. CSS-in-JS 的单位

```ts twoslash
type Size = `${number}px` | `${number}rem` | `${number}%`
const s1: Size = '16px'
const s2: Size = '50%'
```

### 5. 模板字符串推导（4.3+）

```ts twoslash
declare function makeId(prefix: string): `${string}-${number}`
const id = makeId('user')
type T = typeof id
//   ^?
```

函数返回值也可以声明成模板字面量类型。

## 限制

### 1. 联合展开会爆炸

```ts twoslash
type Big = `${'a' | 'b' | 'c'}-${'x' | 'y' | 'z'}-${'1' | '2' | '3'}`
//   ^?
```

结果是 27 个成员。再多就会触发 "Expression produces a union type that is too complex to represent"。

### 2. 不能做正则

`${infer X}` 只能做**分隔符匹配**，没有正则能力。要做复杂解析得手写递归状态机。

### 3. number 插值有范围限制

```ts twoslash
type A = `${number}`
//   ^?
```

`${number}` 匹配任意数字字符串，但反向（从字符串转数字）需要用 `T extends \`${infer N extends number}\`` 这类写法，且大数会有问题。

### 4. symbol 不能直接插值

```ts twoslash
type S<K extends string | number> = `x_${K}`
type A = S<'a'>
//   ^?
```

symbol 要先过滤掉（`Extract<keyof T, string>`）。

## 下一步

- [内置工具类型源码](./utility)
