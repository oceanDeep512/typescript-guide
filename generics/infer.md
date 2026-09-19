# infer 模式匹配

`infer` 是类型层的**解构赋值**：从一个结构里"抠出"你想要的那部分。

## 基本形态

```ts twoslash
type ReturnTypeOf<T> = T extends (...args: any[]) => infer R ? R : never

type A = ReturnTypeOf<() => string>
//   ^?
type B = ReturnTypeOf<(x: number) => boolean>
//   ^?
```

`infer R` 的意思是："这里有个位置我不知道是什么类型，让编译器推断出来，存到 `R` 里。"

**`infer` 只能出现在条件类型的 `extends` 子句里。**

## 对照 JS 的解构

| JS | 类型层 |
| --- | --- |
| `const { a } = obj` | `T extends { a: infer A } ? A : never` |
| `const [first] = arr` | `T extends [infer F, ...unknown[]] ? F : never` |
| `const { a: { b } } = obj` | `T extends { a: { b: infer B } } ? B : never` |

## 常见模式

### 函数

```ts twoslash
type ParamsOf<T> = T extends (...args: infer P) => any ? P : never
type ReturnOf<T> = T extends (...args: any[]) => infer R ? R : never

type A = ParamsOf<(x: string, y: number) => void>
//   ^?
type B = ReturnOf<(x: string) => number>
//   ^?
```

### 数组与元组

```ts twoslash
type First<T extends unknown[]> = T extends [infer F, ...unknown[]] ? F : never
type Last<T extends unknown[]> = T extends [...unknown[], infer L] ? L : never
type Tail<T extends unknown[]> = T extends [unknown, ...infer R] ? R : never

type A = First<[1, 2, 3]>
//   ^?
type B = Last<[1, 2, 3]>
//   ^?
type C = Tail<[1, 2, 3]>
//   ^?
```

### Promise

```ts twoslash
type Unwrap<T> = T extends Promise<infer U> ? U : T

type A = Unwrap<Promise<string>>
//   ^?
type B = Unwrap<Promise<Promise<number>>>
//   ^?
```

注意嵌套 Promise 只解一层，要递归解用官方的 `Awaited`。

### 内置工具就是这么造的

`Awaited` 的秘密只是**递归调用自己**：

```ts twoslash
type MyAwaited<T> = T extends Promise<infer U> ? MyAwaited<U> : T

type A = MyAwaited<Promise<Promise<number>>>
//   ^?
```

另外两个高频工具同理，都是"一次 `infer`"：

```ts twoslash
interface User {
  id: string
}

type MyParameters<T extends (...args: any) => any> = T extends (
  ...args: infer P
) => any
  ? P
  : never

type MyReturnType<T extends (...args: any) => any> = T extends (
  ...args: any
) => infer R
  ? R
  : never

type P = MyParameters<(id: string, opt?: { force: boolean }) => void>
//   ^?
type R = MyReturnType<(id: string) => Promise<User>>
//   ^?
```

看出规律了吗：**`infer` 放在哪个位置，就提取哪个位置的类型**——
参数列表里就是参数元组，返回值位置就是返回类型，`Promise<...>` 里就是 resolve 出来的值。

### 字符串

```ts twoslash
type SplitDash<S extends string> = S extends `${infer A}-${infer B}` ? [A, B] : [S]

type A = SplitDash<'a-b'>
//   ^?
type B = SplitDash<'abc'>
//   ^?
```

模板字面量里的 `${infer X}` 是**非贪婪**的：只匹配到第一个分隔符。

### 对象

```ts twoslash
type ValueOfKey<T, K extends keyof T> = T extends { [P in K]: infer V } ? V : never

interface Todo {
  title: string
  done: boolean
}
type A = ValueOfKey<Todo, 'title'>
//   ^?
```

## 多个 infer

一次可以声明多个：

```ts twoslash
type Swap<T> = T extends [infer A, infer B] ? [B, A] : T

type A = Swap<[string, number]>
//   ^?
```

## infer 带约束（TS 4.8）

```ts twoslash
type GetLength<T> = T extends { length: infer L extends number } ? L : never

type A = GetLength<string[]>
//   ^?
type B = GetLength<[1, 2, 3]>
//   ^?
```

好处是推断失败时不用写 `never` 兜底逻辑，编译器会直接认为不匹配。

## 递归 infer

```ts twoslash
type DeepUnwrap<T> = T extends Promise<infer U> ? DeepUnwrap<U> : T

type A = DeepUnwrap<Promise<Promise<Promise<boolean>>>>
//   ^?
```

这就是 `Awaited` 的简化版（官方版还处理了 `thenable` 对象）。

## 联合分发下的 infer

```ts twoslash
type ElementOf<T> = T extends (infer U)[] ? U : never

type A = ElementOf<string[] | number[]>
//   ^?
```

分发让每个成员各自推断，结果是联合。

## 坑

### 1. infer 在协变/逆变位置的结果不同

```ts twoslash
type InReturn<T> = T extends () => infer R ? R : never
type InParam<T> = T extends (x: infer P) => void ? P : never

type A = InReturn<() => 'a'>
//   ^?
type B = InParam<(x: 'a' | 'b') => void>
//   ^?

// 多个参数时推断成什么？
type InParams<T> = T extends (...args: infer P) => any ? P : never
type C = InParams<(x: string, y: number) => void>
//   ^?
```

参数位置是逆变的，多个参数会推断成元组；如果同一位置有多个候选（函数重载），会取交叉。

### 2. infer 推断不出来就是 never… 或不匹配

```ts twoslash
type F<T> = T extends [infer A] ? A : 'not a tuple'

type A = F<[string]>
//   ^?
type B = F<string>
//   ^?
```

推断失败 = 条件不成立 = 走 false 分支，不是 `never`。

### 3. 分发会干扰 infer

```ts twoslash
type F<T> = T extends [infer A] ? A : never
type G = F<[string] | [number]>
//   ^?
```

想要整体判断时用 `[T] extends [[infer A]]` 这类包一层写法。

## 实战：从异步流反推元素类型

```ts twoslash
declare function streamChat(): AsyncGenerator<{ delta: string }, void, unknown>

type ChunkOf<T> = T extends AsyncGenerator<infer U, any, any> ? U : never
type Chunk = ChunkOf<ReturnType<typeof streamChat>>
//   ^?

type ElemOf<T> = T extends AsyncIterable<infer U> ? U : never
```

这是做流式 AI 响应时最常用的一个技巧，详见[异步与迭代器](../engineering/async-iterator)。

## 下一步

- [模板字面量类型](./template-literal)
- [组合拳：六个概念一起工作](./in-action)
