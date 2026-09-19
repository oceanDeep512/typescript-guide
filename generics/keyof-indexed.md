# keyof / typeof / 索引访问

这三个是"从已有类型里取东西"的工具，也是类型编程里出现频率最高的语法。

一句话记住三者分工：

| 工具 | 作用 | 值层类比 |
| --- | --- | --- |
| `keyof T` | 取**键** → 键名联合 | `Object.keys(obj)` |
| `typeof v` | 取**值**的类型 | 把运行时的值搬进类型层 |
| `T[K]` | 按**键**取值类型 | `obj[key]` |

它们几乎从不单独出现：`keyof typeof config`、`T[keyof T]`、`T[K & string]` 才是你在库源码里真正会看到的形态。

## keyof：取键

```ts twoslash
interface Todo {
  title: string
  done: boolean
  priority: number
}

type K = keyof Todo
//   ^?

// 上面显示成 `keyof Todo` 是 TS 的显示习惯——它保留了你写的原始形式。
// 让类型真正参与一次运算，才能看到它展开后的字面量联合：
type Keys = Exclude<K, never>
//   ^?
```

`keyof` 返回的是**键名的字面量联合**（见上面第二个 `^?`：`"title" | "done" | "priority"`）。

::: tip `^?` 显示的是原始写法？让它参与一次运算
`keyof X`、`Step1<X>` 这类结果，TS 的 quickinfo 会**原样保留你写的表达式**，不会主动展开。
想看真实结果，就让它再过一次类型运算——最常用的写法是 `Exclude<T, never>`（等价于把联合"摊平"一次）。
:::

几个特殊结果：

```ts twoslash
type A = keyof any
//   ^?
type B = keyof unknown
//   ^?
interface Dict {
  [k: string]: number
}
type C = keyof Dict
//   ^?
type D = keyof string[]
//   ^?
```

`keyof Dict` 是 `string | number` 而不是 `string`，因为 JS 里 `obj[0]` 等价于 `obj['0']`。

`keyof string[]` 同理：它是 `number`（下标）加上**所有数组方法名**（`"length" | "push" | "map" | ...`），因为太长，TS 这里只保留 `keyof string[]` 的写法。

### keyof 与映射类型配合

这是最常见用法：

```ts twoslash
type Getters<T> = {
  [K in keyof T]: () => T[K]
}

interface Todo {
  title: string
  done: boolean
}
type G = Getters<Todo>
//   ^?
```

## typeof：值 → 类型

`typeof` 是**值层通往类型层的唯一入口**。

```ts twoslash
const config = {
  host: 'localhost',
  port: 3000,
  nested: { debug: true },
}

type Config = typeof config
//   ^?
```

注意对象属性默认会**拓宽**（`'localhost'` 变 `string`），要保住字面量加 `as const`：

```ts twoslash
const config = {
  host: 'localhost',
  port: 3000,
} as const

type Config = typeof config
//   ^?
```

### typeof 的三种位置

```ts twoslash
const config = { host: 'localhost', port: 3000 } as const

// ① 值的位置：运行时操作符（JS 原本就有）
const a = typeof 1

// ② 类型的位置：取值的类型
const obj = { x: 1 }
type T = typeof obj

// ③ 在 type 查询里嵌套使用
type Host = typeof config['host']
//   ^?
```

## 索引访问类型 T[K]

类型层的"查表"。

```ts twoslash
interface Todo {
  title: string
  done: boolean
}

type A = Todo['title']
//   ^?
type B = Todo['title' | 'done']
//   ^?
type C = Todo[keyof Todo]
//   ^?
```

**K 是联合时，结果是值的联合**——这是它最重要的特性。

### 数组与元组

```ts twoslash
type A = string[][number]
//   ^?
type B = [string, number, boolean][number]
//   ^?
type C = [string, number]['length']
//   ^?
type D = string[]['length']
//   ^?
```

元组能用 `[number]` 转成联合、能用 `['length']` 拿到具体长度；数组不行（长度是 `number`）。这个差异是"用元组做计数"的基础。

### 索引访问会保留可选性

```ts twoslash
interface Opt {
  a?: string
  b: number
}
type A = Opt['a']
//   ^?
```

配合 `noUncheckedIndexedAccess` 时，索引签名访问也会带 `undefined`。

### 深层取值与批量取值

```ts twoslash
interface Nested {
  user: { name: string; age: number }
  meta: { tags: string[] }
}

// ① 深层：一层一层往下点
type Name = Nested['user']['name']
//   ^?

// ② 批量：K 是联合 → 结果是值的联合
type Values = Nested[keyof Nested]
//   ^?

// 社区给它起了个名字：ValueOf
type ValueOf<T> = T[keyof T]
type V = ValueOf<{ a: 1; b: 'x' }>
//   ^?

// ③ 取值后去掉可选 / null
type Opt = { a?: string; b: number | null }
type A = NonNullable<Opt['a']>
//   ^?
```

`ValueOf` 在库源码里出现频率极高——**"我不关心键是什么，我只要这个对象所有值的类型"**时就用它，比如表单字段值的联合、枚举所有 payload 类型。

## 三者组合的实战

### 从常量对象生成联合类型

```ts twoslash
const ROUTES = {
  home: '/',
  about: '/about',
  user: '/user/:id',
} as const

type RouteKey = keyof typeof ROUTES
//   ^?
type RoutePath = (typeof ROUTES)[RouteKey]
//   ^?
```

这是"配置即类型"的标准写法：**改常量，类型自动跟着变**，不用维护两份。

### 从数组常量生成联合

```ts twoslash
const STATUSES = ['idle', 'loading', 'done'] as const
type Status = (typeof STATUSES)[number]
//   ^?
```

### SDK 事件表：三件套的标准用法

这是 `keyof` + 索引访问 + 泛型约束**同时在场**的最典型场景，几乎所有带事件/回调的 SDK 都这么写：

```ts twoslash
// 一份"事件名 → 载荷"的表（SDK 里通常是导出的 interface）
interface Events {
  'user.created': { id: string; name: string }
  'user.deleted': { id: string }
  'order.paid': { orderId: string; amount: number }
}

// ① keyof：事件名联合，自动跟着表走，加一个事件就多一个成员
type EventName = keyof Events
//   ^?

// ② 索引访问：取某个事件的载荷
type Created = Events['user.created']
//   ^?

// ③ 所有载荷的联合 —— 写 reducer / 消息总线时的入参类型
type AnyPayload = Events[keyof Events]
//   ^?

// ④ 泛型约束：让 name 和 payload 对得上（错配会直接报错）
declare function emit<K extends EventName>(name: K, payload: Events[K]): void

emit('user.created', { id: '1', name: 'x' })
emit('user.deleted', { id: '1' })
// emit('user.deleted', { id: '1', name: 'x' }) // ❌ 多余字段
```

`emit` 的签名就是"类型安全的事件系统"的全部秘密：**第一个参数约束第二个参数的类型**。
事件名写错、载荷字段多/少/错，都在编译期拦住。

### 类型安全的 get

```ts twoslash
declare function get<T, K extends keyof T>(obj: T, key: K): T[K]

const todo = { title: 'x', done: false }
const a = get(todo, 'title')
type A = typeof a
//   ^?
const b = get(todo, 'done')
type B = typeof b
//   ^?
```

返回值类型跟着 key 变，这正是 `K extends keyof T` + `T[K]` 组合的威力。

### 提取嵌套路径

```ts twoslash
type PathsOf<T> = {
  [K in keyof T & string]: T[K] extends Record<string, unknown>
    ? `${K}.${keyof T[K] & string}`
    : K
}[keyof T & string]

type Todo = {
  title: string
  meta: { author: string; tags: string }
}
type P = PathsOf<Todo>
//   ^?
```

这个例子把映射类型、模板字面量、索引访问三者组合了起来。做成任意深度需要递归，见[递归与元组计数](../type-programming/recursion)。

## 容易踩的坑

### 1. `keyof` 结果要过滤 symbol / number

```ts twoslash
type StrKeys<T> = Extract<keyof T, string>
interface M {
  a: string
  [Symbol.iterator]: () => void
}
type K = StrKeys<M>
//   ^?
```

### 2. 模板字面量里要 `& string`

```ts twoslash
type Getter<T> = {
  [K in keyof T as `get${Capitalize<K & string>}`]: () => T[K]
}
```

`keyof T` 可能是 `string | number | symbol`，而 `Capitalize` 只接受 `string`，所以要 `& string` 收敛。

### 3. `typeof` 不能用于类型

```ts
type A = { x: 1 }
// type B = typeof A  // 报错：A 是类型不是值
```

反过来，**值也不能直接当类型用**，必须 `typeof`。

## 下一步

- [映射类型](./mapped)
- [组合拳：六个概念一起工作](./in-action)
