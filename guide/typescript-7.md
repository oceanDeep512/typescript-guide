# TypeScript 6 与 7：编译器换引擎了

::: warning 时间线
本页信息核对时间 **2026-09-19**。TypeScript 7 仍在快速迭代（7.1 已在 `next` 标签上发 nightly），涉及生态兼容的部分请以官方公告为准。
:::

先给结论：**TypeScript 7.0（2026-07-08 发布）把编译器从 JavaScript 重写成了 Go**，同样的代码、同样的报错，但全量类型检查快 **8～12 倍**，内存降 6～26%。它不是一门新语言 —— 类型系统的语法和语义几乎没变，变的是底下跑的那台发动机，以及伴随这次重写一起清掉的历史包袱。

## 版本现状速览

| 版本 | 状态 | npm 上的版本 | 说明 |
| --- | --- | --- | --- |
| 5.9 | 已冻结 | `typescript@5.9` | 只修安全/bug，不要再上新项目 |
| **6.0** | 维护中，最后一个 JS 版本 | 末版 `6.0.3`（2026-04-16） | 过渡版本：改默认值 + 把 7.0 要删的东西先标记为弃用 |
| **7.0** | **当前 `latest`** | `7.0.2`（2026-07-08） | Go 原生编译器，默认推荐 |
| 7.1 | 开发中 | `next` 标签：`7.1.0-dev.20260919.1` | 主要目标是补齐程序化 API |
| `@typescript/typescript6` | 共存包 | `6.0.2` | 提供 `tsc6` 可执行文件 + 重导出 6.0 API |
| `@typescript/native-preview` | 已归档 | 停在 `7.0.0-dev.20260707.2` | 预览期的 nightly 包，7.0 GA 后改用 `typescript@next` |

::: tip 一句话判断
- **纯 TypeScript / React / Node 项目，不用 Vue 单文件组件、不用 typescript-eslint**：直接升 7.0，几乎无感。
- **用了 Vue / Svelte / Astro / MDX 的编辑器类型支持，或依赖 typescript-eslint**：走「双版本共存」，命令行用 7.0，编辑器与插件用 6.0。
:::

## 一、为什么非要重写

TS 编译器原来是 TypeScript 自己写的（跑在 Node/V8 上）。它撞上了三个绕不过去的天花板：

1. **单线程**。V8 的 `SharedArrayBuffer` 多线程共享内存在 Node 环境下限制很多，类型检查这个天然可并行的活儿只能一条线程干到底。
2. **JIT + GC 开销**。编译器是「启动 → 跑几分钟 → 退出」的批处理负载，JIT 预热的时间白花了，而 GC 在几 GB 的 AST + 类型对象上反复回收。
3. **对象模型不友好**。JS 对象属性访问、`string` 的 UTF-16 语义、以及到处都是的 `undefined` 兜底，对编译器这种数据结构来说全是额外开销。

Go 恰好反过来：原生编译、廉价的多线程 + 共享内存、可控的内存布局、启动即全速。所以微软的「Project Corsa」（内部早期代号 Strada）把整个编译器（检查器 + 语言服务）用 Go 重译了一遍，目标是**行为对齐**：同样的输入要给出同样的报错和同样的类型推导结果。

### 官方给出的实测数据

全量 `tsc` 构建，TS 6 vs TS 7（默认 `--checkers 4`）：

| 代码库 | TS 6 | TS 7 | 提速 | 内存变化 |
| --- | --- | --- | --- | --- |
| vscode | 125.7s | **10.6s** | 11.9x | 5.2GB → 4.2GB（-18%） |
| sentry | 139.8s | **15.7s** | 8.9x | 4.9GB → 4.6GB（-6%） |
| bluesky | 24.3s | **2.8s** | 8.7x | 1.8GB → 1.3GB（-26%） |
| playwright | 12.8s | **1.47s** | 8.7x | 1.0GB → 0.9GB（-11%） |
| tldraw | 11.2s | **1.46s** | 7.7x | 0.6GB → 0.5GB（-15%） |

把 `--checkers` 调到 8，还能再快一档（vscode 7.51s，16.7x）。编辑器侧的体感差异更大：**打开 vscode 仓库里的一个报错文件，从「17.5 秒后才有第一个红波浪线」降到 1.3 秒以内**。

其他团队公开的数字：Slack 的 CI 类型检查 7.5 分钟 → 1.25 分钟；Canva 编辑器内首次报错 58 秒 → 4.8 秒。

::: warning 别对号入座
这些是**万级文件的大型仓库**。如果你项目只有几百个文件、全量检查本来就 3 秒，提升到 0.4 秒是好事但不会改变什么。TS 7 真正的价值在大仓库、CI 瓶颈、和编辑器响应速度上。
:::

## 二、安装与共存：tsc / tsc6 到底是什么关系

7.0 装到 `typescript` 这个包名上之后，`npx tsc` 就是 Go 版编译器。但问题来了：**7.0 不带程序化 API**（见第六节），而 typescript-eslint、Volar 这些工具是 `import ts from 'typescript'` 的 —— 它们拿到 7.0 会直接崩。

官方的解法是发布 **`@typescript/typescript6`**：内容和 6.0 一模一样，但可执行文件改名成 **`tsc6`**，避免和 7.0 的 `tsc` 撞名，同时把 6.0 的 API 原样导出。

### 三种可执行文件对照

| 命令 | 来自哪个包 | 引擎 | 是否提供 API |
| --- | --- | --- | --- |
| `tsc` | `typescript@7` | Go | ❌（7.1 才有） |
| `tsc6` | `@typescript/typescript6` | JS（V8） | ✅ |
| `tsgo` | `@typescript/native-preview`（已停更） | Go | ❌ |

### 方案 A：只装 7.0（推荐，前提是你不依赖那些插件）

```bash
npm install -D typescript@^7.0.2
npx tsc --version   # Version 7.0.2
```

### 方案 B：tsc 用 7.0，API 消费者用 6.0（当前最稳的通用方案）

```jsonc
{
  "devDependencies": {
    // 命令行跑的是 Go 版，快 10 倍
    "typescript": "^7.0.2",
    // 需要 import 'typescript' 的工具会解析到这个
    "typescript6": "npm:@typescript/typescript6@^6.0.2"
  }
}
```

然后让插件指向 6.0。多数工具支持显式指定 TS 实例路径，例如 typescript-eslint：

```js
// eslint.config.js
import tseslint from 'typescript-eslint'

export default tseslint.config({
  languageOptions: {
    parserOptions: {
      // 关键：把解析器指向 JS 版编译器
      projectService: true,
      tsconfigRootDir: import.meta.dirname,
      typescriptPath: 'typescript6', // 或用 require.resolve('typescript6')
    },
  },
})
```

### 方案 C：反着来，让 `typescript` 指向 6.0

如果你暂时完全不想动插件生态，只想让主包名保持旧行为：

```bash
npm install -D typescript@npm:@typescript/typescript6
```

这样 `typescript` 解析到 6.0（可执行文件只有 `tsc6`，没有 `tsc`），插件零改动；等 7.1 出来再切回去。

::: tip 选哪个
新项目 / 小项目 → 方案 A。中大型项目、CI 有类型检查瓶颈 → 方案 B，把收益先拿到手。插件一堆且懒得调 → 方案 C，先原地不动。
:::

## 三、新增的四个并发开关

这是 7.0 唯一「新」的命令行能力，全部围绕并行度：

| 开关 | 默认 | 作用 |
| --- | --- | --- |
| `--checkers <n>` | `4` | 类型检查工作线程数。加大 → 更快但更吃内存；设 `1` → 单线程检查（消除跨线程的重复工作） |
| `--builders <n>` | — | `--build` 模式下并行构建的项目数。monorepo 用得上，与 `--checkers` 是**乘法关系** |
| `--singleThreaded` | off | 一把全关：检查线程上限 1，解析和发射也走单线程。调试 / 做性能对比 / 受限环境用 |
| `--ignoreConfig` | off | 目录下有 `tsconfig.json` 时，`tsc foo.ts` 这种带文件路径的调用会直接报错（6.0 起的新行为），加这个标志可绕过 |

```bash
# CI 上给 8 核机器开满
tsc --noEmit --checkers 8

# monorepo：4 个包并行构建，每个包内部 4 个检查线程（最多 16 个线程）
tsc --build --builders 4 --checkers 4

# 内存吃紧的 CI 容器：降并发换内存
tsc --noEmit --checkers 2

# 排查「是不是并发导致的类型排序不同」
tsc --noEmit --singleThreaded
```

::: warning `--checkers` 是实验性的
默认值和取值范围后续可能调整。别把它写进需要长期稳定的脚本，或者在 CI 里固定成具体数字并加注释说明。
:::

## 四、默认值变了（6.0 改的，7.0 继承）

**这些是 6.0 改的，不是 7.0**。很多人以为是重写带来的，其实是为了对齐而先在 6.0 落地。7.0 全部沿用。

| 选项 | 旧默认（≤5.9） | 新默认 | 影响 |
| --- | --- | --- | --- |
| `strict` | `false` | **`true`** | 最省心的一项，新项目本来就该开 |
| `target` | `ES5` | **`es2025`**（浮动，随年份走） | 不再把 `?.`、`async/await` 降级 |
| `module` | `CommonJS` | **`esnext`** | 终于默认 ESM 了 |
| `types` | 自动包含 `node_modules/@types/*` | **`[]`** | ⚠️ **最容易踩**，见下 |
| `rootDir` | 推断公共目录 | **`.`**（tsconfig 所在目录） | ⚠️ 输出结构会变，见下 |
| `libReplacement` | `true` | `false` | 不再用 `@typescript/lib-*` 替换内置 lib |
| `noUncheckedSideEffectImports` | `false` | `true` | `import './foo.css'` 解析不到就报错 |
| `stableTypeOrdering` | — | `true`（7.0 起**不可关闭**） | 并行化后保证类型排序确定 |

### 坑 1：`types` 默认变成 `[]`

以前你不写 `types`，`@types/node`、`@types/jest` 会自动进全局。现在**什么都不进**。症状是升级后突然一堆 `Cannot find name 'process'`、`Cannot find name 'describe'`。

```jsonc
{
  "compilerOptions": {
    // 想恢复旧行为
    "types": ["*"],
    // 更推荐：显式列出来，少加载一堆用不上的全局类型，还能提速
    // "types": ["node", "jest"]
  }
}
```

### 坑 2：`rootDir` 默认变成 `.`

以前 `rootDir` 是所有输入文件的公共根（通常是 `src`），产物是 `dist/index.js`。现在默认是项目根，产物会变成 `dist/src/index.js` —— 部署路径全错。

```jsonc
{
  "compilerOptions": {
    "rootDir": "./src",  // 显式写回来
    "outDir": "./dist"
  }
}
```

::: tip 官方给了迁移脚本
[`ts5to6`](https://github.com/andrewbranch/ts5to6) 是社区的实验性工具（作者是 TS 团队成员），能自动改 `baseUrl`、`rootDir`、补 `types` 等。跑一遍看它改了什么，比自己逐个排查快。
:::

## 五、6.0 弃用 → 7.0 硬错误的完整清单

6.0 里这些是「弃用警告」（可以用 `"ignoreDeprecations": "6.0"` 暂时压下去），**7.0 直接变成硬错误**，没有开关能关。

### 编译器选项

| 被删/被禁的东西 | 改成什么 |
| --- | --- |
| `target: "es5"` | 最低 `es2015`。实在要 ES5 产出，交给 Babel/esbuild 下沉 |
| `downlevelIteration` | 直接删掉。它是为 ES5 降级 `for...of` 存在的，没了 ES5 就没意义 |
| `moduleResolution: "node"` / `"node10"` | `"nodenext"`（Node 项目）或 `"bundler"`（打包器项目） |
| `moduleResolution: "classic"` | 同上 |
| `module: "amd"` / `"umd"` / `"systemjs"` / `"none"` | `"esnext"` 或 `"preserve"` |
| `baseUrl` | 删掉，`paths` 的值改成**相对 tsconfig 所在目录**写：`{ "paths": { "@/*": ["./src/*"] } }` |
| `esModuleInterop: false` | 删掉（默认已开，不能关） |
| `allowSyntheticDefaultImports: false` | 删掉，同上 |
| `alwaysStrict: false` | 删掉，永远按严格模式解析 |
| `outFile` | 选项已移除，用打包器 |

### 语法

| 被删的写法 | 改成什么 |
| --- | --- |
| `module Foo { }` 声明命名空间 | `namespace Foo { }`（⚠️ `declare module "x" {}` 这种环境模块声明仍然支持） |
| `import data from './x.json' assert { type: 'json' }` | 把 `assert` 换成 `with`，对齐 ECMAScript import attributes |
| `/// <reference no-default-lib="true" />` | 不再生效 |

### JS 特殊支持的移除（只影响用 JSDoc 写类型的 .js 项目）

| 以前能写 | 现在 |
| --- | --- |
| `/** @type {typeof SomeClass} */` 里直接用值当类型 | 必须写 `typeof someValue` |
| `/** @enum {number} */` | 改成 `@typedef` |
| 单独的 `?` 作为类型 | 写 `any` |
| `/** @class */` 标记函数当构造器 | 直接写 `class` |
| 类型后缀 `!`（非空断言的 JSDoc 版） | 直接写 `T` |
| 不在 `@typedef` 里定义类型名 | 必须 `/** @typedef {T} TypeAliasName */` |
| Closure 风格 `/** @param {function(string): void} f */` | 用标准 TS 语法 |

### 语义变更

**模板字面量类型现在按 Unicode 码点处理**，不再按 UTF-16 代码单元。以前 `"😀"` 在类型层被当成两个字符（代理对），现在是一个。如果你写过按长度拆字符串的类型，行为会变：

```ts
type Len<S extends string> = S extends `${infer H}${infer R}` ? [H, ...Len<R>] : []

// TS ≤ 5.9：emoji 被拆成两个代理对单元
// TS 7：按码点算，"😀" 是一个字符
type Test = Len<'😀'>
```

另外，**目录下有 `tsconfig.json` 时，`tsc someFile.ts` 这种带文件路径的调用会报错**（以前是忽略 tsconfig 直接编译）。要临时单文件编译就加 `--ignoreConfig`。

## 六、语言服务：换成 LSP 了

7.0 的编辑器支持基于 **LSP（Language Server Protocol）** 重写，多线程，不再是从前那个内嵌在扩展里的 JS 语言服务。官方数据：失败的语言服务命令减少 **80%+**，服务器崩溃减少 **60%+**。

- **VS Code**：7.0 GA 时先用 `TypeScriptTeam.native-preview` 扩展；内置版本随后跟上。
- **Visual Studio**：自动启用。
- 其他编辑器走标准 LSP 客户端即可。

⚠️ 后果是：**依赖旧语言服务私有协议/插件的编辑器扩展需要重写**。这也是为什么 Volar、Svelte 这类「嵌入式语言」工具暂时用不上 TS 7 —— 它们正是靠语言服务插件机制把 `.vue` / `.svelte` 里的 `<script>` 虚拟成一个 TS 文件来做的。

## 七、7.0 没有 API：生态卡在哪

**这是当前升级最大的障碍，也是你必须知道的现实。**

> TypeScript 7.0 does not ship with an API. TypeScript 7.1 会发布一个新的（且不同的）API。

`typescript` 包从 5.x 起就同时是「编译器」和「库」：你可以 `import ts from 'typescript'` 拿到 `createProgram`、`createSourceFile`、`transform` 等几十个函数。一大票工具靠这个活着。7.0 的 Go 二进制**不提供这些**，所以：

| 工具 / 场景 | 现状 | 你现在怎么办 |
| --- | --- | --- |
| `tsc` 命令行检查 / 构建 | ✅ 完全可用，快 10 倍 | 直接升 |
| `tsc --noEmit` in CI | ✅ | 直接升 |
| **typescript-eslint** | ❌ 需要 TS API | 用 6.0 实例（方案 B/C） |
| **Volar / Vue SFC** | ❌ 依赖语言服务插件 | 编辑器继续用 6.0 |
| **Svelte** | ❌ 同上 | 继续 6.0 |
| **Astro / MDX** | ❌ 嵌入式语言 | 继续 6.0 |
| **Angular 模板类型检查** | ❌ 编辑器侧不支持 | CLI 用 7.0 做项目级检查，编辑器用 6.0 |
| `ts-node` / `tsx` / `swc` / `esbuild` | ✅ 它们本来就不调 API（只做转译） | 不受影响 |
| `tsup` / `rolldown-plugin-dts` / `api-extractor` 等 dts 生成 | ⚠️ 视实现而定 | 见 [工具链篇](../engineering/toolchain) |

::: tip 一个反直觉的点
**转译器从来不用 TS API**。esbuild / swc / Babel 是自己解析 TS 语法再擦除类型，压根不 `import 'typescript'`。所以 Vite、tsx、tsup 这些「跑起来」的工具完全不受影响，**受影响的只有「类型检查」和「IDE 智能」这两类**。
:::

### 时间表

7.1 的目标就是补上这个 API（beta 预计 2026-09 前后，正式版官方给的窗口是 2026-11-10）。**API 不会和 5.x/6.0 兼容**，是重新设计的，所以到时候这些工具还要各自适配一轮。在那之前，「命令行用 7.0，插件用 6.0」的双版本状态会持续存在。

## 八、迁移实操清单

按这个顺序走，每一步都能独立验证：

**第 0 步：先升到 6.0，不要直接跳 7.0**

```bash
npm install -D typescript@6.0.3
npx tsc --noEmit
```

6.0 会把所有弃用项报成警告（而不是错误），你正好借它把清单过一遍。全部清掉后再上 7.0，就不会撞上「一堆硬错误同时炸开」。

**第 1 步：处理默认值**

- [ ] 显式写 `"types": ["node"]`（或 `["*"]`），解决 `Cannot find name 'process'`
- [ ] 显式写 `"rootDir": "./src"`，确认 `dist` 结构没变
- [ ] 确认 `target` 改成 `es2025` 后打包产物符合预期（尤其 toB / 低版本浏览器场景，靠打包器的 browserslist 兜底）
- [ ] 如果项目从来没开过 `strict`，现在是默认开的 —— 要么补类型，要么显式 `"strict": false` 先顶住

**第 2 步：清理被移除的选项**

- [ ] `baseUrl` 删掉，`paths` 改成 `./src/*` 这种带前缀的写法
- [ ] `moduleResolution` 换成 `bundler` 或 `nodenext`
- [ ] `downlevelIteration`、`outFile`、`esModuleInterop: false`、`alwaysStrict: false` 全删
- [ ] 全局搜 `module Xxx {` 的命名空间写法，改成 `namespace`
- [ ] 全局搜 `assert { type:` ，改成 `with { type:`

**第 3 步：升 7.0 + 安排共存**

```bash
npm install -D typescript@^7.0.2
npx tsc --version        # 确认是 7.0.2
time npx tsc --noEmit    # 对比一下耗时，留个基线
```

- [ ] 跑了 typescript-eslint / Volar 的，按方案 B 装 `@typescript/typescript6` 并指过去
- [ ] CI 里按核数调 `--checkers`，记录调优前后耗时
- [ ] 编辑器装好 native-preview（或等内置），确认跳转/补全正常

**第 4 步：验证行为一致**

最容易被忽略的一步。并行化之后理论上行为一致，但值得验一下：

```bash
# 两边都跑一遍，diff 一下输出
npx tsc6 --noEmit > ts6.log 2>&1
npx tsc  --noEmit > ts7.log 2>&1
diff ts6.log ts7.log
```

有差异先试 `--singleThreaded` 排除并发因素，还不一样就是真 bug，去 [GitHub Issues](https://github.com/microsoft/TypeScript/issues) 报。

## FAQ

**Q：我的项目还在 5.x，要不要现在动？**
不动也行，5.9 还在修 bug。但新项目建议直接 7.0 —— 从 5.x 一路跳过 6.0 的问题是你得一次性消化所有默认值变更，而 6.0 的价值就是「把这些变成警告让你分批处理」。

**Q：升 7.0 会改我的代码吗？**
语法层面**不会**。TS 7 没有新增类型系统特性（这活儿留给 7.x 后续版本）。要改的都是配置和一些老写法。

**Q：`tsc` 变快了，为什么我的 Vite 启动还是老样子？**
因为 Vite 压根不调 `tsc`。它用 esbuild 转译，类型检查是你在 IDE 里或者 `vue-tsc --noEmit` 时才发生的。TS 7 提速的是**类型检查**这一环，不是转译。想感受到差异，去跑 `tsc --noEmit` 或者看编辑器报错出现的速度。

**Q：`isolatedDeclarations` 和 TS 7 有关系吗？**
没有直接关系（它是 5.5 加的），但方向一致：都是为了把类型检查从单文件维度拆开、好并行。TS 7 的并发收益在大项目上，一部分就来自这类「每个文件能独立处理」的设计。详见 [工具链篇](../engineering/toolchain)。

**Q：官方说 7.1 的 API 是「不同的」，那我现在写的工具要不要等？**
要等。现在基于 5.x/6.0 API 写的东西，7.1 出来后大概率要改。如果只是内部脚本，用 `tsc --noEmit` 的退出码 + 输出解析，反而比调 API 稳。

**Q：`@typescript/native-preview` 还能装吗？**
能装但别用了，它停在 2026-07-07 的 `7.0.0-dev`。7.0 GA 之后 nightly 统一走 `typescript@next`：

```bash
npm install -D typescript@next
```
