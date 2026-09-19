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

export default {
  extends: Theme,
  enhanceApp({ app, router }) {
    app.use(TwoslashFloatingVue, {
      themes: {
        // 默认 query（//^?）会在页面加载时强制 shown，我们在 config.ts 里把 :shown="true" 去掉了。
        // 这里把触发方式改成 hover + click，并允许鼠标移开后自动隐藏。
        'twoslash-query': { triggers: ['hover', 'click'], autoHide: true },
        'twoslash-completion': { triggers: ['hover', 'click'], autoHide: true },
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
  },
}
