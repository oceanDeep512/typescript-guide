# React 与 Vue 中的类型

框架本身的类型不是重点（官方文档很全），这节讲**容易卡住的地方和怎么写才不别扭**。

## React

### 组件 props

```ts
type Props = {
  title: string
  count?: number
  onClick: (id: string) => void
  children?: React.ReactNode
}

function Card({ title, count = 0, onClick, children }: Props) {
  return <div onClick={() => onClick(title)}>{children}</div>
}
```

React 18 之后 `children` 不再自动注入，用 `React.ReactNode` 显式声明。

### 用 interface 还是 type

都行，社区惯例：

- **props 用 `type`**（要用到联合、交叉、工具类型）
- **需要声明合并时用 `interface`**

### 泛型组件

```ts
interface ListProps<T> {
  items: T[]
  renderItem: (item: T) => React.ReactNode
}

function List<T>({ items, renderItem }: ListProps<T>) {
  return <ul>{items.map((item, i) => <li key={i}>{renderItem(item)}</li>)}</ul>
}

// 调用时 T 会自动推导
;<List items={[1, 2, 3]} renderItem={(n) => n.toFixed(2)} />
```

### 事件类型

从 React 的类型里取，别手写：

```ts
type ClickEv = React.MouseEvent<HTMLButtonElement>
type ChangeEv = React.ChangeEvent<HTMLInputElement>
type FormEv = React.FormEvent<HTMLFormElement>

function App() {
  const onClick = (e: ClickEv) => e.currentTarget.blur()
  const onChange = (e: ChangeEv) => e.target.value
  const onSubmit = (e: FormEv) => e.preventDefault()
}
```

`currentTarget` 和 `target` 的区别：前者是绑定事件的元素（类型准确），后者可能是子元素。

### Hooks

```ts
// useState：能推导就别标
const [count, setCount] = useState(0) // number
const [user, setUser] = useState<User | null>(null) // 需要显式标注

// useRef：DOM ref 要给 null 初值
const ref = useRef<HTMLDivElement>(null)

// useReducer：判别联合最好用
type Action =
  | { type: 'increment' }
  | { type: 'set'; value: number }

function reducer(state: number, action: Action): number {
  switch (action.type) {
    case 'increment':
      return state + 1
    case 'set':
      return action.value
  }
}
```

`reducer` 的 action 用**判别联合**，配合 `switch` 就有穷尽性检查——加了个新 action 类型但忘了处理，编译器会报错。

### forwardRef（React 18）

```ts
const Input = forwardRef<HTMLInputElement, { value: string }>(
  function Input({ value }, ref) {
    return <input ref={ref} value={value} />
  }
)
```

参数顺序是 `<RefType, PropsType>`，跟直觉相反，容易记错。React 19 里 ref 变成普通 prop 了。

### 常见坑：默认导出组件的类型

```ts
// 用 React.FC 的写法（不推荐）
const A: React.FC<Props> = (props) => <div />

// 直接标注 props（推荐）
function B(props: Props) {
  return <div />
}
```

`React.FC` 的问题：它隐式允许返回 `undefined`、对 `defaultProps` 的处理有历史包袱、泛型组件写起来麻烦。**官方已不推荐**。

## Vue 3

::: warning 🆕 TS7：Vue 项目暂时用不了 7.0 做 SFC 类型检查
Vue 的 `.vue` 单文件组件类型支持靠 **Volar**，而 Volar 依赖 TypeScript 的**语言服务插件机制**——TS 7.0 不带这个 API（7.1 才补，且是重新设计的）。

所以 2026-09 这个时间点上：

| 环节 | 能不能用 TS 7 |
| --- | --- |
| 纯 `.ts` / `.vue` 里的 `<script lang="ts">` 之外的项目文件，`tsc --noEmit` | ✅ 可以，快 10 倍 |
| `.vue` 文件内部的模板类型检查（`vue-tsc`） | ❌ 只能继续用 6.0 |
| 编辑器里 `.vue` 的智能提示 | ❌ 只能继续用 6.0 |

推荐做法：**两条 typecheck 并存**——

```jsonc
{
  "scripts": {
    "typecheck": "tsc --noEmit",         // TS 7，跑得快，覆盖 .ts
    "typecheck:vue": "vue-tsc --noEmit"  // TS 6 实例，覆盖 .vue
  }
}
```

React 不受影响：`.tsx` 是原生 TS 语法，`tsc` 直接处理，也不需要语言服务插件，可以完全用 7.0。

详见 [TypeScript 6 与 7](../guide/typescript-7)。同样的结论适用于 **Svelte / Astro / MDX**。
:::

### 组合式 API 的类型推导

```ts
import { ref, computed, reactive } from 'vue'

const count = ref(0) // Ref<number>
const user = ref<User | null>(null) // Ref<User | null>
const double = computed(() => count.value * 2) // ComputedRef<number>

const state = reactive({ items: [] as User[] }) // reactive 里数组要断言
```

`ref` 的推导很聪明，但**嵌套对象会被 `UnwrapRef` 解包**，深层类型可能和你写的不一样。遇到问题时用 `shallowRef` 或显式标注。

### props 声明

```ts
// 运行时声明 + 类型推导
const props = defineProps<{
  title: string
  count?: number
}>()

// 带默认值（3.5+ 支持响应式解构）
const { title, count = 0 } = defineProps<{
  title: string
  count?: number
}>()
```

泛型写法（复杂约束）：

```ts
const props = defineProps<{
  items: Array<{ id: string; label: string }>
  modelValue?: string
}>()
```

### emits

```ts
const emit = defineEmits<{
  update: [id: string, value: string]
  close: []
}>()

emit('update', '1', 'x') // 参数类型被检查
```

3.3+ 的元组语法比旧的对象语法简洁很多。

### 泛型组件

```vue
<script setup lang="ts" generic="T extends { id: string }">
defineProps<{
  items: T[]
}>()
</script>
```

`generic` 属性是 3.3+ 的能力。

## 跨框架的通用模式

### 判别联合建模状态

不管 React 还是 Vue，异步状态都应该这么写：

```ts
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error }
```

好处：非法状态无法表示（`{ status: 'loading', data: ... }` 写不出来），配合 `switch` / `v-if` 有穷尽性检查。

### 表单类型从 schema 推导

```ts
const FormSchema = z.object({
  email: z.string().email(),
  age: z.number().min(0),
})

type FormData = z.infer<typeof FormSchema>
```

改 schema 自动改类型，不会出现"加了字段忘了改类型"。

### 组件库的类型增强

```ts
// 给第三方组件库补类型
declare module 'some-ui' {
  interface ButtonProps {
    variant?: 'primary' | 'ghost'
  }
}
```

## 下一步

- [TypeScript 6 与 7](../guide/typescript-7)
- [Node 与服务端类型](./node)
