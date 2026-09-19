# strict 家族

`strict: true` 不是"开启严格模式"这么简单，它是八个开关的别名。知道每个开关在做什么，才能在遇到"历史项目想开 strict"时知道该先关哪个。

## 八个开关

```jsonc
{
  "compilerOptions": {
    // 以下全部由 strict: true 打开
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "useUnknownInCatchVariables": true
  }
}
```

想开 `strict` 但先关掉某几个，就显式写 `false`：

```jsonc
{ "strict": true, "strictPropertyInitialization": false }
```

## strictNullChecks

**最重要、影响最大的一个。** 关掉它，其他一切都失去意义。

```ts
// strictNullChecks: false 的世界（以下都合法）
let x: string = null
let y: number = undefined
```

开之后，`null` 和 `undefined` 各自成为独立类型，不再能赋值给其他类型：

```ts twoslash
// @errors: 2322
let x: string = null
```

它逼你在类型层面表达"这个值可能没有"，是消灭 `Cannot read property of undefined` 的根本手段。

### 非空断言 `!`

```ts twoslash
declare function find(): string | undefined
const s: string = find()!
```

`!` 告诉编译器"我确定不是 null/undefined"。它是**逃生舱，不是解决方案**——用多了等于把 `strictNullChecks` 关了。合理场景是编译器确实推不出来的情况（比如刚赋值过的类属性、三方库的错误声明）。

## noImplicitAny

```ts twoslash
// @errors: 7006
function f(a) {
  return a
}
```

不开它，`a` 会静默变成 `any`，函数内部所有操作都不再检查。开了它，漏标参数立刻报错。

注意：**它只管"推不出来"的情况**。显式写 `any` 它不管，要禁止显式 any 得上 ESLint（`no-explicit-any`）。

## strictFunctionTypes

让函数类型的参数做**逆变**检查。详见[变型](../type-system/variance)，这里只看效果：

```ts twoslash
// @errors: 2322
type Handler = (x: string | number) => void
// 参数收窄成 string 是不安全的：调用方可能传 number
const h: Handler = (x: string) => {}
```

关掉它，函数赋值会变成"双向都允许"，能藏住真实 bug。

一个历史包袱：**它只作用于函数类型字面量，不作用于方法简写**。

```ts twoslash
interface WithMethod {
  m(x: string): void // 方法简写：不受 strictFunctionTypes 约束
}
interface WithProp {
  m: (x: string) => void // 函数属性：受约束
}
```

## strictBindCallApply

```ts twoslash
// @errors: 2345
function f(a: string, b: number) {}
f.call(null, 'a', 'b')
```

不开的话 `call` / `apply` / `bind` 的参数是 `any[]`，传错了也不知道。

## strictPropertyInitialization

```ts twoslash
// @errors: 2564
class User {
  name: string
}
```

要求类属性必须在声明时或构造函数里赋值。三种解法：

```ts twoslash
class A {
  name = '' // ① 声明时初始化
}
class B {
  name!: string // ② 明确断言（比如由 DI 框架注入）
  constructor() {}
}
class C {
  name: string
  constructor(name: string) {
    this.name = name // ③ 构造函数里赋值（正解）
  }
}
```

注意它需要 `strictNullChecks` 一起开才生效。

## noImplicitThis

```ts twoslash
// @errors: 2683
const obj = {
  name: 'x',
  greet() {
    return function () {
      return this.name
    }
  },
}
```

`this` 推不出来时报错，而不是悄悄变 `any`。

## useUnknownInCatchVariables

```ts twoslash
// @errors: 18046
try {
  throw new Error('x')
} catch (e) {
  console.log(e.message)
}
```

4.4 之前 `catch (e)` 的 `e` 是 `any`，现在是 `unknown`。正确写法：

```ts twoslash
try {
  throw new Error('x')
} catch (e) {
  if (e instanceof Error) {
    console.log(e.message)
  } else {
    throw e
  }
}
```

## 不在 strict 里但强烈建议开的

| 开关 | 作用 |
| --- | --- |
| `noUncheckedIndexedAccess` | `arr[0]`、`dict[k]` 变成 `T \| undefined` |
| `exactOptionalPropertyTypes` | 区分"属性不存在"和"属性值为 undefined" |
| `noImplicitOverride` | 覆盖父类方法必须写 `override` |
| `noFallthroughCasesInSwitch` | switch 里非空 case 贯穿报错 |
| `noUnusedLocals` / `noUnusedParameters` | 未使用变量报错 |
| `forceConsistentCasingInFileNames` | 文件名大小写一致性（Linux CI 救命） |

前两个在 [tsconfig 逐项精讲](./tsconfig) 里有详细说明。

## 历史项目怎么渐进开启

别一次性全开。推荐顺序：

1. 先加 `"strict": true`，跑一遍看报错量
2. 报错集中在 `strictNullChecks` → 先临时关掉它，修完其他的再开
3. 用 `// @ts-expect-error` 标记暂时改不动的地方，而不是 `any`
4. 每次开启后跑完整测试

一个技巧：用 `tsc --noEmit` 统计报错数，把它当进度条。

```bash
tsc --noEmit 2>&1 | grep -c "error TS"
```

## 下一步

- [类型兼容性](../type-system/compatibility)
