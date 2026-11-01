import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { vuetify } from './plugins/vuetify'
import '@amber-hub/ui/tokens.css'
import '@fontsource-variable/inter'
import './styles/document.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(vuetify)

app.mount('#app')
