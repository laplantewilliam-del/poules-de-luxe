<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../lib/supabase'
import { parseInteger, normalize, toLocalInput } from '../lib/format'
import { loadActiveVariants, groupByCreation } from '../lib/variants'
import { friendlyError } from '../lib/errors'
import { toast } from '../lib/toast'
import MarketSelect from '../components/MarketSelect.vue'

const route = useRoute()
const marketId = ref(route.query.marche ? Number(route.query.marche) : null)
const soldAt = ref(toLocalInput())
const search = ref('')
const variants = ref([])
const qty = reactive({}) // id de variante -> texte saisi
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

function value(id) {
  const t = qty[id]
  if (t === undefined || String(t).trim() === '') return 0
  return parseInteger(t)
}
const isBad = (id) => {
  const n = value(id)
  return Number.isNaN(n) || n < 0
}
function step(id, delta) {
  const n = value(id)
  qty[id] = String(Math.max(0, (Number.isNaN(n) ? 0 : n) + delta))
}

const groups = computed(() => {
  const q = normalize(search.value)
  const list = q ? variants.value.filter((v) => normalize(`${v.creation} ${v.color} ${v.brand}`).includes(q)) : variants.value
  return groupByCreation(list)
})

const lines = computed(() =>
  variants.value
    .map((v) => ({ v, n: value(v.id) }))
    .filter((l) => !Number.isNaN(l.n) && l.n > 0),
)
const totalPieces = computed(() => lines.value.reduce((t, l) => t + l.n, 0))
const anyBad = computed(() => variants.value.some((v) => isBad(v.id)))

async function save() {
  error.value = ''
  if (!marketId.value) return (error.value = 'Choisis un marché.')
  if (anyBad.value) return (error.value = 'Corrige les quantités en rouge (nombres entiers, 0 ou plus).')
  if (!lines.value.length) return (error.value = 'Aucune quantité à enregistrer.')
  const when = new Date(soldAt.value)
  if (!soldAt.value || Number.isNaN(when.getTime())) return (error.value = 'La date et l\'heure sont invalides.')

  const over = lines.value.filter((l) => l.n > l.v.stock)
  if (over.length) {
    const detail = over.map((l) => `- ${l.v.creation} · ${l.v.color} : vente ${l.n}, stock ${l.v.stock}`).join('\n')
    if (!window.confirm(`La quantité dépasse le stock :\n${detail}\n\nContinuer ? Le stock deviendra négatif.`)) return
  }

  saving.value = true
  const { error: err } = await supabase.rpc('record_sales', {
    p_market_id: marketId.value,
    p_lines: lines.value.map((l) => ({ variant_id: l.v.id, quantity: l.n })),
    p_sold_at: when.toISOString(),
  })
  saving.value = false
  if (err) {
    error.value = /record_sales/.test(err.message || '')
      ? "La mise à jour de la base de données n'a pas été faite (fonction record_sales manquante)."
      : friendlyError(err, "L'enregistrement a échoué.")
    return
  }
  toast(`${totalPieces.value} pièce(s) enregistrée(s).`)
  for (const k of Object.keys(qty)) delete qty[k]
  soldAt.value = toLocalInput()
  await load()
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
    <div class="field">
      <label for="sold-at">Date et heure des ventes</label>
      <input id="sold-at" v-model="soldAt" class="input" type="datetime-local" />
    </div>
    <input v-model="search" class="input" type="search" aria-label="Rechercher une création" placeholder="Rechercher" />
  </div>

  <p v-if="error" class="error" role="alert">{{ error }}</p>
  <p v-if="loading" class="muted">Chargement...</p>
  <p v-else-if="!variants.length" class="muted">Aucune couleur en inventaire. Ajoute d'abord des créations avec leurs couleurs.</p>

  <section v-for="g in groups" :key="g.id" class="card group">
    <h2>{{ g.name }}</h2>
    <div v-for="v in g.variants" :key="v.id" class="line">
      <i class="swatch" :style="{ background: v.hex }" />
      <div class="grow">
        <div class="title">{{ v.color }}</div>
        <div class="sub">{{ v.brand }} · stock {{ v.stock }}</div>
      </div>
      <div class="stepper">
        <button type="button" class="step" :aria-label="`Retirer un, ${g.name} ${v.color}`" @click="step(v.id, -1)">−</button>
        <input
          v-model="qty[v.id]"
          class="qty"
          :class="{ bad: isBad(v.id) }"
          inputmode="numeric"
          placeholder="0"
          :aria-label="`Quantité vendue, ${g.name} ${v.color}`"
        />
        <button type="button" class="step" :aria-label="`Ajouter un, ${g.name} ${v.color}`" @click="step(v.id, 1)">+</button>
      </div>
    </div>
  </section>

  <div class="bar-spacer" />
  <div class="savebar">
    <span class="muted">{{ lines.length }} ligne(s) · {{ totalPieces }} pièce(s)</span>
    <button class="btn btn-primary" type="button" :disabled="saving || !lines.length" @click="save">
      {{ saving ? 'Enregistrement...' : 'Enregistrer les ventes' }}
    </button>
  </div>
</template>

<style scoped>
.top { margin: 16px 0; }
.group { margin-bottom: 12px; padding-top: 12px; padding-bottom: 6px; }
.group h2 { font-size: 17px; margin-bottom: 4px; }
.line { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-top: 1px solid var(--border); }
.line:first-of-type { border-top: 0; }
.grow { flex: 1; min-width: 0; }
.title { font-weight: 600; color: var(--ink); }
.sub { font-size: 12px; color: var(--muted); }
.stepper { display: flex; align-items: center; gap: 4px; flex: none; }
.step {
  width: 44px;
  height: 44px;
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  background: var(--surface);
  color: var(--ink);
  font: 600 22px Jost, sans-serif;
  cursor: pointer;
}
.qty {
  width: 52px;
  height: 44px;
  text-align: center;
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  background: var(--surface);
  color: var(--ink);
  font: 600 17px Jost, sans-serif;
}
.qty.bad { border-color: var(--terra); border-width: 2px; }
</style>
