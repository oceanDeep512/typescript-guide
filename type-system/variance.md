# 变型：协变与逆变

变型（variance）描述的是：**当 `A` 是 `B` 的子类型时，`Container<A>` 和 `Container<B>` 是什么关系。**

这是理解函数赋值、泛型兼容性、以及很多三方库报错的关键。

## 四种变型

以 `string` ⊂ `string | number` 为例：

| 变型 | 含义 | 例子 |
| --- | --- | --- |
| **协变（covariant）** | 容器与内部类型同向 | `Box<string>` ⊂ `Box<string \| number>` |
| **逆变（contravariant）** | 容器与内部类型反向 | `Fn<string \| number>` ⊂ `Fn<string>` |
| **双变（bivariant）** | 两个方向都行 | TS 默认的方法参数 |
| **不变（invariant）** | 必须完全一致 | `Inv<string>` 与 `Inv<string \| number>` 互不相容 |

## 快速判断口诀

> **返回值位置 → 协变；参数位置 → 逆变。**

```ts twoslash
type Cov<T> = () => T // T 在输出位置，协变
type Con<T> = (x: T) => void // T 在输入位置，逆变
type Inv<T> = (x: T) => T // 两边都有，不变

type A = Cov<'x'> extends Cov<string> ? true : false
//   ^?
type B = Con<string> extends Con<'x'> ? true : false
//   ^?
type C = Inv<'x'> extends Inv<string> ? true : false
//   ^?
```

## 为什么参数必须是逆变

这不是 TS 的规定，是**类型安全的必然要求**。

```ts
type Handler = (x: string) => void

// 假设允许这样赋值：
const h: Handler = (x: 'only-literal') => {}

// 那调用方这么写就炸了：
h('any string') // 运行时传了 'any string'，但实现只处理 'only-literal'
```

所以参数只能**变宽**（逆变），不能变窄。

## strictFunctionTypes

TS 默认是"方法参数双变"，这是为了兼容大量老代码做的妥协。`strictFunctionTypes` 打开后：

```ts twoslash
// @errors: 2322
type Fn = (x: string) => void
const f: Fn = (x: 'literal') => {}
```

<Callout type="warn">

**它只作用于函数类型字面量，不作用于方法简写**——这是 TS 明确保留的行为：

```ts twoslash
interface WithMethod {
  m(x: string): void // 方法简写：双变，不报错
}
interface WithProp {
  m: (x: string) => void // 函数属性：逆变，会报错
}

const a: WithMethod = { m: (x: 'literal') => {} }
```

设计理由是：方法在真实代码里（尤其是内置类型如 `Array`）大量依赖双变，一刀切会破坏太多代码。

</Callout>

## 数组的协变是有意为之的"漏洞"

```ts twoslash
const strs: string[] = ['a']
const arr: (string | number)[] = strs
arr.push(1) // 现在 strs 里混进了一个 number
```

严格来说 `string[]` 应该是**不变**的（`push` 让 `T` 出现在输入位置）。但 TS 选了协变，因为这个洞在实际开发里几乎用不到，而严格化会让大量代码写不了。

## in / out 显式注解（TS 4.7）

可以手动标注泛型参数的变型：

```ts twoslash
interface Producer<out T> {
  get(): T
}
interface Consumer<in T> {
  put(x: T): void
}
interface Both<in out T> {
  v: T
}
```

两个好处：

**1. 写反了会被抓住**

```ts
interface Bad<out T> {
  put(x: T): void
}
//  ^ 报错：方差注解 out 与 T 的实际方差冲突
```

TS 会明确指出注解写反了，不用等运行时才发现。

**2. 类型检查变快**

TS 原本要靠结构化递归比较来判断 `Producer<'a'>` 和 `Producer<string>` 的关系，有了注解可以直接查表。大型类型（比如数十个字段的 ORM schema）上能省下可观的编译时间。

## 实际场景

### 事件处理器

```ts twoslash
type EventMap = {
  click: { x: number; y: number }
  input: { value: string }
}

type Handler<K extends keyof EventMap> = (e: EventMap[K]) => void

const onAny: Handler<'click' | 'input'> = () => {}
const onClick: Handler<'click'> = onAny
```

`onAny` 能处理两种事件，自然能替代只处理 click 的处理器——逆变成立。

### 状态更新函数

```ts twoslash
type Setter<T> = (value: T) => void

declare const setUnknown: Setter<unknown>
// 能接受 unknown 的 setter，自然能拿来当 string 的 setter 用（参数逆变）
const setStr: Setter<string> = setUnknown
```

### 协变数组 vs 逆变回调的组合

```ts twoslash
interface Config<T> {
  items: T[] // 协变
  onSelect: (item: T) => void // 逆变
}
// 两者叠加 → Config<T> 是不变的
```

这就是为什么很多库的配置对象类型改起来很别扭——只要有回调，整个配置对象就变成不变了。

## 调试变型问题

遇到"这两个类型明明看着一样"的报错，用这个方法定位：

```ts twoslash
type Debug<A, B> = [A] extends [B] ? 'A→B ok' : 'A→B fail'

type T1 = Debug<(x: string) => void, (x: 'a') => void>
//   ^?
type T2 = Debug<(x: 'a') => void, (x: string) => void>
//   ^?
```

## 下一步

- [联合与交叉](./union-intersection)
