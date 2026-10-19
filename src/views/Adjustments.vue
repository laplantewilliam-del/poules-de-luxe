<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../lib/supabase'
import { formatDateTime } from '../lib/format'
import { friendlyError } from '../lib/errors'
import AdjustForm from '../components/AdjustForm.vue'

const route = useRoute()
const filterId = route.query.variante ? Number(route.query.variante) : null

const variants = ref([])
const movements = ref([])
const loading = ref(true)
const error = ref('')

const TYPES = {
  ajout: 'Ajout',
  vente: 'Vente',
  ajustement: 'Ajustement',
  annulation_vente: 'Annulation de vente',
}

async function load() {
  const v = await supabase
    .from('variants')
    .select('id, stock_quantity, creations(name), yarns(brand, color)')
    .eq('is_active', true)
  let m = supabase
    .from('stock_movements')
    .select('id, movement_type, quantity_change, note, created_at, variants(id, creations(name), yarns(brand, color))')
    .order('created_at', { ascending: false })
    .limit(100)
  if (filterId) m = m.eq('variant_id', filterId)
  const mv = await m
  loading.value = false
  if (v.error || mv.error) return (error.value = friendlyError(v.error || mv.error, 'Chargement impossible.'))
  variants.value = v.data
    .map((x) => ({
      id: x.id,
      stock: x.stock_quantity,
      label: `${x.creations?.name} · ${x.yarns?.color} (${x.yarns?.brand})`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'fr'))
  movements.value = mv.data
}
onMounted(load)

const filterLabel = computed(() => {
  const m = movements.value[0]
  return m ? `${m.variants?.creations?.name} · ${m.variants?.yarns?.color}` : 'cette couleur'
})
</script>

<template>
  <RouterLink to="/plus" class="back">‹ Plus</RouterLink>
  <h1>Ajustements de stock</h1>

  <div class="layout">
    <section class="card stack">
      <h2>Nouveau mouvement</h2>
      <AdjustForm :variants="variants" :variant-id="filterId" @saved="load" />
    </section>

    <section class="card">
      <h2>Historique</h2>
      <p v-if="filterId" class="muted small">
        Filtré sur {{ filterLabel }}. <RouterLink to="/plus/ajustements">Voir tout</RouterLink>
      </p>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p v-if="loading" class="muted">Chargement...</p>
      <p v-else-if="!movements.length" class="muted">Aucun mouvement pour le moment.</p>
      <div v-for="m in movements" :key="m.id" class="list-row">
        <div class="grow">
          <div class="title">{{ m.variants?.creations?.name }} · {{ m.variants?.yarns?.color }}</div>
          <div class="sub">
            {{ TYPES[m.movement_type] || m.movement_type }} · {{ formatDateTime(m.created_at) }}
            <template v-if="m.note"> · {{ m.note }}</template>
          </div>
        </div>
        <div class="delta" :class="{ neg: m.quantity_change < 0 }">
          {{ m.quantity_change > 0 ? '+' : '' }}{{ m.quantity_change }}
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.layout { display: flex; flex-direction: column; gap: 16px; margin-top: 16px; max-width: 640px; }
.small { font-size: 13px; }
.delta { font: 600 18px 'Playfair Display', serif; color: var(--sage); min-width: 44px; text-align: right; }
.delta.neg { color: var(--terra); }
</style>
