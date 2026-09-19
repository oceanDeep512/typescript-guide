# 断言、守卫与 satisfies

三个都在"处理编译器不知道的事"，但用途完全不同。

## `as` 断言：我说了算

```ts twoslash
declare const x: unknown
const s = x as string
//    ^?
```

`as` 不做任何运行时转换，只是让编译器闭嘴。它只在两种情况下安全：

- 你比编译器知道得更多（DOM 查询、三方库声明写错）
- 从 `unknown` 收窄

危险之处在于它**可以跨越不兼容的类型**：

```ts twoslash
const n = '123' as unknown as number // 编译通过，运行时是字符串
//    ^?
```

<Callout type="danger">

`as` 的最大问题是**它不会在你改错类型时报错**。

```ts twoslash
interface User {
  name: string
  age: number
}
const u = { name: 'a' } as User
//    ^?
// age 字段根本不存在，但编译器不管
```

如果之后 `User` 加了字段，这个断言依然"通过"，运行时才是 `undefined`。用 `satisfies` 能避免这个问题。

</Callout>

### _const 断言

```ts twoslash
const a = { x: 1, y: 'p' }
const b = { x: 1, y: 'p' } as const

type TA = typeof a
//   ^?
type TB = typeof b
//   ^?
```

`as const` 做两件事：把字面量收窄到最窄，加 `readonly`。这是从值生成精确类型的标准手段。

## 类型守卫：运行时判断 + 编译期收窄

守卫是"带 `is` 返回类型的函数"，见[收窄](../guide/narrowing#自定义类型谓词-is)。

```ts twoslash
function isString(x: unknown): x is string {
  return typeof x === 'string'
}

const arr: unknown[] = ['a', 1]
const strs = arr.filter(isString)
type T = typeof strs
//   ^?
```

### 断言函数 `asserts`

比 `is` 更强：它让后续的**整个作用域**都收窄，且不需要 `if`。

```ts twoslash
function assertIsString(x: unknown): asserts x is string {
  if (typeof x !== 'string') throw new Error('not string')
}

declare const v: unknown
assertIsString(v)
v.toUpperCase() // 这里 v 已经是 string
```

对比 `is`：

```ts twoslash
function isString(x: unknown): x is string {
  return typeof x === 'string'
}
declare const v: unknown
if (isString(v)) {
  v.toUpperCase() // 只在 if 内有效
}
```

`asserts` 需要注意：**箭头函数需要显式标注类型**，否则推断不出来。

```ts twoslash
declare const v: unknown
const assertString: (x: unknown) => asserts x is string = (x) => {
  if (typeof x !== 'string') throw new Error('nope')
}
assertString(v)
v.toUpperCase()
```

## `satisfies`：校验但保留推导

TS 4.9 引入，解决了一个长期的两难。

### 问题

```ts twoslash
// 类型标注：校验了结构，但把类型擦宽了
const routes1: Record<string, string> = { home: '/' }
type A = typeof routes1.home
//   ^?
```

`A` 是 `string` 而不是 `'/'`，后续拿不到字面量信息。

反过来用 `as` 断言能保住类型，但它对结构的校验很松（只要两边有重叠就放行），写错键名、漏字段都不一定报错。

### 解法

```ts twoslash
const routes = { home: '/', about: '/about' } satisfies Record<string, string>

type A = typeof routes.home
//   ^?
type B = typeof routes.about
//   ^?
```

既校验了结构，又保留了字面量。

### 校验是真的

```ts twoslash
// @errors: 2322
const bad = { home: 'index' } satisfies Record<string, `/${string}`>
```

### 典型用途

```ts twoslash
type Color = 'red' | 'green' | 'blue'
type Palette = Record<Color, string | [number, number, number]>

const palette = {
  red: '#f00',
  green: [0, 255, 0],
  blue: '#00f',
} satisfies Palette

// 推导结果保留了每个键的精确类型
type R = typeof palette.red
//   ^?
type G = typeof palette.green
//   ^?

// 所以这里能安全访问数组方法
palette.green.push(1)
```

换成 `: Palette` 标注，`palette.green` 就是 `string | [number, number, number]`，`.push` 会报错。

### 与 `as const` 组合

```ts twoslash
const config = {
  host: 'localhost',
  port: 3000,
  features: ['a', 'b'],
} as const satisfies Record<string, unknown>

type H = typeof config.host
//   ^?
type F = typeof config.features
//   ^?
```

顺序固定：`as const satisfies T`（先收窄再校验）。

## 三者怎么选

| 场景 | 用什么 |
| --- | --- |
| 编译器确实不知道（DOM、三方库） | `as` |
| 已知精确值，想生成字面量类型 | `as const` |
| 运行时判断类型 | 类型守卫 `is` / `asserts` |
| 想校验结构又想保住字面量 | `satisfies` |
| 两者都要 | `as const satisfies T` |

一句话原则：**能用 `satisfies` 就别用 `as`，能用守卫就别用 `as`。**

## 下一步

- [声明文件与模块解析](./declaration)
