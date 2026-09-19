# 发布带类型的包

自己维护 npm 包时，目标是**用户 `npm i your-lib` 之后不用装 `@types/xxx` 就有完整提示**。

## 最小配置

```jsonc
{
  "name": "my-lib",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist"]
}
```

四个关键字段：

| 字段 | 作用 | 给谁看 |
| --- | --- | --- |
| `types` | 老式类型入口兜底 | 旧版 TS / 老工具 |
| `exports["."].types` | 现代类型入口 | TS 4.7+ / Node |
| `main` | CJS 入口 | Node `require` |
| `module` | ESM 入口 | 打包器（非标准但广泛支持） |

<Callout type="warn">

`exports` 里的 **`types` 必须放在第一位**。条件是按顺序匹配的，放在 `import` / `require` 后面就永远轮不到。

</Callout>

## 生成声明文件

```jsonc
{
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true, // 点击跳转回源码，而不是跳进 .d.ts
    "emitDeclarationOnly": true, // 只出声明，JS 交给别的工具
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

完整构建流程通常是两条腿：

```jsonc
{
  "scripts": {
    "build:types": "tsc -p tsconfig.build.json",
    "build:js": "tsup src/index.ts --format esm,cjs --dts false",
    "build": "npm run build:types && npm run build:js"
  }
}
```

或者直接用 `tsup` / `unbuild` 这类工具，它们内置了 `.d.ts` 生成（底层还是 `tsc` 或 `rollup-plugin-dts`）。

## 多入口

每个子路径导出都要单独生成声明：

```jsonc
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./utils": {
      "types": "./dist/utils.d.ts",
      "import": "./dist/utils.js"
    }
  }
}
```

忘了声明某个子路径，用户 `import 'my-lib/utils'` 会直接失败（Node 的 `exports` 是白名单）。

## 打包声明：要不要 bundle

两种策略：

| 策略 | 做法 | 优点 | 缺点 |
| --- | --- | --- | --- |
| 不打包 | `tsc` 直接输出，目录结构和源码一致 | 简单、跳转准确 | 用户要能解析到所有内部 `.d.ts` |
| 打包成一个 | 用 `rollup-plugin-dts` / `tsup --dts` 合并成单个 `.d.ts` | 一份文件、无内部路径泄漏 | 依赖类型必须可解析 |

小库推荐打包成单文件；大库（有复杂内部引用）保持目录结构。

打包时注意：**外部依赖不要打进去**，只打包自己的类型。

## 暴露类型给用户

用户需要能 `import type { Config } from 'my-lib'`，所以入口要 `export type`：

```ts
// src/index.ts
export { createClient } from './client'
export type { Config, ClientOptions } from './types'
export type { Result, StreamEvent } from './stream'
```

用 `export type` 而不是 `export`，配合 `verbatimModuleSyntax` 更干净。

## 版本兼容声明

如果你的类型依赖某个最低 TS 版本：

```jsonc
{
  "typesVersions": {
    "<4.7": {
      "*": ["./dist/legacy/*"]
    }
  }
}
```

多数情况下不需要。更常见的是声明支持的 Node / TS 版本：

```jsonc
{
  "engines": { "node": ">=18" }
}
```

## 发布前自检清单

- [ ] `npm pack --dry-run` 看看实际会上传哪些文件（`.d.ts` 在里面吗？）
- [ ] 确认 `files` 或 `.npmignore` 不会把 `dist` 排除掉
- [ ] 用一个全新的测试项目 `npm i` 本地产物，确认不用装 `@types`
- [ ] 测两种导入方式：`import` 和 `require`
- [ ] 测 `moduleResolution` 三种配置下的解析（Bundler / NodeNext / Node10）
- [ ] 确认 `exports` 里 `types` 在第一位

### 本地验证的最快方式

```bash
# 在包目录
npm pack

# 在测试项目
npm i ../my-lib/my-lib-1.0.0.tgz
```

然后写一个 `test.ts` 尝试导入，看有没有提示。

## 常见问题

### 1. 用户报"找不到类型"

先确认三件事：
- `types` / `exports.types` 指向的文件真的存在（在 `npm pack` 的产物里）
- 那个 `.d.ts` 里真的 `export` 了你用到的名字
- 用户的 `moduleResolution` 能理解 `exports` 字段（Node10 不行）

### 2. 提示跳到 `any`

通常是依赖的类型没解析到：

```ts
import type { Foo } from 'another-lib' // another-lib 没被用户安装
```

如果你的 `.d.ts` 里 import 了一个 **devDependency** 的类型，用户那边就解析不到。解决：把这类依赖移到 `dependencies`，或者把那个类型内联进来。

### 3. `skipLibCheck` 掩盖了问题

你自己开发时开了 `skipLibCheck`，`.d.ts` 的错误不报，但用户那边（如果没开）会报错。发布前临时关掉跑一次：

```bash
tsc --noEmit --skipLibCheck false
```

### 4. 声明文件和实现不同步

永远用 `tsc` **自动生成** `.d.ts`，不要手写。手写的一定会和实现漂移。

## 用工具简化

- **tsup**：零配置，内置 dts
- **unbuild**（unjs）：rollup + dts，适合库
- **publint**：检查 package.json 的字段是否正确
- **arethetypeswrong.github.io**：在线检查你的包在各种配置下的类型解析结果

```bash
npx publint
```

这两个工具能在发布前抓出 90% 的配置问题。

## 下一步

- 回到[工程实践概览](./)
