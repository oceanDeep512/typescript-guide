# 结构化类型系统

TS 的类型系统是**结构化（structural）**的，不是 Java/C# 那种**名义化（nominal）**的。这是很多"为什么这里能通过/不能通过"的根源。

## 一句话区别

- **名义化**：两个类型兼容当且仅当**名字**相同或有继承关系
- **结构化**：两个类型兼容当且仅当**形状**匹配

```ts twoslash
class Dog {
  name = 'x'
}
class Cat {
  name = 'y'
}

const d: Dog = new Cat()
```

没有任何继承关系，但 `Cat` 有 `Dog` 要求的全部成员，所以赋值合法。

## 鸭子类型

更极端一点：

```ts twoslash
interface Named {
  name: string
}

const obj = { name: 'a', age: 1, extra: true }
const n: Named = obj
```

`obj` 的属性比 `Named` 要求的**多**，依然合法。这就是"鸭子类型"：叫起来像鸭子就是鸭子。

但反过来——**对象字面量直接赋值时会做多余属性检查**：

```ts twoslash
// @errors: 2353
interface Named {
  name: string
}
const n: Named = { name: 'a', age: 1 }
```

<Callout type="warn">

这是最容易困惑的一条规则：**变量赋值不做多余属性检查，字面量直接赋值才做**。

```ts twoslash
// @errors: 2353
interface Named {
  name: string
}
const obj = { name: 'a', age: 1 }
const a: Named = obj // 合法：变量中转
const b: Named = { name: 'a', age: 1 } // 报错：字面量直接赋值
```

设计意图是：字面量是你当场写出来的，多写属性大概率是笔误，所以报错提醒你。

</Callout>

## 结构化带来的三个后果

### 1. 空接口/空类型能接受任何东西

```ts twoslash
interface Empty {}
const a: Empty = 1
const b: Empty = 'x'
const c: Empty = { whatever: true }
```

`{}`、`object`、`unknown` 的差异就在这里：

| 类型 | 能接受 |
| --- | --- |
| `{}` | 除 `null` / `undefined` 外的一切 |
| `object` | 除原始类型外的一切（不含 `string` / `number` / …） |
| `unknown` | 一切 |

### 2. 无法表达"这两个类型必须区分"

```ts twoslash
type UserId = string
type PostId = string

const uid: UserId = 'u1'
const pid: PostId = uid // 合法，但它们语义上不该互通
```

解决办法是 **Branded Type**（品牌类型），用交叉类型加一个不存在的标记：

```ts twoslash
declare const brand: unique symbol

type UserId = string & { readonly [brand]: 'UserId' }
type PostId = string & { readonly [brand]: 'PostId' }

const uid = 'u1' as UserId
const pid = 'u1' as PostId

function needUser(id: UserId) {}
needUser(uid)
```

用 `unique symbol` 做标记的好处是不会和真实属性冲突。

### 3. 类型兼容是递归的

比较 `{ a: { b: string } }` 和 `{ a: { b: string } }` 时，TS 会递归比较每个成员，成员又是对象就继续下钻。这就是为什么深层嵌套的类型会让 `tsc` 变慢。

## 结构化 vs 泛型的交互

两个泛型类型比较时，TS 会尝试**推断**类型参数使它们匹配：

```ts twoslash
interface Box<T> {
  value: T
}

declare const sb: Box<string>
const nb: Box<string | number> = sb
```

`Box<string>` 能赋值给 `Box<string | number>`，因为 `string` 可以赋给 `string | number`——这是**协变**，详见[变型](./variance)。

## 什么时候 TS 会"破例"用名义化

极少，但有两个你一定会遇到：

1. **`private` / `protected` 成员**：来自不同声明的私有成员不兼容

```ts twoslash
// @errors: 2322
class A {
  private x = 1
}
class B {
  private x = 1
}
const a: A = new B()
```

2. **`unique symbol`**：上面 Branded Type 用的就是这个特性

## 实践建议

1. **优先用结构化建模**，它让代码更贴合 JS 的动态本质
2. **语义上必须区分的 ID、单位、状态用 Branded Type**，不然编译器帮不了你
3. **接口设计时考虑"最小结构"**：只要求你真正用到的字段，让调用方更容易满足
4. 遇到"这两个类型明明一样为什么不兼容"，先去看[变型](./variance)

## 下一步

- [类型兼容性](./compatibility)
