# 热身与 Easy

type-challenges 的 warm-up + easy 共 14 题。这里收录 8 道最代表性的。

::: tip
每题限时 15 分钟。做不出来直接展开答案，看懂后默写一遍。
:::

<Exercise title="4 · 实现 Pick" level="easy">

实现 `MyPick<T, K>`，从 `T` 中选出属性 `K`。不能使用内置的 `Pick`。

```ts
interface Todo {
  title: string
  description: string
  completed: boolean
}

type TodoPreview = MyPick<Todo, 'title' | 'completed'>
// 期望 { title: string; completed: boolean }
```

<template #answer>

```ts twoslash
type MyPick<T, K extends keyof T> = { [P in K]: T[P] }

interface Todo {
  title: string
  description: string
  completed: boolean
}
type TodoPreview = MyPick<Todo, 'title' | 'completed'>
//   ^?
```

**套路**：重新构造做变换。

1. K 必须是 T 的键 → `K extends keyof T`（约束）
2. 遍历 K → 映射类型 `[P in K]`
3. 值保持原样 → `T[P]`（索引访问）

一行里包含四个概念：泛型函数、循环、查表、入参校验。

</template>
</Exercise>

<Exercise title="7 · 实现 Readonly" level="easy">

实现 `MyReadonly<T>`，让所有属性变成只读。

```ts
interface Todo {
  title: string
}
const todo: MyReadonly<Todo> = { title: 'x' }
todo.title = 'y' // 应该报错
```

<template #answer>

```ts twoslash
type MyReadonly<T> = { readonly [P in keyof T]: T[P] }

interface Todo {
  title: string
}
type R = MyReadonly<Todo>
//   ^?
```

**套路**：重新构造 + 修饰符。

去掉 readonly 则是 `{ -readonly [P in keyof T]: T[P] }`。

</template>
</Exercise>

<Exercise title="14 · First of Array" level="easy">

实现 `First<T>`，取元组的第一个元素类型。

```ts
type A = First<[3, 2, 1]> // 3
type B = First<[]> // never
```

<template #answer>

```ts twoslash
type First<T extends unknown[]> = T extends [infer F, ...unknown[]] ? F : never

type A = First<[3, 2, 1]>
//   ^?
type B = First<[]>
//   ^?
```

**套路**：模式匹配做提取。

注意空元组的处理：`[]` 不匹配 `[infer F, ...unknown[]]`，所以落到 `never`。

</template>
</Exercise>

<Exercise title="18 · Length of Tuple" level="easy">

实现 `Length<T>`，返回元组的长度。

```ts
type A = Length<[1, 2, 3]> // 3
```

<template #answer>

```ts twoslash
type Length<T extends readonly unknown[]> = T['length']

type A = Length<[1, 2, 3]>
//   ^?
type B = Length<[]>
//   ^?
```

**套路**：数组长度做计数的基础。

关键点：`['length']` 对**元组**返回具体数字，对**数组**返回 `number`。

</template>
</Exercise>

<Exercise title="43 · 实现 Exclude" level="easy">

实现 `MyExclude<T, U>`，从联合 `T` 中剔除可以赋值给 `U` 的成员。

```ts
type A = MyExclude<'a' | 'b' | 'c', 'a'> // 'b' | 'c'
```

<template #answer>

```ts twoslash
type MyExclude<T, U> = T extends U ? never : T

type A = MyExclude<'a' | 'b' | 'c', 'a'>
//   ^?
```

**套路**：联合分散可简化。

原理：`T` 是裸类型参数，会分发；不满足的成员变成 `never`，而 `never` 在联合里自动消失。

</template>
</Exercise>

<Exercise title="189 · 实现 Awaited" level="easy">

实现 `MyAwaited<T>`，取出 `Promise` 的内容类型（支持嵌套）。

```ts
type A = MyAwaited<Promise<string>> // string
type B = MyAwaited<Promise<Promise<number>>> // number
```

<template #answer>

```ts twoslash
type MyAwaited<T> = T extends Promise<infer U> ? MyAwaited<U> : T

type A = MyAwaited<Promise<string>>
//   ^?
type B = MyAwaited<Promise<Promise<number>>>
//   ^?
```

**套路**：模式匹配做提取 + 递归复用做循环。

官方的 `Awaited` 更复杂（要处理 thenable 对象），见[内置工具类型源码](../generics/utility)。

</template>
</Exercise>

<Exercise title="268 · 实现 If" level="easy">

实现 `If<C, T, F>`：`C` 为 `true` 返回 `T`，否则返回 `F`。

```ts
type A = If<true, 'a', 'b'> // 'a'
type B = If<false, 'a', 'b'> // 'b'
```

<template #answer>

```ts twoslash
type If<C extends boolean, T, F> = C extends true ? T : F

type A = If<true, 'a', 'b'>
//   ^?
type B = If<false, 'a', 'b'>
//   ^?
```

**套路**：条件类型最基础形态。

`C extends boolean` 是约束，`C extends true ? T : F` 是判断——同一个 `extends` 两种含义。

</template>
</Exercise>

<Exercise title="3057 · 实现 Push" level="easy">

实现 `Push<T, U>`，往元组末尾追加一个类型。

```ts
type A = Push<[1, 2], 3> // [1, 2, 3]
```

<template #answer>

```ts twoslash
type Push<T extends unknown[], U> = [...T, U]

type A = Push<[1, 2], 3>
//   ^?
type Unshift<T extends unknown[], U> = [U, ...T]
type B = Unshift<[1, 2], 0>
//   ^?
```

**套路**：重新构造做变换。

元组可以直接展开拼接，这是类型层少数"看起来像数组操作"的语法。

</template>
</Exercise>

## 刷完这些之后

如果这 8 题你都能独立写出来，说明已经过了"前 10 题发懵"的阶段。继续 [Medium 精选](./medium)。
