<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../lib/supabase'
import { formatMoney, formatDateRange, formatDateTime } from '../lib/format'
import { marketTotals } from '../lib/stats'
import { friendlyError } from '../lib/errors'
import { toast } from '../lib/toast'

const route = useRoute()
const id = Number(route.params.id)

const market = ref(null)
const sales = ref([])
const loading = ref(true)
const error = ref('')

async function load() {
  const [m, s] = await Promise.all([
    supabase.from('markets').select('*').eq('id', id).single(),
    supabase
      .from('sales')
      .select('id, quantity, unit_price, unit_cost, sold_at, entry_mode, cancelled_at, variants(creations(name), yarns(color))')
      .eq('market_id', id)
      .order('sold_at', { ascending: false })
      .limit(300),
  ])
  loading.value = false
  if (m.error || s.error) return (error.value = friendlyError(m.error || s.error, 'Chargement impossible.'))
  market.value = m.data
  sales.value = s.data
}
onMounted(load)

const totals = computed(() => (market.value ? marketTotals(market.value, sales.value) : null))

async function cancelSale(s) {
  error.value = ''
  const label = `${s.variants?.creations?.name} · ${s.variants?.yarns?.color} (${s.quantity})`
  if (!window.confirm(`Annuler cette vente ?\n${label}\nLe stock sera remis en place.`)) return
  const { error: err } = await supabase.rpc('cancel_sale', { p_sale_id: s.id })
  if (err) return (error.value = friendlyError(err, "L'annulation a échoué."))
  toast('Vente annulée, stock remis en place.')
  await load()
}
</script>

<template>
  <RouterLink to="/marches" class="back">‹ Marchés</RouterLink>
  <p v-if="error" class="error" role="alert">{{ error }}</p>
  <p v-if="loading" class="muted">Chargement...</p>

  <template v-else-if="market">
    <div class="page-head">
      <div>
        <h1>{{ market.name }}</h1>
        <div class="muted">{{ formatDateRange(market) }}<template v-if="market.location"> · {{ market.location }}</template></div>
      </div>
      <RouterLink :to="`/marches/${id}/modifier`" class="btn btn-small">Modifier</RouterLink>
    </div>

    <div class="row-inline actions">
      <RouterLink :to="{ path: '/ventes', query: { marche: id } }" class="btn btn-primary">Saisir des ventes</RouterLink>
      <RouterLink :to="{ path: '/ventes/decompte', query: { marche: id } }" class="btn">Décompte après marché</RouterLink>
    </div>

    <section class="card stats">
      <div class="stat">
        <div class="label">Revenu</div>
        <div class="value">{{ formatMoney(totals.revenue) }}</div>
      </div>
      <div class="stat">
        <div class="label">Profit</div>
        <div class="value" :class="{ neg: totals.profit < 0 }">{{ formatMoney(totals.profit) }}</div>
      </div>
      <div class="stat">
        <div class="label">Pièces vendues</div>
        <div class="value">{{ totals.pieces }}</div>
      </div>
      <div class="stat">
        <div class="label">Coût de l'emplacement</div>
        <div class="value">{{ formatMoney(totals.booth) }}</div>
      </div>
    </section>
    <p v-if="totals.usesFinalAmount" class="muted small note">
      Le revenu est le montant final encaissé. Avec les prix du catalogue, il serait de {{ formatMoney(totals.catalogRevenue) }}.
    </p>
    <p v-if="totals.missingCost" class="muted small note">
      {{ totals.missingCost }} ligne(s) de vente n'ont pas de coût de revient : le profit est incomplet.
    </p>

    <section class="card">
      <h2>Ventes</h2>
      <p v-if="!sales.length" class="muted">Aucune vente pour le moment.</p>
      <div v-for="s in sales" :key="s.id" class="list-row" :class="{ cancelled: s.cancelled_at }">
        <div class="grow">
          <div class="title">{{ s.variants?.creations?.name }} · {{ s.variants?.yarns?.color }}</div>
          <div class="sub">
            {{ s.quantity }} × {{ formatMoney(s.unit_price) }} · {{ formatDateTime(s.sold_at) }}
            <template v-if="s.entry_mode === 'remaining_count'"> · décompte</template>
          </div>
        </div>
        <span v-if="s.cancelled_at" class="tag">Annulée</span>
        <button v-else class="btn btn-small btn-danger" type="button" @click="cancelSale(s)">Annuler</button>
      </div>
      <p v-if="sales.length >= 300" class="muted small">Seules les 300 ventes les plus récentes sont affichées.</p>
    </section>
  </template>
</template>

<style scoped>
.actions { margin: 4px 0 16px; }
.actions .btn { display: inline-flex; align-items: center; text-decoration: none; }
.page-head .btn { display: inline-flex; align-items: center; text-decoration: none; }
.stats { margin-bottom: 8px; }
.note { margin: 4px 0 8px; }
.small { font-size: 13px; }
section.card + section.card { margin-top: 16px; }
.cancelled .title, .cancelled .sub { text-decoration: line-through; opacity: 0.6; }
</style>
