# 组合拳：六个概念怎么一起工作

前面六篇是逐个讲语法，这一篇讲它们**怎么组合**——因为你在真实库源码里看到的从来不是单个语法，而是它们叠在一起。这篇也是"读别人的类型"的速查手册。

## 一、看到这个形态，就该认出它

| 你在源码里看到 | 它是什么 | 作用 |
| --- | --- | --- |
| `keyof T` | keyof | 取键，得到字面量联合 |
| `typeof someValue` | typeof | 把运行时的值搬进类型层 |
| `T[K]` / `T[keyof T]` | 索引访问 | 按键取值类型（后者是"所有值的联合"） |
| `<T, K extends keyof T>` | 泛型 + 约束 | 让两个参数产生关联 |
| `{ [K in keyof T]: X }` | 映射类型 | 类型层唯一的"循环" |
| `T extends U ? A : B` | 条件类型 | 类型层的 if；裸参数会**分发** |
| `T extends (...a: infer P) => infer R` | infer | 模式匹配，把匹配到的部分存进变量 |
| `` `on${Capitalize<K>}` `` / `` `${string}.delta` `` | 模板字面量 | 字符串拼接与模式匹配 |
| `Partial` `Pick` `Omit` `Record` `Extract` `Exclude` `ReturnType` `Awaited` | 内置工具类型 | 前面几样的固定组合 |

## 二、内置工具类型的"配方"

把它们看成配方而不是背诵清单，就不会再混淆：

| 工具 | 配方 | 关键语法 |
| --- | --- | --- |
| `Partial` / `Required` / `Readonly` | 纯映射 | `[K in keyof T]?` / `-?` / `readonly` |
| `Pick<T, K>` | 映射 + 约束 | `[P in K]: T[P]`，`K extends keyof T` |
| `Omit<T, K>` | `Pick` + `Exclude` | `Pick<T, Exclude<keyof T, K>>` |
| `Record<K, V>` | 映射（键来自联合） | `[P in K]: V`，`K extends keyof any` |
| `Exclude` / `Extract` / `NonNullable` | 条件 + **分发** | `T extends U ? never : T` |
| `ReturnType` / `Parameters` | 条件 + **infer** | `T extends (...a: infer P) => infer R` |
| `Awaited` | 条件 + infer + **递归** | `T extends Promise<infer U> ? Awaited<U> : T` |

换句话说，整章只有三块积木：**映射（遍历）、条件（判断 + 分发）、infer（提取）**，`keyof` / 模板字面量负责给它们喂"键"和"字符串"。

## 三、一个完整例子：给流式 SDK 写类型

假设 SDK 返回一个异步可迭代对象，产出若干事件。我们从头把类型搭出来——六块积木会全部出场。

### 1. 先定义事件表

```ts twoslash
// 事件名 → 载荷。这是唯一的真相来源
interface StreamEvents {
  created: { id: string }
  delta: { text: string }
  done: { text: string; tokens: number }
}
```

### 2. 事件名与载荷：`keyof` + 索引访问

```ts twoslash
interface StreamEvents {
  created: { id: string }
  delta: { text: string }
  done: { text: string; tokens: number }
}
type EventName = keyof StreamEvents
//   ^?
type AnyPayload = StreamEvents[keyof StreamEvents]
//   ^?
```

### 3. 订阅签名：泛型约束把两个参数绑起来

```ts twoslash
interface StreamEvents {
  created: { id: string }
  delta: { text: string }
  done: { text: string; tokens: number }
}
declare function on<K extends keyof StreamEvents>(
  event: K,
  handler: (payload: StreamEvents[K]) => void
): void

on('delta', (p) => p.text) // p 自动是 { text: string }
```

### 4. 派生 handler 表：映射 + 模板字面量

```ts twoslash
interface StreamEvents {
  created: { id: string }
  delta: { text: string }
  done: { text: string; tokens: number }
}
type Handlers = {
  [K in keyof StreamEvents as `on${Capitalize<K & string>}`]: (
    payload: StreamEvents[K]
  ) => void
}
type H = Handlers
//   ^?
```

一次映射就把事件表变成"可选的回调集合"——React 组件 props、配置对象都常用这个形态。

### 5. 只挑出某类事件：模板字面量 + Extract

事件名带命名空间时（`'response.output_text.delta'`），用模式匹配筛：

```ts twoslash
interface StreamEvents {
  'response.created': { id: string }
  'response.output_text.delta': { delta: string }
  'response.completed': { text: string }
}

// 先把事件表拍成 { type, payload } 的联合（映射 + 索引访问）
type Event =
  { [K in keyof StreamEvents]: { type: K; payload: StreamEvents[K] } }[keyof StreamEvents]
type E = Event
//   ^?

// 再按模式筛出 delta 家族
type DeltaEvents = Extract<Event, { type: `${string}.delta` }>
//   ^?
```

`{ ... }[keyof T]` 这个尾巴是常用技巧：**把"映射出来的对象"转成"联合"**——
每个键对应一个成员，最后用 `keyof T` 全部取出来。

### 6. 从 SDK 的函数反推产出类型：infer + Awaited

```ts twoslash
declare function createStream(): AsyncIterable<
  { type: 'delta'; text: string } | { type: 'done'; text: string }
>

// ① 先拿到返回值类型
type Stream = ReturnType<typeof createStream>
//   ^?

// ② 再从 AsyncIterable 里把元素"抠"出来
type Chunk = Stream extends AsyncIterable<infer I> ? I : never
//   ^?

// ③ 只要 delta 块
type TextChunk = Extract<Chunk, { type: 'delta' }>
//   ^?
```

这个"**从函数签名反向提取**"的技巧在读第三方 SDK 时极其实用：
你没有源码也能把内部类型挖出来，而且**SDK 升级后类型自动跟着变**。

## 四、读别人类型的三条经验

1. **从外向内拆**。看到 `type X<T> = A extends B ? C : D`，先当作一个 `if`，再分别看 `A`、`B`、`C`、`D` 各自又是什么。
2. **先找 `infer` 和 `?`**。它们是"提取点"和"分叉点"，其余部分基本都是为了给它们准备输入。
3. **看不清就展开**。套一层 `Prettify`（`{ [K in keyof T]: T[K] } & {}`）把交叉和别名拍平，或者在 IDE 里一步步 hover 中间结果——详见[调试与类型测试](../type-programming/debugging)。

## 五、什么时候不该用

类型体操的成本是**编译时间**和**同事的理解成本**。以下情况建议收手：

- 能用 `interface` 手写清楚的，不要为了"优雅"硬推
- 需要超过两层递归才能表达的约束，通常说明数据结构设计有问题
- 团队里没人看得懂的条件类型，改成运行时校验 + 简单类型往往更划算（外部数据另说，见 [Schema 与运行时校验](../engineering/schema)）

## 下一步

- [速查表：内置工具类型](../cheatsheet/utility) —— 忘记签名时来查
- [六大套路](../type-programming/six-patterns) —— 这些组合的更高层模式
