import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import '@amber-hub/ui/tokens.css'
import '@amber-hub/ui/styles.css'
import '@fontsource-variable/inter'
import './styles/gallery.css'

createApp(App).use(router).mount('#app')
