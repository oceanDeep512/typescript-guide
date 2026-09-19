# 异步与迭代器

两个三参数家族：同步的 `Iterator` / `Generator`，异步的 `AsyncIterator` / `AsyncGenerator`。做流式处理时天天见。

## 先分清四个名字

| 名字 | 是什么 |
| --- | --- |
| `Iterable<T>` | **可被 `for...of`** 的对象（有 `[Symbol.iterator]`） |
| `Iterator<T>` | 有 `next()` 的那个对象 |
| `IterableIterator<T>` | 两者都是（生成器返回的就是这个） |
| `Generator<T, TReturn, TNext>` | `function*` 的类型 |

异步家族一一对应，只多一个 `Async` 前缀。

## 三个参数分别是什么

```ts
interface Iterator<T, TReturn = any, TNext = undefined> {
  next(...args: [] | [TNext]): IteratorResult<T, TReturn>
  return?(value?: TReturn): IteratorResult<T, TReturn>
  throw?(e?: any): IteratorResult<T, TReturn>
}
```

| 参数 | 含义 | 对应语法 |
| --- | --- | --- |
| `T` | 每次 `yield` 产出的类型 | `yield value` |
| `TReturn` | 结束时 `return` 的类型 | `return value` |
| `TNext` | 外部通过 `next(v)` 送进去的类型 | `const x = yield` 的 `x` |

## IteratorResult 是判别联合

```ts twoslash
type IteratorResult<T, TReturn = any> =
  | IteratorYieldResult<T>
  | IteratorReturnResult<TReturn>

interface IteratorYieldResult<T> {
  done?: false
  value: T
}
interface IteratorReturnResult<TReturn> {
  done: true
  value: TReturn
}
```

所以手写循环时，判断 `done` 之后 `value` 的类型会自动收窄：

```ts twoslash
declare const it: Iterator<string, number>

let r = it.next()
while (!r.done) {
  r.value.toUpperCase() // string
  r = it.next()
}
r.value.toFixed() // 循环结束后是 number
```

## 同步生成器

```ts twoslash
function* count(n: number): Generator<number, string, undefined> {
  for (let i = 0; i < n; i++) yield i
  return 'done'
}

const it = count(3)
it.next()
```

`for...of` 只能拿到 `yield` 的值，`return` 的值会被丢弃：

```ts twoslash
function* count(n: number): Generator<number, string, undefined> {
  for (let i = 0; i < n; i++) yield i
  return 'done'
}

for (const x of count(3)) {
  const y: number = x
}
```

## 异步家族

结构完全一样，唯一区别是 `next()` 返回 `Promise`：

```ts
interface AsyncIterator<T, TReturn = any, TNext = undefined> {
  next(...args: [] | [TNext]): Promise<IteratorResult<T, TReturn>>
  return?(value?: TReturn | PromiseLike<TReturn>): Promise<IteratorResult<T, TReturn>>
  throw?(e?: any): Promise<IteratorResult<T, TReturn>>
}

interface AsyncIterable<T> {
  [Symbol.asyncIterator](): AsyncIterator<T>
}

interface AsyncGenerator<T = unknown, TReturn = any, TNext = any>
  extends AsyncIterator<T, TReturn, TNext> {
  next(...args: [] | [TNext]): Promise<IteratorResult<T, TReturn>>
  return(value: TReturn | PromiseLike<TReturn>): Promise<IteratorResult<T, TReturn>>
  throw(e: any): Promise<IteratorResult<T, TReturn>>
  [Symbol.asyncIterator](): AsyncGenerator<T, TReturn, TNext>
}
```

### async function\*

```ts twoslash
type Chunk = { delta: string; done: boolean }

async function* stream(): AsyncGenerator<Chunk, void, unknown> {
  yield { delta: 'a', done: false }
  yield { delta: 'b', done: false }
}
```

### for await...of

要求右侧是 `AsyncIterable`。循环变量**自动被解包**，你拿到的是 `T` 不是 `Promise<T>`：

```ts twoslash
type Chunk = { delta: string; done: boolean }
declare const src: AsyncIterable<Chunk>

async function consume() {
  for await (const chunk of src) {
    chunk.delta // Chunk，不是 Promise<Chunk>
  }
}
```

等价的手写形式（能看清 `Promise` 在哪）：

```ts twoslash
type Chunk = { delta: string; done: boolean }
declare const src: AsyncIterable<Chunk>

async function consume() {
  const it = src[Symbol.asyncIterator]()
  let r = await it.next()
  while (!r.done) {
    r.value.delta // 因为 done === false，r.value 是 Chunk
    r = await it.next()
  }
}
```

## 从异步流反推元素类型

这是做 AI 流式响应时最常用的技巧：

```ts twoslash
declare function streamChat(): AsyncGenerator<{ delta: string }, void, unknown>

// 从 AsyncGenerator 里抠出 yield 的类型
type YieldOf<G> = G extends AsyncGenerator<infer T, any, any> ? T : never
type Chunk = YieldOf<ReturnType<typeof streamChat>>
//   ^?

// 从 AsyncIterable 里抠
type ElemOf<T> = T extends AsyncIterable<infer U> ? U : never

declare const src: AsyncIterable<number>
type N = ElemOf<typeof src>
//   ^?
```

## Awaited：递归解包 Promise

```ts twoslash
type A = Awaited<Promise<Promise<number>>>
//   ^?
type B = Awaited<Promise<string> | number>
//   ^?
type C = Awaited<Promise<Promise<Promise<boolean>>>>
//   ^?
```

官方实现（值得背）：

```ts
type Awaited<T> =
  T extends null | undefined ? T :
    T extends object & { then(onfulfilled: infer F): any }
      ? F extends (value: infer V, ...args: any) => any
        ? Awaited<V>
        : never
      : T
```

它匹配的是 **thenable**（有 `then` 方法的对象），不只是 `Promise`。

## ReadableStream ↔ 异步迭代

两套协议，需要转换。

**Node 的 `Readable` 本身就是 `AsyncIterable`**：

```ts twoslash
import fs from 'node:fs'
// ---cut---
for await (const chunk of fs.createReadStream('a.txt')) {
  //             ^?
  // chunk 是 Buffer
}
```

**Web 的 `ReadableStream` 需要适配**：

```ts twoslash
async function* toIterable<T>(
  stream: ReadableStream<T>
): AsyncGenerator<T, void, unknown> {
  const reader = stream.getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      //            ^?
      if (done) return
      yield value
    }
  } finally {
    reader.releaseLock()
  }
}
```

Node 18+ 也提供了 `ReadableStream` 的实验性异步迭代支持。

## 实用辅助类型

```ts twoslash
// 把同步 Iterable 变成 AsyncIterable
type ToAsync<T> = T extends Iterable<infer U> ? AsyncIterable<U> : never

type A = ToAsync<string[]>
//   ^?

// 收集异步迭代器的产出类型（元组形式，仅限已知长度）
type Collect<T extends readonly unknown[]> = {
  [I in keyof T]: T[I] extends AsyncIterable<infer U> ? U : never
}

type B = Collect<[AsyncIterable<string>, AsyncIterable<number>]>
//   ^?
```

## 常见坑

### 1. `AsyncIterableIterator` vs `AsyncGenerator`

`AsyncIterableIterator<T>` 只是 `AsyncIterator<T>` + 自己的 `[Symbol.asyncIterator]`，没有 `return` / `throw` 的强约束。写库时用 `AsyncGenerator` 更精确。

### 2. `for await` 里的 `break` 会触发 `return()`

```ts twoslash
declare const src: AsyncGenerator<number, string, unknown>
async function f() {
  for await (const x of src) {
    if (x > 5) break // 会调用 src.return()
  }
}
```

所以生成器里可以用 `try...finally` 做清理。

### 3. lib 配置

`AsyncIterator` 在 `ES2018.AsyncIterable` 里，`tsconfig` 的 `lib` 要包含 ES2018+：

```jsonc
{ "lib": ["ES2022"] }
```

### 4. downlevelIteration

`target` 低于 ES2015 时，`for...of` 遍历迭代器需要开 `downlevelIteration`。现代项目不用管。

## 下一步

- [流式与 SSE](./streaming)
