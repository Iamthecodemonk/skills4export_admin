import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { Toaster } from 'vue-sonner'
import App from './App.vue'
import router from './router'
import './style.css'
import 'vue-sonner/style.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.component('Toaster', Toaster)
app.mount('#app')
