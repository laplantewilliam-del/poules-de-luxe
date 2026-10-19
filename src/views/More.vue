<script setup>
import { useRouter } from 'vue-router'
import { signOut, session } from '../lib/auth'

const router = useRouter()
const links = [
  { to: '/plus/laines', label: 'Laines' },
  { to: '/plus/categories', label: 'Catégories' },
  { to: '/plus/ajustements', label: 'Ajustements de stock' },
  { to: '/plus/export', label: 'Export des données' },
]

async function logout() {
  await signOut()
  router.replace({ name: 'login' })
}
</script>

<template>
  <h1>Plus</h1>
  <ul class="list">
    <li v-for="l in links" :key="l.to">
      <RouterLink :to="l.to" class="row card">{{ l.label }}</RouterLink>
    </li>
  </ul>
  <p class="muted small">Connecté : {{ session?.user?.email }}</p>
  <button class="btn" @click="logout">Se déconnecter</button>
</template>

<style scoped>
.list { list-style: none; padding: 0; margin: 16px 0; display: flex; flex-direction: column; gap: 8px; }
.row {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 10px 16px;
  color: var(--ink);
  font-weight: 500;
  text-decoration: none;
}
.small { font-size: 13px; }
</style>
