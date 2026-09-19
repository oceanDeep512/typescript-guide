# 递归与元组计数

类型层没有 `for`，一切重复都是递归；没有算术，一切计算都靠元组长度。这节把两件事一起讲。

## 递归的三要素

```ts twoslash
type Loop<
  Target extends number,
  Acc extends unknown[] = []
> = Acc['length'] extends Target ? Acc : Loop<Target, [...Acc, unknown]>

type R = Loop<3>
//   ^?
```

1. **终止条件**：`Acc['length'] extends Target`
2. **自我调用**：`Loop<Target, [...Acc, unknown]>`
3. **累加器**：默认参数 `Acc`

缺任何一条都会出问题：没有终止条件 → 无限递归；不缩小输入 → 无限递归；没累加器 → 无法保存中间状态。

## 尾递归 vs 嵌套递归

```ts twoslash
// 尾递归：结果直接就是递归调用本身
type TailLoop<N extends number, Acc extends unknown[] = []> =
  Acc['length'] extends N ? Acc : TailLoop<N, [...Acc, unknown]>

// 非尾递归：递归调用的结果还要被包一层
type NestStr<S extends string> =
  S extends `${infer A}${infer B}` ? `${A}${NestStr<B>}` : S

type A = TailLoop<3>
//   ^?
type B = NestStr<'abc'>
//   ^?
```

**尾递归**能被 TS 优化到约 1000 次迭代；**嵌套递归**大约 50 层就会报：

```
Type instantiation is excessively deep and possibly infinite.
```

尽可能写成尾递归。

## 元组计数：类型层的算术

### 加法

```ts twoslash
type Tuple<N extends number, Acc extends unknown[] = []> =
  Acc['length'] extends N ? Acc : Tuple<N, [...Acc, unknown]>

type Add<A extends number, B extends number> =
  [...Tuple<A>, ...Tuple<B>]['length']

type R = Add<2, 3>
//   ^?
```

### 减法

```ts twoslash
type Tuple<N extends number, Acc extends unknown[] = []> =
  Acc['length'] extends N ? Acc : Tuple<N, [...Acc, unknown]>

type Sub<A extends number, B extends number> =
  Tuple<A> extends [...Tuple<B>, ...infer Rest] ? Rest['length'] : never

type R = Sub<5, 2>
//   ^?
```

### 比较

```ts twoslash
type Tuple<N extends number, Acc extends unknown[] = []> =
  Acc['length'] extends N ? Acc : Tuple<N, [...Acc, unknown]>

type Gt<A extends number, B extends number> =
  Tuple<A> extends [...Tuple<B>, ...unknown[]] ? true : false

type A = Gt<5, 3>
//   ^?
type B = Gt<2, 4>
//   ^?
```

<Callout type="warn">

**元组计数只适合小数字。** 要算 `Add<900, 900>` 会构造 1800 个元素的元组，编译会非常慢甚至超限。真实项目里需要大数运算时，说明你的设计有问题。

</Callout>

## 递归处理结构

### 深层只读

```ts twoslash
type DeepReadonly<T> = T extends (infer U)[]
  ? DeepReadonly<U>[]
  : T extends Function
    ? T
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T

type R = DeepReadonly<{ a: { b: { c: string } }; list: number[] }>
//   ^?
```

判断顺序：**数组 → 函数 → 对象**。因为数组和函数都是 `object` 的子类型，先判 `object` 会把它们吞掉。

### 字符串递归

```ts twoslash
type ReplaceAll<
  S extends string,
  From extends string,
  To extends string
> = From extends ''
  ? S
  : S extends `${infer L}${From}${infer R}`
    ? `${L}${To}${ReplaceAll<R, From, To>}`
    : S

type R = ReplaceAll<'a-b-c', '-', '/'>
//   ^?
```

第一步的 `From extends ''` 不是可选的——空字符串会让 `${infer L}${''}${infer R}` 永远匹配成功，直接爆栈。

### 递归展开 Promise

```ts twoslash
type DeepAwait<T> = T extends Promise<infer U> ? DeepAwait<U> : T

type R = DeepAwait<Promise<Promise<Promise<string>>>>
//   ^?
```

## 联合上的递归（分发递归）

```ts twoslash
type DeepUnwrap<T> = T extends Promise<infer U> ? DeepUnwrap<U> : T

// 输入是联合时，分发让每个成员各自递归
type R = DeepUnwrap<Promise<string> | number | Promise<Promise<boolean>>>
//   ^?
```

## 常见错误

### 1. 忘了终止条件

```ts
type Bad<T> = T extends string ? Bad<T> : never // 无限递归
```

### 2. 输入没有变小

```ts
type Bad<S extends string> = S extends `${infer A}${infer B}` ? Bad<S> : S
// 应该用 Bad<B>，用 Bad<S> 永远是同一个输入
```

### 3. 联合递归时意外分发

```ts twoslash
type Bad<T> = T extends string ? Bad<T> : T
type Good<T> = [T] extends [string] ? Good2<T> : T
type Good2<T> = T extends string ? T : T
```

### 4. 递归深度超限

报错信息：

```
Type instantiation is excessively deep and possibly infinite.
```

解决方案优先级：

1. 改成尾递归
2. 减少嵌套层数（把中间类型拆出来）
3. 降低精度（比如只递归 3 层而不是无限层）
4. 用 `// @ts-ignore` 兜底（最后的手段）

## 调试递归

把每一步的结果打出来看：

```ts twoslash
type Tuple<N extends number, Acc extends unknown[] = []> =
  Acc['length'] extends N ? Acc : Tuple<N, [...Acc, unknown]>

// 手动展开看每一步
type S0 = Tuple<3, []>
//   ^?
type S1 = Tuple<3, [unknown]>
//   ^?
type S2 = Tuple<3, [unknown, unknown]>
//   ^?
```

手动传累加器，就能看到递归的每一步状态——这是调试递归类型最有效的手段。

## 下一步

- [any / unknown / never](./edge-cases)
