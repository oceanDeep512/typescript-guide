# 联合与交叉

## 联合类型 `|`

`A | B` 表示"要么是 A，要么是 B"。

```ts twoslash
type Id = string | number
type Status = 'idle' | 'loading' | 'ok' | 'err'
```

### 联合上只能访问公共成员

```ts twoslash
type A = { a: string; common: number }
type B = { b: string; common: number }

declare const v: A | B
v.common // 两个都有，可以访问
```

访问 `v.a` 会报错，因为 `B` 上不存在。**必须先收窄**，见[收窄与判别联合](../guide/narrowing)。

### 联合的属性访问结果是交叉

```ts twoslash
type A = { kind: 'a'; a: string }
type B = { kind: 'b'; b: number }
declare const v: A | B

type K = typeof v.kind
//   ^?
```

`v.kind` 的类型是 `'a' | 'b'`。访问联合上的方法时，参数会变成交叉（TS 3.3+ 的改进）：

```ts twoslash
type F1 = (x: string) => void
type F2 = (x: number) => void
declare const f: F1 | F2
type P = Parameters<typeof f>
//   ^?
```

参数变成 `string & number`（即 `never`），意思是"没有任何值能安全调用它"。

### 联合的长度

```ts ts
type A = 'a' | 'b' | 'a' // 重复的会合并 → 'a' | 'b'
type B = string | 'a' // 'a' 被 string 吸收 → string
type C = any | string // any 吸收一切 → any
type D = never | string // never 被吸收 → string
```

最后两条是类型编程的基础：**`never` 在联合里会消失**，所以可以用它来"过滤"联合成员。

## 交叉类型 `&`

`A & B` 表示"同时是 A 也是 B"。

```ts twoslash
type WithId = { id: string }
type WithTime = { createdAt: Date }
type Entity = WithId & WithTime

declare const e: Entity
e.id
e.createdAt
```

### 交叉不是"合并"，是"叠加约束"

对对象类型，效果看起来像合并，但机制是"同时满足两个约束"：

```ts twoslash
type A = { x: string }
type B = { x: number }
type C = A & B

declare const c: C
type X = typeof c.x
//   ^?
```

`x` 变成 `string & number` = `never`，这个类型实际上无法构造。

### 函数交叉 = 重载

```ts twoslash
type Overloaded = ((x: string) => string) & ((x: number) => number)

declare const f: Overloaded
const a = f('a')
//    ^?
const b = f(1)
//    ^?
```

### 原始类型的交叉

```ts twoslash
type A = string & {}
//   ^?
type B = string & any
//   ^?
type C = string & never
//   ^?
```

注意 `T & {}` 是 4.8 之后 `NonNullable<T>` 的实现——因为 `{}` 排除了 `null` 和 `undefined`。

## 联合与交叉的分配律

交叉对联合满足分配律：

```ts twoslash
type A = ('a' | 'b') & ('b' | 'c')
//   ^?
```

结果是 `('a' & 'b') | ('a' & 'c') | ('b' & 'b') | ('b' & 'c')` 化简后的形式。TS 会做这个展开，这也是为什么复杂交叉会拖慢编译。

## 联合转交叉（经典技巧）

```ts twoslash
type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never

type R = UnionToIntersection<{ a: 1 } | { b: 2 }>
//   ^?
```

原理：
1. `U extends any ? (k: U) => void : never` 对联合分发，得到 `((k: A) => void) | ((k: B) => void)`
2. 再用 `infer I` 去匹配这个**函数联合**的参数位置——函数参数位置是逆变的，TS 会把联合在这里转成交叉

这是逆变特性的经典应用。

## 实践：用联合建模状态，用交叉做混入

```ts twoslash
// 状态：用联合，因为"同时是两种状态"没有意义
type Request =
  | { state: 'idle' }
  | { state: 'loading'; startedAt: number }
  | { state: 'done'; data: string }
  | { state: 'error'; error: Error }

// 能力：用交叉，因为一个对象可以同时有多种能力
type Timestamped = { createdAt: number; updatedAt: number }
type SoftDeletable = { deletedAt: number | null }
type BaseEntity = { id: string } & Timestamped & SoftDeletable
```

判断标准：**互斥的用联合，可叠加的用交叉。**

## 下一步

- [断言、守卫与 satisfies](./assertion)
