# 写在前面

## 这份教程的定位

本文档适用于已经写了两三年 TypeScript，日常业务代码里的类型都能写，但看到三方库源码里那些 `infer`、递归条件类型、模板字面量类型时会发懵。这份教程就是为这个状态写的：

- **不重复官方文档**。TS Handbook 讲得很好的部分不展开，只给链接。
- **偏"为什么"而不是"怎么用"**。比如 `extends` 为什么既能做约束又能做判断，`satisfies` 到底解决了什么问题。
- **类型编程讲套路不讲题海**。把类型编程拆成六个可复用的模式，而不是罗列一百道题的答案。
- **关键概念可验证**。代码块接入了 [Twoslash](#twoslash-怎么用)，悬停能看到编译器真实的推导结果。

## TypeScript 到底是什么

一句话：**TypeScript = JavaScript + 一个只在编译期存在的类型系统 + 一个能把它编译回 JS 的编译器。**

它有三个彼此独立的身份，混在一起看会永远搞不清：

| 身份 | 做什么 | 在哪个阶段 |
| --- | --- | --- |
| 类型检查器 | 分析你的代码，找出类型错误 | 编译期（和 IDE 实时） |
| 转译器 | 把新语法降级成目标环境的 JS | 编译期 |
| 语言服务 | 给 IDE 提供补全、跳转、重命名 | 编辑时 |

关键结论：**类型在运行前会被完全擦除**。TS 不会给运行时加任何校验，也不会改变生成的 JS 语义（`enum` 和 `namespace` 是仅有的两个例外，它们会生成真实代码）。

```ts
// 你写的
interface User { name: string }
function greet(u: User): string {
  return `hi ${u.name}`
}

// tsc 输出（target: ES2020）
function greet(u) {
  return `hi ${u.name}`;
}
```

所以 `if (typeof x === 'string')` 这种检查在 TS 里**依然要你手写**。TS 只是让你在写的时候就被提醒。

## 三个世界

理解类型层的关键，是分清这三个层次：

```ts twoslash
// ① 值层：运行时真实存在的数据
const user = { name: 'ada', age: 36 }

// ② 类型层：编译期的形状描述
type User = typeof user
//   ^?

// ③ 类型构造函数（泛型）：把类型映射成类型的函数
type Nullable<T> = T | null
type MaybeUser = Nullable<User>
//   ^?
```

泛型就是类型层的**函数**：`<T>` 是参数，`=` 右边是返回值，`Nullable<User>` 是调用。理解这一点之后，[类型编程篇](../type-programming/)的所有内容都会顺很多。

## 阅读路线

如果你时间有限，按这个顺序读：

1. **[编译流程](./compile)** —— 先搞清 tsc / Babel / swc 谁负责什么，否则工程配置会一直靠猜
2. **[tsconfig 逐项精讲](./tsconfig)** —— 每个开关在做什么、默认值有什么坑
3. **[TypeScript 6 与 7](./typescript-7)** —— 编译器换成 Go 了：默认值改了什么、什么被删了、你的技术栈能不能升
4. **[收窄与判别联合](./narrowing)** —— 日常收益最高的单一技巧
5. **[条件类型与分发](../generics/conditional)** —— 类型编程的门槛
6. **[六大套路](../type-programming/six-patterns)** —— 类型编程的总纲
7. **[调试与类型测试](../type-programming/debugging)** —— 卡住时的救命工具

::: tip 版本说明
本站的类型系统内容以 **TypeScript 5.9** 为准（Twoslash 实时编译用的就是它）。**TS 6 / 7 没有改变类型系统本身**——语法和语义都还在，变的是编译器引擎、默认值、和被删掉的老选项。相关内容集中在 [TypeScript 6 与 7](./typescript-7)，并在 [tsconfig 篇](./tsconfig)里以 🆕 TS7 标记逐项标注。
:::

## Twoslash 怎么用

教程里带 **Twoslash** 标记的代码块是可以交互的：

- 鼠标**悬停**在带虚线下划线的标识符上，会弹出它的真实类型
- `//^?` 这一行会被替换成上一行表达式的推导结果
- 带红色波浪线的地方是**故意保留的错误**，用来演示什么写法会报错

```ts twoslash
type Todo = { title: string; done: boolean }
type Keys = keyof Todo
//   ^?

const arr = [1, 2, 3] as const
type Elem = typeof arr[number]
//   ^?
```

想自己改着玩时，每节末尾一般会给出一个可以直接打开的 Playground 链接。
