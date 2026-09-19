# 声明文件与模块解析

`.d.ts` 是"只有类型、没有实现"的文件。理解它，你才能给三方库打补丁、发布带类型的包。

## 什么是声明文件

```ts
// types.d.ts
declare const VERSION: string
declare function fetchUser(id: string): Promise<{ name: string }>
declare class Logger {
  log(msg: string): void
}
```

`declare` 的意思是"这个东西在别处（运行时）已经存在了，你只要知道它的类型"。编译后不产生任何代码。

## 三方库的类型从哪来

按顺序查找：

1. 包自带的 `types` / `typings` 字段（很多库自己写了 `.d.ts`）
2. 包根目录的 `index.d.ts`
3. `@types/xxx`（DefinitelyTyped）
4. 都没有 → 报错 `Could not find a declaration file`

第 4 种情况的快速解决：

```ts
// src/shims.d.ts
declare module 'some-untyped-lib'
```

这会给它 `any` 类型，能用但没提示。

## 模块声明与增强

### 给已有模块加东西（模块增强）

```ts
// src/augment.d.ts
import 'express'

declare module 'express' {
  interface Request {
    userId?: string // 给 Request 加字段
  }
}
```

注意：文件里必须有 `import` 或 `export`，否则 `declare module` 会被当成"声明一个新模块"而不是"增强已有模块"。这是最常见的坑。

### 声明全局

```ts
// src/global.d.ts
declare global {
  interface Window {
    __APP_VERSION__: string
  }
  var process: {
    env: { NODE_ENV: string }
  }
}

export {} // 必须有，让这个文件成为模块
```

`declare global` 只能在模块文件里用，所以文件末尾要加 `export {}`。

### 声明资源模块

```ts
declare module '*.css' {
  const content: Record<string, string>
  export default content
}
declare module '*.svg' {
  const src: string
  export default src
}
```

Vite 项目里这些由 `vite/client` 提供，加一行引用即可：

```ts
/// <reference types="vite/client" />
```

## 三斜杠指令

```ts
/// <reference path="./other.d.ts" />
/// <reference types="node" />
/// <reference lib="es2021" />
```

- `path`：引用另一个文件
- `types`：引用 `@types/xxx`
- `lib`：引用内置 lib

现代项目里用得少，`types` 的活儿大多由 tsconfig 的 `types` / `lib` 字段接管了。

## 模块解析策略

`moduleResolution` 决定了 `import 'x'` 去哪里找文件。三种：

### Node10（旧称 `node`）

经典 Node 算法：查 `node_modules/x/package.json` 的 `main`/`types`，没有就找 `index.d.ts`。**不认识 `exports` 字段。**

### Bundler

给打包器用的：支持 `exports`、允许省略扩展名、不要求 ESM 里写 `.js` 后缀。Vite / webpack 项目选它。

### NodeNext

最严格：完全按 Node 的 ESM/CJS 规则来，**ESM 里导入必须写扩展名**。写 npm 包时选它。

详见 [ESM / CJS 与模块解析](../engineering/module)。

## 常见坑

### 1. 增强不生效

```ts
// 错误：没有 import/export，这是"声明一个新模块"
declare module 'express' {
  interface Request {
    userId: string
  }
}
```

正确写法是文件顶部加 `import 'express'` 或任意 `export {}`，让文件成为模块。

### 2. `types` 字段把全局类型挤掉了

```jsonc
{
  "compilerOptions": {
    "types": ["node"] // 只有 @types/node 会被自动引入
  }
}
```

一旦显式写了 `types`，其他 `@types/*` 就不再自动引入。想保留全部就别写这个字段。

### 3. 类型与运行时不一致

`.d.ts` 是你手写的承诺，编译器不校验它和实现是否匹配。发布包时务必用 `tsc --declaration` **自动生成**，而不是手写。

### 4. `skipLibCheck` 会掩盖错误

开了它，`.d.ts` 内部的错误不报。你写的增强如果有语法错误，可能不会立刻暴露。

## 给三方库打补丁的完整流程

以"给某个库补一个缺失的导出"为例：

```ts
// src/types/fix.d.ts
import 'some-lib'

declare module 'some-lib' {
  // 补一个缺失的导出
  export function missingFn(x: string): number
}

export {}
```

然后确认 `tsconfig.include` 包含了 `src/types`（或直接放 `src/` 下）。

验证：

```bash
tsc --noEmit --noErrorTruncation
```

## 下一步

- [泛型基础](../generics/)
