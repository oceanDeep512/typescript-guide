---
layout: home

hero:
  name: TypeScript 指南
  text: 从 tsconfig 到类型编程
  tagline: 一份写给工程师的 TypeScript 完整教程 —— 类型系统、泛型、类型编程，以及它们在实际项目里的用法
  actions:
    - theme: brand
      text: 开始阅读
      link: /guide/
    - theme: alt
      text: 速查表
      link: /cheatsheet/

features:
  - title: 可交互的类型演示
    details: 关键概念的代码块接入了 Twoslash，鼠标悬停即可看到 TypeScript 编译器真实的推导结果，不用自己 hover 试。
    link: /type-programming/
  - title: 从工程配置讲起
    details: tsconfig 每一项在做什么、默认值有什么坑、为什么很多项目必须开 skipLibCheck —— 先把地基讲清楚。
    link: /guide/tsconfig
  - title: 类型编程讲套路
    details: 不堆砌语法，把类型编程归纳成六个可复用的套路，配可运行的推导过程与调试手法。
    link: /type-programming/six-patterns
  - title: 覆盖异步与流式
    details: AsyncIterator / AsyncGenerator 三参数族、Awaited 递归解包、SSE 与 AI 流式响应怎么写出干净的类型。
    link: /engineering/async-iterator
  - title: 速查手册
    details: 关键字、内置工具类型源码、六大套路、边界行为、变型与调试技巧，分七页随时查。
    link: /cheatsheet/
  - title: 题库与答案
    details: 精选 type-challenges 的 easy / medium 题，折叠式答案，配合本教程的套路讲解一起刷。
    link: /practice/
---
