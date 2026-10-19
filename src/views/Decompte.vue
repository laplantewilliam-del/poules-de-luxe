<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../lib/supabase'
import { parseInteger, normalize } from '../lib/format'
import { loadActiveVariants } from '../lib/variants'
import { friendlyError } from '../lib/errors'
import { toast } from '../lib/toast'
import MarketSelect from '../components/MarketSelect.vue'

const route = useRoute()
const marketId = ref(route.query.marche ? Number(route.query.marche) : null)
const search = ref('')
const variants = ref([])
const remaining = reactive({}) // id de variante -> texte saisi
const loading = ref(true)
const saving = ref(false)
const error = ref('')

async function load() {
  const r = await loadActiveVariants()
  loading.value = false
  if (r.error) return (error.value = friendlyError(r.error, 'Chargement impossible.'))
  variants.value = r.variants
}
onMounted(load)

// État d'une ligne : vide, invalide, dépasse le stock, ou valide (avec le nombre vendu)
function state(v) {
  const t = remaining[v.id]
  if (t === undefined || String(t).trim() === '') return { kind: 'empty' }
  const n = parseInteger(t)
  if (Number.isNaN(n) || n < 0) return { kind: 'invalid' }
  if (n > v.stock) return { kind: 'over' }
  return { kind: 'ok', remaining: n, sold: v.stock - n }
}

const shown = computed(() => {
  const q = normalize(search.value)
  return q ? variants.value.filter((v) => normalize(`${v.creation} ${v.color} ${v.brand}`).includes(q)) : variants.value
})

const states = computed(() => variants.value.map((v) => ({ v, s: state(v) })))
const problems = computed(() => states.value.filter((x) => x.s.kind === 'invalid' || x.s.kind === 'over').length)
const actionable = computed(() => states.value.filter((x) => x.s.kind === 'ok' && x.s.sold > 0))

function payload(rows) {
  return rows.map((x) => ({ variant_id: x.v.id, remaining: x.s.remaining, expected_current: x.v.stock }))
}

async function submit(rows) {
  error.value = ''
  if (!marketId.value) return (error.value = 'Choisis un marché.')
  if (!rows.length) return (error.value = 'Aucune vente à enregistrer : la quantité restante est identique au stock actuel.')
  saving.value = true
  const { data, error: err } = await supabase.rpc('record_remaining', {
    p_market_id: marketId.value,
    p_counts: payload(rows),
  })
  saving.value = false
  if (err) {
    if (/a changé/.test(err.message || '')) {
      await load()
      error.value = "Le stock a changé depuis l'ouverture de l'écran. Les stocks ont été rechargés : vérifie tes quantités et réessaie."
    } else {
      error.value = friendlyError(err, "L'enregistrement a échoué.")
    }
    return
  }
  for (const x of rows) delete remaining[x.v.id]
  toast(`${data} vente(s) enregistrée(s) pour ce marché.`)
  await load()
}

function saveRow(v) {
  const s = state(v)
  if (s.kind === 'over') return (error.value = "La quantité restante dépasse le stock : utilise l'ajustement de stock pour augmenter.")
  if (s.kind !== 'ok') return (error.value = 'Entre une quantité restante valide (nombre entier, 0 ou plus).')
  return submit([{ v, s }])
}

function saveAll() {
  if (problems.value) {
    error.value = `${problems.value} ligne(s) à corriger avant d'enregistrer.`
    return
  }
  return submit(actionable.value)
}
</script>

<template>
  <h1>Ventes</h1>
  <nav class="tabs" aria-label="Mode de saisie">
    <RouterLink :to="{ path: '/ventes', query: route.query }">Saisie directe</RouterLink>
    <RouterLink :to="{ path: '/ventes/decompte', query: route.query }">Décompte après marché</RouterLink>
  </nav>

  <div class="stack top">
    <MarketSelect v-model="marketId" />
    <p class="muted small">Inscris la quantité qui reste. Les lignes vides sont ignorées. La différence avec le stock actuel devient une vente du marché choisi.</p>
    <input v-model="search" class="input" type="search" aria-label="Rechercher une création" placeholder="Rechercher" />
  </div>

  <p v-if="error" class="error" role="alert">{{ error }}</p>
  <p v-if="loading" class="muted">Chargement...</p>
  <p v-else-if="!variants.length" class="muted">Aucune couleur en inventaire.</p>

  <section v-if="shown.length" class="card rows">
    <div v-for="v in shown" :key="v.id" class="row">
      <i class="sw" :style="{ background: v.hex }" />
      <div class="tx">
        <span class="n">{{ v.creation }}</span>
        <span class="s">{{ v.brand }} · {{ v.color }}</span>
        <span
          class="a"
          :class="{ ok: state(v).kind === 'ok' && state(v).sold > 0, bad: state(v).kind === 'over' || state(v).kind === 'invalid' }"
        >
          Actuel {{ v.stock }}
          <template v-if="state(v).kind === 'ok'"> · vendu {{ state(v).sold }}</template>
          <template v-else-if="state(v).kind === 'over'"> · dépasse le stock</template>
          <template v-else-if="state(v).kind === 'invalid'"> · nombre invalide</template>
        </span>
      </div>
      <input
        v-model="remaining[v.id]"
        class="in"
        :class="{ bad: state(v).kind === 'over' || state(v).kind === 'invalid' }"
        inputmode="numeric"
        :aria-label="`Nouvelle quantité, ${v.creation} ${v.color}`"
      />
      <button
        type="button"
        class="ok-btn"
        :aria-label="`Enregistrer la ligne ${v.creation} ${v.color}`"
        :disabled="saving || state(v).kind !== 'ok'"
        @click="saveRow(v)"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>
      </button>
    </div>
  </section>

  <div class="bar-spacer" />
  <div class="savebar">
    <span v-if="problems" class="error small">{{ problems }} ligne(s) à corriger : utilise l'ajustement de stock pour augmenter</span>
    <span v-else class="muted small">{{ actionable.length }} ligne(s) avec vente</span>
    <button class="btn btn-primary" type="button" :disabled="saving || !!problems || !actionable.length" @click="saveAll">
      {{ saving ? 'Enregistrement...' : `Tout enregistrer (${actionable.length})` }}
    </button>
  </div>
</template>

<style scoped>
.top { margin: 16px 0; }
.small { font-size: 13px; margin: 0; }
.rows { padding-top: 4px; padding-bottom: 4px; }
.row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border); }
.row:last-child { border-bottom: 0; }
.sw { width: 40px; height: 40px; border-radius: 8px; flex: none; border: 1px solid rgba(62, 38, 24, 0.2); }
.tx { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.n { font-weight: 600; font-size: 14px; color: var(--ink); }
.s { font-size: 12px; color: var(--muted); }
.a { font-size: 12px; font-weight: 500; color: var(--text); }
.a.ok { color: #4B5A30; }
.a.bad { color: var(--terra); }
.in {
  width: 64px;
  height: 44px;
  text-align: center;
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  background: var(--surface);
  color: var(--ink);
  font: 600 16px Jost, sans-serif;
  flex: none;
}
.in.bad { border-color: var(--terra); border-width: 2px; }
.ok-btn {
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 10px;
  background: #EADFC6;
  color: var(--ink);
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.ok-btn:disabled { opacity: 0.5; cursor: default; }
</style>
