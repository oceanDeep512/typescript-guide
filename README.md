# TypeScript 指南

基于 VitePress + Twoslash 的 TypeScript 教程与速查站。

- 仓库：<https://github.com/oceanDeep512/typescript-guide>

## 运行

```bash
npm install
npm run dev      # 本地开发，默认 http://localhost:5173
npm run build    # 构建到 dist
npm run preview  # 预览构建产物
```

> `outDir` 在 `.vitepress/config.ts` 里显式设成了 `dist`（VitePress 默认是 `.vitepress/dist`），
> 这样部署到 Cloudflare / Vercel 时不用单独改产物路径。

## 部署（Cloudflare Pages，push 即发布）

| 配置项 | 值 |
| --- | --- |
| Production branch | `main` |
| Framework preset | `None` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/` |
| Environment variables | `NODE_VERSION = 22` |

推到 `main` 即自动构建发布；其他分支生成独立预览地址。

## 目录结构

```
.vitepress/
├── config.ts                  # 站点配置（导航、侧边栏、搜索、Twoslash）
└── theme/
    ├── index.ts               # 主题入口，注册组件
    ├── custom.css             # 样式定制
    └── components/
        ├── Exercise.vue       # 折叠式练习题
        ├── TypeCard.vue       # 速查卡片
        └── Callout.vue        # 提示块
```

目录顺序即推荐阅读顺序（与侧边栏一致，详见 `guide/index.md` 的「阅读路线」）：

```
guide/             基础篇（按阅读顺序）
                   写在前面 → 编译流程 → tsconfig → TypeScript 6/7
                   → 基础类型 → 收窄与判别联合 → strict 家族
type-system/       类型系统：结构化类型 → 兼容性 → 变型 → 联合与交叉
                   → 断言守卫 satisfies → 声明文件与模块解析
generics/          泛型：泛型基础 → keyof/typeof → 映射类型 → 条件类型与分发
                   → infer → 模板字面量 → 内置工具类型源码
type-programming/  类型编程：心智模型 → 六大套路 → 调试与类型测试
                   → 递归与元组计数 → any/unknown/never → 编译性能
engineering/       工程实践：概览 → 工具链 → React/Vue → 装饰器与 NestJS
                   → Schema 与运行时校验 → Node → 异步与迭代器 → 流式 SSE
                   → ESM/CJS 与模块解析 → 发布带类型的包
cheatsheet/        速查表：关键字、工具类型、套路、边界、异步、变型与调试
practice/          题库：热身与 Easy、Medium 精选（折叠式答案）
```

后两篇（速查表、题库）是按需查阅性质，不参与阅读顺序。

## 技术栈

| 依赖 | 用途 |
| --- | --- |
| `vitepress` 1.6 | 静态站点生成、本地搜索、深色模式 |
| `@shikijs/vitepress-twoslash` | 在代码块里渲染真实的 TS 推导结果（hover、`//^?` 查询、`@errors`） |
| `vitepress-plugin-group-icons` | 代码块语言图标 |
| `typescript` | Twoslash 的类型服务依赖 |

## 写内容时的注意事项

1. **只有带 `twoslash` 标记的代码块会做类型检查**：

   ````md
   ```ts twoslash
   type A = keyof { x: 1 }
   //   ^?
   ```
   ````

   普通 ```ts 块只做语法高亮，不会校验类型。

2. **`//^?` 的 `^` 要对准上一行要查询的标识符**。`type X = ...` 的标准写法是 `//   ^?`（三个空格）。

3. **每个 twoslash 块是独立的作用域**，前一个块里定义的类型在下一个块里不存在，需要重复定义。

4. **故意保留的报错要声明**：在块首行写 `// @errors: 2322`，否则构建会失败。

5. Twoslash 的编译选项在 `.vitepress/config.ts` 里配（当前开了 `strict`、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`）。

## 自定义组件

```md
<TypeCard name="keyof" badge="关键字">
说明文字，支持 Markdown 和代码块。
</TypeCard>

<Exercise title="实现 Pick" level="easy">
题目内容

<template #answer>
答案内容
</template>
</Exercise>

<Callout type="warn">
提示内容（tip / warn / danger）
</Callout>
```

组件标签内的空行不能省，否则 Markdown 不会被解析。
