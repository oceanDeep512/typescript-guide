# TS 工具链分工：tsc / esbuild / tsx / tsup / tsdown / vite

`tsc`、`tsx`、`tsup`、`tsdown`、`esbuild`、`vite`、`swc`、`rollup`……这些名字放在一起很容易混。根本原因不是你记性差，而是**它们压根不是同一层的东西**——但名字都带个 `ts`/`t`，看起来像同类。

先把一件事说死：**类型检查、转译、打包、运行，是四件独立的事。** 大部分混淆都来自以为它们是一件事。

## 一、一张图看清整条流水线

<svg viewBox="0 0 680 300" width="100%" role="img" xmlns="http://www.w3.org/2000/svg">
  <title>TypeScript 工具链流水线</title>
  <desc>源文件分别经过类型检查、转译、打包、直接运行四条路径</desc>
  <defs>
    <marker id="ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
    </marker>
  </defs>

  <rect x="250" y="14" width="180" height="44" rx="10" fill="var(--vp-c-bg-soft)" stroke="var(--vp-c-border)" stroke-width="1"/>
  <text x="340" y="41" text-anchor="middle" font-size="14" font-weight="600" fill="var(--vp-c-text-1)">src/*.ts 源文件</text>

  <path d="M340 58 L340 78 M94 78 L586 78 M94 78 L94 104 M258 78 L258 104 M422 78 L422 104 M586 78 L586 104"
        fill="none" stroke="var(--vp-c-text-3)" stroke-width="1.2"/>
  <path d="M94 104 L94 110" fill="none" stroke="var(--vp-c-text-3)" stroke-width="1.2" marker-end="url(#ar)"/>
  <path d="M258 104 L258 110" fill="none" stroke="var(--vp-c-text-3)" stroke-width="1.2" marker-end="url(#ar)"/>
  <path d="M422 104 L422 110" fill="none" stroke="var(--vp-c-text-3)" stroke-width="1.2" marker-end="url(#ar)"/>
  <path d="M586 104 L586 110" fill="none" stroke="var(--vp-c-text-3)" stroke-width="1.2" marker-end="url(#ar)"/>

  <g>
    <rect x="18" y="112" width="152" height="58" rx="10" fill="var(--vp-c-bg-soft)" stroke="var(--vp-c-border)" stroke-width="1"/>
    <text x="94" y="136" text-anchor="middle" font-size="13" font-weight="600" fill="var(--vp-c-text-1)">① 类型检查</text>
    <text x="94" y="156" text-anchor="middle" font-size="12" font-family="ui-monospace, monospace" fill="var(--vp-c-brand-1)">tsc --noEmit</text>
  </g>
  <g>
    <rect x="182" y="112" width="152" height="58" rx="10" fill="var(--vp-c-bg-soft)" stroke="var(--vp-c-border)" stroke-width="1"/>
    <text x="258" y="136" text-anchor="middle" font-size="13" font-weight="600" fill="var(--vp-c-text-1)">② 转译</text>
    <text x="258" y="156" text-anchor="middle" font-size="12" font-family="ui-monospace, monospace" fill="var(--vp-c-brand-1)">esbuild / swc / tsc</text>
  </g>
  <g>
    <rect x="346" y="112" width="152" height="58" rx="10" fill="var(--vp-c-bg-soft)" stroke="var(--vp-c-border)" stroke-width="1"/>
    <text x="422" y="136" text-anchor="middle" font-size="13" font-weight="600" fill="var(--vp-c-text-1)">③ 打包</text>
    <text x="422" y="156" text-anchor="middle" font-size="12" font-family="ui-monospace, monospace" fill="var(--vp-c-brand-1)">rollup / rolldown</text>
  </g>
  <g>
    <rect x="510" y="112" width="152" height="58" rx="10" fill="var(--vp-c-bg-soft)" stroke="var(--vp-c-border)" stroke-width="1"/>
    <text x="586" y="136" text-anchor="middle" font-size="13" font-weight="600" fill="var(--vp-c-text-1)">④ 直接运行</text>
    <text x="586" y="156" text-anchor="middle" font-size="12" font-family="ui-monospace, monospace" fill="var(--vp-c-brand-1)">tsx / node</text>
  </g>

  <path d="M94 170 L94 206" fill="none" stroke="var(--vp-c-text-3)" stroke-width="1.2" marker-end="url(#ar)"/>
  <path d="M258 170 L258 206" fill="none" stroke="var(--vp-c-text-3)" stroke-width="1.2" marker-end="url(#ar)"/>
  <path d="M422 170 L422 206" fill="none" stroke="var(--vp-c-text-3)" stroke-width="1.2" marker-end="url(#ar)"/>
  <path d="M586 170 L586 206" fill="none" stroke="var(--vp-c-text-3)" stroke-width="1.2" marker-end="url(#ar)"/>

  <g>
    <rect x="18" y="208" width="152" height="46" rx="10" fill="none" stroke="var(--vp-c-border)" stroke-dasharray="4 3" stroke-width="1"/>
    <text x="94" y="236" text-anchor="middle" font-size="12" fill="var(--vp-c-text-2)">类型错误报告</text>
  </g>
  <g>
    <rect x="182" y="208" width="152" height="46" rx="10" fill="none" stroke="var(--vp-c-border)" stroke-dasharray="4 3" stroke-width="1"/>
    <text x="258" y="236" text-anchor="middle" font-size="12" fill="var(--vp-c-text-2)">同名 .js 文件</text>
  </g>
  <g>
    <rect x="346" y="208" width="152" height="46" rx="10" fill="none" stroke="var(--vp-c-border)" stroke-dasharray="4 3" stroke-width="1"/>
    <text x="422" y="236" text-anchor="middle" font-size="12" fill="var(--vp-c-text-2)">dist/*.js</text>
  </g>
  <g>
    <rect x="510" y="208" width="152" height="46" rx="10" fill="none" stroke="var(--vp-c-border)" stroke-dasharray="4 3" stroke-width="1"/>
    <text x="586" y="236" text-anchor="middle" font-size="12" fill="var(--vp-c-text-2)">进程跑起来</text>
  </g>

  <text x="94" y="278" text-anchor="middle" font-size="11" fill="var(--vp-c-text-3)">不产出文件</text>
  <text x="258" y="278" text-anchor="middle" font-size="11" fill="var(--vp-c-text-3)">1 个 → 1 个</text>
  <text x="422" y="278" text-anchor="middle" font-size="11" fill="var(--vp-c-text-3)">多个 → 少量</text>
  <text x="586" y="278" text-anchor="middle" font-size="11" fill="var(--vp-c-text-3)">不落盘</text>
  <text x="340" y="292" text-anchor="middle" font-size="11" fill="var(--vp-c-text-3)">②③④ 都不做类型检查 —— 类型检查永远是 tsc 的活</text>
</svg>

关键点：**只有 ① 会看你的类型对不对。** ②③④ 全都是"把类型擦掉、把语法降级"，类型写错了它们照样给你跑。

## 二、五类角色，别混着记

| 角色 | 干什么 | 产出 | 代表工具 |
| --- | --- | --- | --- |
| **类型检查器** | 验证类型、报错 | 无 | `tsc --noEmit`、`vue-tsc` |
| **转译器** | 擦类型 + 语法降级，单文件进单文件出 | `.js` | `tsc`、`esbuild`、`swc`、`oxc`、Babel |
| **打包器** | 合并模块、tree-shaking、代码分割 | `dist/` | `rollup`、`rolldown`、`esbuild`、`webpack`、`rspack` |
| **运行时 / 加载器** | 让 Node 直接执行 `.ts` | 无 | `tsx`、`ts-node`、Node 原生类型剥离 |
| **一体化工具** | 把上面几步串起来 | 视情况 | `vite`、`tsup`、`tsdown`、`unbuild` |

`vite` / `tsup` / `tsdown` 属于最后一类——它们是**编排者**，内部会挑转译器和打包器来用。所以拿 `tsup` 和 `esbuild` 对比是错的：`tsup` 的底层就是 `esbuild`。

## 三、逐个说清楚

### `tsc` —— 唯一的官方编译器

TypeScript 自带的编译器，同时做两件事：**类型检查** + **转译**。

```bash
tsc --noEmit     # 只检查，不产出任何文件（CI 里跑这个）
tsc              # 检查 + 产出 .js
tsc -b           # build 模式，配合 project references 做增量构建
```

**它不打包。** 这是最常被误解的一点：`tsc` 只是把 `src/a.ts` 变成 `dist/a.js`，一进一出。它不会把 `node_modules` 里的依赖合并进来，不做 tree-shaking，不做代码分割。想发布一个单文件的库，`tsc` 做不到。

慢，是因为它要做完整的类型推导——这份慢换来的是唯一可信的类型检查。

### `esbuild` —— 快的转译器 + 打包器

Go 写的，快一个数量级。既能转译也能打包，`vite` 和 `tsup` 都拿它当底座。

**它明确不做类型检查**（官方 FAQ 写了永远不会支持）。所以：

```jsonc
{
  "scripts": {
    "build": "esbuild src/index.ts --bundle --outfile=dist/index.js",
    // 类型错误不会让上面那行失败，必须单独跑
    "typecheck": "tsc --noEmit"
  }
}
```

因为它单文件转译（不知道其他文件的信息），你的代码必须满足 `isolatedModules` 的约束——这条约束和我们后面要讲的所有快速工具都相关。

### `swc` / `oxc` —— 同类竞品

- `swc`：Rust 写的转译器，定位对标 `esbuild`，Next.js 早期用过它
- `oxc`：更新的 Rust 工具链，`tsdown` 用它生成 `.d.ts`

同样都不做类型检查。

### `tsx` —— 让 Node 直接跑 TS

一个运行时加载器，底层是 `esbuild`。

```bash
npx tsx src/index.ts        # 直接跑
npx tsx watch src/index.ts  # 改文件自动重启
node --import tsx ./x.ts    # 当 loader 挂到 node 上
```

- **不做类型检查**
- 同时支持 ESM 和 CJS，不需要你区分
- **读 `tsconfig.json`**，所以 `paths` 别名能用（这是它相对 Node 原生的关键优势）
- 支持 JSX
- 常被当作 Jest 的 TS loader，替代配置繁琐的 `ts-jest`

启动开销约 120ms，`ts-node` 约 300ms。

### `ts-node` —— 老牌运行时

用真正的 TypeScript 编译器来跑，**默认会做类型检查**，所以慢。

```bash
npx ts-node src/index.ts                 # 会检查类型，慢
npx ts-node --transpile-only src/index.ts # 不检查，快
```

什么时候还离不开它：需要 `emitDecoratorMetadata` 的框架（典型是 NestJS 的依赖注入）。`esbuild` / `swc` / 类型剥离都不产出装饰器元数据，这类项目必须走 `tsc` 或 `ts-node`。

### Node 原生跑 TS —— 零依赖选项

```bash
node --experimental-strip-types src/index.ts  # Node 22.6 ~ 22.17
node src/index.ts                             # Node 22.18+ / 23.6+ / 24，默认可用
```

原理是**擦除类型**（type stripping），不是编译。三条硬约束：

1. **不转换 `enum`、`namespace`、参数属性**——这些是有运行时产物的语法。要用得加 `--experimental-transform-types`。所以想用原生模式，老老实实开 `erasableSyntaxOnly`
2. **不读 `tsconfig.json`**——`paths` 别名不生效，需要别名的项目请用 `tsx`
3. **不处理 `node_modules` 里的 TS**——发布到 npm 的包必须提供编译后的 JS

启动开销约 15ms，最快，且零依赖。适合脚本、定时任务、内部工具。

::: warning
三种运行方式**都不检查类型**。这不是缺陷，是刻意的分工：执行归执行，检查归检查。CI 里必须有独立的 `tsc --noEmit` 步骤，否则类型错误会一路跑到生产。
:::

### `vite` —— 前端应用的一体化工具

```
dev  ：esbuild 转译 + 依赖预打包 + 原生 ESM dev server（毫秒级 HMR）
build：rollup（Vite 7 起可切换 rolldown）
```

**不做类型检查。** 你在 Vite 项目里看到的类型错误，来自 IDE（背后是 TS 语言服务），不是来自 Vite。所以 Vite 项目的 CI 要跑：

```jsonc
{
  "scripts": {
    "build": "vue-tsc --noEmit && vite build",  // Vue 项目
    // 或
    "build": "tsc --noEmit && vite build"       // React 项目
  }
}
```

### `tsup` —— 库打包器（esbuild 底座）

零配置打包 TS 库，一条命令出 ESM + CJS + `.d.ts`：

```bash
npx tsup src/index.ts --format esm,cjs --dts
```

```ts
// tsup.config.ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,          // 生成 .d.ts
  clean: true,
  sourcemap: true,
  // dependencies / peerDependencies 默认自动 external，不会被打进产物
})
```

一个容易误解的点：**`dts: true` 这一步不是 esbuild 干的**。类型声明仍然要靠 `tsc`（或 `rollup-plugin-dts`）生成，所以开了 `dts` 之后构建会明显变慢——慢的那部分就是类型系统在干活。

### `tsdown` —— tsup 的继任者（rolldown 底座）

官方定位是 "tsup 的精神继任者"，底层换成 **Rolldown**（Rust，Rollup 的兼容替代）：

```ts
// tsdown.config.ts
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
})
```

相对 `tsup` 的差异：

| 项 | tsup | tsdown |
| --- | --- | --- |
| 引擎 | esbuild（Go） | Rolldown（Rust）+ Oxc 生成 dts |
| 插件生态 | esbuild 插件 | Rollup / Rolldown / unplugin / 部分 Vite 插件 |
| 默认 format | `cjs` | `esm` |
| `clean` 默认 | `false` | `true` |
| `dts` | 默认关 | `package.json` 有 `types` 字段时自动开 |
| 其他 | — | 内置 workspace 模式、产物校验、CSS、可执行打包 |

迁移有官方命令 `npx tsdown-migrate`，多数选项直接兼容。

**怎么选**：新项目追求性能和未来兼容 → `tsdown`；要最稳、生态插件最全 → `tsup`。两者配置文件几乎一样，切换成本很低。

### `unbuild` —— unjs 生态的选择

Rollup 底座，Nuxt / Nitro / h3 这些包在用。最大特色是 **stub 模式**：

```bash
npx unbuild --stub
```

它在 `dist/` 里生成转发到 `src/` 的代理文件，改源码立刻生效，**连 watch 都不用跑**。本地联调多个包时体验很好。`tsdown` 明确不支持这个模式。

### `rollup` / `webpack` / `rspack` / `rolldown`

通用打包器。日常不直接配置它们——你用的 `vite`、`tsup`、`tsdown` 已经替你选好了。只有需要精细化控制产物时才直接上手。

## 四、决策树

<svg viewBox="0 0 680 400" width="100%" role="img" xmlns="http://www.w3.org/2000/svg">
  <title>TypeScript 工具选择决策树</title>
  <desc>按目标选择对应的 TS 工具</desc>
  <defs>
    <marker id="ar2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
    </marker>
  </defs>

  <rect x="230" y="12" width="220" height="44" rx="10" fill="var(--vp-c-brand-soft)" stroke="var(--vp-c-brand-1)" stroke-width="1"/>
  <text x="340" y="40" text-anchor="middle" font-size="14" font-weight="600" fill="var(--vp-c-text-1)">你现在要做什么？</text>

  <path d="M340 56 L340 70 M60 70 L620 70 M60 70 L60 104 M230 70 L230 104 M400 70 L400 104 M570 70 L570 104"
        fill="none" stroke="var(--vp-c-text-3)" stroke-width="1.2"/>
  <path d="M60 104 L60 110" fill="none" stroke="var(--vp-c-text-3)" stroke-width="1.2" marker-end="url(#ar2)"/>
  <path d="M230 104 L230 110" fill="none" stroke="var(--vp-c-text-3)" stroke-width="1.2" marker-end="url(#ar2)"/>
  <path d="M400 104 L400 110" fill="none" stroke="var(--vp-c-text-3)" stroke-width="1.2" marker-end="url(#ar2)"/>
  <path d="M570 104 L570 110" fill="none" stroke="var(--vp-c-text-3)" stroke-width="1.2" marker-end="url(#ar2)"/>

  <text x="60" y="96" text-anchor="middle" font-size="11" fill="var(--vp-c-text-3)">验证类型</text>
  <text x="230" y="96" text-anchor="middle" font-size="11" fill="var(--vp-c-text-3)">跑脚本 / 起服务</text>
  <text x="400" y="96" text-anchor="middle" font-size="11" fill="var(--vp-c-text-3)">开发前端</text>
  <text x="570" y="96" text-anchor="middle" font-size="11" fill="var(--vp-c-text-3)">发布 npm 库</text>

  <g>
    <rect x="10" y="112" width="100" height="86" rx="10" fill="var(--vp-c-bg-soft)" stroke="var(--vp-c-border)" stroke-width="1"/>
    <text x="60" y="140" text-anchor="middle" font-size="13" font-weight="600" fill="var(--vp-c-text-1)">tsc</text>
    <text x="60" y="160" text-anchor="middle" font-size="12" font-family="ui-monospace, monospace" fill="var(--vp-c-brand-1)">--noEmit</text>
    <text x="60" y="180" text-anchor="middle" font-size="11" fill="var(--vp-c-text-3)">CI / pre-commit</text>
  </g>

  <g>
    <rect x="140" y="112" width="180" height="86" rx="10" fill="var(--vp-c-bg-soft)" stroke="var(--vp-c-border)" stroke-width="1"/>
    <text x="230" y="140" text-anchor="middle" font-size="13" font-weight="600" fill="var(--vp-c-text-1)">node file.ts</text>
    <text x="230" y="160" text-anchor="middle" font-size="11" fill="var(--vp-c-text-3)">Node 22.18+，零依赖</text>
    <text x="230" y="180" text-anchor="middle" font-size="11" fill="var(--vp-c-text-3)">需要别名 / JSX → tsx</text>
  </g>

  <g>
    <rect x="340" y="112" width="120" height="86" rx="10" fill="var(--vp-c-bg-soft)" stroke="var(--vp-c-border)" stroke-width="1"/>
    <text x="400" y="140" text-anchor="middle" font-size="13" font-weight="600" fill="var(--vp-c-text-1)">vite</text>
    <text x="400" y="160" text-anchor="middle" font-size="11" fill="var(--vp-c-text-3)">dev + build 一体</text>
    <text x="400" y="180" text-anchor="middle" font-size="11" fill="var(--vp-c-text-3)">类型另跑 vue-tsc</text>
  </g>

  <g>
    <rect x="480" y="112" width="180" height="86" rx="10" fill="var(--vp-c-bg-soft)" stroke="var(--vp-c-border)" stroke-width="1"/>
    <text x="570" y="140" text-anchor="middle" font-size="13" font-weight="600" fill="var(--vp-c-text-1)">tsup / tsdown</text>
    <text x="570" y="160" text-anchor="middle" font-size="11" fill="var(--vp-c-text-3)">出 ESM + CJS + d.ts</text>
    <text x="570" y="180" text-anchor="middle" font-size="11" fill="var(--vp-c-text-3)">monorepo → tsdown -W</text>
  </g>

  <path d="M340 198 L340 236" fill="none" stroke="var(--vp-c-text-3)" stroke-width="1.2" marker-end="url(#ar2)"/>
  <rect x="150" y="238" width="380" height="60" rx="10" fill="var(--vp-c-brand-soft)" stroke="var(--vp-c-brand-1)" stroke-width="1" stroke-dasharray="5 3"/>
  <text x="340" y="266" text-anchor="middle" font-size="13" font-weight="600" fill="var(--vp-c-text-1)">不管选哪条，类型检查都是独立的一步</text>
  <text x="340" y="286" text-anchor="middle" font-size="12" font-family="ui-monospace, monospace" fill="var(--vp-c-brand-1)">tsc --noEmit</text>

  <path d="M340 298 L340 330 M170 330 L510 330 M170 330 L170 352 M510 330 L510 352"
        fill="none" stroke="var(--vp-c-text-3)" stroke-width="1.2"/>
  <path d="M170 352 L170 358" fill="none" stroke="var(--vp-c-text-3)" stroke-width="1.2" marker-end="url(#ar2)"/>
  <path d="M510 352 L510 358" fill="none" stroke="var(--vp-c-text-3)" stroke-width="1.2" marker-end="url(#ar2)"/>

  <rect x="60" y="360" width="220" height="34" rx="10" fill="none" stroke="var(--vp-c-border)" stroke-width="1"/>
  <text x="170" y="381" text-anchor="middle" font-size="12" fill="var(--vp-c-text-2)">IDE 里看到红波浪线</text>
  <rect x="400" y="360" width="220" height="34" rx="10" fill="none" stroke="var(--vp-c-border)" stroke-width="1"/>
  <text x="510" y="381" text-anchor="middle" font-size="12" fill="var(--vp-c-text-2)">CI 里阻断合并</text>
</svg>

## 五、最容易踩的六个误区

**1. "Vite / tsup 会帮我检查类型"**
不会。它们的流水线里没有 `tsc`。你在编辑器里看到的红线是 TS 语言服务给的，跟构建工具无关。所以 `npm run build` 成功 ≠ 类型没问题。

**2. "tsc 会打包"**
不会。`tsc` 是一进一出的转译器，不做依赖合并、不做 tree-shaking。想产出可分发的单文件，需要打包器。

**3. "装了 tsx 就不用 tsc 了"**
不行。`tsx` 只负责跑起来，不检查类型。两者是配合关系，不是替代关系。

**4. "esbuild 能处理所有 TS 语法"**
不能。单文件转译模式下，`enum`、`namespace`、参数属性、`export =` 这些"需要跨文件信息"或"有运行时产物"的语法都有坑。这也是 `isolatedModules` / `verbatimModuleSyntax` / `erasableSyntaxOnly` 这三个开关存在的意义——它们提前把这类写法禁掉。

**5. "d.ts 是 esbuild 生成的"**
不是。类型声明至今仍然依赖 TypeScript 自己的 API：`tsup` 内部调 `tsc` / `rollup-plugin-dts`，`tsdown` 用 Oxc。所以开了 `dts` 之后构建变慢是必然的。

**6. "Node 能跑 .ts，那 tsconfig 的 paths 也能用"**
不能。Node 的类型剥离**完全不读 `tsconfig.json`**。需要 `paths` 别名就回到 `tsx` 或打包器。

## 六、tsconfig 里哪些项真正影响这些工具

| 配置项 | 影响谁 | 说明 |
| --- | --- | --- |
| `strict` 家族 | 只有 `tsc` | esbuild / swc 直接无视 |
| `target` | `tsc` 产出；esbuild 用自己的 `target` | 两边不一致会导致产物行为不同 |
| `isolatedModules` | 所有单文件转译工具 | 不满足就无法用 esbuild / swc / vite |
| `verbatimModuleSyntax` | 同上 | 强制区分 `import type` |
| `erasableSyntaxOnly` | Node 原生跑 TS | 禁掉 enum / namespace / 参数属性 |
| `useDefineForClassFields` | `tsc` / `esbuild` / `swc` 都要对齐 | 不一致会出现"本地好、线上炸" |
| `paths` | `tsc` 只影响类型 | 运行时要打包器或 `tsx` 支持；Node 原生不支持 |
| `experimentalDecorators` + `emitDecoratorMetadata` | 只有 `tsc` / `ts-node` | NestJS 这类框架锁死在 `tsc` 上 |

一句话总结：**`tsconfig.json` 是给 `tsc` 和 IDE 看的**，其他工具只读其中一小部分（主要是模块解析和少量语法开关）。

## 七、三套可以照抄的组合

**前端应用**

```jsonc
{
  "scripts": {
    "dev": "vite",
    "typecheck": "tsc --noEmit",           // 或 vue-tsc --noEmit
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview"
  }
}
```

**Node 后端服务**

```jsonc
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "typecheck": "tsc --noEmit",
    "build": "tsc",                         // 产出 dist/
    "start": "node dist/index.js"           // 生产跑编译后的 JS
  }
}
```

**npm 库**

```jsonc
{
  "scripts": {
    "dev": "tsdown --watch",
    "typecheck": "tsc --noEmit",
    "build": "tsdown",                      // 出 ESM + CJS + d.ts
    "prepublishOnly": "npm run typecheck && npm run build"
  }
}
```

三者都有一个独立的 `typecheck`——**这条是刻意的**。把类型检查从执行/构建里拆出来，既能享受 esbuild 的速度，又不丢 tsc 的严谨。

## 下一步

- [ESM / CJS 与模块解析](./module)
- [发布带类型的包](./publish)
- [tsconfig 逐项精讲](../guide/tsconfig)
