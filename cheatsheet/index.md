# 速查表总览

按主题分的七页速查。用 `⌘K` / `Ctrl+K` 可以直接搜索全部内容。

## 分页导航

| 页面 | 内容 |
| --- | --- |
| [关键字与语法](./keywords) | `keyof` / `typeof` / `infer` / `in` / `as` / `satisfies` / 修饰符 / 模板字面量 |
| [内置工具类型](./utility) | 按用途分组，含实现源码与一句话说明 |
| [六大套路](./patterns) | 类型编程的六个可复用模式 |
| [边界行为](./edge) | `any` / `unknown` / `never` / 分发 / 元组 vs 数组 |
| [异步与迭代器](./async) | 两个三参数族的完整签名与取元素类型 |
| [变型与调试](./variance-debug) | 协变逆变、`Expand`、`Equal`、tsc 开关 |

## 最常用的一张表

如果你只记一页，记这个：

<TypeCard name="JS → 类型层 对照" badge="心智模型">

```ts
const a = 1                    →  type A = 1
if (a === b) {} else {}        →  A extends B ? X : Y
for (const x of xs) {}         →  递归调用自身
(x) => x + 1                   →  type F<T> = ...
const { a } = obj              →  T extends { a: infer A } ? A : never
xs.map(x => f(x))              →  { [K in keyof T]: F<T[K]> }
console.log(x)                 →  type Expand<T> = { [K in keyof T]: T[K] }
let x = 1; x = 2               →  不存在，只能构造新类型
```

</TypeCard>

<TypeCard name="语法小抄" badge="高频">

| 想干什么 | 写法 |
| --- | --- |
| 取键 | `keyof T` |
| 查键的类型 | `T[K]`（K 是联合时得值的联合） |
| 限制参数范围 | `K extends keyof T` |
| 遍历键造对象 | `{ [P in K]: ... }` |
| 遍历时换键名 | `{ [P in K as NewKey]: ... }`（`as` 键重映射） |
| 过滤键 | 把不想要的映射成 `never` |
| 做判断 | `A extends B ? X : Y` |
| 阻止分发 | `[T] extends [U]` |
| 判断 never | `[T] extends [never]` |
| 判断 any | `0 extends 1 & T` |
| 拆出一部分 | `T extends [infer F, ...infer R] ? F : never` |
| 元组长度 | `T['length']` |
| 元组转联合 | `T[number]` |
| 看不清的类型 | `type Prettify<T> = { [K in keyof T]: T[K] } & {}` |

</TypeCard>

<TypeCard name="extends 的三种含义" badge="第一大坑">

```ts
// ① 约束：K 只能是 T 的键
type MyPick<T, K extends keyof T> = { [P in K]: T[P] }

// ② 判断：A 能不能赋值给 B
type IsStr<T> = T extends string ? true : false

// ③ 继承
interface A extends B { x: number }
```

</TypeCard>

<TypeCard name="边界行为四条" badge="必记">

```ts
type F<T> = T extends string ? 1 : 2

F<any>      // 1 | 2   两个分支都要
F<never>    // never   分发到空集
'a' | never // 'a'     never 被联合吸收
keyof any   // string | number | symbol
```

</TypeCard>

## 下一步

- [关键字与语法](./keywords)
