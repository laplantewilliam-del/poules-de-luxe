<script setup>
import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { session } from './lib/auth'
import { toastMessage } from './lib/toast'
import NavBar from './components/NavBar.vue'
import Wordmark from './components/Wordmark.vue'

const route = useRoute()
const router = useRouter()

// Retour à la connexion si la session se termine
watch(session, (s) => {
  if (!s && !route.meta.public) router.replace({ name: 'login' })
})
</script>

<template>
  <RouterView v-if="route.meta.public" />
  <div v-else class="shell">
    <NavBar />
    <header class="topbar"><Wordmark /></header>
    <main class="content"><RouterView :key="route.fullPath" /></main>
    <div v-if="toastMessage" class="toast" role="status">{{ toastMessage }}</div>
  </div>
</template>

<style scoped>
.topbar {
  padding: calc(14px + env(safe-area-inset-top, 0px)) 16px 4px;
}
.content {
  max-width: 960px;
  padding: 8px 16px calc(var(--nav-h) + 24px + env(safe-area-inset-bottom, 0px));
}
@media (min-width: 900px) {
  .topbar { display: none; }
  .shell { margin-left: var(--side-w); }
  .content { padding: 32px 32px 32px; }
}
</style>
