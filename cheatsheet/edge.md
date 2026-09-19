# 边界行为

"为什么我的类型结果跟想的不一样"的答案库。

## any / unknown / never 定位

| 类型 | 含义 | 谁能赋给它 | 它能赋给谁 |
| --- | --- | --- | --- |
| `any` | 放弃检查 | 一切 | 一切 |
| `unknown` | 未知 | 一切 | 只有 `unknown` / `any` |
| `never` | 空集 | 没有值 | 一切 |

## 在条件类型里的行为

```ts twoslash
type F<T> = T extends string ? 1 : 2
type A = F<any>
//   ^?
type B = F<unknown>
//   ^?
type C = F<never>
//   ^?
type D = F<string>
//   ^?
```

| 输入 | 结果 | 原因 |
| --- | --- | --- |
| `any` | `1 \| 2` | 同时走两个分支 |
| `unknown` | `2` | 正常判断 |
| `never` | `never` | 被当成空联合，分发到 0 个成员 |
| 普通类型 | 正常 | 分发后合并 |

## 分发

<TypeCard name="什么时候分发" badge="核心机制">

```ts twoslash
type D1<T> = T extends 'a' ? 1 : 2
type D2<T> = [T] extends ['a'] ? 1 : 2
type D3<T> = T[] extends 'a'[] ? 1 : 2

type A = D1<'a' | 'b'>
//   ^?
type B = D2<'a' | 'b'>
//   ^?
type C = D3<'a' | 'b'>
//   ^?
```

**只有裸类型参数**才分发。包一层元组 / 数组 / 对象就能阻止。

</TypeCard>

<TypeCard name="判断 never 必须用元组" badge="必考题">

```ts twoslash
type Bad<T> = T extends never ? true : false
type Good<T> = [T] extends [never] ? true : false

type A = Bad<never>
//   ^?
type B = Good<never>
//   ^?
```

</TypeCard>

<TypeCard name="判断 any" badge="技巧">

```ts twoslash
type IsAny<T> = 0 extends 1 & T ? true : false
type A = IsAny<any>
//   ^?
type B = IsAny<unknown>
//   ^?
```

原理：`1 & any` 是 `any`，`0 extends any` 成立。

</TypeCard>

## 元组 vs 数组

```ts twoslash
type A = [1, 2, 3]['length']
//   ^?
type B = number[]['length']
//   ^?
type C = [...[1, 2], 3]
//   ^?
type D = [1, 2, 3] extends [infer F, ...infer R] ? [F, R] : never
//   ^?
```

数组转元组办不到（长度未知）。所有计数技巧只对元组有效。

## 递归上限

- **尾递归**：TS 会优化，约 1000 次迭代
- **非尾递归**：约 50 层就会报 `Type instantiation is excessively deep`

对策：改成尾递归、限制深度、拆分中间类型。详见[编译性能](../type-programming/performance)。

## readonly 与可变性

```ts twoslash
type Mutable<T> = { -readonly [K in keyof T]: T[K] }
type A = Mutable<readonly string[]>
//   ^?
```

方向：`string[]` → `readonly string[]` 可以，反过来不行。

## keyof 的意外

```ts twoslash
interface Dict {
  [k: string]: number
}
type A = keyof Dict
//   ^?
interface Opt {
  a?: string
}
type B = Opt['a']
//   ^?
```

- 索引签名会多出 `number`
- 可选属性的值带 `undefined`

## boolean 也是联合

```ts twoslash
type F<T> = T extends true ? 'yes' : 'no'
type A = F<boolean>
//   ^?
type G<T> = [T] extends [true] ? 'yes' : 'no'
type B = G<boolean>
//   ^?
```

## 其他易错点

| 现象 | 原因 |
| --- | --- |
| 联合变成 `never` | 条件类型把所有成员都过滤掉了 |
| 结果变成联合而不是单个 | 意外分发了 |
| 循环里收窄失效 | 收窄只在 `if` 块内有效 |
| 交叉类型看不清 | 套 `Prettify` |
| 报错被截断 | 加 `--noErrorTruncation` |

## 下一步

- [异步与迭代器](./async)
