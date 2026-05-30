import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'

// 拦截 target="_blank" 链接，通知父窗口（MiniBrowser）打开新实例
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[target="_blank"]')
  if (link && link.href) {
    e.preventDefault()
    window.parent.postMessage({ type: 'MINI_BROWSER_OPEN_URL', url: link.href }, '*')
  }
}, true)

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
