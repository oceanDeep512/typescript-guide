# 六大套路

类型编程 90% 的题目都是这六个模式的组合。遇到题先判断属于哪一类，再去套语法。

## ① 模式匹配做提取

**干什么**：从一个结构里"抠出"想要的片段。
**核心语法**：`T extends 模式 ? 拿 infer 的部分 : 兜底`

```ts twoslash
// 提取函数返回值
type GetReturn<T> = T extends (...a: any[]) => infer R ? R : never

// 提取元组首尾
type Last<T extends unknown[]> = T extends [...unknown[], infer L] ? L : never

// 提取字符串前缀
type Before<S extends string> = S extends `${infer P}_${string}` ? P : S

type A = GetReturn<() => number>
//   ^?
type B = Last<[1, 2, 3]>
//   ^?
type C = Before<'user_id'>
//   ^?
```

识别特征：题目要求"拿/取/得到"某个内部类型 → 就是 `infer`。

## ② 重新构造做变换

**干什么**：遍历并重新拼装。
**核心语法**：`{ [K in keyof T as 新键名]: 新值 }`

```ts twoslash
// 改造键名
type Getters<T> = {
  [K in keyof T as `get${Capitalize<K & string>}`]: () => T[K]
}

// 改造值
type Nullable<T> = { [K in keyof T]: T[K] | null }

// 过滤键（映射成 never 即丢弃）
type OnlyFn<T> = {
  [K in keyof T as T[K] extends (...a: any) => any ? K : never]: T[K]
}

type A = Getters<{ name: string; age: number }>
//   ^?
```

识别特征：题目要求"把 X 变成 Y"、"加前缀"、"只要某些属性" → 映射类型。

## ③ 递归复用做循环

**干什么**：重复执行直到满足条件。
**核心语法**：类型自己调用自己 + 默认参数当累加器

```ts twoslash
type BuildTuple<
  N extends number,
  Acc extends unknown[] = []
> = Acc['length'] extends N ? Acc : BuildTuple<N, [...Acc, unknown]>

type DeepReadonly<T> = T extends (infer U)[]
  ? DeepReadonly<U>[]
  : T extends Function
    ? T
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T

type A = BuildTuple<4>
//   ^?
type B = DeepReadonly<{ a: { b: string } }>
//   ^?
```

三条写作规则：

1. **必须有终止条件**（第一个 `extends` 判断）
2. **每步必须让输入变小**，否则无限递归
3. **累加器用默认参数传**

识别特征：题目涉及"任意深度"、"重复 N 次" → 递归。

## ④ 数组长度做计数

**干什么**：做算术。
**核心语法**：元组的 `['length']`

类型层没有数字运算，只能靠元组长度"数"出来。

```ts twoslash
type Tuple<N extends number, Acc extends unknown[] = []> =
  Acc['length'] extends N ? Acc : Tuple<N, [...Acc, unknown]>

type Add<A extends number, B extends number> =
  [...Tuple<A>, ...Tuple<B>]['length']

type Sub<A extends number, B extends number> =
  Tuple<A> extends [...Tuple<B>, ...infer R] ? R['length'] : never

type A = Add<2, 3>
//   ^?
type B = Sub<5, 2>
//   ^?
```

只有**元组**能数长度，`string[]` 的 `length` 是 `number`。

识别特征：题目要"加减"、"比较大小"、"重复 N 次" → 元组计数。

## ⑤ 联合分散可简化

**干什么**：对联合的每个成员分别处理。
**核心语法**：裸类型参数 + 条件类型 + `never` 消失

```ts twoslash
// 过滤成员
type Filter<T, U> = T extends U ? T : never
type A = Filter<'a' | 1 | 2, number>
//   ^?

// 分别变换
type ToPromise<T> = T extends any ? Promise<T> : never
type B = ToPromise<string | number>
//   ^?

// 联合转交叉（利用逆变）
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never
type C = UnionToIntersection<{ a: 1 } | { b: 2 }>
//   ^?
```

记住两个关键事实：

- **裸类型参数才分发**，`[T] extends [U]` 阻止分发
- **`never` 在联合里自动消失**，所以"不满足 → never"就是过滤

识别特征：题目输入是联合，要求"过滤/分别处理" → 分发。

## ⑥ 特殊特性要记清

**干什么**：避开反直觉的边界行为。

```ts twoslash
type F<T> = T extends string ? 1 : 2

// any 会同时走两个分支
type A = F<any>
//   ^?

// never 分发后是 never
type B = F<never>
//   ^?

// never 被联合吸收
type C = 'a' | never
//   ^?

// keyof any 是三个键类型的联合
type D = keyof any
//   ^?
```

完整版见[any / unknown / never](./edge-cases)。

## 做题流程

拿到一道题按这个顺序走：

1. **翻译题意**：输入是什么类型？输出是什么类型？
2. **判断套路**：提取 / 变换 / 循环 / 计数 / 分发？
3. **处理边界**：空元组、空字符串、`never`、`any` 分别会怎样？
4. **写终止条件**（如果递归）
5. **分步验证**：拆成中间类型逐个 `//^?`

## 以 Pick 为例完整走一遍

```ts twoslash
interface Todo {
  title: string
  done: boolean
}

// ① 输入是对象 T 和键名联合 K，输出是新对象 → 属于"重新构造"
// ② K 必须属于 T 的键 → 加约束
// ③ 遍历 K 生成键 → 映射类型
// ④ 值保持原样 → 索引访问
type MyPick<T, K extends keyof T> = { [P in K]: T[P] }

type R = MyPick<Todo, 'title'>
//   ^?
```

就一行，但它同时是**一个函数（泛型）+ 一次循环（映射类型）+ 一次查表（索引访问）+ 一条入参校验（约束）**。第一次看会晕，是因为它把四个概念压在了一行里。

## 下一步

- [调试与类型测试](./debugging) —— 刚学完套路，先学会自己排错，再往下走
- [递归与元组计数](./recursion)
