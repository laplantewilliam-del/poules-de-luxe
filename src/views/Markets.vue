<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import { formatMoney, formatDateRange } from '../lib/format'
import { marketTotals, sortMarkets } from '../lib/stats'
import { friendlyError } from '../lib/errors'

const markets = ref([])
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  const { data, error: err } = await supabase
    .from('markets')
    .select('id, name, location, start_date, end_date, is_open_ended, booth_cost, final_amount, sales(quantity, unit_price, unit_cost, cancelled_at)')
  loading.value = false
  if (err) return (error.value = friendlyError(err, 'Chargement impossible.'))
  markets.value = sortMarkets(data).map((m) => ({ ...m, totals: marketTotals(m, m.sales) }))
})

const empty = computed(() => !loading.value && !markets.value.length)
</script>

<template>
  <h1>Marchés</h1>
  <p v-if="error" class="error" role="alert">{{ error }}</p>
  <p v-if="loading" class="muted">Chargement...</p>
  <p v-else-if="empty" class="muted">Aucun marché pour le moment. Ajoute le premier avec le bouton +.</p>

  <div v-else class="stack list">
    <RouterLink v-for="m in markets" :key="m.id" :to="`/marches/${m.id}`" class="card item">
      <div class="top">
        <span class="nm">{{ m.name }}</span>
        <span v-if="m.is_open_ended" class="tag">Sans fin</span>
      </div>
      <div class="sub">{{ formatDateRange(m) }}<template v-if="m.location"> · {{ m.location }}</template></div>
      <div class="nums">
        <span><strong>{{ formatMoney(m.totals.revenue) }}</strong> de revenu</span>
        <span>{{ m.totals.pieces }} pièce{{ m.totals.pieces > 1 ? 's' : '' }} vendue{{ m.totals.pieces > 1 ? 's' : '' }}</span>
      </div>
    </RouterLink>
  </div>

  <RouterLink to="/marches/nouveau" class="fab" aria-label="Ajouter un marché">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
  </RouterLink>
</template>

<style scoped>
.list { margin-top: 16px; }
.item { display: flex; flex-direction: column; gap: 4px; color: inherit; text-decoration: none; }
.top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.nm { font: 600 18px 'Playfair Display', serif; color: var(--ink); }
.sub { font-size: 14px; color: var(--muted); }
.nums { display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; font-size: 14px; margin-top: 4px; }
.nums strong { color: var(--terra); }
</style>
