# 内置工具类型源码

所有内置工具类型都在 20 行以内。**看懂它们的实现，等于掌握了 type-challenges 里 easy + medium 的一大半。**

下面是 TypeScript 官方 `lib.es5.d.ts` 里的真实定义（略有简化）。

## 对象操作

<TypeCard name="Partial<T>" badge="映射 + 修饰符">

把所有属性变成可选。

```ts
type Partial<T> = { [P in keyof T]?: T[P] }
```

</TypeCard>

<TypeCard name="Required<T>" badge="移除修饰符">

把所有属性变成必填。

```ts
type Required<T> = { [P in keyof T]-?: T[P] }
```

</TypeCard>

<TypeCard name="Readonly<T>" badge="映射">

```ts
type Readonly<T> = { readonly [P in keyof T]: T[P] }
```

</TypeCard>

<TypeCard name="Pick<T, K>" badge="约束 + 映射">

```ts
type Pick<T, K extends keyof T> = { [P in K]: T[P] }
```

`K extends keyof T` 保证只能挑存在的键。

</TypeCard>

<TypeCard name="Omit<T, K>" badge="Pick + Exclude">

```ts
type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>
```

注意它是**浅层**的，嵌套对象里的键不会被剔除。

```ts twoslash
type DeepOmit<T, K extends string> = T extends (infer U)[]
  ? DeepOmit<U, K>[]
  : T extends object
    ? { [P in Exclude<keyof T, K>]: DeepOmit<T[P], K> }
    : T
```

</TypeCard>

<TypeCard name="Record<K, T>" badge="映射">

```ts
type Record<K extends keyof any, T> = { [P in K]: T }
```

</TypeCard>

## 联合操作

<TypeCard name="Exclude<T, U>" badge="分发">

```ts
type Exclude<T, U> = T extends U ? never : T
```

原理：分发后不满足的变成 `never`，`never` 在联合里消失。

</TypeCard>

<TypeCard name="Extract<T, U>" badge="分发">

```ts
type Extract<T, U> = T extends U ? T : never
```

</TypeCard>

<TypeCard name="NonNullable<T>" badge="TS 4.8 改过实现">

```ts
// 4.8 之前
type Old<T> = T extends null | undefined ? never : T

// 4.8 之后
type NonNullable<T> = T & {}
```

改成 `T & {}` 的原因：旧实现会**分发**，把 `NonNullable<string | null>` 变成 `string` 是对的，但对 `any` 的处理有 bug（`any` 会被分发成两个分支）。`T & {}` 直接利用"交叉 `{}` 排除 null/undefined"的结构性质，更快也更准。

</TypeCard>

## 函数操作

<TypeCard name="Parameters<T>" badge="infer">

```ts
type Parameters<T extends (...args: any) => any> =
  T extends (...args: infer P) => any ? P : never
```

</TypeCard>

<TypeCard name="ReturnType<T>" badge="infer">

```ts
type ReturnType<T extends (...args: any) => any> =
  T extends (...args: any) => infer R ? R : any
```

注意兜底是 `any` 不是 `never`。

</TypeCard>

<TypeCard name="ConstructorParameters / InstanceType" badge="abstract new">

```ts
type ConstructorParameters<T extends abstract new (...args: any) => any> =
  T extends abstract new (...args: infer P) => any ? P : never

type InstanceType<T extends abstract new (...args: any) => any> =
  T extends abstract new (...args: any) => infer R ? R : any
```

`abstract new` 是关键——加了 `abstract` 才能同时匹配普通类和抽象类。

</TypeCard>

<TypeCard name="ThisParameterType / OmitThisParameter" badge="this 参数">

```ts
type ThisParameterType<T> =
  T extends (this: infer U, ...args: never) => any ? U : unknown

type OmitThisParameter<T> =
  unknown extends ThisParameterType<T>
    ? T
    : T extends (...args: infer A) => infer R ? (...args: A) => R : T
```

</TypeCard>

## 异步

<TypeCard name="Awaited<T>" badge="TS 4.5 · 递归">

```ts
type Awaited<T> =
  T extends null | undefined ? T :
    T extends object & { then(onfulfilled: infer F): any }
      ? F extends (value: infer V, ...args: any) => any
        ? Awaited<V>
        : never
      : T
```

这段源码本身就很值得背：

1. 先排除 `null | undefined`
2. 用 `object & { then(...) }` 匹配 **thenable**（不只是 `Promise`，任何有 `then` 的对象都行）
3. 从 `onfulfilled` 回调里 `infer` 出值的类型 `V`
4. 对 `V` **递归**调用自己

```ts twoslash
type A = Awaited<Promise<Promise<number>>>
//   ^?
type B = Awaited<Promise<string> | number>
//   ^?
```

</TypeCard>

<TypeCard name="NoInfer<T>" badge="TS 5.4 · intrinsic">

编译器内部实现，没有 TS 层源码。作用是阻止类型参数参与推断。

```ts twoslash
declare function f1<T>(items: T[], init: T): T
declare function f2<T>(items: T[], init: NoInfer<T>): T

const a = f1(['x', 'y'], 'z')
type A = typeof a
//   ^?
```

`f1` 会把 `T` 推成 `'x' | 'y' | 'z'`；`f2` 只从 `items` 推断，`init` 只做校验。

</TypeCard>

## 字符串

<TypeCard name="Uppercase / Lowercase / Capitalize / Uncapitalize" badge="intrinsic">

四个都是编译器内部实现，无法用 TS 表达。

```ts twoslash
type A = Capitalize<'abc'>
//   ^?
```

</TypeCard>

## 手写高频补充

官方没有但项目里几乎必用：

<TypeCard name="Mutable<T>" badge="常用">

```ts
type Mutable<T> = { -readonly [P in keyof T]: T[P] }
```

</TypeCard>

<TypeCard name="Prettify<T>" badge="调试必备">

```ts
type Prettify<T> = { [K in keyof T]: T[K] } & {}
```

把交叉类型拍平成可读的对象字面量。

```ts twoslash
type Prettify<T> = { [K in keyof T]: T[K] } & {}
type P = Prettify<{ a: string } & { b: number }>
//   ^?
```

</TypeCard>

<TypeCard name="DeepPartial<T>" badge="常用">

```ts
type DeepPartial<T> = T extends (infer U)[]
  ? DeepPartial<U>[]
  : T extends Function
    ? T
    : T extends object
      ? { [P in keyof T]?: DeepPartial<T[P]> }
      : T
```

顺序很关键：**数组 → 函数 → 对象**，因为前两者都是 `object` 的子类型。

</TypeCard>

<TypeCard name="UnionToIntersection<U>" badge="经典题">

```ts
type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never
```

利用函数参数位置的**逆变**把联合转成交叉。

```ts twoslash
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never
type R = UnionToIntersection<{ a: 1 } | { b: 2 }>
//   ^?
```

</TypeCard>

## 下一步

- [类型层心智模型](../type-programming/)
