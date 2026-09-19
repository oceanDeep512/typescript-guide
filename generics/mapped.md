# 映射类型

映射类型是**类型层唯一的"循环"**。类型层没有 `for`，要遍历键只能靠它。

## 基本形式

```ts twoslash
type Mapped<T> = {
  [K in keyof T]: T[K]
}

interface Todo {
  title: string
  done: boolean
}
type A = Mapped<Todo>
//   ^?
```

`[K in keyof T]` 读作 `for (const K of Object.keys(T))`。

## 修饰符：增删 readonly 与 ?

```ts twoslash
type Partial<T> = { [K in keyof T]?: T[K] }
type Required<T> = { [K in keyof T]-?: T[K] }
type Readonly<T> = { readonly [K in keyof T]: T[K] }
type Mutable<T> = { -readonly [K in keyof T]: T[K] }
```

`+` 是默认的（省略即可），`-` 表示移除。

<Callout type="warn">

修饰符是**保留**的，不是覆盖的：

```ts twoslash
interface Mixed {
  a?: string
  b: string
}
type P = Partial<Mixed>
//   ^?
```

`a` 和 `b` 都变成可选，`a` 不会"变回必填"。

</Callout>

## 键重映射（TS 4.1）

用 `as` 改写键名：

```ts twoslash
type Getters<T> = {
  [K in keyof T as `get${Capitalize<K & string>}`]: () => T[K]
}

interface Todo {
  title: string
  done: boolean
}
type G = Getters<Todo>
//   ^?
```

注意 `K & string`：`keyof T` 可能是 `string | number | symbol`，而 `Capitalize` 只吃 `string`。

### 用 never 过滤键

映射成 `never` 的键会被丢弃：

```ts twoslash
type OnlyStrings<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K]
}

interface Mixed {
  name: string
  age: number
  email: string
}
type S = OnlyStrings<Mixed>
//   ^?
```

这是"筛选属性"的标准写法，比 `Omit` 灵活得多（可以按值类型筛，不只是按键名）。

## 遍历数组与元组

映射类型用在元组上会**保持长度**：

```ts twoslash
type ToPromise<T extends unknown[]> = {
  [I in keyof T]: Promise<T[I]>
}

type A = ToPromise<[string, number]>
//   ^?
type B = ToPromise<string[]>
//   ^?
```

因为元组的 `keyof` 包含数字索引，映射后仍是元组。

## 递归映射

处理嵌套结构要自己递归：

```ts twoslash
type DeepReadonly<T> = T extends (infer U)[]
  ? DeepReadonly<U>[]
  : T extends Function
    ? T
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T

interface Nested {
  a: string
  b: { c: number; d: { e: boolean } }
}
type R = DeepReadonly<Nested>
//   ^?
```

三个判断的顺序很重要：**先排除数组，再排除函数，最后才是普通对象**。因为函数和数组都是 `object` 的子类型。

## 实战：一份 interface 派生一整族类型

映射类型在业务代码里最大的价值不是"造工具类型"，而是**一份数据结构派生出所有配套类型**，改一处全部跟着变：

```ts twoslash
interface User {
  id: string
  name: string
  age: number
}

// ① 表单校验规则：每个字段一个校验函数
type Rules<T> = { [K in keyof T]?: (value: T[K]) => string | undefined }
type UserRules = Rules<User>
//   ^?

// ② 字段级异步状态（表格 / 详情页常见）
type Async<T> = { [K in keyof T]: { loading: boolean; data: T[K] | null } }
type UserAsync = Async<User>
//   ^?

// ③ 字段权限矩阵：每个字段能不能编辑
type Editable<T> = { [K in keyof T]: boolean }
type UserEditable = Editable<User>
//   ^?
```

注意 `[K in keyof T]` 里 `in` 后面必须是**键的联合**。
写 `[K in T]` 是非法的——`T` 是个对象类型，不是联合；必须先 `keyof`。
这也是为什么映射类型几乎总跟 `keyof` 成对出现。

## 常见工具的实现

```ts twoslash
// 官方内置的四个
type MyPartial<T> = { [K in keyof T]?: T[K] }
type MyRequired<T> = { [K in keyof T]-?: T[K] }
type MyReadonly<T> = { readonly [K in keyof T]: T[K] }
type MyPick<T, K extends keyof T> = { [P in K]: T[P] }

// 社区常用但官方没有的
type MyMutable<T> = { -readonly [K in keyof T]: T[K] }
type Nullable<T> = { [K in keyof T]: T[K] | null }
type Stringify<T> = { [K in keyof T]: string }
```

`Omit` 不是映射类型直接实现的，它是 `Pick` + `Exclude`：

```ts twoslash
type MyOmit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>
```

## 坑与限制

### 1. 键重映射里不能用索引签名

```ts twoslash
// 想给所有键加前缀，但保留索引签名是做不到的
type Prefix<T> = {
  [K in keyof T as `x_${K & string}`]: T[K]
}
```

### 2. 复杂映射会拖慢编译

嵌套映射 + 递归 + 条件类型叠在一起时，`tsc` 会明显变慢。见[编译性能](../type-programming/performance)。

### 3. 映射丢掉泛型约束信息

```ts twoslash
type Id<T> = { [K in keyof T]: T[K] }
```

这个 `Id` 看似恒等，实际上会把交叉类型拍平——它常被用作"美化类型"的工具（`Prettify`）：

```ts twoslash
type Prettify<T> = { [K in keyof T]: T[K] } & {}
type P = Prettify<{ a: string } & { b: number }>
//   ^?
```

## 下一步

- [条件类型与分发](./conditional)
- [组合拳：六个概念一起工作](./in-action)
