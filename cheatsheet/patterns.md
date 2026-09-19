# 六大套路

类型编程 90% 的题目都是这六个模式的组合。

## ① 模式匹配做提取

从结构里抠出想要的片段。识别特征：题目说"拿/取/得到"。

```ts twoslash
type GetReturn<T> = T extends (...a: any[]) => infer R ? R : never
type Last<T extends unknown[]> = T extends [...unknown[], infer L] ? L : never
type Before<S extends string> = S extends `${infer P}_${string}` ? P : S

type A = GetReturn<() => number>
//   ^?
type B = Last<[1, 2, 3]>
//   ^?
type C = Before<'user_id'>
//   ^?
```

## ② 重新构造做变换

遍历并重新拼装。识别特征："把 X 变成 Y"、"加前缀"、"只要某些属性"。

```ts twoslash
type Getters<T> = {
  [K in keyof T as `get${Capitalize<K & string>}`]: () => T[K]
}
type Nullable<T> = { [K in keyof T]: T[K] | null }
type OnlyFn<T> = {
  [K in keyof T as T[K] extends (...a: any) => any ? K : never]: T[K]
}

type A = Getters<{ name: string }>
//   ^?
```

## ③ 递归复用做循环

类型层没有 for。识别特征："任意深度"、"重复 N 次"。

```ts twoslash
type BuildTuple<N extends number, Acc extends unknown[] = []> =
  Acc['length'] extends N ? Acc : BuildTuple<N, [...Acc, unknown]>

type A = BuildTuple<4>
//   ^?
```

三要素：**终止条件 + 自我调用 + 累加器（默认参数）**。

## ④ 数组长度做计数

类型层没有算术。识别特征："加减"、"比较大小"。

```ts twoslash
type Tuple<N extends number, Acc extends unknown[] = []> =
  Acc['length'] extends N ? Acc : Tuple<N, [...Acc, unknown]>

type Add<A extends number, B extends number> = [...Tuple<A>, ...Tuple<B>]['length']
type Sub<A extends number, B extends number> =
  Tuple<A> extends [...Tuple<B>, ...infer R] ? R['length'] : never
type Gt<A extends number, B extends number> =
  Tuple<A> extends [...Tuple<B>, ...unknown[]] ? true : false

type A = Add<2, 3>
//   ^?
type B = Gt<5, 3>
//   ^?
```

只有**元组**能数长度，`string[]` 的 length 是 `number`。

## ⑤ 联合分散可简化

识别特征：输入是联合，要"过滤"或"分别处理"。

```ts twoslash
type Filter<T, U> = T extends U ? T : never
type ToPromise<T> = T extends any ? Promise<T> : never
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never

type A = Filter<'a' | 1 | 2, number>
//   ^?
type B = ToPromise<string | number>
//   ^?
```

两个关键事实：

- **裸类型参数才分发**，`[T] extends [U]` 阻止分发
- **`never` 在联合里自动消失**，所以"不满足 → never"就是过滤

## ⑥ 特殊特性要记清

```ts twoslash
type F<T> = T extends string ? 1 : 2
type A = F<any>
//   ^?
type B = F<never>
//   ^?
type C = 'a' | never
//   ^?
type D = keyof any
//   ^?
```

完整版见[边界行为](./edge)。

## 做题流程

1. **翻译题意**：输入输出各是什么类型
2. **判断套路**：提取 / 变换 / 循环 / 计数 / 分发
3. **处理边界**：空元组、空串、`never`、`any`
4. **写终止条件**（递归题）
5. **分步验证**：拆成中间类型逐个 `//^?`

## 以 Pick 为例

```ts twoslash
interface Todo {
  title: string
  done: boolean
}
type MyPick<T, K extends keyof T> = { [P in K]: T[P] }
type R = MyPick<Todo, 'title'>
//   ^?
```

一行里包含：**函数（泛型）+ 循环（映射类型）+ 查表（索引访问）+ 入参校验（约束）**。第一次看会晕，是因为四个概念被压成了一行。

## 下一步

- [边界行为](./edge)
