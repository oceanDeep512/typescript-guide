# ESM / CJS 与模块解析

"找不到模块"、"导入的东西是 undefined"、"构建能过但运行时报错"——八成是这块的问题。

## 两套模块系统

| | CommonJS | ESM |
| --- | --- | --- |
| 语法 | `require()` / `module.exports` | `import` / `export` |
| 加载 | 运行时同步加载 | 静态分析、可 tree-shaking |
| Node 识别 | `.cjs` 或 `package.json` 没有 `"type": "module"` | `.mjs` 或 `"type": "module"` |
| 顶层 `await` | 不支持 | 支持 |
| `__dirname` | 有 | 没有，要用 `import.meta.url` |

## package.json 的 type 字段

```jsonc
{
  "type": "module" // .js 文件被当作 ESM
  // 不写 或 "commonjs" → .js 被当作 CJS
}
```

这是最容易忽略的一条：你的 `tsconfig` 配的是 ESM，但 `package.json` 里没写 `"type": "module"`，Node 就会把编译产物当 CJS 解析，然后报 `Cannot use import statement outside a module`。

## moduleResolution 三选一

这是 tsconfig 里最容易配错的项。

### `Bundler` —— 打包器项目

```jsonc
{
  "module": "ESNext",
  "moduleResolution": "Bundler"
}
```

特点：
- 支持 `exports` / `imports` 字段
- **允许省略扩展名**：`import './foo'`
- 不要求 ESM 里写 `.js` 后缀

Vite / webpack / Rspack 项目选它。

### `NodeNext` —— 原生 ESM 的 Node / npm 包

```jsonc
{
  "module": "NodeNext",
  "moduleResolution": "NodeNext"
}
```

特点：
- 完全按 Node 的规则
- **ESM 里导入必须写扩展名**：`import './foo.js'`（注意是 `.js` 不是 `.ts`）
- 会根据最近的 `package.json` 的 `type` 判断每个文件是 ESM 还是 CJS

写 npm 包时选它，否则用户在不同环境里会遇到解析问题。

### `Node10`（旧称 `node`）

经典算法，**不认 `exports` 字段**。老项目才会用到。

## exports 字段

现代包的入口声明：

```jsonc
{
  "name": "my-lib",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./utils": {
      "types": "./dist/utils.d.ts",
      "import": "./dist/utils.js"
    }
  }
}
```

要点：

1. **`types` 必须写在最前面**——条件按顺序匹配
2. 每个子路径都要单独声明，否则 `import 'my-lib/utils'` 会失败
3. 写 `exports` 之后，**未声明的子路径一律不可导入**

## 双格式发布

同时提供 ESM 和 CJS：

```jsonc
{
  "main": "./dist/index.cjs",      // CJS 兜底（老工具）
  "module": "./dist/index.js",     // ESM 兜底（打包器）
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  }
}
```

CJS 和 ESM 的类型不同时（很少见），可以用 `types` 的两个条件：

```jsonc
{
  "exports": {
    ".": {
      "import": { "types": "./dist/index.d.mts", "default": "./dist/index.mjs" },
      "require": { "types": "./dist/index.d.ts", "default": "./dist/index.cjs" }
    }
  }
}
```

## 常见坑

### 1. 扩展名问题

ESM + `NodeNext` 下必须写扩展名，而且写的是**输出后的**扩展名：

```ts
// 源码 src/a.ts
import { foo } from './b.js' // 不是 './b'，也不是 './b.ts'
```

`moduleResolution: Bundler` 或 `Node10` 则不用写。

### 2. 导入 CJS 包的默认值

```ts
import express from 'express' // 需要 esModuleInterop: true
import * as express from 'express' // 不开时的写法
```

开了 `esModuleInterop` 后，TS 会在转译产物里加 interop 辅助函数。**Babel / esbuild 默认行为等价于开着它**，所以 tsconfig 里关掉会导致两边行为不一致。

### 3. `__dirname` 在 ESM 里不存在

```ts twoslash
// @module: esnext
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
//    ^?
```

要在 tsconfig 里加 `"types": ["node"]` 才能用 `node:*` 前缀。

### 4. 顶层 await

```ts twoslash
// @module: esnext
// ESM 才能用
const data = await fetch('/api')
//    ^?
```

CJS 下会报错。需要 `module: ESNext` + `"type": "module"`。

### 5. 构建能过但运行时报错

这是**类型解析和运行时解析不一致**的典型症状：

| 症状 | 原因 |
| --- | --- |
| `Cannot find module './foo'` | tsconfig 配了 Bundler 但 Node 用 NodeNext 跑 |
| `require() of ES Module` | 产物是 ESM 但没有 `"type": "module"` |
| 导入得到 `undefined` | CJS 的 `module.exports` 和 ESM 的 default 互操作问题 |

排查第一步：确认 `tsc --showConfig` 里的 `module` / `moduleResolution`，再确认 `package.json` 的 `type`。

## verbatimModuleSyntax

TS 5.0 的开关，取代 `isolatedModules` + `importsNotUsedAsValues`：

```jsonc
{ "verbatimModuleSyntax": true }
```

作用：**类型导入必须显式写 `import type`**，且不会被转译器偷偷删掉。

```ts
import type { User } from './types'   // 类型
import { fetchUser } from './api'     // 值
import { type Config, init } from './config' // 内联混合
```

为什么重要：esbuild / swc / Babel 是单文件转译，它们分不清 `import { User }` 是类型还是值。开了这个开关，TS 会强制你写清楚，避免产物里出现"导入了一个不存在的导出"。

## 快速诊断清单

遇到模块问题，按顺序检查：

1. `package.json` 里有没有 `"type": "module"`？和你的产物格式一致吗？
2. `tsconfig` 的 `module` / `moduleResolution` 是哪一对？
3. 导入路径有没有写扩展名（NodeNext 需要）？
4. `esModuleInterop` 开了吗？
5. 三方包的 `exports` 字段里有没有 `types` 条件？
6. 跑 `tsc --showConfig` 看最终生效的配置
7. 跑 `tsc --explainFiles` 看某个文件为什么被引入

## 下一步

- [发布带类型的包](./publish)
