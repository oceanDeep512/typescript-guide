# Medium 精选

medium 共 103 题，是真正的主战场。这里精选 8 道，覆盖全部六个套路。

::: tip
medium 里 80% 的题都是六大套路的组合。做题前先判断属于哪一类。
:::

<Exercise title="2 · Get Return Type" level="medium">

实现 `MyReturnType<T>`，不用内置的 `ReturnType`。

```ts twoslash
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never

type A = MyReturnType<() => string>
//   ^?
```

<template #answer>

```ts twoslash
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never

type A = MyReturnType<() => string>
//   ^?
type B = MyReturnType<(x: number) => boolean>
//   ^?
```

**套路**：模式匹配做提取。

`infer R` 就是类型层的解构赋值。

</template>
</Exercise>

<Exercise title="3 · 实现 Omit" level="medium">

实现 `MyOmit<T, K>`，剔除指定的键。

```ts twoslash
type MyOmit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>

interface Todo {
  title: string
  description: string
  completed: boolean
}
type A = MyOmit<Todo, 'description' | 'completed'>
//   ^?
```

<template #answer>

```ts twoslash
type MyOmit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>

interface Todo {
  title: string
  description: string
  completed: boolean
}
type A = MyOmit<Todo, 'description' | 'completed'>
//   ^?
```

**套路**：组合——`Pick` + `Exclude`。

也可以直接用键重映射：

```ts twoslash
type OmitByRemap<T, K extends keyof any> = {
  [P in keyof T as P extends K ? never : P]: T[P]
}
```

后者更灵活（可以按值类型筛，不只是按键名）。

</template>
</Exercise>

<Exercise title="9 · Deep Readonly" level="medium">

递归地把所有属性（含嵌套）变成只读。

```ts twoslash
type DeepReadonly<T> = T extends (infer U)[]
  ? DeepReadonly<U>[]
  : T extends Function
    ? T
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T

type A = DeepReadonly<{ a: { b: string }; c: number[] }>
//   ^?
```

<template #answer>

```ts twoslash
type DeepReadonly<T> = T extends (infer U)[]
  ? DeepReadonly<U>[]
  : T extends Function
    ? T
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T

type A = DeepReadonly<{ a: { b: string }; c: number[] }>
//   ^?
```

**套路**：递归复用做循环。

**判断顺序很关键**：数组 → 函数 → 对象。因为数组和函数都是 `object` 的子类型，先判 `object` 会把它们吞掉（函数变 readonly 后还能调用，数组变 readonly 后丢方法）。

</template>
</Exercise>

<Exercise title="10 · Tuple to Union" level="medium">

把元组转成元素类型的联合。

```ts twoslash
type TupleToUnion<T extends unknown[]> = T[number]

type A = TupleToUnion<[string, number]>
//   ^?
```

<template #answer>

```ts twoslash
type TupleToUnion<T extends unknown[]> = T[number]

type A = TupleToUnion<[string, number]>
//   ^?
```

**套路**：索引访问。

`T[number]` 是元组/数组转联合的标准写法——因为元组的索引签名包含数字字面量。

</template>
</Exercise>

<Exercise title="119 · ReplaceAll" level="medium">

实现 `ReplaceAll<S, From, To>`，替换字符串里所有匹配。

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

<template #answer>

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

**套路**：递归复用做循环 + 模板字面量。

三个要点：

1. **`From extends ''` 的边界判断不可省略**——空串会让 `${infer L}${''}${infer R}` 永远匹配成功，直接爆栈
2. 每次递归输入 `R` 一定比 `S` 短
3. 字符串里不再含 `From` 时落到 false 分支，递归结束

</template>
</Exercise>

<Exercise title="实现 UnionToIntersection" level="medium">

把联合类型转成交叉类型。

```ts twoslash
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never

type A = UnionToIntersection<{ a: 1 } | { b: 2 }>
//   ^?
```

<template #answer>

```ts twoslash
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never

type A = UnionToIntersection<{ a: 1 } | { b: 2 }>
//   ^?
```

**套路**：联合分散 + **逆变**。

原理两步：

1. `U extends any ? (k: U) => void : never` 对联合分发，得到 `((k: A) => void) | ((k: B) => void)`
2. 用 `infer I` 匹配这个函数联合的**参数位置**——参数位置是逆变的，TS 在推断时会把联合折合成交叉

这是类型层利用变型的经典技巧。

</template>
</Exercise>

<Exercise title="实现 Getters（键重映射）" level="medium">

把对象的每个属性转成对应的 getter 方法。

```ts twoslash
type Getters<T> = {
  [K in keyof T as `get${Capitalize<K & string>}`]: () => T[K]
}

type A = Getters<{ name: string; age: number }>
//   ^?
```

<template #answer>

```ts twoslash
type Getters<T> = {
  [K in keyof T as `get${Capitalize<K & string>}`]: () => T[K]
}

type A = Getters<{ name: string; age: number }>
//   ^?
```

**套路**：重新构造做变换 + 模板字面量。

两个易错点：

1. `K & string`：`keyof T` 可能是 `string | number | symbol`，而 `Capitalize` 只接受 `string`
2. 值要写成 `() => T[K]`（函数类型），不是 `T[K]`

</template>
</Exercise>

<Exercise title="实现 TrimLeft" level="medium">

去掉字符串左侧的空白字符（空格、换行、制表符）。

```ts twoslash
type Space = ' ' | '\n' | '\t'
type TrimLeft<S extends string> = S extends `${Space}${infer R}`
  ? TrimLeft<R>
  : S

type A = TrimLeft<'  \n\t hello'>
//   ^?
```

<template #answer>

```ts twoslash
type Space = ' ' | '\n' | '\t'
type TrimLeft<S extends string> = S extends `${Space}${infer R}`
  ? TrimLeft<R>
  : S

type A = TrimLeft<'  \n\t hello'>
//   ^?
type B = TrimLeft<'hi  '>
//   ^?
```

**套路**：递归复用做循环 + 模板字面量。

`${Space}${infer R}` 里的 `Space` 是联合，会产生三个候选匹配。TS 会尝试直到匹配成功。

注意这个递归是**尾递归**（结果直接是 `TrimLeft<R>`），能被 TS 优化。

</template>
</Exercise>

## 刷完这些之后

去检验一下成果：打开 [type-fest](https://github.com/sindresorhus/type-fest) 的任意源码文件，看能不能读懂。能读懂就达到 [L2 目标](../type-programming/)了。
