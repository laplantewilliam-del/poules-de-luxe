<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import { formatMoney, formatDateRange } from '../lib/format'
import { marketTotals, filterSales, topCreations, lastFixedMarket } from '../lib/stats'
import { loadSalesFlat } from '../lib/salesData'
import { loadActiveVariants, groupByCreation } from '../lib/variants'
import { friendlyError } from '../lib/errors'

const loading = ref(true)
const error = ref('')
const markets = ref([])
const sales = ref([])
const variants = ref([])

function todayKey() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

onMounted(async () => {
  const [m, s, v] = await Promise.all([
    supabase.from('markets').select('id, name, location, start_date, end_date, is_open_ended, booth_cost, final_amount'),
    loadSalesFlat(),
    loadActiveVariants(),
  ])
  loading.value = false
  const err = m.error || s.error || v.error
  if (err) return (error.value = friendlyError(err, 'Chargement impossible.'))
  markets.value = m.data
  sales.value = s.sales
  variants.value = v.variants
})

const salesOf = (id) => sales.value.filter((x) => x.market_id === id)

const last = computed(() => {
  const m = lastFixedMarket(markets.value, todayKey())
  return m ? { market: m, totals: marketTotals(m, salesOf(m.id)) } : null
})

const marketplace = computed(() => {
  const open = markets.value.filter((m) => m.is_open_ended)
  if (!open.length) return null
  let revenue = 0
  let pieces = 0
  for (const m of open) {
    const t = marketTotals(m, salesOf(m.id))
    revenue += t.revenue
    pieces += t.pieces
  }
  return { count: open.length, revenue, pieces, first: open.length === 1 ? open[0] : null }
})

const top3 = computed(() => topCreations(filterSales(sales.value)).slice(0, 3))

const lowStock = computed(() =>
  groupByCreation(variants.value)
    .map((g) => ({ ...g, total: g.variants.reduce((t, x) => t + x.stock, 0) }))
    .filter((g) => g.total <= 2)
    .sort((a, b) => a.total - b.total || a.name.localeCompare(b.name, 'fr')),
)

function stockLabel(n) {
  if (n < 0) return 'Stock négatif'
  if (n === 0) return 'Épuisé'
  return 'Stock bas'
}
const plural = (n, w) => `${n} ${w}${n > 1 ? 's' : ''}`
</script>

<template>
  <h1>Accueil</h1>
  <p v-if="error" class="error" role="alert">{{ error }}</p>
  <p v-if="loading" class="muted">Chargement...</p>

  <div v-else class="stack-lg">
    <div class="quick">
      <RouterLink to="/ventes" class="btn btn-primary">Saisir des ventes</RouterLink>
      <RouterLink to="/ventes/decompte" class="btn">Décompte après marché</RouterLink>
    </div>

    <section class="card stack">
      <h2>Dernier marché</h2>
      <template v-if="last">
        <RouterLink :to="`/marches/${last.market.id}`" class="mk">
          <strong>{{ last.market.name }}</strong>
          <span class="muted">{{ formatDateRange(last.market) }}</span>
        </RouterLink>
        <div class="stats">
          <div class="stat"><div class="label">Revenu</div><div class="value">{{ formatMoney(last.totals.revenue) }}</div></div>
          <div class="stat"><div class="label">Profit</div><div class="value" :class="{ neg: last.totals.profit < 0 }">{{ formatMoney(last.totals.profit) }}</div></div>
        </div>
        <p v-if="last.totals.missingCost" class="muted note">{{ plural(last.totals.missingCost, 'ligne') }} sans coût de revient : le profit est surévalué.</p>
      </template>
      <p v-else class="muted">Aucun marché à date fixe pour le moment.</p>
    </section>

    <section v-if="marketplace" class="card stack">
      <h2>Marketplace</h2>
      <div class="stats">
        <div class="stat"><div class="label">Revenu total</div><div class="value">{{ formatMoney(marketplace.revenue) }}</div></div>
        <div class="stat"><div class="label">Pièces vendues</div><div class="value">{{ marketplace.pieces }}</div></div>
      </div>
      <RouterLink v-if="marketplace.first" :to="`/marches/${marketplace.first.id}`">Voir le détail</RouterLink>
      <RouterLink v-else to="/marches">Voir les marchés</RouterLink>
    </section>

    <section class="card stack">
      <h2>Les plus vendues</h2>
      <ol v-if="top3.length" class="plain">
        <li v-for="(t, i) in top3" :key="t.key"><span>{{ i + 1 }}. {{ t.label }}</span><strong>{{ plural(t.pieces, 'pièce') }}</strong></li>
      </ol>
      <p v-else class="muted">Pas encore de ventes.</p>
      <RouterLink to="/stats">Toutes les statistiques</RouterLink>
    </section>

    <section class="card stack">
      <h2>Stock à surveiller</h2>
      <ul v-if="lowStock.length" class="plain">
        <li v-for="g in lowStock" :key="g.id">
          <RouterLink :to="`/inventaire/${g.id}`">{{ g.name }}</RouterLink>
          <span><span class="tag tag-warn">{{ stockLabel(g.total) }}</span> <strong>{{ g.total }}</strong></span>
        </li>
      </ul>
      <p v-else class="muted">Rien à signaler : tout est bien approvisionné.</p>
    </section>
  </div>
</template>

<style scoped>
.quick { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
.quick .btn { text-align: center; text-decoration: none; }
.mk { display: flex; flex-direction: column; text-decoration: none; color: var(--ink); gap: 2px; }
.plain { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.plain li { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
.note { font-size: 13px; margin: 0; }
h2 { margin: 0; }
</style>
