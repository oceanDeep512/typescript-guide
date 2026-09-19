# 类型层心智模型

这是整份教程最重要的一节。你之前刷 type-challenges 觉得"晕"，根源就在这里。

## 一个认知转变

**类型层是一门独立的、纯函数式的编程语言。它只是恰好长着 TypeScript 的脸。**

你写 JS 时积累的所有直觉——变量、循环、if/else、console.log——在这里全部失效。所以你不是"学不会 TypeScript"，你是在用一门没学过的语言写程序。

## 对照表

| 你熟悉的 JS | 类型层的等价物 |
| --- | --- |
| `const a = 1` | `type A = 1` |
| `if (a === b) {} else {}` | `A extends B ? X : Y` |
| `for (const x of xs) {}` | 递归调用自身 |
| `(x) => x + 1` | `type F<T> = ...` |
| `const { a } = obj` | `T extends { a: infer A } ? A : never` |
| `xs.map(x => f(x))` | `{ [K in keyof T]: F<T[K]> }` |
| `console.log(x)` | `type Expand<T> = { [K in keyof T]: T[K] }` |
| `let x = 1; x = 2` | 不存在，只能构造新类型 |

## 三条铁律

### 1. 没有赋值，只有定义

```ts twoslash
type A = string
type B = A // 这是"引用"，不是"复制后再修改"
```

你不能 `A = number`，因为 `type` 声明是不可变的。

### 2. 不能修改，只能构造

```ts twoslash
interface Todo {
  title: string
  done: boolean
}

// 想"去掉 done"？做不到，只能基于它造一个新的
type WithoutDone = Omit<Todo, 'done'>
//   ^?
```

所有类型工具都是"输入 → 输出"的纯函数。

### 3. 没有循环，只有递归

```ts twoslash
type BuildTuple<
  N extends number,
  Acc extends unknown[] = []
> = Acc['length'] extends N ? Acc : BuildTuple<N, [...Acc, unknown]>

type T = BuildTuple<3>
//   ^?
```

想"重复做 N 次"，只能让类型自己调用自己，用默认参数当累加器往下传状态。

## 泛型就是函数

```ts twoslash
// 声明一个"类型函数"
type Wrap<T> = { value: T }

// 调用它
type A = Wrap<string>
//   ^?

// 多个参数
type Pair<A, B> = [A, B]
type B = Pair<string, number>
//   ^?

// 参数带约束（相当于参数类型检查）
type Str<T extends string> = `id_${T}`
type C = Str<'abc'>
//   ^?
```

把 `<T>` 读成 `(T)`，把 `=` 右边读成函数体，很多东西立刻就懂了。

## 求值顺序

类型层是**惰性**的：只有当你真正"用"它时才会展开。

```ts twoslash
type Deep<T> = { [K in keyof T]: Deep<T[K]> }
```

这个类型声明本身不会递归展开——只有当你写成 `Deep<SomeType>` 并且 TS 需要知道它的具体形状时才展开。这也是为什么有些"看起来会无限递归"的类型在实际使用中没问题。

## 调试方式完全不同

类型层**没有 console.log**。你的调试器只有：

1. **hover**：鼠标悬停看推导结果
2. **`//^?` 查询**：在文档里直接把结果写出来（本教程大量使用）
3. **`Expand` / `Prettify`**：把类型拍平看清楚
4. **分步赋值**：拆成 `Step1` / `Step2` 逐个看

详见[调试与类型测试](./debugging)。

## 什么时候该写类型体操

在往下读之前，先给你一个判断标准——**大多数时候你不该写**。

**该写**：

- 你在写内部 SDK / 组件库 / API client，消费者是别的团队
- 需要强制编译期不变量（互斥属性、branded ID、穷尽性检查）
- 需要从已有类型派生（路由参数、事件名、i18n key）
- 业务数据结构你已经完全确定，只是想让它"自动"

**不该写**：

- 业务代码里为了炫技
- 数据模型本身还没想清楚（先把模型拍平，比写 20 行类型管用）
- 团队里没人看得懂（维护成本大于收益）

## 下一步

- [六大套路](./six-patterns) —— 类型编程的总纲
