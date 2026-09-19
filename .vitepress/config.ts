import { defineConfig } from 'vitepress'
import { transformerTwoslash } from '@shikijs/vitepress-twoslash'
import { groupIconMdPlugin, groupIconVitePlugin } from 'vitepress-plugin-group-icons'

// Twoslash 的 queryToken / completionCompose 默认会给 v-menu 加上 :shown="true"，
// 导致页面一加载就把所有 //^? 类型提示弹出来。这里把 :shown="true" 整个删掉，
// 让 query popper 回到未受控的 click 触发状态。
function twoslashQueryDefaultHidden() {
  const strip = (html: string, theme: string) =>
    html.replace(
      new RegExp(`<v-menu\\b([^>]*?)\\btheme="${theme}"([^>]*?)>`, 'g'),
      (match, before, after) =>
        `<v-menu${before.replace(/\s:shown="true"/g, '')}theme="${theme}"${after.replace(/\s:shown="true"/g, '')}>`
    )
  return {
    name: 'twoslash-query-default-hidden',
    postprocess(html) {
      if (typeof html !== 'string') return html
      return strip(strip(html, 'twoslash-query'), 'twoslash-completion')
    },
  }
}

const guide = [
  { text: '写在前面', link: '/guide/' },
  { text: '编译流程：tsc 还是 Babel', link: '/guide/compile' },
  { text: 'tsconfig 逐项精讲', link: '/guide/tsconfig' },
  { text: '基础类型', link: '/guide/basic-types' },
  { text: '收窄与判别联合', link: '/guide/narrowing' },
  { text: 'strict 家族', link: '/guide/strict' },
]

const typeSystem = [
  { text: '结构化类型系统', link: '/type-system/' },
  { text: '类型兼容性', link: '/type-system/compatibility' },
  { text: '变型：协变与逆变', link: '/type-system/variance' },
  { text: '联合与交叉', link: '/type-system/union-intersection' },
  { text: '断言、守卫与 satisfies', link: '/type-system/assertion' },
  { text: '声明文件与模块解析', link: '/type-system/declaration' },
]

const generics = [
  { text: '泛型基础', link: '/generics/' },
  { text: 'keyof / typeof / 索引访问', link: '/generics/keyof-indexed' },
  { text: '映射类型', link: '/generics/mapped' },
  { text: '条件类型与分发', link: '/generics/conditional' },
  { text: 'infer 模式匹配', link: '/generics/infer' },
  { text: '模板字面量类型', link: '/generics/template-literal' },
  { text: '内置工具类型源码', link: '/generics/utility' },
]

const typeProgramming = [
  { text: '类型层心智模型', link: '/type-programming/' },
  { text: '六大套路', link: '/type-programming/six-patterns' },
  { text: '递归与元组计数', link: '/type-programming/recursion' },
  { text: 'any / unknown / never', link: '/type-programming/edge-cases' },
  { text: '调试与类型测试', link: '/type-programming/debugging' },
  { text: '编译性能', link: '/type-programming/performance' },
]

const engineering = [
  { text: '概览', link: '/engineering/' },
  { text: '工具链分工：tsc / tsx / tsup / vite', link: '/engineering/toolchain' },
  { text: 'React 与 Vue 中的类型', link: '/engineering/react-vue' },
  { text: 'Node 与服务端类型', link: '/engineering/node' },
  { text: '异步与迭代器', link: '/engineering/async-iterator' },
  { text: '流式与 SSE', link: '/engineering/streaming' },
  { text: 'ESM / CJS 与模块解析', link: '/engineering/module' },
  { text: '发布带类型的包', link: '/engineering/publish' },
]

const cheatsheet = [
  { text: '速查表总览', link: '/cheatsheet/' },
  { text: '关键字与语法', link: '/cheatsheet/keywords' },
  { text: '内置工具类型', link: '/cheatsheet/utility' },
  { text: '六大套路', link: '/cheatsheet/patterns' },
  { text: '边界行为', link: '/cheatsheet/edge' },
  { text: '异步与迭代器', link: '/cheatsheet/async' },
  { text: '变型与调试', link: '/cheatsheet/variance-debug' },
]

const practice = [
  { text: '刷题指南', link: '/practice/' },
  { text: '题库：热身与 Easy', link: '/practice/easy' },
  { text: '题库：Medium 精选', link: '/practice/medium' },
]

export default defineConfig({
  title: 'TypeScript 指南',
  description: '从 tsconfig 到类型编程：一份给工程师的 TypeScript 完整教程与速查手册',
  lang: 'zh-CN',
  cleanUrls: true,
  lastUpdated: false,
  ignoreDeadLinks: true,
  appearance: 'dark',

  head: [
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    [
      'link',
      {
        href: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
        rel: 'stylesheet',
      },
    ],
  ],

  markdown: {
    languages: ['js', 'jsx', 'ts', 'tsx', 'json', 'bash', 'vue'],
    theme: { light: 'github-light', dark: 'vitesse-dark' },
    codeTransformers: [
      transformerTwoslash({
        explicitTrigger: true,
        twoslashOptions: {
          compilerOptions: {
            strict: true,
            noUncheckedIndexedAccess: true,
            exactOptionalPropertyTypes: true,
          },
        },
      }),
      twoslashQueryDefaultHidden(),
    ],
    config(md) {
      md.use(groupIconMdPlugin)
    },
  },

  vite: {
    plugins: [groupIconVitePlugin()],
  },

  themeConfig: {
    nav: [
      { text: '基础', link: '/guide/', activeMatch: '/guide/' },
      { text: '类型系统', link: '/type-system/', activeMatch: '/type-system/' },
      { text: '泛型', link: '/generics/', activeMatch: '/generics/' },
      { text: '类型编程', link: '/type-programming/', activeMatch: '/type-programming/' },
      { text: '工程实践', link: '/engineering/', activeMatch: '/engineering/' },
      { text: '速查表', link: '/cheatsheet/', activeMatch: '/cheatsheet/' },
      { text: '题库', link: '/practice/', activeMatch: '/practice/' },
    ],

    sidebar: {
      '/guide/': guide,
      '/type-system/': typeSystem,
      '/generics/': generics,
      '/type-programming/': typeProgramming,
      '/engineering/': engineering,
      '/cheatsheet/': cheatsheet,
      '/practice/': practice,
      '/': guide,
    },

    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索', buttonAriaLabel: '搜索文档' },
          modal: {
            noResultsText: '没有找到结果',
            resetButtonTitle: '清除',
            footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' },
          },
        },
      },
    },

    outline: { level: [2, 3], label: '本页目录' },

    docFooter: { prev: '上一篇', next: '下一篇' },

    socialLinks: [{ icon: 'github', link: 'https://github.com/oceanDeep512/typescript-guide' }],

    footer: {
      message: '基于 VitePress 与 Twoslash 构建',
      copyright: '内容以 TypeScript 5.x 为准',
    },

    // 每篇文档底部的「在 GitHub 上编辑此页」，直接落到真实仓库对应文件
    editLink: {
      pattern: 'https://github.com/oceanDeep512/typescript-guide/edit/main/:path',
      text: '在 GitHub 上编辑此页',
    },
  },
})
