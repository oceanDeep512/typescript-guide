# 内置工具类型

按用途分组，每条给实现源码。**看懂这些，type-challenges 的 easy + medium 就掌握了一大半。**

## 对象操作

<TypeCard name="Partial / Required / Readonly" badge="映射">

```ts
type Partial<T>  = { [P in keyof T]?: T[P] }
type Required<T> = { [P in keyof T]-?: T[P] }
type Readonly<T> = { readonly [P in keyof T]: T[P] }
```

</TypeCard>

<TypeCard name="Pick / Omit" badge="约束 / 组合">

```ts
type Pick<T, K extends keyof T> = { [P in K]: T[P] }
type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>
```

`Omit` 是浅层的，深层要自己写递归。

</TypeCard>

<TypeCard name="Record" badge="映射">

```ts
type Record<K extends keyof any, T> = { [P in K]: T }
```

</TypeCard>

<TypeCard name="Mutable / DeepPartial" badge="手写常用">

```ts
type Mutable<T> = { -readonly [P in keyof T]: T[P] }

type DeepPartial<T> = T extends (infer U)[]
  ? DeepPartial<U>[]
  : T extends Function
    ? T
    : T extends object
      ? { [P in keyof T]?: DeepPartial<T[P]> }
      : T
```

</TypeCard>

## 联合操作

<TypeCard name="Exclude / Extract" badge="分发">

```ts
type Exclude<T, U> = T extends U ? never : T
type Extract<T, U> = T extends U ? T : never
```

</TypeCard>

<TypeCard name="NonNullable" badge="TS 4.8 改过">

```ts
type NonNullable<T> = T & {} // 4.8+ 的实现
// 4.8 之前：T extends null | undefined ? never : T
```

</TypeCard>

<TypeCard name="UnionToIntersection" badge="手写经典">

```ts twoslash
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never
type R = UnionToIntersection<{ a: 1 } | { b: 2 }>
//   ^?
```

利用函数参数位置的逆变。

</TypeCard>

## 函数操作

<TypeCard name="Parameters / ReturnType" badge="infer">

```ts
type Parameters<T extends (...args: any) => any> =
  T extends (...args: infer P) => any ? P : never

type ReturnType<T extends (...args: any) => any> =
  T extends (...args: any) => infer R ? R : any
```

</TypeCard>

<TypeCard name="ConstructorParameters / InstanceType" badge="abstract new">

```ts
type ConstructorParameters<T extends abstract new (...args: any) => any> =
  T extends abstract new (...args: infer P) => any ? P : never

type InstanceType<T extends abstract new (...args: any) => any> =
  T extends abstract new (...args: any) => infer R ? R : any
```

</TypeCard>

<TypeCard name="ThisParameterType / OmitThisParameter" badge="this">

```ts
type ThisParameterType<T> =
  T extends (this: infer U, ...args: never) => any ? U : unknown

type OmitThisParameter<T> =
  unknown extends ThisParameterType<T>
    ? T
    : T extends (...args: infer A) => infer R ? (...args: A) => R : T
```

</TypeCard>

<TypeCard name="NoInfer" badge="TS 5.4">

编译器内部实现（intrinsic），没有 TS 层源码。阻止类型参数参与推断。

</TypeCard>

## 异步

<TypeCard name="Awaited" badge="TS 4.5 · 递归">

```ts twoslash
type Awaited<T> =
  T extends null | undefined ? T :
    T extends object & { then(onfulfilled: infer F): any }
      ? F extends (value: infer V, ...args: any) => any
        ? Awaited<V>
        : never
      : T

type A = Awaited<Promise<Promise<number>>>
//   ^?
```

匹配的是 thenable，不只是 Promise。

</TypeCard>

## 字符串

<TypeCard name="Uppercase / Lowercase / Capitalize / Uncapitalize" badge="intrinsic">

编译器内部实现。配合模板字面量做键名转换。

```ts twoslash
type A = Capitalize<'abc'>
//   ^?
```

</TypeCard>

## 调试类

<TypeCard name="Prettify / Expand" badge="调试必备">

```ts twoslash
type Prettify<T> = { [K in keyof T]: T[K] } & {}
type P = Prettify<{ a: string } & { b: number }>
//   ^?
```

</TypeCard>

<TypeCard name="Equal / Expect" badge="类型测试">

```ts twoslash
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y
  ? 1
  : 2
  ? true
  : false
type Expect<T extends true> = T

type A = Equal<{ a: 1 }, { a?: 1 }>
//   ^?
```

利用函数签名的恒等比较，比 `extends` 严格得多。

</TypeCard>

## 速查表

| 类型 | 作用 |
| --- | --- |
| `Partial<T>` | 全部可选 |
| `Required<T>` | 全部必填 |
| `Readonly<T>` | 全部只读 |
| `Pick<T, K>` | 挑键 |
| `Omit<T, K>` | 剔除键 |
| `Record<K, T>` | 造对象 |
| `Exclude<T, U>` | 剔除联合成员 |
| `Extract<T, U>` | 保留联合成员 |
| `NonNullable<T>` | 去 null / undefined |
| `Parameters<T>` | 参数元组 |
| `ReturnType<T>` | 返回值 |
| `Awaited<T>` | 递归解 Promise |
| `NoInfer<T>` | 不参与推断 |
| `Uppercase<S>` | 转大写 |

## 下一步

- [六大套路](./patterns)
