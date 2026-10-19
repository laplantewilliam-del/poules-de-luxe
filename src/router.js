import { createRouter, createWebHashHistory } from 'vue-router'
import { session, authReady } from './lib/auth'
import Login from './views/Login.vue'
import Home from './views/Home.vue'
import More from './views/More.vue'
import Placeholder from './views/Placeholder.vue'

// Mode "hash" (#/...) : évite les erreurs 404 sur GitHub Pages
const routes = [
  { path: '/connexion', name: 'login', component: Login, meta: { public: true } },
  { path: '/', name: 'home', component: Home, meta: { title: 'Accueil' } },
  { path: '/inventaire', component: Placeholder, meta: { title: 'Inventaire' } },
  { path: '/marches', component: Placeholder, meta: { title: 'Marchés' } },
  { path: '/ventes', component: Placeholder, meta: { title: 'Ventes' } },
  { path: '/stats', component: Placeholder, meta: { title: 'Statistiques' } },
  { path: '/plus', component: More, meta: { title: 'Plus' } },
  { path: '/plus/laines', component: Placeholder, meta: { title: 'Laines' } },
  { path: '/plus/categories', component: Placeholder, meta: { title: 'Catégories' } },
  { path: '/plus/ajustements', component: Placeholder, meta: { title: 'Ajustements de stock' } },
  { path: '/plus/export', component: Placeholder, meta: { title: 'Export des données' } },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({ history: createWebHashHistory(), routes })

router.beforeEach(async (to) => {
  await authReady
  if (!to.meta.public && !session.value) return { name: 'login' }
  if (to.name === 'login' && session.value) return { name: 'home' }
})

export default router
