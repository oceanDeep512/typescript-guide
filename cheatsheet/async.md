# 异步与迭代器

两个 `<T, TReturn, TNext>` 三参数家族。完整签名 + 常用取类型技巧。

## 名字对照

| 同步 | 异步 | 是什么 |
| --- | --- | --- |
| `Iterable<T>` | `AsyncIterable<T>` | 可被 `for...of` / `for await...of` |
| `Iterator<T>` | `AsyncIterator<T>` | 有 `next()` 的对象 |
| `IterableIterator<T>` | `AsyncIterableIterator<T>` | 两者都是 |
| `Generator<T, TReturn, TNext>` | `AsyncGenerator<T, TReturn, TNext>` | `function*` / `async function*` |

## 三个参数

| 参数 | 含义 | 语法 |
| --- | --- | --- |
| `T` | `yield` 产出的类型 | `yield value` |
| `TReturn` | 结束时 `return` 的类型 | `return value` |
| `TNext` | 外部 `next(v)` 送进去的类型 | `const x = yield` 的 `x` |

## 完整签名

```ts twoslash
interface Iterator<T, TReturn = any, TNext = undefined> {
  next(...args: [] | [TNext]): IteratorResult<T, TReturn>
  return?(value?: TReturn): IteratorResult<T, TReturn>
  throw?(e?: any): IteratorResult<T, TReturn>
}

interface Iterable<T> {
  [Symbol.iterator](): Iterator<T>
}

interface Generator<T = unknown, TReturn = any, TNext = unknown>
  extends Iterator<T, TReturn, TNext> {
  next(...args: [] | [TNext]): IteratorResult<T, TReturn>
  return(value: TReturn): IteratorResult<T, TReturn>
  throw(e: any): IteratorResult<T, TReturn>
  [Symbol.iterator](): Generator<T, TReturn, TNext>
}

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

type NextSig = Iterator<string, number>['next']
//   ^?
```

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

declare const it: Iterator<string, number>
let r = it.next()
type A = typeof r
//   ^?
```

判断 `done` 后 `value` 自动收窄。

## 取元素类型

<TypeCard name="ElemOf" badge="最常用">

```ts twoslash
type ElemOf<T> = T extends AsyncIterable<infer U> ? U : never

declare const src: AsyncIterable<{ delta: string }>
type Chunk = ElemOf<typeof src>
//   ^?
```

</TypeCard>

<TypeCard name="YieldOf（从 AsyncGenerator）" badge="三参数">

```ts twoslash
type YieldOf<G> = G extends AsyncGenerator<infer T, any, any> ? T : never
type GenOf<G> = G extends AsyncGenerator<infer T, infer R, infer N>
  ? { yield: T; return: R; next: N }
  : never

declare function stream(): AsyncGenerator<{ text: string }, void, unknown>
type A = YieldOf<ReturnType<typeof stream>>
//   ^?
type B = GenOf<ReturnType<typeof stream>>
//   ^?
```

</TypeCard>

<TypeCard name="ToAsync / Collect" badge="辅助">

```ts twoslash
type ToAsync<T> = T extends Iterable<infer U> ? AsyncIterable<U> : never
type Collect<T extends readonly unknown[]> = {
  [I in keyof T]: T[I] extends AsyncIterable<infer U> ? U : never
}

type A = ToAsync<string[]>
//   ^?
type B = Collect<[AsyncIterable<string>, AsyncIterable<number>]>
//   ^?
```

</TypeCard>

## Awaited

```ts twoslash
type A = Awaited<Promise<Promise<number>>>
//   ^?
type B = Awaited<Promise<string> | number>
//   ^?
```

官方实现（递归解包 thenable）：

```ts
type Awaited<T> =
  T extends null | undefined ? T :
    T extends object & { then(onfulfilled: infer F): any }
      ? F extends (value: infer V, ...args: any) => any
        ? Awaited<V>
        : never
      : T
```

## 常用转换

<TypeCard name="ReadableStream → AsyncIterable" badge="Web">

```ts
async function* toIterable<T>(
  stream: ReadableStream<T>
): AsyncGenerator<T, void, unknown> {
  const reader = stream.getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) return
      yield value
    }
  } finally {
    reader.releaseLock()
  }
}
```

</TypeCard>

<TypeCard name="Node Readable 直接可迭代" badge="Node">

```ts
import fs from 'node:fs'

for await (const chunk of fs.createReadStream('a.txt')) {
  // chunk 是 Buffer
}
```

Node 的 `Readable` 本身就是 `AsyncIterable`。

</TypeCard>

## 速查

| 需求 | 写法 |
| --- | --- |
| 产出异步序列 | `AsyncGenerator<T, TReturn, TNext>` |
| 消费 | `for await (const x of src)` |
| 反推元素类型 | `T extends AsyncIterable<infer U> ? U : never` |
| 解包 Promise | `Awaited<T>` |
| 接另一个生成器 | `yield*` |

## 坑

1. `AsyncIterable` 在 `lib: ES2018.AsyncIterable` 里，`lib` 要够新
2. `for await` 里 `break` 会触发生成器的 `return()`，可以用 `try...finally` 清理
3. `target` 低于 ES2015 时要开 `downlevelIteration`

## 下一步

- [变型与调试](./variance-debug)
