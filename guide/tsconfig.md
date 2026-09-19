# tsconfig 逐项精讲

`tsconfig.json` 是 TS 项目里唯一必须存在的配置文件，但大多数人是复制一份就再也不看。这一节按"你会不会用到"排序，把每一项写成**带注释的完整配置**，再逐个拆开说明它在做什么、默认值有什么坑。

::: tip
下文所有默认值均对照 **TypeScript 5.9**（本页站点编译时使用的版本）。官方完整列表见 [TSConfig Reference](https://www.typescriptlang.org/tsconfig)。
:::

::: warning 如果你用的是 TypeScript 6 / 7
**一批默认值改了，一批选项被删了。** 本页里凡是有变化的条目，下方都挂了 🆕 TS7 提示块。完整迁移步骤见 [TypeScript 6 与 7](./typescript-7)。

最要紧的三条，升级前先记住：

- `types` 默认从「自动包含所有 `@types/*`」变成 `[]` —— 升级后 `process`、`describe` 会集体报"找不到名称"
- `rootDir` 默认从「推断的公共目录」变成 `.` —— 产物会多套一层 `dist/src/`
- `baseUrl` 被删除、`target: es5` 被删除、`moduleResolution: node10` 被删除
:::

## 一、先抄配置：三种常见形态

先给结论。下面三份是可以直接用的基线，**每一行都有注释**，先看这里，再看后面的逐项拆解。

### 1. 前端应用（Vite / Next / webpack / Rspack）

```jsonc
{
  "compilerOptions": {
    /* ── 语言与运行环境 ───────────────────────────── */
    // 产物 JS 的语法版本。只管"语法降级"，不管类型。
    // 默认 ES5（很老，会把可选链、async/await 全降级成一坨 helper）。
    // 前端有打包器兜底，直接给高版本，让打包器按 browserslist 去降级。
    "target": "ES2022",
    // 允许你在代码里用哪些内置 API 的类型。
    // 不写时按 target 推断，且默认包含 DOM —— 所以 DOM 项目其实可以不写，但显式写更稳。
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    // JSX 编译方式。打包器项目一律 preserve：TS 不碰 JSX，原样丢给 esbuild/babel。
    // 只有当你用 tsc 直接产出 JS 时才需要改 react-jsx。
    "jsx": "preserve",

    /* ── 模块 ────────────────────────────────────── */
    // 用打包器 → ESNext + Bundler，这是当前唯一推荐的组合。
    "module": "ESNext",
    "moduleResolution": "Bundler",
    // 强制把每个文件都当成模块（而不是全局脚本）。
    // 不开的话，一个没有 import/export 的 .ts 文件里的变量会泄漏到全局作用域，
    // 然后你会遇到" Cannot redeclare block-scoped variable 'xxx' "。
    "moduleDetection": "force",
    // 不改写、不删除任何 import/export：写了 import 就一定出现在产物里。
    // 强制你区分 import type 和 import，避免打包器把只剩类型的 import 留着导致循环依赖。
    // TS 内部对它的检查等价于 isolatedModules，两者通常一起写。
    "verbatimModuleSyntax": true,
    "isolatedModules": true,

    /* ── 严格性 ──────────────────────────────────── */
    "strict": true,
    // 下面三个不在 strict 里，但收益极高，建议全开（后面有详细解释）
    "noUncheckedIndexedAccess": true,   // arr[0] / obj[k] 一律带上 | undefined
    "exactOptionalPropertyTypes": true, // 区分"属性不存在"和"属性存在但值是 undefined"
    "noImplicitOverride": true,         // 子类覆盖父类方法必须写 override
    "noFallthroughCasesInSwitch": true, // switch 里忘了 break 就报错
    "noUnusedLocals": true,             // 声明了没用的变量报错（配合 ESLint 可关）
    "noUnusedParameters": true,         // 声明了没用的函数参数报错

    /* ── 互操作 ──────────────────────────────────── */
    // 允许 import express from 'express' 这种 CJS 默认导入。
    // 不开就只能 import * as express。现代项目一律开。
    // 注意：Babel / esbuild 默认行为等价于"开着"，你在 tsconfig 里关掉会导致两边行为不一致。
    "esModuleInterop": true,
    // 允许 import pkg from './package.json'，读版本号很方便
    "resolveJsonModule": true,
    // 跳过对 node_modules 里 .d.ts 的类型检查（只跳过检查，类型照常使用）。
    // 不开的话，某个三方包的类型写得不严谨会让你自己的项目编译失败，且你无法修它。
    // 收益：构建速度常常快一倍。代价：看不到三方包类型自身的错误。
    "skipLibCheck": true,

    /* ── 输出 ────────────────────────────────────── */
    // 前端项目由打包器产出，tsc 只负责检查，不产出任何文件
    "noEmit": true,

    /* ── 工程结构 ────────────────────────────────── */
    // 路径别名。⚠️ 只影响类型解析，不影响运行时 —— Vite / webpack 里必须再配一遍 alias
    // 🆕 TS7：baseUrl 已删除。paths 的值改成相对 tsconfig 所在目录写（加 ./ 前缀），
    // 这种写法在 TS 5.x 下同样有效，现在就改可以两边通吃。
    "paths": { "@/*": ["./src/*"] }
  },
  // 参与编译的文件。写了 include 就不再默认包含全部
  "include": ["src", "vite.config.ts"],
  // 默认已含 node_modules，这里显式补上产物目录
  "exclude": ["node_modules", "dist"]
}
```

### 2. Node 后端服务（tsc 编译出 dist 运行）

```jsonc
{
  "compilerOptions": {
    // Node 22 用 ES2023 完全没问题；查一下 node -p "process.versions.v8" 或直接看 @tsconfig/node22
    "target": "ES2023",
    // 关键：Node 环境不要 DOM，用 ES + node 的 @types 提供的全局
    "lib": ["ES2023"],
    // 🆕 TS7：types 默认是 []，不写就一个 @types 都不加载，process / Buffer 全报"找不到名称"
    "types": ["node"],
    // 原生 ESM 的 Node 项目用 NodeNext，它会正确解析 package.json 的 exports / imports 字段
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "moduleDetection": "force",
    // NodeNext 下 CJS 文件里不能写 ESM 语法，打开它可以在编译期就发现而不是运行时炸
    "verbatimModuleSyntax": true,

    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,

    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,

    /* ── 输出（后端要真的产出文件）───────────────── */
    // 输入根目录。不写时由所有输入文件的最长公共路径推断，
    // 一旦 src 外面混进来一个文件，dist 的结构就会多套一层 —— 显式写更稳。
    "rootDir": "src",
    "outDir": "dist",
    // 产出 .js.map，配合 sourceMap 才能在 Node 里断点到 .ts 源码
    "sourceMap": true,
    // sourcemap 里嵌入原始 TS 源码，线上排查时可以脱离源码文件看堆栈
    "inlineSources": true,
    // 有类型错误时不产出文件，避免"编译报错但 dist 还是被更新了"这种事故
    "noEmitOnError": true,
    // 不把注释带进产物
    "removeComments": false,
    // 生成 .tsbuildinfo，第二次构建只编译改动的文件
    "incremental": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

::: warning
`lib: ["ES2023"]` 意味着**没有 DOM**。如果代码里出现 `fetch`、`Request` 这类既是 Web 又是 Node 的全局，Node 22 的 `@types/node` 会提供它们；但 `window`、`document` 会直接报"找不到名称"——这是对的，本来就不该在服务端出现。
:::

### 3. npm 库 / 组件库

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "moduleDetection": "force",
    "verbatimModuleSyntax": true,

    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,

    /* ── 库的核心：产出类型声明 ──────────────────── */
    // 生成 .d.ts，这是"你的包有没有类型"的唯一标准
    "declaration": true,
    // 生成 .d.ts.map，让使用方在 IDE 里能 Ctrl+点击跳到你的源码而不是跳到 .d.ts
    "declarationMap": true,
    // 只产出 .d.ts，不产出 .js —— JS 交给 Vite / rollup / tsup 这类打包器去做
    "emitDeclarationOnly": true,
    "outDir": "dist",

    // 让声明文件的输出更稳定：导出的成员必须有显式类型标注，
    // 这样别人才可能用 esbuild 之类工具直接生成 .d.ts 而不用跑 tsc。
    // 大型库开了它能显著提升构建速度，代价是写起来更啰嗦。
    "isolatedDeclarations": false,

    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

## 二、语言与运行环境

### `target`

编译后 JS 的**语法**版本。它只影响语法降级，完全不影响你写的类型。

- 默认 `ES5`，非常老：`?.`、`??`、async/await、class 字段全部会被降级，产物变大、调试变难
- 现代项目写 `ES2020` ~ `ES2023`
- 有打包器时，让打包器按 browserslist 降级，`target` 直接给高版本

::: details 🆕 TS7 变化
- **默认值从 `ES5` 变成 `es2025`**，而且是**浮动目标**（随年份推进，明年可能就是 `es2026`）
- **`target: "es5"` 被删除**（6.0 弃用 → 7.0 硬错误）。最低只能是 `es2015`
- 顺带地 `downlevelIteration` 也没意义了，一并删除

浮动目标是把双刃剑：好处是新语法默认不降级，坏处是**升级 TS 小版本可能悄悄改变产物语法**。要锁定行为就显式写死 `target`。
:::

### `lib`

声明**可用的内置 API 类型**。`target` 管语法，`lib` 管 API，两者独立：

```jsonc
{ "target": "ES2022", "lib": ["ES2022", "DOM", "DOM.Iterable"] }
```

常见坑：

- Node 项目忘了装 `@types/node`，`process`、`fs` 全部报红（这是没有 `lib` 可救的，必须装包）
- 用了 `Object.groupBy` 但 `lib` 是 `ES2022`，报"属性不存在"——那是 **ES2024** 的 API，把 lib 提到 `ES2024` 或单独加 `"ES2024.Object"`
- 不写 `lib` 时会按 `target` 推断，且**默认包含 DOM**。所以 Node 项目务必显式写 `lib: ["ES2023"]`，否则你的服务端代码里写 `window` 也不报错

::: details 🆕 TS7：`libReplacement` 默认变成 `false`
`libReplacement` 控制是否用 `@typescript/lib-*` 这个包里的 lib 文件替换内置的 `lib.*.d.ts`（一般只有装了 `@typescript/lib-dom` 这类包的人会用到）。6.0 起默认 `false`，理由是它能避免大量失败的模块解析、提升解析性能。

如果你确实在用 `@typescript/lib-*` 系列包，需要显式写 `"libReplacement": true`，否则你装的 lib 不会生效。
:::

### `jsx`

| 值 | 行为 | 场景 |
| --- | --- | --- |
| `preserve` | 原样保留 JSX，不做转换 | 打包器项目（Vite / webpack），推荐 |
| `react-jsx` | 转成 `_jsx(...)`，自动从 `react/jsx-runtime` 导入 | 用 tsc 直接产出可运行 JS |
| `react` | 转成 `React.createElement(...)`，要求手动 `import React` | React 17 之前的老项目 |
| `react-jsxdev` | 同 `react-jsx`，但带开发期调试信息 | 开发环境 |

对应还有 `jsxImportSource`，用 Preact / Vue JSX 时改成 `"preact"` / `"vue"`。

### `useDefineForClassFields`

类字段用 `[[Define]]` 语义（ES 标准）还是 `[[Set]]` 语义（TS 老行为）。**默认：target 为 ES2022 及以上时为 `true`。**

```ts
class A { x = 1 }
class B extends A {
  // 语义差异在这里显现：
  // true  → 用 defineProperty 定义，会覆盖父类的 accessor
  // false → 用 this.x = 1 赋值，会走父类 setter
  x = 2
}
```

真实影响：用装饰器 / 依赖注入（如 NestJS、Angular）的老框架在 `target: ES2022` 下升级后行为变了，多半是它。老项目升级时如果类字段行为异常，显式设成 `false` 能回到旧语义。

### `downlevelIteration`

`target` 低于 `ES2015` 时，`for...of`、展开运算符对 Set/Map/字符串的处理方式。默认 `false`，此时 `for (const c of 'abc')` 会被降级成普通 for 循环（对 emoji 等多字节字符会出错）。

`target >= ES2015` 就不需要它。现在只有还在打 ES5 产物的库才用得上。

::: danger 🆕 TS7：这个选项被删了
6.0 起设置即报错，7.0 起**选项本身不存在**。原因是它的唯一用途就是配合 `target: es5`，而 es5 也没了。直接把这一行删掉即可 —— `target >= es2015` 本来就用不上它。

如果你确实要打 ES5 产物（比如 toG 的老浏览器兜底），正确做法是：**`target` 给高版本，让 Babel / esbuild 按 browserslist 下沉**，而不是靠 `tsc` 降级。
:::

## 三、模块系统

### `module` / `moduleResolution`

这两个必须配对，配错是"找不到模块"报错的第一大来源。

| module | moduleResolution | 场景 |
| --- | --- | --- |
| `CommonJS` | `Node10`（旧称 `Node`） | 老 Node 项目、Jest 老配置 |
| `ESNext` / `ES2022` | `Bundler` | Vite / webpack / Rspack 等打包器项目 |
| `NodeNext` | `NodeNext` | 原生 ESM 的 Node 项目，正确解析 `exports` / `imports` 字段 |
| `Preserve` | `Bundler` | TS 5.4+，保留原始模块语法，交给下游工具 |
| `ESNext` | `Node10` | ❌ 错误搭配，导入时经常不认扩展名、不认 `exports` |

规则很简单：**用打包器 → `Bundler`；写 npm 包或原生 ESM Node 服务 → `NodeNext`。** 详见 [ESM / CJS 与模块解析](../engineering/module)。

::: details 🆕 TS7 变化
- **`module` 默认值变成 `esnext`**（以前是 `CommonJS`，取决于 target）
- **`module: "amd"` / `"umd"` / `"systemjs"` / `"none"` 全部删除**（6.0 弃用 → 7.0 硬错误），连带 `/// <amd-module>` 指令
- **`moduleResolution: "node"`（即 `node10`）和 `"classic"` 删除**，只剩 `bundler` / `nodenext`

也就是说上面表格里的第一行（`CommonJS` + `Node10`）在 TS7 下已经不存在了。还在用的项目只能二选一：要么迁到 `NodeNext`（老 CJS 项目要连带改 `require` 写法），要么迁到 `Bundler`（需要打包器兜底）。
:::

一个高频报错：在 `Bundler` 模式下写 `import x from './foo.ts'` 会报错，需要开 `allowImportingTsExtensions`（且必须配 `noEmit` 或 `emitDeclarationOnly`）。

### `moduleDetection`

| 值 | 行为 |
| --- | --- |
| `auto`（默认） | 有 import/export/`import.meta`/JSX 才算模块 |
| `legacy` | 老行为 |
| `force` | 所有非声明文件都当模块 |

推荐 `force`：避免出现"这个文件没写 export，里面的变量变成全局变量，然后在别处报重复声明"这种莫名其妙的问题。

### `verbatimModuleSyntax`

不改写、不删除任何没有标 `type` 的 import/export。

```ts
// 开之前：TS 发现 User 只当类型用，编译后这行会被整个删掉
// 开之后：原样保留，所以你必须写清楚
import { type User, getUser } from './api'
```

打开后：

- 只当类型用的导入必须写 `import type`（或内联 `type` 修饰符）
- `export =`、`export default` 后面不能只跟类型
- CJS 文件里不能写 ESM 的 import/export 语法
- 不能和 `module: UMD / AMD / System` 一起用

::: tip
TS 内部对 `isolatedModules` 和 `verbatimModuleSyntax` 的检查用的是同一个判断（`isolatedModules || verbatimModuleSyntax`），所以开了 `verbatimModuleSyntax` 之后 `isolatedModules` 的约束其实已经生效了。两者一起写主要是为了表达明确 + 兼容老版本工具链。
:::

### `isolatedModules`

保证每个文件能**单独**被转译，不依赖其他文件的信息。esbuild / SWC / Babel 都是单文件转译的，不开这个开关，你的代码在 `tsc` 下能过、在 esbuild 下会炸。

典型症状：`export { SomeType }` 重导出一个类型 —— esbuild 不知道 `SomeType` 是类型，会产出一个运行时不存在的导出。开了它就必须在编译期写成 `export type { SomeType }`。

### `esModuleInterop` / `allowSyntheticDefaultImports`

解决 CommonJS 模块的默认导入问题。

```ts
// 不开 esModuleInterop：只能这样
import * as express from 'express'
// 开了之后：可以这样
import express from 'express'
```

它做两件事：

1. 打开 `allowSyntheticDefaultImports`（**只影响类型检查**：没有 default 导出的模块也允许默认导入）
2. 给转译产物加 interop 辅助函数（**影响运行时**）

现代项目一律 `true`。注意：**Babel / esbuild 默认行为等价于开着它**，如果你在 tsconfig 里关掉，类型检查和实际运行结果会不一致——这是最阴险的一类 bug。

::: details 🆕 TS7 变化
**不能再设成 `false`**（6.0 弃用 → 7.0 硬错误），`allowSyntheticDefaultImports` 同理。

其实从 6.0 起它就默认 `true` 了，所以绝大多数项目只要**把这一行删掉**即可。只有显式写着 `"esModuleInterop": false` 的老配置才会报错。
:::

### `resolveJsonModule`

允许 `import pkg from './package.json'`。开了之后如果 `include` 里包含 json，会连 json 一起处理。`module: NodeNext` 下还需要 import 断言/属性。

### `allowImportingTsExtensions` / `rewriteRelativeImportExtensions`

- `allowImportingTsExtensions`：允许写 `import './foo.ts'`。必须配 `moduleResolution: bundler` 且 `noEmit` 或 `emitDeclarationOnly`
- `rewriteRelativeImportExtensions`（TS 5.7+）：**要产出文件时**用，它会把 `.ts` 后缀在产物里改写成 `.js`。适合 Node 原生跑 TS 的写法

### `customConditions`

给模块解析加额外的 [exports 条件](https://nodejs.org/api/packages.html#conditional-exports)。比如三方包有 `"development"` 条件，你可以在这里声明 `"customConditions": ["development"]` 来解析到开发版入口。

## 四、严格性

### `strict` 家族

`strict: true` 是一组开关的总闸，等价于同时打开下面全部：

| 开关 | 作用 | 关掉会怎样 |
| --- | --- | --- |
| `strictNullChecks` | `null` / `undefined` 不进其他类型 | 关掉后 `string` 实际包含 `null`，所有空值检查形同虚设 |
| `noImplicitAny` | 推不出类型时报错而不是默默变 `any` | 关掉后漏标参数不会提醒 |
| `strictFunctionTypes` | 函数参数逆变检查 | 关掉后函数赋值变宽松，能藏住 bug |
| `strictBindCallApply` | `call` / `apply` / `bind` 也检查参数 | 关掉后 `fn.call(null, 1, 'x')` 不报错 |
| `strictPropertyInitialization` | 类的属性必须在构造函数里赋值 | 关掉后 `this.x` 可能是 `undefined` |
| `noImplicitThis` | `this` 推不出时报错 | 关掉后 `this` 悄悄变 `any` |
| `useUnknownInCatchVariables` | `catch (e)` 的 `e` 是 `unknown` 而非 `any` | 关掉后可以直接用 `e.message` |
| `alwaysStrict` | 产物带 `'use strict'` | 关掉后非模块文件不会严格模式运行 |
| `strictBuiltinIteratorReturn` | 内置迭代器的 `TReturn` 是 `undefined` 而非 `any` | 关掉后 `for...of` 的返回值是 `any` |

更多细节见 [strict 家族](./strict)。

::: tip 🆕 TS7：`strict` 默认是 `true`
从 6.0 起 `strict` 默认开启，7.0 沿用。这一项对现代项目基本是纯收益 —— 新项目本来就该开。

真正的影响是那些**从没开过 strict 的老项目**：升级后你会一次性拿到成百上千个 `strictNullChecks` 报错。两个选择：

1. 老老实实补类型（长期正确，但工作量大）
2. 先显式写 `"strict": false` 顶住，再按 [strict 家族](./strict) 的顺序逐个打开

另外 `alwaysStrict` 也变成「假定为 true、不能设 false」，表里这一项在 TS7 下不能再关。
:::

### `noUncheckedIndexedAccess`

```ts twoslash
// @errors: 18048
const arr: string[] = ['a', 'b']
const first = arr[0]
first.toUpperCase()

const dict: Record<string, number> = {}
const v = dict['missing']
v.toFixed()
```

打开后 `arr[0]` 的类型是 `string | undefined`，`dict['missing']` 也是 `number | undefined`。这是**最容易在实际项目里抓到 bug** 的一个开关——数组越界、字典查不到 key 是最常见的线上崩溃来源。

代价：到处要加 `!` 或判断，代码会变啰嗦。但值得。

::: tip 关不掉的地方
它不作用于 `for...of`、数组解构、`.map()` 的回调参数——这些场景 TS 能确定元素存在，不会加 `undefined`。
:::

### `exactOptionalPropertyTypes`

区分"这个属性不存在"和"这个属性存在但值是 undefined"：

```ts twoslash
// @errors: 2375
interface Opt { a?: string }

const o1: Opt = { a: undefined }
```

打开后上面会报错，因为 `a?: string` 现在严格表示"要么没有 a，要么 a 是 string"，不接受显式 `undefined`。于是 `{ a?: string }` 与 `{ a?: string | undefined }` 变成两种不同类型。

真实价值在 spread / 合并配置时：

```ts
interface Config { port?: number }
const defaults: Config = { port: 3000 }
// 不开：user.port 是 undefined 时，port 会被覆盖成 undefined，运行时炸
// 开了：这里会报错，逼你写清楚
const merged: Config = { ...defaults, ...user }
```

### `noPropertyAccessFromIndexSignature`

索引签名必须用 `[]` 访问，不能用 `.`：

```ts twoslash
// @noPropertyAccessFromIndexSignature: true
// @errors: 4111
interface Env {
  [key: string]: string | undefined
}
declare const env: Env
const port = env.PORT
const ok = env['PORT']
```

配 `noUncheckedIndexedAccess` 一起用，能防止你以为 `env.PORT` 一定是 string、实际上拼写错了就变 `undefined`。

### `noImplicitOverride`

类方法覆盖父类方法时必须写 `override`。防止父类改名 / 改签名后，子类方法悄悄变成一个新方法（而不是覆盖），然后运行时调用的是父类那个——这类 bug 极难查。

### 其他值得开的

| 开关 | 作用 | 备注 |
| --- | --- | --- |
| `noFallthroughCasesInSwitch` | switch 里非空 case 落到下一个 case 就报错 | 忘了 `break` 的经典 bug |
| `noImplicitReturns` | 函数里有分支没 return 就报错 | 返回值偷偷变 `undefined` |
| `noUnusedLocals` / `noUnusedParameters` | 没用到的变量 / 参数报错 | 和 ESLint 重复，可只留一个；参数加 `_` 前缀可豁免 |
| `noUncheckedSideEffectImports` | `import './style.css'` 找不到就报错 | 默认静默失败，开了能抓到拼错的样式路径 |
| `erasableSyntaxOnly` | 禁止 enum、namespace、参数属性这些"有运行时产物"的 TS 语法 | Node 22+ 直接跑 `.ts` 时必须开 |
| `allowUnreachableCode: false` | `return` 之后的代码报错 | 默认 `undefined`（不报错，只灰显） |

## 五、输出（Emit）

### `noEmit`

不产出任何文件，只做类型检查。前端项目（有打包器）的标准配置。

⚠️ 和 `declaration` / `sourceMap` 一起写是自相矛盾的——`noEmit` 优先级最高，什么都产不出来。想要 `.d.ts` 又不想要 `.js`，用 `emitDeclarationOnly`。

### `outDir` / `rootDir`

- `outDir`：产物目录
- `rootDir`：**默认是所有输入文件的最长公共路径**。这意味着只要 `src` 外面混进来一个 `.ts`，`dist` 结构就会多套一层（`dist/src/index.js`）。显式写 `rootDir: "src"` 能锁死结构

::: warning 🆕 TS7：`rootDir` 默认值变成了 `.`
以前默认是「推断出的公共目录」（通常是 `src`），**6.0 起默认是 `.`（tsconfig 所在目录）**。不显式写的话，产物会从 `dist/index.js` 变成 `dist/src/index.js` —— 部署入口、`package.json` 的 `main`、Dockerfile 的 COPY 路径会**全部同时失效**，而且报错信息不会告诉你原因。

升级后第一件事就是确认这条：

```jsonc
{ "compilerOptions": { "rootDir": "./src", "outDir": "./dist" } }
```
:::

### `declaration` 家族

| 开关 | 作用 |
| --- | --- |
| `declaration` | 产出 `.d.ts`。`composite: true` 时自动为 true |
| `declarationMap` | 产出 `.d.ts.map`，让使用方能跳转到你的 `.ts` 源码而不是 `.d.ts` |
| `declarationDir` | `.d.ts` 单独放一个目录（默认和 `outDir` 相同） |
| `emitDeclarationOnly` | 只产 `.d.ts`，不产 `.js` —— JS 交给打包器 |

发布 npm 包时，`declaration` + `declarationMap` 是标配。

### `sourceMap` / `inlineSources` / `inlineSourceMap`

- `sourceMap`：产 `.js.map`
- `inlineSources`：把 TS 源码嵌进 sourcemap。没它的话，线上拿到 sourcemap 还得有源码文件才能还原
- `inlineSourceMap`：把 sourcemap 内联进 `.js`（单文件分发时用）

线上排障推荐 `sourceMap + inlineSources`，产物自包含。

### `removeComments`

产物里去掉注释。默认 `false`（保留）。库的产物通常要关掉以减小体积，但注意**它会连 JSDoc 一起删**，而 JSDoc 会影响使用方 IDE 的提示——一般建议保留。

### `importHelpers`

把 `__extends`、`__awaiter` 这类 helper 从"每个文件内联一份"改成从 `tslib` 导入。产出体积明显减小，需要 `npm i tslib`。只在 `target` 较低（需要降级）时才有意义。

### `noEmitOnError`

有类型错误时不产出文件。后端部署强烈建议开，避免"TypeScript 报错但 dist 还是被更新了、然后上线炸掉"。

## 六、JavaScript 与类型来源

### `allowJs` / `checkJs`

- `allowJs`：允许 `.js` 参与编译（老项目渐进迁移的第一步）
- `checkJs`：对这些 `.js` 也做类型检查（靠 JSDoc 标注）

渐进迁移路线：`allowJs: true` → 加 `// @ts-check` 单文件检查 → `checkJs: true` → 逐个改 `.ts`。

### `types` / `typeRoots`

- `typeRoots`：去哪些目录找类型包，默认向上查找所有 `node_modules/@types`
- `types`：**只**包含列出的类型包

```jsonc
// ⚠️ 一旦写了 types，就只有这两个生效，其他 @types/* 全部不再自动引入
{ "types": ["node", "jest"] }
```

默认行为（不写 `types`）会把 `node_modules/@types` 下**所有**包都注入全局。这就是为什么装了个 `@types/xxx` 之后，你的全局作用域莫名其妙多了些东西。写测试工程时经常要显式收窄。

::: warning 🆕 TS7：不写 `types` 时默认变成 `[]`
这是升级后**最普遍的一类报错来源**。以前 `@types/node`、`@types/jest` 自动进全局，现在一个都不进，你会看到：

```
error TS2580: Cannot find name 'process'. Do you need to install type definitions for node?
error TS2582: Cannot find name 'describe'. Do you need to install type definitions for a test runner?
```

两个解法：

```jsonc
{ "types": ["*"] }                  // 恢复旧行为，全部加载
{ "types": ["node", "jest"] }       // 推荐：显式列出，少加载无用全局类型还能提速
```

注意 `@types/node` 本身还是要装，只是「装了但被自动引入」变成了「装了还得声明」。
:::

### `skipLibCheck`

跳过对所有 `.d.ts` 的类型检查。默认 `false`。

- 收益：构建速度常常快一倍；不会因为某个三方包的类型写得烂而卡住你
- 代价：看不到三方包类型自身的错误（但那本来也不是你能修的）

**建议一律 `true`。** 只在你想给三方包提 issue、需要复现它的类型错误时临时关掉。

## 七、工程结构

### `baseUrl` / `paths`

路径别名：

```jsonc
{
  // paths 里的相对路径都基于 baseUrl 解析
  "baseUrl": ".",
  // "@/*" → 项目根目录下的 src/*
  "paths": { "@/*": ["src/*"] }
}
```

::: danger 🆕 TS7：`baseUrl` 被删除
6.0 弃用、7.0 硬错误，而且**它不再作为模块解析的查找根**。迁移方式只有一步：把 `baseUrl` 删掉，`paths` 的值改成**相对 tsconfig 所在目录**的写法（加 `./` 前缀）：

```jsonc
{
  // ❌ TS7 报错：Option 'baseUrl' has been removed
  // "baseUrl": ".",
  // "paths": { "@/*": ["src/*"] }

  // ✅ 相对项目根写，TS 5.x / 7.x 都认
  "paths": { "@/*": ["./src/*"] }
}
```

改完记得同步改打包器和运行时的 alias 配置 —— 类型层面能过，不代表运行时能找到。
:::

⚠️ **它只影响类型解析，不影响运行时。** 打包器里还要再配一遍，否则能编译通过但运行时报"找不到模块"：

```ts
// vite.config.ts
resolve: { alias: { '@': path.resolve(__dirname, 'src') } }
```

Node 侧同理，要么用 `tsx` / `tsconfig-paths`，要么用 Node 原生的 `imports` 字段。

### `include` / `exclude` / `files`

- `include` 不写时默认为 `**/*`（全部）
- `exclude` 默认值是 `["node_modules", "bower_components", "jspm_packages"]` 加 `outDir`
- `files` 是精确的文件列表，和 `include` 同时存在时取**并集**
- 三者都是 glob，`*` 匹配任意字符（不含 `/`），`?` 匹配单个字符，`**/` 匹配任意层级

一个隐蔽的坑：`exclude` 只排除"被 `include` 匹配到的文件"，**被 `import` 进来的文件仍会被编译**。想彻底排除一个文件，别在任何地方 import 它。

### `extends`

继承另一份配置，可以是相对路径，也可以是 npm 包名：

```jsonc
// 社区预设：省掉自己琢磨的时间
{ "extends": "@tsconfig/strictest/tsconfig.json" }
{ "extends": "@tsconfig/node22/tsconfig.json" }
{ "extends": "@vue/tsconfig/tsconfig.dom.json" }
```

规则：

- 子配置的字段**覆盖**父配置的同名字段（`compilerOptions` 是逐项合并，不是整体替换）
- `files` / `include` / `exclude` 里的相对路径，是**相对于被继承的那份配置文件**解析的——这是个老坑，跨目录继承时经常踩
- 可以多级继承，也可以传数组（TS 5.0+）

### `references` / `composite` / `incremental`

Project References，把大项目拆成多个子项目，各自独立编译 + 增量构建：

```jsonc
{
  "compilerOptions": {
    // composite 是 references 的前提，它会自动打开 declaration 和 incremental
    "composite": true
  },
  "references": [
    { "path": "./packages/core" },
    { "path": "./packages/ui" }
  ]
}
```

- 被引用项目必须 `composite: true`
- 构建必须用 `tsc -b`（build 模式），普通 `tsc` 不会走引用关系
- `incremental` 单独用时生成 `.tsbuildinfo`，加快二次构建；`tsBuildInfoFile` 可指定它的位置（CI 缓存会用到）

monorepo 里这是提速的主要手段。

::: tip 🆕 TS7：monorepo 多了一层并行
`tsc -b` 在 TS7 下可以用 `--builders <n>` 控制并行构建的项目数，和 `--checkers` 是**乘法关系**：

```bash
tsc -b --builders 4 --checkers 4   # 最多 16 个并发检查线程
```

4 个以上的包 + 多核 CI 机器，这一项是除「换编译器」之外最大的提速来源。详见 [TypeScript 6 与 7](./typescript-7)。
:::

## 八、常见报错 → 配置对照

| 报错 | 大概率是这里 |
| --- | --- |
| `Cannot find module 'x' or its corresponding type declarations` | `moduleResolution` 配错 / 没装 `@types/x` / `paths` 没同步给打包器 |
| `Cannot find name 'process'` | Node 项目没装 `@types/node`，或 `types` 把它排除了 |
| `Option 'allowImportingTsExtensions' can only be used when...` | 需要同时配 `noEmit` 或 `emitDeclarationOnly` |
| TS 里能跑，esbuild / Vite 里报"导出的东西不存在" | 没开 `isolatedModules`，类型被当成值重导出了 |
| `Object is possibly 'undefined'` 到处都是 | 开了 `noUncheckedIndexedAccess`，要么判空要么用 `!` |
| 本地能编译，CI（Linux）上报"找不到模块" | 大小写不一致；`forceConsistentCasingInFileNames` 默认已开，真出问题是文件名本身写错了 |
| 装了某包之后全局多出奇怪的东西 | `node_modules/@types` 全部自动注入，用 `types` 收窄 |
| `tsc` 很慢 | 开 `skipLibCheck` + `incremental`；大项目上 `references` |
| 改了 tsconfig 不生效 | 被 `extends` 的某层覆盖了，跑 `tsc --showConfig` |

**升级 TS 6 / 7 后新增的高频报错：**

| 报错 | 原因与修法 |
| --- | --- |
| `Cannot find name 'process'`（升级后突然出现） | `types` 默认变 `[]`，写 `"types": ["node"]` |
| 产物从 `dist/index.js` 变成 `dist/src/index.js` | `rootDir` 默认变 `.`，显式写 `"rootDir": "./src"` |
| `Option 'baseUrl' has been removed` | 删掉 `baseUrl`，`paths` 改写成 `"./src/*"` |
| `Option 'downlevelIteration' has been removed` | 直接删掉这一行 |
| `Option 'target' must be 'es2015' or higher` | `target: es5` 已删除，最低 `es2015` |
| `Option 'moduleResolution' must be 'bundler' or 'nodenext'` | `node10` / `classic` 已删除 |
| `Option 'esModuleInterop' cannot be false` | 删掉这一行，默认已是 true |
| `error TS2451: Cannot redeclare block-scoped variable`（一堆） | 没开 `moduleDetection: force`，非模块文件泄漏到全局 |
| `tsc src/index.ts` 报 "cannot be used with a tsconfig" | 目录下有 tsconfig 时不能再传文件路径，加 `--ignoreConfig` |
| 一堆 `strictNullChecks` 报错 | `strict` 默认变 `true`，要么补类型要么显式 `false` |

## 九、调试配置本身

```bash
tsc --showConfig              # 打印最终合并后的完整配置（排查"配了不生效"第一手段）
tsc --explainFiles            # 解释每个文件为什么被包含进来
tsc --traceResolution         # 打印模块解析的每一步（排查找不到模块）
tsc --listFiles               # 列出所有参与编译的文件
tsc --noEmit --noErrorTruncation  # 完整报错，不截断长类型
tsc --generateTrace out-dir   # 生成性能 trace，找编译慢的原因

# 🆕 TS7 新增
tsc --noEmit --checkers 8     # 类型检查并发数（默认 4，加大更快更吃内存）
tsc -b --builders 4           # monorepo：并行构建的项目数
tsc --noEmit --singleThreaded # 全部单线程，排查并发导致的差异
tsc foo.ts --ignoreConfig     # 绕过"目录下有 tsconfig 就不能传文件路径"
```

`--showConfig` 是最重要的一条。遇到"我明明配了为什么不生效"，先跑它，九成能看出是被哪一层 `extends` 覆盖了。

对比两个版本的编译器行为是否一致时（升级 TS7 后建议做一次）：

```bash
npx tsc6 --noEmit > ts6.log 2>&1   # JS 版（来自 @typescript/typescript6）
npx tsc  --noEmit > ts7.log 2>&1   # Go 版
diff ts6.log ts7.log
```

## 下一步

- [TypeScript 6 与 7：编译器换引擎了](./typescript-7) —— 上面所有 🆕 标记的完整背景与迁移清单
- [基础类型](./basic-types)
- [收窄与判别联合](./narrowing)
- [ESM / CJS 与模块解析](../engineering/module)
