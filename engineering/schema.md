# Schema 与运行时校验：zod / valibot / arktype

如果你写过 TS 但没接触过 schema，先记住一句话：**TypeScript 的类型在运行时不存在，schema 就是补上这一半的那块拼图。**

## 一、schema 到底是什么

### 起点：类型标注会被完全擦除

```ts twoslash
declare const input: string
// ---cut---
interface User {
  name: string
  age: number
}

const user = JSON.parse(input) as User  // ⚠️ 这个 as 什么都没校验
//    ^?
```

`JSON.parse` 返回 `any`，`as User` 只是让编译器闭嘴。运行时它不检查任何东西——`input` 是 `{"name": 123}` 还是 `"hello"` 都能通过。

这就是 [工程实践概览](./index) 里那条原则：**类型只覆盖编译期，运行时是另一回事。**

### schema = 一份「运行时可执行的数据契约」

| | TypeScript 类型 | Schema |
| --- | --- | --- |
| 存在于 | 编译期 | **运行时** |
| 能做什么 | 让 IDE 提示、让 `tsc` 报错 | **真的检查一份未知数据是否符合要求** |
| 运行时残留 | 零 | 一个真实的对象 |
| 类比 | 图纸上的尺寸标注 | 工厂流水线上的**安检门** |

**关键差异**：`interface User` 编译后消失得干干净净；schema 是一个**真的存在于内存里的值**，你可以调用它的 `parse()` 方法，它会真的去检查数据并在失败时告诉你哪个字段不对。

### 哪些数据需要 schema

一句话：**任何不是你自己构造的数据**。

- HTTP 请求体 / query / header
- `JSON.parse` 的结果、`localStorage` 里取出来的东西
- 环境变量（`process.env.X` 永远是 `string | undefined`）
- 第三方 API 的响应（包括你觉得它很稳定的那些）
- **LLM / AI 模型的输出**（结构化输出也要校验，模型会返回不合格式的 JSON）
- 配置文件、CSV、用户上传的文件

## 二、不用库也能做，但你会写腻

```ts twoslash
interface User {
  name: string
  age: number
}
// ---cut---
// 手写校验
function isUser(x: unknown): x is User {
  //     ^?
  return (
    typeof x === 'object' && x !== null &&
    typeof (x as any).name === 'string' &&
    typeof (x as any).age === 'number'
  )
}
```

十个字段就写不下去了，二十个字段还要嵌套、还要给中文错误提示——这就是为什么会有 zod 这类库。它们做的事本质上和上面这段代码一样，只是把它变成了**声明式**的。

## 三、zod 基础

生态里 zod 是事实标准，先拿它讲。

```ts twoslash
import { z } from 'zod'

// ① 声明一份 schema（它是个值，不是类型）
const UserSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().positive(),
  email: z.email(),
})

// ② 从 schema 反推出 TS 类型（不是手写！）
type User = z.infer<typeof UserSchema>
//   ^?

// ③ 在边界处校验
declare const input: string
const user = UserSchema.parse(JSON.parse(input))
```

把鼠标悬停在 `UserSchema` 上（或看 `^?` 的结果），可以看到 `z.infer` 推出的就是 `{ name: string; age: number; email: string }` —— **和手写的 interface 一模一样，但它永远跟着 schema 走**。

### parse 还是 safeParse

```ts twoslash
import { z } from 'zod'

const UserSchema = z.object({ name: z.string() })
declare const rawInput: string

// parse：失败直接抛 ZodError。适合"失败了就该崩"的场景
const user = UserSchema.parse(JSON.parse(rawInput))

// safeParse：返回结果对象，不抛异常。适合表单、API 错误响应
const result = UserSchema.safeParse(JSON.parse(rawInput))
if (!result.success) {
  console.log(result.error.issues) // [{ path: ['name'], message: '...' }, ...]
} else {
  result.data // 已校验的类型安全数据
}
```

**经验**：内部断言用 `parse`，面向用户的输入用 `safeParse`（你要把错误友好地展示出来，而不是让进程挂掉）。

### 常用组合

```ts twoslash
import { z } from 'zod'
// ---cut---
// 嵌套与数组
z.object({ items: z.array(z.object({ id: z.string() })) })

// 可选与默认
z.object({ bio: z.string().optional(), role: z.string().default('user') })

// 判别联合（处理"不同形态的消息"最好用）
const Event = z.discriminatedUnion('type', [
//    ^?
  z.object({ type: z.literal('click'), x: z.number(), y: z.number() }),
  z.object({ type: z.literal('keypress'), key: z.string() }),
])

// 转换：输入是字符串，输出是数字
const Age = z.string().transform(Number).pipe(z.number().int().positive())
//    ^?
```

### 从已有 schema 派生

```ts twoslash
import { z } from 'zod'

const UserSchema = z.object({ id: z.string(), name: z.string(), age: z.number() })

// 类型随 schema 自动更新，不用写第二遍
const CreateUserSchema = UserSchema.omit({ id: true })
const UpdateUserSchema = UserSchema.partial()
const UserSummarySchema = UserSchema.pick({ id: true, name: true })
```

::: warning zod 4 的写法变化
zod 4 把字符串格式校验提到了顶层（v3 的链式写法仍可用但已 deprecated）：

```ts twoslash
import { z } from 'zod'

z.email()        // 替代 z.string().email()
z.uuid()         // 替代 z.string().uuid()
z.url()          // 替代 z.string().url()
z.iso.datetime() // 替代 z.string().datetime()
```

包名还是 `zod`（v4 直接由包根导出）。需要旧行为可以用 `zod/v3` 子路径，需要极小体积用 `zod/mini`。
:::

## 四、`z.infer` / `z.input` / `z.output`：最容易错的一点

三个都用来从 schema 推类型，但**不一样**：

| | 含义 | 什么时候用 |
| --- | --- | --- |
| `z.infer<T>` | **输出类型**（parse 之后） | 校验通过后的数据（≈ `z.output`） |
| `z.output<T>` | 同 `z.infer` | 更明确的写法 |
| `z.input<T>` | **输入类型**（parse 之前） | 表单状态、请求体、你构造给 `parse` 的原始数据 |

没有 `transform` 和 `default` 时，三者完全相同。一旦有，就会分叉：

```ts twoslash
import { z } from 'zod'

const Schema = z.object({
  // 有默认值：输入可以不给，输出一定有
  role: z.string().default('user'),
  // 有转换：输入是 string，输出是 number
  age: z.string().pipe(z.coerce.number()),
})

type In = z.input<typeof Schema>
//   ^?

type Out = z.output<typeof Schema>
//   ^?
```

**踩坑现场**：把 DTO 类型写成 `z.infer`，结果因为字段有 `.default()`，类型里该字段变成必填，业务代码里 `service.create({ title: 'x' })` 就报缺少属性。

::: tip 记忆规则
- **给别人传的东西**（表单值、请求体、函数入参）→ `z.input`
- **校验后拿到的东西**（内部业务类型）→ `z.infer` / `z.output`
:::

## 五、为什么现在流行「schema 优先」

因为手写两遍一定会不同步：

```ts twoslash
import { z } from 'zod'
// ---cut---
// ❌ 反模式：schema 和类型各写一遍
type User = { name: string; age: number }
const UserSchema = z.object({ name: z.string(), age: z.number(), email: z.string() })
//    ^?
//                                                              ^^^^^ schema 多了一个字段，类型不知道
```

schema 改了，手写的类型不会跟着改。而且这个错误**不会报错**——它只会让你在某处读到 `undefined`。

正确方向只有一个：**schema 是唯一事实来源（single source of truth），类型从它推导。**

```
schema（运行时可执行）──推导──> TS 类型（编译期可见）
```

这一条也解释了为什么 Schema 库会顺带成为「类型工具」：它天然同时握着运行时值和编译期类型。

## 六、Standard Schema：真正的「主流」是这个

现在回答最关键的问题：**为什么各个框架突然都能接 zod 了？**

### 它解决的问题

以前：有 N 个校验库（zod、valibot、arktype、yup…）和 M 个消费方（表单库、路由、RPC、ORM）。每个消费方想支持所有校验库，就得写 N×M 个适配器。

现在：大家约定一个**极小接口**，校验库实现一次，消费方对接一次，N×M 变成 N+M。

### 规范本身

由 **zod、valibot、arktype 的作者共同设计**，核心就是一个属性 `~standard`：

```ts
interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': {
    readonly version: 1
    readonly vendor: string            // 'zod' | 'valibot' | 'arktype' | ...
    readonly validate: (value: unknown) => Result<Output> | Promise<Result<Output>>
    readonly types?: { input: Input; output: Output }   // 仅用于类型推导，运行时为空
  }
}
```

`validate()` 返回 `{ value }`（成功）或 `{ issues }`（失败），**不抛异常**，且可能是异步的。

::: warning 它不是校验库
`@standard-schema/spec` 这个包**只有类型定义，没有运行时代码**。你永远不会用它来定义 schema——它只是给库作者和框架作者用的契约。你照常用 zod 写 schema，框架照常读 `~standard`。
:::

### 谁实现了 / 谁在消费

| 角色 | 代表 |
| --- | --- |
| **实现者**（生产 schema） | Zod 3.24.0+、Valibot v1.0+、ArkType v2.0+、Effect Schema v3.13+、Yup 1.6+、Typia 7.3+ |
| **消费者**（接受 schema） | tRPC、TanStack Form / Router、React Hook Form、T3 Env、**NestJS 12** |

### 和 JSON Schema 不是一回事

很多人会混：

| | Standard Schema | JSON Schema |
| --- | --- | --- |
| 形态 | TypeScript 接口（进程内） | 数据格式 / 文档（可跨语言） |
| 用途 | 让不同校验库互换 | 跨服务、跨语言描述数据形状 |
| 例子 | tRPC 接受任意校验库 | OpenAPI 描述你的 API |

**互补**。很多库（zod、TypeBox）两者都能产出：Standard Schema 用于库之间的互操作，JSON Schema 用于跨服务边界。

## 七、三个库怎么选

同一个 schema，三种写法：

```ts
// zod —— 链式 API，生态最大
import { z } from 'zod'
const User = z.object({
  name: z.string().min(1),
  age: z.number().int().positive(),
  email: z.email(),
})

// valibot —— 函数式 pipe 组合，为 tree-shaking 而生
import * as v from 'valibot'
const User = v.object({
  name: v.pipe(v.string(), v.minLength(1)),
  age: v.pipe(v.number(), v.integer(), v.minValue(1)),
  email: v.pipe(v.string(), v.email()),
})

// arktype —— 语法就长成 TS 类型声明的样子
import { type } from 'arktype'
const User = type({
  name: 'string > 0',
  age: 'number.integer > 0',
  email: 'string.email',
})
```

| | zod | valibot | arktype |
| --- | --- | --- | --- |
| 语法风格 | 链式方法 | 函数式 `pipe` | **字符串类型语法** |
| 主打 | 生态最全、文档最好 | **极致 tree-shaking / 体积** | 类型层能力最强、运行时快 |
| 当前版本 | 4.6.5 | 1.5.0 | 2.2.3 |
| Standard Schema | ✅ | ✅ | ✅ |
| 适合 | 默认选择 | 前端 bundle 敏感 / 只要基础校验 | 复杂类型约束、追求运行时性能 |

::: details 关于体积（实测说明）
npm 上各包解压后的体积（2026-09-20 实测）：zod 约 6.0MB、valibot 约 1.8MB、arktype 约 0.33MB。

⚠️ **这不等于打包体积** —— 解压体积包含 sourcemap、多格式产物等。真正进 bundle 的大小取决于 tree-shaking 效果，请按你的打包器实测（用 `vite build --mode production` + bundle 分析工具看）。这里给数字只是说明量级差异确实存在。
:::

**怎么选**：

- **不确定就选 zod**。文档、Stack Overflow 答案、框架集成都是最全的。
- **前端产物敏感、校验规则简单** → valibot。它的 API 是拆成一个个小函数的，打包器能精准摇掉没用的。
- **类型约束复杂、或要极致的运行时性能** → arktype。它的字符串语法写复杂类型比链式清爽。

而且因为都实现了 Standard Schema，**换库不需要重写业务代码**——这正是这个规范的价值。

## 八、边界与坑

### 只在边界校验一次

```ts twoslash
import { z } from 'zod'
const UserSchema = z.object({ id: z.string(), name: z.string(), age: z.number() })
type User = z.infer<typeof UserSchema>
// ---cut---
// ✅ 边界 parse 一次，之后全部可信
async function fetchUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`)
  const data: unknown = await res.json()
  return UserSchema.parse(data)
  //     ^?
}

// ❌ 每个函数里都 parse 一遍 —— 性能浪费且说明你的类型边界没划清
```

`parse` 是要遍历整个结构的，别放在热路径或 render 里。

### 递归 schema 推不出类型

```ts twoslash
import { z } from 'zod'

type Category = { name: string; children: Category[] }
const CategorySchema: z.ZodType<Category> = z.lazy(() =>
  z.object({ name: z.string(), children: z.array(CategorySchema) }),
)
```

### 不要用 schema 替代所有类型

schema 管的是**外部输入的边界**。内部业务逻辑的类型、`Pick`/`Omit`/泛型工具类型、组件 props——这些照常用 TS 写，包一层 schema 只会让代码变慢变啰嗦。

### LLM 输出一定要校验

如果你在做 AI 应用（结构化输出 / function calling / tool use），模型返回的 JSON **不保证**符合你要求的格式。这一段尤其值得加 schema：

```ts
const ToolCallSchema = z.object({
  tool: z.enum(['search', 'calculator', 'none']),
  args: z.record(z.string(), z.unknown()),
})

const raw = await llm.complete(prompt)
const call = ToolCallSchema.safeParse(JSON.parse(raw))
if (!call.success) {
  // 模型返回了不合格式的东西 —— 重试或降级，别直接信任
  return retryWithRepairPrompt(raw, call.error)
}
```

模型会因为截断、幻觉、格式漂移返回意外结构，而 `JSON.parse` + `as` 会让这些意外一路流到业务逻辑里才炸。

## 九、速查

- 外部输入 → `unknown` → 边界 `parse` → 内部类型可信
- **类型永远从 schema 推导**，不手写第二遍
- 有 `transform` / `default` 时：`z.input` 给调用方，`z.output`/`z.infer` 给内部
- 内部断言 `parse`，面向用户输入 `safeParse`
- 复杂形态用 `discriminatedUnion`，别用一堆 optional 字段
- 递归 schema 要手写类型 + `z.ZodType<T>` 标注
- 选库：默认 zod，体积敏感 valibot，类型复杂 arktype（都实现了 Standard Schema，可换）

## 下一步

- [装饰器与 NestJS](./decorators) —— 另一种"运行时类型信息"机制（元数据）
- [Node 与服务端类型](./node) —— 服务端怎么划边界
