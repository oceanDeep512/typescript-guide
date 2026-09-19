# 编译流程：tsc 还是 Babel

这是最容易被跳过、但会让你后面一直踩坑的一节。绝大多数"为什么我的类型没报错""为什么线上行为跟类型不一致"的问题，根子都在没搞清**谁负责什么**。

## 两件事，两套工具

把 TS 变成能跑的 JS，其实是两件独立的事：

| 事 | 谁做 | 产物 |
| --- | --- | --- |
| **类型检查** | 只有 `tsc` | 无产物，只报错 |
| **语法转译**（降级、JSX、装饰器） | `tsc` / Babel / swc / esbuild 都能做 | JS |

关键结论：**Babel、swc、esbuild 只做转译，一行类型检查都不做。** 它们的工作方式是"把类型注解当成要删掉的注释"直接抹掉。

```bash
# 只做转译，不管类型对不对
esbuild src/index.ts --outfile=dist/index.js

# 只做类型检查，不产生任何文件
tsc --noEmit
```

所以现代项目的标准做法是**两者都跑**：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "typecheck": "tsc --noEmit"
  }
}
```

Vite / webpack / Next.js 内部用的是 esbuild 或 swc 做转译，**它们不会替你检查类型**。如果构建脚本里没有 `tsc --noEmit`，你的 CI 等于完全没有类型保障。

::: tip 🆕 TS7：这张表没变，但 `tsc` 换了个实现
从 TS 7.0（2026-07-08）起，官方 `tsc` 是 **Go 写的原生编译器**，同一份代码的全量检查快 8～12 倍。分工没变——**类型检查仍然只有 `tsc` 能做**，esbuild / swc / Babel 依然一行都不检查。

需要注意的只有一点：**TS 7.0 不带程序化 API**，所以 `vue-tsc` 这类包装器、以及调 TS API 生成 `.d.ts` 的工具暂时还要用 6.0 的实例。详见 [TypeScript 6 与 7](./typescript-7)。
:::

## 类型擦除

TS 的类型在编译后 100% 消失，运行时不存在。

```ts
interface User { name: string }
function greet(u: User): string {
  return `hi ${u.name}`
}
```

转译后：

```js
function greet(u) {
  return `hi ${u.name}`;
}
```

推论有几个，都很重要：

1. **TS 不做运行时校验**。前端收到的 API 响应、用户输入的 JSON，类型标注只是"你声称它长这样"，实际可能是任何东西。要做运行时校验得用 zod / valibot / arktype 这类库，并从 schema 反推类型。
2. **不能用类型做运行时分支**。`if (typeof x === 'string')` 还得自己写；`instanceof` 也还是运行时的事。
3. **`enum` 和 `namespace` 是例外**，它们会生成真实代码。这也是社区普遍推荐用 `as const` 对象代替 `enum` 的原因之一。

## 各转译器对比

| 工具 | 类型检查 | 速度 | 常见场景 |
| --- | --- | --- | --- |
| `tsc` | 是 | 慢 | 类型检查、`--declaration` 生成 `.d.ts` |
| Babel | 否 | 中 | 老项目、需要复杂插件链 |
| swc | 否 | 很快 | Next.js 默认、Rspack |
| esbuild | 否 | 极快 | Vite dev / 构建 |

一个必须知道的坑：**Babel / esbuild / swc 都是单文件转译**，它们看不到跨文件的信息。这带来两个限制：

- 不支持 `const enum`（需要跨文件内联值）
- 旧写法里 `export type` 和 `export interface` 无法和值导出区分，会生成错误的 JS

因此有了两个必须开的编译选项：

```jsonc
{
  "compilerOptions": {
    // 强制每个文件都能被独立转译（禁止 const enum 等）
    "isolatedModules": true,
    // 5.0+：类型导入导出必须显式写 import type / export type
    "verbatimModuleSyntax": true
  }
}
```

::: tip 实践建议
新项目直接开 `verbatimModuleSyntax: true`。它取代了 `isolatedModules` + `importsNotUsedAsValues` 的组合，能彻底避免"类型被当成值导入"导致打包产物异常。
:::

## 声明文件（.d.ts）

如果你要发布一个库，需要生成类型声明：

```jsonc
{
  "compilerOptions": {
    "declaration": true,       // 生成 .d.ts
    "declarationMap": true,    // 生成 .d.ts.map，点击跳转回源码
    "emitDeclarationOnly": true // 只生成声明，JS 交给别的工具
  }
}
```

`.d.ts` 里只有类型，没有实现。它是"这个包长什么样"的契约，也是 IDE 补全的来源。详见[发布带类型的包](../engineering/publish)。

::: warning 🆕 TS7：生成 `.d.ts` 这条路在 7.0 下要绕一下
`.d.ts` 生成是目前**唯一必须依赖完整类型检查程序**的环节，而 TS 7.0 **不提供程序化 API**。所以 `tsup` / `rollup-plugin-dts` / `api-extractor` 这类"调 TS API 出声明"的工具，在 `typescript@7` 下拿不到能用的 `createProgram`。

三个解法，按推荐度：

1. **给 dts 工具喂 6.0**：装 `@typescript/typescript6` 并用 npm alias 指过去，`tsc` 仍用 7.0
2. **用非 TS 实现的 dts 生成器**：`tsdown`（Oxc）等，不经过 TS API
3. **开 `isolatedDeclarations`**：让声明能单文件推导，从根上不再需要完整 program

见 [工具链篇](../engineering/toolchain) 与 [TypeScript 6 与 7](./typescript-7)。
:::

## skipLibCheck 为什么大家都开

```jsonc
{
  "compilerOptions": { "skipLibCheck": true }
}
```

它跳过对**所有 `.d.ts` 文件**的类型检查，只检查你自己的代码。之所以几乎必开：

- `node_modules` 里几万个三方 `.d.ts`，全量检查会让 `tsc` 慢好几倍
- 不同库的声明文件之间经常互相冲突（尤其是 React 18 生态的 `@types/react` 版本打架）
- 这些错误你根本修不了

代价：三方库声明文件里的错误不会被发现。这通常是可以接受的。

## 一条完整的检查命令

```bash
# 完整显示被截断的类型（调试复杂类型时必开）
tsc --noEmit --noErrorTruncation

# 看看某个文件为什么被引入、用了哪份 tsconfig
tsc --noEmit --explainFiles

# 列出最终生效的所有编译选项
tsc --showConfig

# 🆕 TS7：调类型检查并发度（默认 4）
tsc --noEmit --checkers 8
```

`--noErrorTruncation` 请记牢。类型复杂之后，报错信息会被 TS 折叠成 `Type 'X' is not assignable to type 'DeepPartial<...>'`，不开这个开关你根本看不到问题在哪。

## 下一步

- [TypeScript 6 与 7：编译器换引擎了](./typescript-7)
- [tsconfig 逐项精讲](./tsconfig) —— 每个开关到底在做什么
- [工具链分工](../engineering/toolchain) —— tsc / esbuild / tsx / tsup / vite 各自管哪一段
- [基础类型](./basic-types) —— 进入语言本身
