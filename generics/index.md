# 泛型基础

泛型是类型层的**函数**。理解这一点，后面所有内容都会顺。

## 泛型 = 类型的函数

```ts twoslash
type Wrap<T> = { value: T }

type A = Wrap<string>
//   ^?
type B = Wrap<number[]>
//   ^?
```

对照一下：

| 值层 | 类型层 |
| --- | --- |
| `function wrap(x) { return { value: x } }` | `type Wrap<T> = { value: T }` |
| `wrap('a')` | `Wrap<string>` |
| 参数是 `x` | 参数是 `T` |

## 约束：extends 的第一个含义

```ts twoslash
interface HasLength {
  length: number
}
function logLen<T extends HasLength>(x: T): number {
  return x.length
}

logLen('abc')
logLen([1, 2, 3])
```

`T extends HasLength` 是**约束**：`T` 必须满足 `HasLength`。

注意 `extends` 的三个含义别搞混：

```ts twoslash
// ① 约束（在泛型参数位置）
type F1<T extends string> = T

// ② 判断（在条件类型位置）
type F2<T> = T extends string ? true : false

// ③ 继承（在 interface 位置）
interface A {
  x: number
}
interface B extends A {
  y: number
}
```

### 约束的四种常见写法

```ts twoslash
interface HasId {
  id: string
}

// ① 约束成某个形状（"我只需要它有 id"）
type F1<T extends HasId> = T['id']

// ② 约束来自另一个参数（最有用，也最常见）
type F2<T, K extends keyof T> = T[K]

// ③ 约束成字面量联合（配合模板字面量做字符串变换）
type F3<T extends 'a' | 'b'> = `x_${T}`
type A3 = F3<'a'>
//   ^?

// ④ 多重约束
type F4<T extends object & { length: number }> = T
```

### 为什么约束不能省

去掉约束，TS 立刻不知道你在干什么：

```ts twoslash
// @errors: 2536
type Bad<T, K> = T[K]
```

`T[K]` 的前提是"K 一定是 T 的键"。没有 `K extends keyof T`，TS 无从验证，只能报错。
**约束的本质是给编译器一个承诺**：我保证 K 只会是 T 的键，你放心让我索引。

## 经典形态：类型安全的事件订阅器

`keyof` + 索引访问 + 泛型约束三者一起用，是 SDK / 事件系统里最常见的签名：

```ts twoslash
interface Events {
  click: { x: number; y: number }
  change: { value: string }
}

declare function on<K extends keyof Events>(
  event: K,
  handler: (payload: Events[K]) => void
): void

on('click', (p) => {
  p.x // ✅ 回调参数自动是 { x, y }
})
on('change', (p) => {
  p.value // ✅ 自动是 { value }
})
// on('clik', () => {})     // ❌ 事件名拼错
```

注意这里**没有写任何类型标注**：`p` 的类型是 `Events[K]`，而 `K` 由第一个实参推导出来。
用户写对了事件名，回调参数的类型就自动对——这是泛型"让类型之间产生关联"最直观的例子。

## 默认值

```ts twoslash
type EventMap<T extends Record<string, unknown> = Record<string, unknown>> = {
  [K in keyof T]: (payload: T[K]) => void
}
```

递归类型里，默认参数常被用作**累加器**（类型层没有可变变量，只能靠参数往下传）：

```ts twoslash
type BuildTuple<
  N extends number,
  Acc extends unknown[] = []
> = Acc['length'] extends N ? Acc : BuildTuple<N, [...Acc, unknown]>

type T3 = BuildTuple<3>
//   ^?
type T0 = BuildTuple<0>
//   ^?
```

## 泛型推导

大部分时候不用手动传参，编译器会从参数推出来：

```ts twoslash
declare function identity<T>(x: T): T
const a = identity('hello')
type T = typeof a
//   ^?

declare function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K>
const r = pick({ a: 1, b: 'x', c: true }, ['a', 'b'])
type R = typeof r
//   ^?
```

### 推导不出来时显式指定

```ts twoslash
declare function makePair<T>(): [T, T]
const p = makePair<string>()
type T = typeof p
//   ^?
```

### 部分指定（TS 没有这功能）

TS 不支持"只指定一部分类型参数"，要么全推要么全写。绕过的常见做法是用**柯里化**：

```ts twoslash
declare function create<T>(): <U>(input: U) => [T, U]
const f = create<string>()
const r = f(123)
type R = typeof r
//   ^?
```

## 泛型在函数 vs 类型别名 vs 接口

```ts twoslash
// 函数
function f<T>(x: T): T {
  return x
}

// 类型别名
type Alias<T> = { value: T }

// 接口
interface Iface<T> {
  value: T
}

// 类
class Box<T> {
  constructor(public value: T) {}
}
```

## 常见模式

### 关联两个参数

```ts twoslash
declare function getKey<T, K extends keyof T>(obj: T, key: K): T[K]

const obj = { a: 1, b: 'x' }
const v1 = getKey(obj, 'a')
type A = typeof v1
//   ^?
const v2 = getKey(obj, 'b')
type B = typeof v2
//   ^?
```

返回值类型跟着 key 变——这就是泛型真正的价值：**让类型之间产生关联**，而不是各自独立。

### 泛型约束实现接口

```ts twoslash
interface Repository<T> {
  find(id: string): Promise<T | undefined>
  save(entity: T): Promise<void>
}

// 实现一个具体的 Repository
class UserRepo implements Repository<{ id: string; name: string }> {
  async find(id: string) {
    return { id, name: 'x' }
  }
  async save(entity: { id: string; name: string }) {}
}
```

### 条件返回类型

```ts twoslash
type Unwrap<T> = T extends Promise<infer U> ? U : T

declare function maybeAwait<T>(x: T): Unwrap<T>

declare const p: Promise<number>
const a = maybeAwait(p)
type A = typeof a
//   ^?
declare const n: number
const b = maybeAwait(n)
type B = typeof b
//   ^?
```

## const 类型参数（TS 5.0）

```ts twoslash
declare function f1<T>(x: T[]): T[]
declare function f2<const T>(x: T[]): T[]

const a = f1(['x', 'y'])
type A = typeof a
//   ^?
const b = f2(['x', 'y'])
type B = typeof b
//   ^?
```

`const` 让泛型推导走"字面量模式"，调用方不用再写 `as const`。写 SDK 时非常有用。

## NoInfer（TS 5.4）

阻止某个类型参数参与推断，只用于校验：

```ts twoslash
declare function f1<T>(items: T[], init: T): T
declare function f2<T>(items: T[], init: NoInfer<T>): T

const a = f1(['x', 'y'], 'z')
type A = typeof a
//   ^?
const b = f2(['x', 'y'], 'z')
//   报错：'z' 不在 'x' | 'y' 里
```

典型场景：有默认值或初始值的 API，不希望初始值把类型推宽。

## 下一步

- [keyof / typeof / 索引访问](./keyof-indexed)
- [组合拳：六个概念一起工作](./in-action)
