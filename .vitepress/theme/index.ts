import Theme from 'vitepress/theme'
import { nextTick } from 'vue'
import TwoslashFloatingVue from '@shikijs/vitepress-twoslash/client'
import { hideAllPoppers } from 'floating-vue'
import '@shikijs/vitepress-twoslash/style.css'
import 'virtual:group-icons.css'
import './custom.css'

import Exercise from './components/Exercise.vue'
import TypeCard from './components/TypeCard.vue'
import Callout from './components/Callout.vue'

// 触屏设备没有真正的 hover。浏览器的兼容行为会先补发 mouseenter（显示），
// 紧接着真实 click 又把它 toggle 掉，轻点看起来毫无反应。
// 所以触屏只用 click：点开 / 再点收 / 点别处收（autoHide）。
const isTouch =
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(hover: none)').matches

// twoslash-query / twoslash-completion：//^? 查询与补全。
// 触屏：轻点开关；桌面：悬停即看，鼠标移开自动收起。
const queryTheme = isTouch
  ? { triggers: ['click'], autoHide: true }
  : { triggers: ['hover', 'click'], autoHide: true }

export default {
  extends: Theme,
  enhanceApp({ app, router }) {
    app.use(TwoslashFloatingVue, {
      themes: {
        // twoslash：标识符上的悬浮类型。库在移动端只给 ['touch']
        // （touchstart 显示 / touchend 隐藏 = 必须长按），改成 click 才能轻点查看。
        twoslash: isTouch
          ? { triggers: ['click'], autoHide: true }
          : { triggers: ['hover', 'touch'], popperTriggers: ['hover', 'touch'], autoHide: true },
        // 默认 query（//^?）会在页面加载时强制 shown，我们在 config.ts 里把 :shown="true" 去掉了。
        // 这里按设备区分触发方式，autoHide 让「点别处」也能收起。
        'twoslash-query': queryTheme,
        'twoslash-completion': queryTheme,
      },
    })
    app.component('Exercise', Exercise)
    app.component('TypeCard', TypeCard)
    app.component('Callout', Callout)

    // 路由切换后强制收起所有 Twoslash 悬浮提示
    // 否则旧页面残留的 popper 会以 shown 状态留在新页面上
    if (typeof window !== 'undefined' && router) {
      const prev = router.onAfterPageLoad
      router.onAfterPageLoad = (href) => {
        prev?.(href)
        hideAllPoppers()
        nextTick(() => hideAllPoppers())
      }
    }

    // 页面一滚动就收起所有类型提示。
    // scroll 事件不冒泡，所以用捕获阶段监听 window，才能收到内部滚动容器（如横向滚动的代码块）的事件。
    if (typeof window !== 'undefined') {
      let scheduled = false
      window.addEventListener(
        'scroll',
        () => {
          if (scheduled) return
          scheduled = true
          requestAnimationFrame(() => {
            scheduled = false
            hideAllPoppers()
          })
        },
        { passive: true, capture: true }
      )
    }
  },
}
