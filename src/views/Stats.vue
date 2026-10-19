<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import { formatMoney, formatDateRange } from '../lib/format'
import { marketTotals, sortMarkets, filterSales, topCreations, topYarns, byCategory, byPriceRange } from '../lib/stats'
import { loadSalesFlat } from '../lib/salesData'
import { friendlyError } from '../lib/errors'
import BarList from '../components/BarList.vue'

const loading = ref(true)
const error = ref('')
const markets = ref([])
const allSales = ref([])

const marketId = ref('')
const from = ref('')
const to = ref('')

onMounted(async () => {
  const [m, s] = await Promise.all([
    supabase.from('markets').select('id, name, location, start_date, end_date, is_open_ended, booth_cost, final_amount'),
    loadSalesFlat(),
  ])
  loading.value = false
  const err = m.error || s.error
  if (err) return (error.value = friendlyError(err, 'Chargement impossible.'))
  markets.value = sortMarkets(m.data)
  allSales.value = s.sales
})

const rows = computed(() =>
  markets.value
    .filter((m) => !marketId.value || String(m.id) === String(marketId.value))
    .map((m) => ({ m, t: marketTotals(m, allSales.value.filter((x) => x.market_id === m.id)) })),
)
const grand = computed(() => ({
  revenue: rows.value.reduce((t, r) => t + r.t.revenue, 0),
  profit: rows.value.reduce((t, r) => t + r.t.profit, 0),
  pieces: rows.value.reduce((t, r) => t + r.t.pieces, 0),
}))

const sales = computed(() =>
  filterSales(allSales.value, { marketId: marketId.value ? Number(marketId.value) : null, from: from.value, to: to.value }),
)
const pieces = (n) => `${n} pièce${n > 1 ? 's' : ''}`
const toItems = (list) => list.map((r) => ({ key: r.key, label: r.label, value: r.pieces, text: pieces(r.pieces), sub: formatMoney(r.revenue) }))

const creations = computed(() => toItems(topCreations(sales.value)))
const yarns = computed(() => toItems(topYarns(sales.value)))
const categories = computed(() => toItems(byCategory(sales.value)))
const prices = computed(() => toItems(byPriceRange(sales.value)))

const hasPeriod = computed(() => from.value || to.value)
function reset() { marketId.value = ''; from.value = ''; to.value = '' }
</script>

<template>
  <h1>Statistiques</h1>
  <p v-if="error" class="error" role="alert">{{ error }}</p>
  <p v-if="loading" class="muted">Chargement...</p>

  <div v-else class="stack-lg">
    <section class="card stack">
      <div class="filters">
        <label class="field">Marché
          <select v-model="marketId" class="input">
            <option value="">Tous les marchés</option>
            <option v-for="m in markets" :key="m.id" :value="m.id">{{ m.name }}</option>
          </select>
        </label>
        <label class="field">Du
          <input v-model="from" type="date" class="input" />
        </label>
        <label class="field">Au
          <input v-model="to" type="date" class="input" />
        </label>
      </div>
      <button v-if="marketId || hasPeriod" type="button" class="btn btn-small btn-ghost" @click="reset">Réinitialiser les filtres</button>
      <p class="muted note">La période s'applique aux blocs de ventes ci-dessous (créations, couleurs, catégories, prix), selon la date de saisie. Le tableau des marchés montre toujours le total complet de chaque marché.</p>
    </section>

    <section class="card stack">
      <h2>Revenu et profit par marché</h2>
      <p v-if="!rows.length" class="muted">Aucun marché.</p>
      <div v-else class="tablewrap">
        <table>
          <thead><tr><th>Marché</th><th class="num">Pièces</th><th class="num">Revenu</th><th class="num">Profit</th></tr></thead>
          <tbody>
            <tr v-for="r in rows" :key="r.m.id">
              <td>
                <RouterLink :to="`/marches/${r.m.id}`">{{ r.m.name }}</RouterLink>
                <div class="muted sm">{{ formatDateRange(r.m) }}</div>
              </td>
              <td class="num">{{ r.t.pieces }}</td>
              <td class="num">{{ formatMoney(r.t.revenue) }}</td>
              <td class="num" :class="{ neg: r.t.profit < 0 }">{{ formatMoney(r.t.profit) }}<span v-if="r.t.missingCost" title="Certaines lignes n'ont pas de coût de revient"> *</span></td>
            </tr>
          </tbody>
          <tfoot v-if="rows.length > 1">
            <tr><th>Total</th><th class="num">{{ grand.pieces }}</th><th class="num">{{ formatMoney(grand.revenue) }}</th><th class="num" :class="{ neg: grand.profit < 0 }">{{ formatMoney(grand.profit) }}</th></tr>
          </tfoot>
        </table>
      </div>
      <p class="muted note">* Au moins une vente sans coût de revient : le profit est surévalué. Le revenu utilise le montant final encaissé quand il est rempli.</p>
    </section>

    <section class="card stack">
      <h2>Créations les plus vendues</h2>
      <BarList v-if="creations.length" :items="creations" />
      <p v-else class="muted">Aucune vente pour ces filtres.</p>
    </section>

    <section class="card stack">
      <h2>Couleurs les plus populaires</h2>
      <BarList v-if="yarns.length" :items="yarns" />
      <p v-else class="muted">Aucune vente pour ces filtres.</p>
    </section>

    <section class="card stack">
      <h2>Ventes par catégorie</h2>
      <BarList v-if="categories.length" :items="categories" />
      <p v-else class="muted">Aucune vente pour ces filtres.</p>
    </section>

    <section class="card stack">
      <h2>Ventes par tranche de prix</h2>
      <BarList v-if="sales.length" :items="prices" :limit="4" />
      <p v-else class="muted">Aucune vente pour ces filtres.</p>
    </section>
  </div>
</template>

<style scoped>
.filters { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
.note { font-size: 13px; margin: 0; }
h2 { margin: 0; }
.tablewrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th, td { padding: 8px 6px; border-bottom: 1px solid var(--border); text-align: left; vertical-align: top; }
th { font-weight: 600; color: var(--muted); font-size: 13px; }
tfoot th { color: var(--ink); border-bottom: 0; }
.num { text-align: right; white-space: nowrap; }
.neg { color: var(--terra); }
.sm { font-size: 12px; }
</style>
