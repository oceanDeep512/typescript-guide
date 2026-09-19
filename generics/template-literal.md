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

### 6. SDK 里的模式匹配：`${string}.delta` 这类写法

流式 / 事件类 SDK（OpenAI、Anthropic、各类 stream 接口）的事件名几乎都带命名空间，
模板字面量可以**按模式匹配**它们，而不是逐个枚举：

```ts twoslash
// 反解出前缀：一切以 .delta 结尾的事件名
type DeltaOf<T extends string> = T extends `${infer P}.delta` ? P : never

type A = DeltaOf<'response.output_text.delta'>
//   ^?
// 不匹配的返回 never
type B = DeltaOf<'response.done'>
//   ^?
```

`${infer P}.delta` 读作"以 `.delta` 结尾，前面那截存进 `P`"。
反过来 `${infer P}.${string}` 则是"取第一段"。

配合 `Extract` 还能直接从事件联合里筛出一族：

```ts twoslash
type StreamEvent =
  | { type: 'response.created'; id: string }
  | { type: 'response.output_text.delta'; delta: string }
  | { type: 'response.reasoning.delta'; delta: string }
  | { type: 'response.completed'; text: string }

// 所有 delta 类事件 —— 不用手写每个名字
type DeltaEvents = Extract<StreamEvent, { type: `${string}.delta` }>
//   ^?

declare function onDelta(e: DeltaEvents): void
onDelta({ type: 'response.output_text.delta', delta: 'hi' })
// onDelta({ type: 'response.completed', text: 'hi' }) // ❌ 不是 delta 事件
```

这是"**按模式收窄**"：SDK 新增一个 `xxx.delta` 事件时，你的处理函数签名自动跟上，不用改代码。

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
- [组合拳：六个概念一起工作](./in-action)
