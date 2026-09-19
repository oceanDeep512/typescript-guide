# 工程实践概览

前面几篇讲的是语言本身，这一篇讲**类型在真实项目里怎么用**。

## 这一篇解决什么问题

- 框架（React / Vue）里的类型怎么写才不别扭
- Node 服务端（Express / Fastify / NestJS）的类型边界在哪
- **tsc / esbuild / tsx / tsup / tsdown / vite 各自管哪一段**（最容易混的一块）
- **装饰器在做什么，NestJS 的依赖注入靠什么工作**
- **外部数据怎么校验（schema 优先）**
- 异步迭代器、流式响应怎么建模
- ESM / CJS 与模块解析的那些坑
- 发布一个带类型的 npm 包要配什么

## 一个贯穿全文的原则

**类型只覆盖编译期，运行时是另一回事。**

```ts
interface User {
  name: string
  age: number
}

// 这个断言在运行时完全不生效
const user = JSON.parse(input) as User
```

`JSON.parse` 返回 `any`，`as User` 只是让编译器闭嘴。**外部输入必须做运行时校验**，然后用 schema 反推类型：

```ts
import { z } from 'zod'

const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
})

type User = z.infer<typeof UserSchema>

const user = UserSchema.parse(JSON.parse(input)) // 校验 + 类型都对
```

这个方向很重要：**类型是推导出来的，不是手写的**。手写两遍（schema 一遍、类型一遍）一定会不同步。

## 类型边界的划分

一个健康的项目，类型边界长这样：

```
外部输入 → 运行时校验 → 内部类型（可信）→ 业务逻辑
   ↑                                          ↓
  unknown                                  内部输出
```

规则：

1. **所有外部输入先当作 `unknown`**
2. **边界处做一次运行时校验**，之后内部代码可以完全信任类型
3. **不要在每个函数里重复判空**

```ts
// 边界：校验 + 收窄
async function fetchUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`)
  const data: unknown = await res.json()
  return UserSchema.parse(data) // 这里之后类型可信
}

// 内部：直接信类型，不再判空
function greet(u: User): string {
  return `hi ${u.name}`
}
```

## 常见反模式

### 1. any 传染

```ts
function f(x: any) {
  return x.a.b.c // any 一路传下去，整个调用链都失去检查
}
```

### 2. 到处 `!`

```ts
// 每个字段都加 ! 等于关掉 strictNullChecks
const name = user!.profile!.name!
```

### 3. 过度抽象的类型

```ts
type Handler<T extends Record<string, unknown>, K extends keyof T> = ...
```

如果团队里只有一个人看得懂，维护成本会超过收益。

### 4. 手写 schema 对应的类型

```ts
// schema 改了，这个类型不会自动跟着改
type User = { name: string; age: number }
const UserSchema = z.object({ name: z.string(), age: z.number(), email: z.string() })
```

永远用 `z.infer` 之类的方式推导。

完整展开见 [Schema 与运行时校验](./schema)——那篇会从"schema 到底是什么"讲起，覆盖 `z.infer` / `z.input` / `z.output` 的区别和 zod / valibot / arktype 的选型。

## 各章导航

| 章节 | 适合谁 |
| --- | --- |
| [工具链分工](./toolchain) | 搞不清 tsc / tsx / tsup / vite 谁管什么 |
| [React 与 Vue 中的类型](./react-vue) | 写前端组件 |
| [装饰器与 NestJS](./decorators) | 用 NestJS / 想搞懂 `@` 到底做了什么 |
| [Node 与服务端类型](./node) | 写后端 |
| [Schema 与运行时校验](./schema) | 校验外部数据、zod / valibot / arktype 怎么选 |
| [异步与迭代器](./async-iterator) | 处理流、生成器 |
| [流式与 SSE](./streaming) | 接 AI / 实时数据 |
| [ESM / CJS 与模块解析](./module) | 配构建、发包 |
| [发布带类型的包](./publish) | 维护 npm 包 |

## 下一步

- [React 与 Vue 中的类型](./react-vue)
