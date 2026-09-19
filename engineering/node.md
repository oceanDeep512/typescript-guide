# Node 与服务端类型

服务端和前端最大的差别：**你拥有输入输出的两端，所以可以让类型贯穿全链路**。

## 环境类型

第一件事：装 `@types/node`。

```bash
npm i -D @types/node
```

然后在 tsconfig 里显式写 `lib`（不写的话会带 DOM，服务端没有 `window`）：

```jsonc
{
  "compilerOptions": {
    "lib": ["ES2022"],
    "types": ["node"]
  }
}
```

## Express

### 请求与响应的类型边界

```ts
import type { Request, Response, NextFunction } from 'express'

app.get('/users/:id', (req: Request, res: Response) => {
  const id = req.params.id // string（Express 5 之前是 any）
  res.json({ id })
})
```

Express 的类型里，很多地方是 `any`：

- `req.body` —— 没有 body parser 时是 `any`
- `req.query` —— `any`
- `req.params` —— Express 4 里是 `any`

正确做法是**在每个 handler 的边界处校验**：

```ts
import { z } from 'zod'

const ParamsSchema = z.object({ id: z.string().uuid() })

app.get('/users/:id', (req, res) => {
  const { id } = ParamsSchema.parse(req.params) // 校验后 id 是 string
})
```

### 给 Request 加字段（中间件传值）

这是最常卡住的地方。用模块增强：

```ts
// src/types/express.d.ts
import 'express'

declare global {
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

export {}
```

或者（更现代的方式）：

```ts
declare module 'express-serve-static-core' {
  interface Request {
    userId?: string
  }
}
```

用哪个取决于 Express 版本和 `@types/express` 的版本。**推荐第一种（`declare global` + `namespace Express`）**，兼容性最好。

### 类型安全的路由（进阶）

手写路由表，让路径参数自动推导：

```ts twoslash
type Route = `/users/${string}` | '/health'

type ExtractParams<S extends string> =
  S extends `${string}:${infer P}/${infer Rest}`
    ? P | ExtractParams<Rest>
    : S extends `${string}:${infer P}`
      ? P
      : never

type P = ExtractParams<'/users/:id/posts/:postId'>
//   ^?
```

真实项目里用 tRPC 或 Hono 更省事——它们原生支持这种推导。

## Fastify

Fastify 的类型比 Express 严格得多，原生支持 schema 推导：

```ts
import { Type } from '@sinclair/typebox'

const BodySchema = Type.Object({
  name: Type.String(),
  age: Type.Number(),
})

app.post<{ Body: Static<typeof BodySchema> }>(
  '/users',
  { schema: { body: BodySchema } },
  async (req) => {
    req.body.name // string，不需要额外校验
  }
)
```

TypeBox 的 schema 和 JSON Schema 同构，一份东西同时用于运行时校验和类型推导。

## 环境变量

```ts
// src/env.ts
function required(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

export const env = {
  PORT: Number(required('PORT')),
  DATABASE_URL: required('DATABASE_URL'),
} as const
```

在启动时一次性校验，之后全项目拿到的都是可信类型。不要用 `process.env.X!` 到处断言。

## 错误处理

```ts
class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

function isAppError(e: unknown): e is AppError {
  return e instanceof AppError
}

app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  if (isAppError(err)) {
    res.status(err.statusCode).json({ code: err.code })
    return
  }
  console.error(err)
  res.status(500).json({ code: 'internal' })
})
```

注意错误中间件的参数必须是 4 个，Express 靠 `fn.length` 区分。

## 数据库

### Prisma：从 schema 推导

```ts
import type { User, Prisma } from '@prisma/client'

const user = await prisma.user.findUnique({ where: { id } })
// user: User | null

const withPosts = await prisma.user.findUnique({
  where: { id },
  include: { posts: true },
})
// 类型自动包含 posts
```

Prisma 的类型是从 schema 生成的，改 schema 后跑 `prisma generate` 就同步了。

### Drizzle：类型即 schema

```ts
import { pgTable, text, integer } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  age: integer('age'),
})

type User = typeof users.$inferSelect
type NewUser = typeof users.$inferInsert
```

### 手写 SQL 的情况

```ts
type Row = { id: string; name: string }
const rows = await db.query<Row>('SELECT id, name FROM users')
// 这是你声称的类型，运行时不校验
```

手写 SQL 时要意识到 `<Row>` 只是一个断言。

## 流式响应

服务端写流式响应（SSE、chunked）时，类型是 `AsyncIterable` 这一族，详见[流式与 SSE](./streaming)。

## 常见坑

### 1. `@types/node` 版本和 Node 版本不匹配

Node 22 装了 `@types/node@16`，新 API 会报"不存在"。反过来 `AsyncIterator` 之类的在新版本才有。

### 2. `process.env` 的类型

默认是 `Record<string, string | undefined>`，每个都要判空。用上面的 `env.ts` 模式一次性解决。

### 3. ESM / CJS 混用

`import` 一个 CJS 包、或者顶层用 `__dirname`，都会踩坑。详见[ESM / CJS 与模块解析](./module)。

### 4. 中间件的类型丢失

```ts
// Express 的中间件链是"弱类型"的，req 上的东西加了但类型不知道
app.use(authMiddleware) // 加了 req.userId，但类型里没有
```

解决：用上面说的模块增强，或者换 Fastify / tRPC / Hono。

## 下一步

- [异步与迭代器](./async-iterator)
