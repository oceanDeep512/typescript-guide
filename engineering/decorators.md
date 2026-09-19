# 装饰器：从语法到 NestJS 的依赖注入

装饰器是 TS 里最"像魔法"的语法，但在 NestJS 里它是基础设施。这篇把它拆成三层讲：**语法**（怎么写）、**原理**（编译器做了什么）、**NestJS**（为什么非它不可）。

## 一句话：装饰器是「在定义时执行的标注函数」

```ts
@Controller('users')   // ← 这个就是装饰器
class UsersController {}
```

去掉语法糖，它等价于：

```ts
class UsersController {}
// 类定义完成后，立刻执行一次
Controller('users')(UsersController)
```

三个关键点：

1. **它只是一个函数**，`@` 是调用它的语法糖
2. **在类加载/定义时执行一次**，不是每次调用方法时执行——看到"装饰器只在启动时跑一次"不要意外
3. **它不改变你的逻辑**。装饰器能做的事只有：修改被装饰的目标，或者**往旁边记一条元数据**——而 NestJS 用的是后者

## 两套装饰器，先分清你在用哪套

这是最容易踩的第一坑：**TypeScript 里存在两套不兼容的装饰器**。

| | **Legacy（实验性）** | **标准（TC39 Stage 3）** |
| --- | --- | --- |
| 开启方式 | `"experimentalDecorators": true` | TS 5.0 起默认开启 |
| 来源 | 2014 年的旧提案 | 已进入标准的提案 |
| 函数签名 | `(target, key, descriptor)` | `(target, context)` |
| 参数装饰器 | ✅ 支持 | ❌ 不支持 |
| `emitDecoratorMetadata` | ✅ 支持 | ❌ 不支持 |
| 谁在用 | **NestJS、Angular、TypeORM、MobX、InversifyJS** | 新项目、不依赖 DI 的库 |

**怎么判断**：看你 `tsconfig.json` 里有没有 `experimentalDecorators: true`。有 → legacy 模式；没有 → 标准模式。两者不能混用。

::: warning 为什么 NestJS 必须用 legacy
因为 NestJS 的依赖注入**同时需要两件只有 legacy 模式才有的东西**：

1. **参数装饰器** —— `@Param('id') id: string` 这种写法，标准装饰器没有这个概念
2. **`emitDecoratorMetadata`** —— 把构造函数的参数类型写进运行时元数据，标准装饰器不支持

所以即便标准装饰器更"正规"，NestJS / Angular / TypeORM 生态短期内也迁不过去。新项目如果不用这些框架，用标准装饰器即可。
:::

## 四类装饰器的签名

legacy 模式下，装饰器放在不同位置，拿到的参数不同：

```ts
// ① 类装饰器：拿到构造函数
function Controller<T extends new (...args: any[]) => any>(target: T): T | void {}

// ② 方法装饰器：拿到原型 + 方法名 + 属性描述符
function Get(target: any, key: string, descriptor: PropertyDescriptor) {}

// ③ 属性装饰器：拿到原型 + 属性名（没有 descriptor！）
function Column(target: any, key: string) {}

// ④ 参数装饰器：拿到原型 + 方法名 + 参数下标
function Param(target: any, key: string, index: number) {}
```

注意 ③：**属性装饰器拿不到 `PropertyDescriptor`**，因为类字段在原型上根本不存在描述符。想改属性行为得配合 `Object.defineProperty` 自己造一个。

### 执行顺序：求值从上到下，应用从下到上

```ts
class C {
  @A()
  @B()
  method() {}
}
// ① 求值：A() 先执行，B() 后执行
// ② 应用：B 先包裹 method，A 再包裹 B 的结果
```

也就是说**离声明最近的装饰器最先生效**。同一类/方法上叠多个装饰器时，这个顺序决定了谁包谁。

## 元数据：NestJS 到底靠什么工作

这是本篇的核心。NestJS 的依赖注入能用，靠的是一条链路：**类型擦除 → 元数据发射 → 运行时读取**。

### 问题的起点：运行时不知道类型

```ts
class UsersController {
  constructor(private usersService: UsersService) {}
}
```

TypeScript 编译后，`: UsersService` 这个标注**被完全擦除**。运行时只知道有个参数，不知道该传什么进去。想自动注入，就必须让运行时拿到这个类型信息。

### 解法：`emitDecoratorMetadata`

```jsonc
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

开启后，编译器会为**带装饰器的声明**额外生成元数据。一共三个 key：

| Key | 含义 |
| --- | --- |
| `design:type` | 属性/方法的类型 |
| `design:paramtypes` | 构造参数或方法参数的类型**数组** |
| `design:returntype` | 方法返回类型 |

::: danger 触发条件：必须有装饰器
**没有装饰器，就不会发射任何元数据。** 这是最多人不知道的一条。

```ts
// ❌ 没有装饰器 → 不发射元数据 → NestJS 无法注入
class UsersController {
  constructor(private usersService: UsersService) {}
}

// ✅ 有装饰器 → 发射 design:paramtypes → 能注入
@Controller('users')
class UsersController {
  constructor(private usersService: UsersService) {}
}
```

反过来也成立：**只要有任意一个装饰器**，这个类/方法/参数的完整元数据就都会发射。所以实践上"类上加了 `@Controller`/`@Injectable`"就顺带解决了构造参数的元数据问题。
:::

### 看一眼真实产物

实测（TypeScript 7.0.2，`experimentalDecorators` + `emitDecoratorMetadata`）：

```ts
// 源码
@Controller('users')
class UsersController {
  @Get(':id')
  findOne(@Param('id') id: string): string { return id }
}
```

```js
// 编译产物（节选）
__decorate([
    Get(':id'),
    __param(0, Param('id')),                      // ← 参数装饰器
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),    // ← 参数类型被写进来了
    __metadata("design:returntype", String)
], UsersController.prototype, "findOne", null);

UsersController = __decorate([ Controller('users') ], UsersController);
```

运行时用 `reflect-metadata` 就能读回来：

```ts
import 'reflect-metadata'
Reflect.getMetadata('design:paramtypes', UsersController.prototype, 'findOne')
// → [String]
```

`reflect-metadata` 是 NestJS 的 peer 依赖（`@nestjs/core@12` 仍声明 `reflect-metadata ^0.1.12 || ^0.2.0`），它提供 `Reflect.defineMetadata` / `getMetadata` 这套 API。

## NestJS 里的完整链路

把这些串起来，`@Injectable()` + 构造函数注入到底发生了什么：

```
① 你写：constructor(private usersService: UsersService)
                    ↓
② 编译时（emitDecoratorMetadata）
   生成 Reflect.defineMetadata('design:paramtypes', [UsersService], UsersController)
                    ↓
③ 启动时，Nest 扫描 @Module({ providers: [...] })，把 UsersService 登记进容器
                    ↓
④ 实例化 UsersController 时
   Reflect.getMetadata('design:paramtypes', UsersController) → [UsersService]
                    ↓
⑤ 按类型去容器里找，找到就注入，没有就 new 一个并缓存
```

**所以在 NestJS 里，类型不只是给 IDE 看的——它就是依赖注入的 key。**

### 各类装饰器对应关系

```ts
import { Controller, Get, Injectable, Module, Param } from '@nestjs/common'

@Module({ providers: [UsersService], controllers: [UsersController] })  // 类装饰器
export class UsersModule {}

@Injectable()          // 类装饰器：标记"可被注入"
export class UsersService {}

@Controller('users')   // 类装饰器：标记路由前缀
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get(':id')                      // 方法装饰器：HTTP 方法 + 路径
  findOne(@Param('id') id: string) // 参数装饰器：从 request 里取值
    { return this.usersService.findOne(id) }
}
```

规律很整齐：**类装饰器说"我是 Nest 的什么"，方法装饰器说"这个方法对应哪个 HTTP 动作"，参数装饰器说"这个参数从 request 的哪里取"。**

## NestJS 常见坑

### 1. 忘了 `import 'reflect-metadata'`

症状：`Nest can't resolve dependencies of the XController (?)`，或者元数据读出来是 `undefined`。

```ts
// main.ts —— 必须是第一个 import
import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
```

NestJS 内部会引，但你自己写装饰器、或者用 `Reflect.getMetadata` 时如果顺序不对就会读空。

### 2. 拿 interface 当依赖注入的 token

```ts
interface UserRepo { find(id: string): Promise<User> }

@Injectable()
class UsersService {
  // ❌ interface 编译后完全消失，design:paramtypes 里没有它
  constructor(private repo: UserRepo) {}
}
```

`emitDecoratorMetadata` 只能发射**运行时存在的东西**（class、String、Number 这类构造函数）。`interface`、`type`、`import type` 全部擦除，注入必然失败。

解法：用 class（哪怕是个抽象类）当 token，或者显式指定：

```ts
@Injectable()
class UsersService {
  constructor(@Inject('USER_REPO') private repo: UserRepo) {}
}
```

### 3. 循环依赖导致元数据丢失

两个模块互相 import 时，其中一个在解析时可能还是 `undefined`，`design:paramtypes` 就拿到了 `undefined`。

```ts
@Module({
  imports: [forwardRef(() => UsersModule)],  // 用 forwardRef 打破循环
})
export class AuthModule {}
```

### 4. 用 esbuild 构建 NestJS 会炸

**esbuild 不支持 `emitDecoratorMetadata`**（官方明确说不打算支持），也不完整支持 legacy 装饰器的元数据语义。所以：

| 构建方式 | 能用吗 |
| --- | --- |
| `tsc` | ✅ 官方路径 |
| `swc`（NestJS CLI 的 `-b swc`） | ✅ 支持，快很多 |
| `esbuild` | ❌ 元数据丢失 |
| `tsx` / Node 原生类型剥离 | ❌ 同上 |

NestJS 官方文档给的做法是 `npm run start -- -b swc`（用 SWC builder，构建快约 20 倍）。

::: tip 和工具链篇的关系
这条是 [工具链篇](./toolchain) 里"esbuild 不能处理所有 TS 语法"的具体案例：装饰器 + 元数据是**需要跨文件类型信息**才能生成的，而 esbuild 是单文件转译。
:::

### 5. 自定义装饰器的两种写法

NestJS 里写一个自己的装饰器通常是这两种之一：

```ts
import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common'

// ① 贴元数据：给守卫/拦截器读（比如权限标记）
export const Roles = (...roles: string[]) => SetMetadata('roles', roles)

// 用法
@Get('admin')
@Roles('admin')
adminOnly() {}

// ② 参数装饰器：从 request 里抽东西
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest()
    return req.user
  },
)

// 用法
@Get('me')
me(@CurrentUser() user: User) { return user }
```

② 的本质就是前面说的**参数装饰器**：把"这个参数该拿什么"记进元数据，Nest 在处理请求时按元数据填值。

### 6. NestJS 12 起：装饰器直接接 schema 校验

NestJS 12（`@nestjs/core@12.0.3`）在**路由参数装饰器**上原生支持 [Standard Schema](./schema)，也就是说 zod / valibot / arktype 的 schema 可以直接挂到装饰器上：

```ts
import { Body, Controller, Get, Param, Post } from '@nestjs/common'
import { z } from 'zod'

const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
})

@Controller('users')
export class UsersController {
  @Post()
  create(@Body({ schema: CreateUserSchema }) body: z.infer<typeof CreateUserSchema>) {
    return this.usersService.create(body)
  }

  @Get(':id')
  findOne(@Param('id', { schema: z.coerce.number().int().positive() }) id: number) {
    return this.usersService.findOne(id)
  }
}
```

装饰器只负责**挂元数据**，真正的校验要注册一个全局管道：

```ts
// main.ts
import { StandardSchemaValidationPipe } from '@nestjs/common'

app.useGlobalPipes(new StandardSchemaValidationPipe())
```

要点：

- 同一份 schema 还能喂给 OpenAPI 生成 —— 和 [schema 优先](./schema) 的思路完全一致
- 老方案（class-validator + DTO class）**仍然完全支持**，官方没有移除计划
- 序列化方向也有对应物：`StandardSchemaSerializerInterceptor` + `@SerializeOptions({ schema })`

::: tip 这条把两件事连起来了
装饰器解决的是「把元信息挂到代码上」，schema 解决的是「运行时校验外部数据」。NestJS 12 把二者拼在了一起：**用装饰器声明用哪份 schema 校验**。详见 [Schema 与运行时校验](./schema)。
:::

## TypeScript 6 / 7 下要注意什么

::: tip 实测结论（2026-09-20，TypeScript 7.0.2）
**TS 7 完整支持 legacy 装饰器和 `emitDecoratorMetadata`。** 我用一个最小 NestJS 风格样例实测（类/方法/参数装饰器 + `design:type` / `design:paramtypes` / `design:returntype` 三种元数据），类型检查和产物发射都正常，运行时 `Reflect.getMetadata` 也读得到。

也就是说 Go 版编译器**没有砍掉装饰器这条链路**，NestJS 项目可以升 TS 7。
:::

需要注意的反而是别的改动：

1. **`rootDir` 默认值变了**（TS 6 起）。实测时我先撞上了这个：
   ```
   error TS5011: The common source directory of 'tsconfig.json' is './src'.
   The 'rootDir' setting must be explicitly set...
   Visit https://aka.ms/ts6 for migration information.
   ```
   显式写 `"rootDir": "./src"` 即可，详见 [tsconfig 篇](../guide/tsconfig)。

2. **`strict` 默认开启**。老 NestJS 项目如果一直靠 `strictNullChecks: false` 活着，升级后会一次性冒出大量报错。

3. **TS 7 不带程序化 API** —— 但这**不影响装饰器本身**（装饰器是编译器特性，不是 API）。受影响的是 `vue-tsc`、typescript-eslint 这类工具，见 [TypeScript 6 与 7](../guide/typescript-7)。

## 速查

- 用 NestJS / Angular / TypeORM → 必须 `experimentalDecorators: true` + `emitDecoratorMetadata: true`
- 元数据**只在有装饰器的地方**发射
- `interface` / `type` 不能当 DI token，会被引射成 `undefined`
- 构建用 `tsc` 或 `swc`，**别用 esbuild**
- `import 'reflect-metadata'` 放在入口第一行
- 循环依赖 → `forwardRef()`
- 装饰器求值从上到下、应用从下到上

## 下一步

- [Schema 与运行时校验](./schema) —— 另一半"运行时信息"的问题：外部数据怎么校验
- [工具链分工](./toolchain) —— 谁支持装饰器、谁不支持
