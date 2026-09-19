# 类型兼容性

"赋值能不能过"背后的规则。理解它，你就不用靠试来写代码。

## 核心规则

**如果 `S` 能安全地用在所有需要 `T` 的地方，那么 `S` 可以赋值给 `T`。** 记为 `S extends T` 或 `S` 是 `T` 的子类型。

具体到各种类型：

## 原始类型

```ts twoslash
type A = 'a' extends string ? true : false
//   ^?
type B = string extends 'a' ? true : false
//   ^?
type C = 1 extends number ? true : false
//   ^?
type D = number extends 1 ? true : false
//   ^?
```

字面量是对应原始类型的子类型，方向不可逆。

## 对象：属性少的可以赋给属性多的（反过来不行）

```ts twoslash
type More = { a: string; b: number }
type Less = { a: string }

type A = More extends Less ? true : false
//   ^?
type B = Less extends More ? true : false
//   ^?
```

`More` 有 `Less` 要求的一切（还多一个），所以兼容。反过来缺 `b`，不兼容。

属性类型本身也要递归兼容：

```ts twoslash
type A = { a: string } extends { a: string | number } ? true : false
//   ^?
type B = { a: string | number } extends { a: string } ? true : false
//   ^?
```

### 可选属性的兼容

```ts twoslash
type Opt = { a?: string }
type Req = { a: string }

type A = Req extends Opt ? true : false
//   ^?
type B = Opt extends Req ? true : false
//   ^?
```

`a: string` 能当 `a?: string` 用（必填满足可选），反过来不行。

## 函数：参数逆变，返回值协变

```ts twoslash
type F1 = (x: string) => string
type F2 = (x: string | number) => string

type A = F2 extends F1 ? true : false
//   ^?
type B = F1 extends F2 ? true : false
//   ^?
```

`F2` 接受 `string | number`，比 `F1` 要求的更多，所以 `F2` 可以替代 `F1`。反过来 `F1` 处理不了 `number`，不安全。

返回值方向相反：

```ts twoslash
type F1 = () => string
type F2 = () => string | number

type A = F1 extends F2 ? true : false
//   ^?
type B = F2 extends F1 ? true : false
//   ^?
```

返回值"更具体"是安全的，因为调用方按宽类型处理也没问题。

完整规则见[变型](./variance)。

## 联合与交叉

```ts twoslash
type A = 'a' extends 'a' | 'b' ? true : false
//   ^?
type B = ('a' | 'b') extends 'a' ? true : false
//   ^?
type C = ('a' & { x: 1 }) extends 'a' ? true : false
//   ^?
```

联合是"或"，成员是整体的子类型；交叉是"且"，整体是各成员的子类型。

## any / unknown / never

```ts twoslash
type A = any extends string ? true : false
//   ^?
type B = string extends any ? true : false
//   ^?
type C = string extends unknown ? true : false
//   ^?
type D = unknown extends string ? true : false
//   ^?
type E = never extends string ? true : false
//   ^?
```

记住三条：

1. **`any` 双向都通**，且在条件类型里会同时走两个分支（返回联合）
2. **`unknown` 只能被赋值**（顶层类型），使用前必须收窄
3. **`never` 能赋给一切**（底层类型），但条件类型里对 `never` 分发会得到 `never`

第三条是类型编程的大坑，详见[any / unknown / never](../type-programming/edge-cases)。

## 数组与元组

```ts twoslash
type A = [string, number] extends unknown[] ? true : false
//   ^?
type B = unknown[] extends [string, number] ? true : false
//   ^?
type C = string[] extends readonly string[] ? true : false
//   ^?
type D = readonly string[] extends string[] ? true : false
//   ^?
```

可变数组能赋给只读数组（读取是安全的），反过来不行。

## 泛型：默认按结构推断

```ts twoslash
interface Box<T> {
  value: T
}

type A = Box<string> extends Box<string | number> ? true : false
//   ^?
type B = Box<string | number> extends Box<string> ? true : false
//   ^?
```

`Box<T>` 里 `T` 只出现在输出位置，所以是协变。如果 `T` 同时出现在输入和输出位置，就变成不变，两个方向都不兼容。

## 一个实用技巧：用条件类型测兼容性

不用猜，直接问编译器：

```ts twoslash
type IsAssignable<A, B> = A extends B ? true : false

type T1 = IsAssignable<{ a: 1; b: 2 }, { a: 1 }>
//   ^?
type T2 = IsAssignable<() => void, () => undefined>
//   ^?
```

## 下一步

- [变型：协变与逆变](./variance)
