# 刷题指南

配合本教程的[六大套路](../type-programming/six-patterns)一起刷。

## 先说方法

### 1. 别死磕

**每题限时 15 分钟，做不出来直接看答案**，看懂后关掉默写一遍。

这类题的卡点通常不是逻辑难，而是你不知道某个语法特性存在（比如条件类型的分配律、元组展开、`infer extends`）。那是知识缺口，硬想想不出来。

### 2. 前 15 题的目标是"见过的套路够多"，不是"自己想出来"

跟刷算法题前期完全一样。前 10 题晕是标准流程，大概到第 15 题左右会突然通。

### 3. 每天 2-3 题

比周末刷 20 题有效得多——类型直觉需要睡觉来固化。

### 4. 先学后刷

如果你还没读过[类型层心智模型](../type-programming/)，先去读。题库是学完之后的检验，不是学习材料。

## 资源

| 资源 | 特点 |
| --- | --- |
| [type-challenges](https://github.com/type-challenges/type-challenges) | 题目量最大，事实标准，有中文 README |
| [TypeHero](https://typehero.dev) | 浏览器里直接做，能看别人的解法，有 Learning Tracks |
| [TypeScript Exercises](https://typescript-exercises.github.io/) | 15 题连贯故事，偏业务建模 |

## 停止标准

两个可验证的指标，达成就可以停：

1. **刷完 easy + medium**（约 117 题），到达 L2 上沿
2. 随手打开 [type-fest](https://github.com/sindresorhus/type-fest) 的任意工具类型源码，能不看解释说出它在干嘛

hard 挑 10-20 道做，extreme 直接跳过。目标不是通关，是**读三方库源码不卡壳**。

## 题目列表

- [热身与 Easy](./easy) —— 建立手感
- [Medium 精选](./medium) —— 主战场

## 怎么对答案

本页的每道题都有折叠答案。点标题展开。

<div style="margin-top:24px">
<Exercise title="试试看：实现 MyPick" level="easy">

从类型 `T` 中选出属性 `K`，构造成一个新的类型。不能使用内置的 `Pick`。

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

**用到的套路**：重新构造做变换（映射类型）+ 约束（`K extends keyof T`）+ 索引访问。

**思维过程**：

1. K 必须是 T 的键 → `K extends keyof T`（这是 `extends` 的"约束"含义）
2. 要遍历 K 生成键 → 类型层没有 for，用映射类型 `[P in K]`
3. 每个键的值保持原样 → `T[P]`

</template>
</Exercise>
</div>
