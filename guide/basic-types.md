# 基础类型

这一节不重复 Handbook，只讲**容易搞错的部分**。

## 类型标注与推导

TS 会尽量自己推导类型，你只在它推不出来的时候标注。

```ts twoslash
let a = 1 // 推导出 number，不需要写 let a: number = 1
//  ^?
const b = 1 // 推导出字面量 1
//    ^?

let c: number // 只有声明没赋值时才必须标注
let d: string[] = [] // 空数组必须标注，否则是 any[]
```

原则是：**导数优先，标注兜底**。过度标注会让类型变成"你声称是这样"而不是"它实际是这样"。

## 原始类型

```ts twoslash
const s: string = 'x'
const n: number = 1
const b: boolean = true
const big: bigint = 1n
const sym: symbol = Symbol('s')
const nul: null = null
const und: undefined = undefined
```

注意 `String` / `Number` / `Boolean`（大写）是**包装对象类型**，不是原始类型。永远用小写。

`void` 表示函数没有返回值；`never` 表示"永远不会走到这里"。

```ts twoslash
function log(): void { console.log('x') }

function fail(msg: string): never {
  throw new Error(msg)
}

function infinite(): never {
  while (true) {}
}
```

`never` 的两个典型用途：

1. 函数永远不正常返回（抛异常、死循环）
2. 类型编程里的"空集"，配合条件类型做过滤（见[类型编程](../type-programming/)）

## 数组与元组

数组是"任意长度、元素同类型"，元组是"固定长度、每个位置类型可以不同"。

```ts twoslash
const arr: string[] = ['a', 'b']
const tup: [string, number] = ['a', 1]

type A = typeof arr.length // number
type B = typeof tup.length // number（注意不是 2！）
```

<Callout type="warn">

关键区别在**类型层**：元组类型的 `length` 是具体数字，数组是 `number`。这是类型编程里"用数组长度做计数"的基础。

```ts twoslash
type L1 = [string, number]['length']
//   ^?
type L2 = string[]['length']
//   ^?
```

</Callout>

元组的进阶写法：

```ts twoslash
// 可选元素
type T1 = [string, number?]
// 剩余元素
type T2 = [string, ...number[]]
// 带标签（只影响可读性/编辑器提示）
type T3 = [name: string, age: number]
// 只读元组
type T4 = readonly [string, number]
```

从值生成元组要用 `as const`，否则会推导成数组：

```ts twoslash
const a = ['x', 'y'] // string[]
const b = ['x', 'y'] as const // readonly ['x', 'y']
type Elem = typeof b[number]
//   ^?
```

## 对象类型

三种写法，各有用武之地：

```ts twoslash
// interface：可声明合并，适合描述"形状"
interface User {
  name: string
  age?: number // 可选
  readonly id: string // 只读
}

// type：能做联合、交叉、映射，能力更强
type Point = { x: number; y: number }

// 索引签名：动态键
type Dict = { [key: string]: number }
type Arr2 = { [index: number]: string }
```

`interface` 和 `type` 的实际差别现在很小，社区主流建议：**默认用 `interface`，需要用到联合/映射/元组时才用 `type`。**

`interface` 唯一的独有能力是**声明合并**，给三方库打补丁时会用到：

```ts
interface Window {
  __MY_APP__: string
}
```

### 索引签名的坑

```ts twoslash
interface Dict {
  [key: string]: number
}

type K = keyof Dict
//   ^?
```

结果不是 `string` 而是 `string | number`——因为 JS 里 `obj[0]` 和 `obj['0']` 等价，TS 把数字键也算进去了。

另外，一旦写了索引签名，所有显式声明的属性必须兼容它：

```ts twoslash
// @errors: 2411
interface Bad {
  [key: string]: number
  name: string
}
```

## 函数类型

```ts twoslash
// 类型别名写法
type Fn = (a: string, b?: number) => boolean

// 接口写法（支持重载）
interface Overload {
  (a: string): string
  (a: number): number
}

// 可调用 + 带属性
type FnWithMeta = {
  (a: number): number
  version: string
}
```

可选参数与剩余参数：

```ts twoslash
function f(a: string, b?: number, ...rest: string[]): void {}

// 剩余参数用元组描述更精确
function g(...args: [name: string, age: number]): void {}
type Args = Parameters<typeof g>
//   ^?
```

## 字面量类型

值也可以当类型用，这是 TS 类型系统区别于 Java/C# 的关键。

```ts twoslash
type Method = 'GET' | 'POST' | 'DELETE'
type Code = 200 | 404 | 500
type Flag = true

const m: Method = 'POST'
const c: Code = 404
```

问题在于**字面量会被自动拓宽**：

```ts twoslash
const a = { method: 'GET' }
type M = typeof a.method
//   ^?
```

`let` 推导成宽类型，`const` 推导成窄类型，但**对象属性永远是宽类型**。要保住字面量，用 `as const`：

```ts twoslash
const a = { method: 'GET' } as const
type M = typeof a.method
//   ^?
```

## 类型断言

```ts
// DOM 查询：编译器确实不知道元素类型
const el = document.getElementById('app') as HTMLElement

// 从 unknown 收窄
const n = someUnknownValue as number

// 双重断言：类型差距太大时（尽量避免）
const x = '123' as unknown as number
```

`as` 是**你告诉编译器"别管了，我确定"**，它不做任何运行时转换。只在下面几种情况用：

- DOM 查询（编译器确实不知道）
- 从 `unknown` 收窄到具体类型
- 处理三方库写错的声明

滥用 `as` 是把类型系统当摆设。更好的替代是 [收窄](./narrowing) 和 `satisfies`。

## 下一步

- [收窄与判别联合](./narrowing) —— 日常收益最高的技巧
