import { createRouter, createWebHashHistory } from 'vue-router'
import { session, authReady } from './lib/auth'
import Login from './views/Login.vue'
import Home from './views/Home.vue'
import More from './views/More.vue'
import Placeholder from './views/Placeholder.vue'
import Inventory from './views/Inventory.vue'
import CreationForm from './views/CreationForm.vue'
import Yarns from './views/Yarns.vue'
import YarnForm from './views/YarnForm.vue'
import Categories from './views/Categories.vue'
import Adjustments from './views/Adjustments.vue'
import Markets from './views/Markets.vue'
import MarketDetail from './views/MarketDetail.vue'
import MarketForm from './views/MarketForm.vue'
import Sales from './views/Sales.vue'
import Decompte from './views/Decompte.vue'

// Mode "hash" (#/...) : évite les erreurs 404 sur GitHub Pages
const routes = [
  { path: '/connexion', name: 'login', component: Login, meta: { public: true } },
  { path: '/', name: 'home', component: Home, meta: { title: 'Accueil' } },
  { path: '/inventaire', component: Inventory, meta: { title: 'Inventaire' } },
  { path: '/inventaire/nouvelle', component: CreationForm, meta: { title: 'Nouvelle création' } },
  { path: '/inventaire/:id(\\d+)', component: CreationForm, meta: { title: 'Création' } },
  { path: '/marches', component: Markets, meta: { title: 'Marchés' } },
  { path: '/marches/nouveau', component: MarketForm, meta: { title: 'Nouveau marché' } },
  { path: '/marches/:id(\\d+)', component: MarketDetail, meta: { title: 'Marché' } },
  { path: '/marches/:id(\\d+)/modifier', component: MarketForm, meta: { title: 'Modifier le marché' } },
  { path: '/ventes', component: Sales, meta: { title: 'Ventes' } },
  { path: '/ventes/decompte', component: Decompte, meta: { title: 'Décompte après marché' } },
  { path: '/stats', component: Placeholder, meta: { title: 'Statistiques' } },
  { path: '/plus', component: More, meta: { title: 'Plus' } },
  { path: '/plus/laines', component: Yarns, meta: { title: 'Laines' } },
  { path: '/plus/laines/nouvelle', component: YarnForm, meta: { title: 'Nouvelle laine' } },
  { path: '/plus/laines/:id(\\d+)', component: YarnForm, meta: { title: 'Laine' } },
  { path: '/plus/categories', component: Categories, meta: { title: 'Catégories' } },
  { path: '/plus/ajustements', component: Adjustments, meta: { title: 'Ajustements de stock' } },
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
