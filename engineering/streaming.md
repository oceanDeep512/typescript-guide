# 流式与 SSE

AI 响应、实时日志、进度推送——这些场景的类型怎么写才干净。这一节以 SSE（Server-Sent Events）为主线。

## SSE 的数据形状

SSE 的 wire format 长这样：

```
data: {"delta":"你"}

data: {"delta":"好"}

data: [DONE]
```

每一行是一个 `data:` 开头的字符串。所以你的解析链路是：

```
ReadableStream<Uint8Array>
  → 解码成字符串
  → 按空行切分成事件
  → 剥掉 "data: " 前缀
  → JSON.parse
  → 业务对象
```

## 把事件建模成判别联合

不要用一个 `type Chunk = { delta?: string; error?: string; done?: boolean }`，那会允许非法状态。用判别联合：

```ts twoslash
type StreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'tool_call'; name: string; args: unknown }
  | { type: 'error'; message: string }
  | { type: 'done'; finishReason: 'stop' | 'length' }
```

这样 `switch` 就有穷尽性检查，加新事件类型时编译器会提醒你漏了分支。

## 手写一个 SSE 解析器

```ts twoslash
type StreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'tool_call'; name: string; args: unknown }
  | { type: 'error'; message: string }
  | { type: 'done'; finishReason: 'stop' | 'length' }
// ---cut---
async function* parseSSE(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<StreamEvent, void, unknown> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n\n')
      buffer = lines.pop() ?? '' // 最后一段可能不完整

      for (const raw of lines) {
        const line = raw.trim()
        if (!line.startsWith('data:')) continue

        const payload = line.slice(5).trim()
        if (payload === '[DONE]') {
          yield { type: 'done', finishReason: 'stop' }
          return
        }

        const event = JSON.parse(payload) as StreamEvent
        //    ^?
        yield event
      }
    }
  } finally {
    reader.releaseLock()
  }
}
```

关键点：

1. **缓冲区要留尾巴**：一个 chunk 可能把一个事件切成两半，`lines.pop()` 把不完整的一段留到下轮
2. **`finally` 里释放锁**：`for await` 提前 `break` 时会走到 `finally`
3. `JSON.parse` 的结果是断言，不是校验——生产环境应该用 zod 之类的 `safeParse`

## 消费端

```ts twoslash
type StreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'error'; message: string }
  | { type: 'done'; finishReason: 'stop' | 'length' }

declare function parseSSE(): AsyncGenerator<StreamEvent, void, unknown>

async function render() {
  let acc = ''
  for await (const event of parseSSE()) {
    switch (event.type) {
      case 'delta':
        acc += event.text
        break
      case 'error':
        console.error(event.message)
        break
      case 'done':
        return acc
    }
  }
  return acc
}
```

注意 `for await` 里 `acc` 的类型是 `string`，`switch` 覆盖了所有分支。

## 用 OpenAI SDK 的情况

OpenAI SDK 的 `stream: true` 返回的是一个 `Stream<ChatCompletionChunk>`，它本身就是 `AsyncIterable`：

```ts
import OpenAI from 'openai'

const stream = await client.chat.completions.create({
  model: 'deepseek-chat',
  messages: [{ role: 'user', content: 'hi' }],
  stream: true,
})

for await (const chunk of stream) {
  chunk.choices[0]?.delta?.content
}
```

反推元素类型的技巧：

```ts twoslash
declare const stream: AsyncIterable<{ choices: Array<{ delta?: { content?: string } }> }>

type Chunk = ElemOf<typeof stream>
type ElemOf<T> = T extends AsyncIterable<infer U> ? U : never

type Delta = NonNullable<Chunk['choices'][number]['delta']>
//   ^?
```

## 前端：fetch + 流式读取

```ts
async function* streamChat(url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok || !res.body) {
    throw new Error(`HTTP ${res.status}`)
  }

  yield* parseSSE(res.body)
}
```

`yield*` 可以把另一个生成器"接进来"，类型会自动合并。

## 一个常见的类型陷阱

```ts
type StreamEvent = { type: 'delta'; text: string } | { type: 'done' }

declare const events: AsyncIterable<StreamEvent>

async function f() {
  for await (const e of events) {
    if (e.type === 'delta') {
      e.text // 这里 e.text 是 string
    }
    e.text
    // ^ 报错：Property 'text' does not exist on type 'StreamEvent'
  }
}
```

`for await` 里每次迭代 `e` 都是完整的联合，收窄只在 `if` 块内有效。想在循环外保留结果就要用累加变量。

## 背压与取消

`for await` 天然支持背压：处理慢的时候不会继续拉取。取消用 `break`（会触发生成器的 `return()`），或者 `AbortController`：

```ts twoslash
declare function parseSSE(signal: AbortSignal): AsyncGenerator<string, void, unknown>

async function f() {
  const ctrl = new AbortController()
  setTimeout(() => ctrl.abort(), 5000)

  try {
    for await (const chunk of parseSSE(ctrl.signal)) {
      console.log(chunk)
    }
  } catch (e) {
    // abort 会抛异常，需要捕获
  }
}
```

## 服务端：写 SSE 响应

```ts
app.get('/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })

  const send = (data: unknown) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  send({ type: 'delta', text: 'hi' })
  send({ type: 'done', finishReason: 'stop' })
  res.end()
})
```

想让 `send` 只接受合法事件，把参数类型标成 `StreamEvent` 即可——这就是判别联合的收益，非法状态写不出来。

## 速查

| 需求 | 写法 |
| --- | --- |
| 产出异步序列 | `AsyncGenerator<T, TReturn, TNext>` |
| 消费 | `for await (const x of src)` |
| 反推元素类型 | `T extends AsyncIterable<infer U> ? U : never` |
| 解包 Promise | `Awaited<T>` |
| Web 流转异步迭代 | `getReader()` + `while` + `yield` |
| 接另一个生成器 | `yield*` |

## 下一步

- [ESM / CJS 与模块解析](./module)
