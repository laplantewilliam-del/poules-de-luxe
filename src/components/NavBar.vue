<script setup>
import Icon from './Icon.vue'
import Wordmark from './Wordmark.vue'

const items = [
  { to: '/', label: 'Accueil', icon: 'home' },
  { to: '/inventaire', label: 'Inventaire', icon: 'box' },
  { to: '/marches', label: 'Marchés', icon: 'calendar' },
  { to: '/ventes', label: 'Ventes', icon: 'receipt' },
  { to: '/stats', label: 'Stats', icon: 'chart' },
  { to: '/plus', label: 'Plus', icon: 'dots' },
]
</script>

<template>
  <nav class="nav" aria-label="Navigation principale">
    <div class="brand"><Wordmark /></div>
    <RouterLink v-for="item in items" :key="item.to" :to="item.to" class="item">
      <Icon :name="item.icon" />
      <span>{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.nav {
  position: fixed;
  z-index: 10;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  height: calc(var(--nav-h) + env(safe-area-inset-bottom, 0px));
  padding-bottom: env(safe-area-inset-bottom, 0px);
  background: var(--surface);
  border-top: 1px solid var(--border);
}
.brand { display: none; }
.item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-width: 44px;
  font-size: 11px;
  font-weight: 500;
  color: var(--muted);
  text-decoration: none;
}
.item.router-link-exact-active,
.item.router-link-active:not([href='#/']) {
  color: var(--ink);
  font-weight: 600;
}

@media (min-width: 900px) {
  .nav {
    top: 0;
    right: auto;
    width: var(--side-w);
    height: auto;
    flex-direction: column;
    gap: 4px;
    padding: 20px 12px;
    border-top: 0;
    border-right: 1px solid var(--border);
  }
  .brand { display: block; padding: 0 8px 20px; }
  .item {
    flex: none;
    flex-direction: row;
    justify-content: flex-start;
    gap: 12px;
    height: 44px;
    padding: 0 12px;
    border-radius: var(--radius);
    font-size: 15px;
  }
  .item.router-link-exact-active,
  .item.router-link-active:not([href='#/']) { background: #EADFC6; }
}
</style>
