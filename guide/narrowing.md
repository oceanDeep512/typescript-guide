# 收窄与判别联合

如果说整份教程只能学一节，就是这节。**收窄（narrowing）是 TypeScript 在日常业务代码里收益最高的单一技巧**，没有之一。

## 问题：为什么类型会"变宽"

```ts
function print(x: string | number) {
  console.log(x.toUpperCase())
  //          ^ Property 'toUpperCase' does not exist on type 'string | number'
}
```

`x` 可能是 `string` 也可能是 `number`，`number` 上没有 `toUpperCase`，所以报错。你需要**先证明** `x` 现在是什么类型——这个过程叫收窄。

## 收窄的六种手段

### 1. typeof

```ts twoslash
function print(x: string | number) {
  if (typeof x === 'string') {
    x.toUpperCase() // 这里 x 是 string
  } else {
    x.toFixed(2) // 这里 x 是 number
  }
}
```

注意 `typeof null === 'object'`，这是 JS 的历史 bug，TS 保留了它。

### 2. 真值判断

```ts twoslash
function f(x?: string) {
  if (x) {
    x.toUpperCase() // x 是 string（排除了 undefined 和空串）
  }
}
```

小心：`if (x)` 会同时排除 `''`、`0`、`false`、`NaN`。要区分 `undefined` 和空串时用 `x !== undefined`。

### 3. 相等判断

```ts twoslash
function f(x: string | number, y: string | boolean) {
  if (x === y) {
    x // 都是 string（这是唯一的交集）
    y
  }
}
```

### 4. in 操作符

```ts twoslash
type Fish = { swim: () => void }
type Bird = { fly: () => void }

function move(a: Fish | Bird) {
  if ('swim' in a) {
    a.swim()
  } else {
    a.fly()
  }
}
```

### 5. instanceof

```ts twoslash
function f(x: Date | RegExp) {
  if (x instanceof Date) {
    x.getTime()
  } else {
    x.test('a')
  }
}
```

### 6. 自定义类型谓词 `is`

前面五种是编译器内置的，遇到复杂判断就得自己写：

```ts twoslash
function isString(x: unknown): x is string {
  return typeof x === 'string'
}

const v: unknown = 'hi'
if (isString(v)) {
  v.toUpperCase() // v 被收窄为 string
}
```

`x is string` 这个返回值类型就是**类型谓词**。它对编译器说："如果这个函数返回 `true`，那参数 `x` 一定是 `string`。"

<Callout type="warn">
类型谓词是**一个承诺，编译器不校验实现**。你可以写 `function isString(x: unknown): x is string { return Math.random() > 0.5 }`，编译器照样信你。
</Callout>

配合 `filter` 特别好用：

```ts twoslash
const arr: unknown[] = ['a', 1, 'b', 2]
const strs = arr.filter((x): x is string => typeof x === 'string')
type T = typeof strs
//   ^?
```

## 判别联合（Discriminated Union）

这是把收窄用到极致的模式，也是**建模状态机的最佳实践**。

做法：给联合的每个成员加一个**字面量类型的公共字段**（判别式）。

```ts twoslash
type Result =
  | { kind: 'ok'; data: string }
  | { kind: 'err'; message: string }
  | { kind: 'loading' }

function render(r: Result) {
  switch (r.kind) {
    case 'ok':
      return r.data // r 已被收窄
    case 'err':
      return r.message
    case 'loading':
      return '...'
  }
}
```

`switch` 之后 TS 知道 `r.kind` 只有三种可能，`case 'ok'` 分支里 `r` 就只有 `data` 字段。

### 为什么它比可选字段好

对比一下"不用判别联合"的常见写法：

```ts
type Bad = {
  status: string
  data?: string
  message?: string
}
```

这个类型允许 `{ status: 'ok', message: 'x' }` 这种非法状态，而且你每次用 `data` 都要判空。判别联合把**非法状态变成不可能表示的状态**，这是它最大的价值。

### 穷尽性检查

判别联合最爽的地方：漏了一个分支，编译器会告诉你。

```ts twoslash
type Result =
  | { kind: 'ok'; data: string }
  | { kind: 'err'; message: string }
  | { kind: 'loading' }

function assertNever(x: never): never {
  throw new Error('unexpected: ' + x)
}

function render(r: Result) {
  switch (r.kind) {
    case 'ok':
      return r.data
    case 'err':
      return r.message
    case 'loading':
      return '...'
    default:
      return assertNever(r)
  }
}
```

现在给 `Result` 加一个成员但不改 `render`，`default` 分支里的 `r` 就不是 `never` 了，`assertNever` 会报错。这就是**编译期的穷尽性检查**。

## 判别式的其他形式

判别字段不一定是字符串字面量：

```ts twoslash
// 布尔判别式
type Shape = { isCircle: true; radius: number } | { isCircle: false; side: number }

// 用 undefined 判别（常见于可选字段建模）
type Resp = { data: string; error?: undefined } | { data?: undefined; error: Error }
```

第二种写法在 React / Node 里很常见，好处是可以直接 `if (resp.error)` 判断。

## 常见坑

### 收窄会失效的情况

```ts twoslash
let x: string | number = 'a'

function later() {
  x = 1 // 重新赋值
}

if (typeof x === 'string') {
  later()
  x.toUpperCase() // 这里还安全吗？
}
```

对 `let` 变量，TS 的收窄是**基于控制流分析**的，但遇到闭包赋值会保守处理。用 `const` 能避免绝大多数这类问题。

### 索引访问不会收窄

```ts twoslash
type Obj = { a?: string }
function f(o: Obj) {
  if (o.a) {
    o.a.toUpperCase()
  }
}
```

上面是安全的，但换成变量中转就不行了：

```ts
type Obj = { a?: string }
function f(o: Obj) {
  const a = o.a
  if (a) {
    o.a.toUpperCase() // 报错：'o.a' is possibly 'undefined'
  }
}
```

因为 `o.a` 可能被别的代码改掉，TS 不会把 `a` 的收窄结果关联回 `o.a`。解决办法是直接用中转变量 `a.toUpperCase()`。

## 下一步

- [strict 家族](./strict)
- [类型兼容性](../type-system/compatibility)
