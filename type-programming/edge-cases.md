# any / unknown / never

这三个在类型层有**反直觉的固定行为**。不记清，你会一直遇到"结果跟我算的不一样"。

## 一句话定位

| 类型 | 含义 | 谁能赋给它 | 它能赋给谁 |
| --- | --- | --- | --- |
| `any` | 放弃检查 | 一切 | 一切 |
| `unknown` | 未知 | 一切 | 只有 `unknown` / `any` |
| `never` | 空集 | 没有任何值 | 一切（因为没有任何值需要检查） |

## any

### 赋值：双向通行

```ts twoslash
let a: any = 1
a = 'x'
a = { foo: 1 }
const s: string = a
const n: number = a
```

它会**传染**：

```ts twoslash
type A = string & any
//   ^?
type B = string | any
//   ^?
```

### 在条件类型里：同时走两个分支

```ts twoslash
type F<T> = T extends string ? 1 : 2

type A = F<any>
//   ^?
```

这是最容易踩的一条。如果你写的工具类型遇到 `any` 就返回奇怪的联合，原因在这里。

### 检测 any

```ts twoslash
type IsAny<T> = 0 extends 1 & T ? true : false

type A = IsAny<any>
//   ^?
type B = IsAny<unknown>
//   ^?
type C = IsAny<string>
//   ^?
```

原理：`1 & any` 是 `any`，而 `0 extends any` 成立；其他类型下 `1 & T` 不会让 `0 extends ...` 成立。

## unknown

### 只能收，不能直接发

```ts twoslash
// @errors: 18046
declare const u: unknown
u.toFixed()
```

必须先收窄：

```ts twoslash
declare const u: unknown
if (typeof u === 'number') {
  u.toFixed()
}
```

### 在条件类型里

```ts twoslash
type A = unknown extends string ? 1 : 2
//   ^?
type B = string extends unknown ? 1 : 2
//   ^?
type C = keyof unknown
//   ^?
```

`keyof unknown` 是 `never`（没有任何已知键）。

### 交叉与联合

```ts twoslash
type A = string & unknown
//   ^?
type B = string | unknown
//   ^?
```

`unknown` 是顶层类型：交叉时被吸收，联合时吸收别人。

## never

### 空集

```ts twoslash
type A = never extends string ? 1 : 2
//   ^?
type B = string extends never ? 1 : 2
//   ^?
type C = string & never
//   ^?
type D = string | never
//   ^?
```

`never` 能赋给一切（因为没有值需要满足检查），但没有任何值能赋给 `never`。

### 分发时的 never：会消失

```ts twoslash
type F<T> = T extends string ? 1 : 2

type A = F<never>
//   ^?
```

结果是 `never` 而不是 `1` 或 `2`——因为 `never` 被当成**空联合**，分发到 0 个成员，结果就是空。

### 判断 never 必须用元组包一层

```ts twoslash
type Bad<T> = T extends never ? true : false
type Good<T> = [T] extends [never] ? true : false

type A = Bad<never>
//   ^?
type B = Good<never>
//   ^?
```

**这是 type-challenges 里的必考题，记住 `[T] extends [never]`。**

### never 的用途

1. 函数永不返回（抛异常、死循环）
2. 条件类型里的"过滤掉"（配合分发）
3. 键重映射里的"丢弃这个键"
4. 表示不可能的状态

## 对比表

```ts twoslash
type F<T> = T extends string ? 1 : 2

type A1 = F<any>
//   ^?
type A2 = F<unknown>
//   ^?
type A3 = F<never>
//   ^?
type A4 = F<string>
//   ^?
```

| 输入 | 分发？ | 结果 |
| --- | --- | --- |
| `any` | 不适用 | 两个分支的联合 `1 \| 2` |
| `unknown` | 不适用 | 正常判断 `2` |
| `never` | 分发到 0 个成员 | `never` |
| 普通类型 | 是 | 正常判断 |

## 实战：写一个安全的工具类型

```ts twoslash
// 目标：把类型变成数组，但要正确处理边界
type SafeArray<T> = IsAny<T> extends true
  ? any[]
  : [T] extends [never]
    ? never[]
    : T extends any
      ? T[]
      : never

type IsAny<T> = 0 extends 1 & T ? true : false

type A = SafeArray<string | number>
//   ^?
type B = SafeArray<never>
//   ^?
type C = SafeArray<any>
//   ^?
```

写工具类型时先问自己三个问题：**输入是 `any` 会怎样？是 `never` 会怎样？是联合要不要分发？**

## 相关：boolean 的陷阱

`boolean` 其实是 `true | false` 的联合，所以也会分发：

```ts twoslash
type F<T> = T extends true ? 'yes' : 'no'

type A = F<boolean>
//   ^?
```

想要整体判断就包一层：

```ts twoslash
type F<T> = [T] extends [true] ? 'yes' : 'no'
type A = F<boolean>
//   ^?
```

## 下一步

- [调试与类型测试](./debugging)
