<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import { formatMoney, normalize } from '../lib/format'
import { friendlyError } from '../lib/errors'
import Photo from '../components/Photo.vue'

const LOW_STOCK = 2 // stock total à partir duquel on affiche « Stock bas »
const MAX_DOTS = 4

const loading = ref(true)
const error = ref('')
const creations = ref([])
const categories = ref([])
const search = ref('')
const categoryId = ref(null)
const showInactive = ref(false)

onMounted(async () => {
  const [c, k] = await Promise.all([
    supabase
      .from('creations')
      .select('id, name, price, photo_path, is_active, category_id, variants(id, stock_quantity, is_active, yarns(color, color_hex))')
      .order('name'),
    supabase.from('categories').select('id, name').order('name'),
  ])
  loading.value = false
  if (c.error || k.error) return (error.value = friendlyError(c.error || k.error, 'Chargement impossible.'))
  categories.value = k.data
  creations.value = c.data.map((cr) => {
    const variants = cr.variants
      .filter((v) => v.is_active)
      .sort((a, b) => (a.yarns?.color || '').localeCompare(b.yarns?.color || '', 'fr'))
    return { ...cr, variants, total: variants.reduce((s, v) => s + v.stock_quantity, 0) }
  })
})

const shown = computed(() => {
  const q = normalize(search.value)
  return creations.value.filter((c) => {
    if (!showInactive.value && !c.is_active) return false
    if (categoryId.value && c.category_id !== categoryId.value) return false
    return !q || normalize(c.name).includes(q)
  })
})

function stockTag(c) {
  if (!c.variants.length) return { text: 'Aucune couleur', warn: false }
  if (c.total < 0) return { text: `Stock négatif : ${c.total}`, warn: true }
  if (c.total === 0) return { text: 'Épuisé', warn: true }
  if (c.total <= LOW_STOCK) return { text: `Stock bas : ${c.total}`, warn: true }
  return { text: `Stock ${c.total}`, warn: false }
}
</script>

<template>
  <div class="stack">
    <h1>Inventaire</h1>
    <input v-model="search" class="input" type="search" aria-label="Rechercher une création" placeholder="Rechercher" />
    <div class="chips" role="group" aria-label="Filtrer par catégorie">
      <button class="chip" :class="{ on: categoryId === null }" @click="categoryId = null">Toutes</button>
      <button
        v-for="k in categories"
        :key="k.id"
        class="chip"
        :class="{ on: categoryId === k.id }"
        @click="categoryId = k.id"
      >{{ k.name }}</button>
    </div>
    <label class="check"><input v-model="showInactive" type="checkbox" /> Afficher les créations désactivées</label>
  </div>

  <p v-if="error" class="error" role="alert">{{ error }}</p>
  <p v-if="loading" class="muted">Chargement...</p>
  <p v-else-if="!shown.length" class="muted empty">
    {{ creations.length ? 'Aucune création ne correspond.' : 'Aucune création pour le moment. Ajoute la première avec le bouton +.' }}
  </p>

  <div v-else class="grid">
    <RouterLink v-for="c in shown" :key="c.id" :to="`/inventaire/${c.id}`" class="card item">
      <div class="ph"><Photo :path="c.photo_path" :alt="c.name" /></div>
      <div class="nm">{{ c.name }}</div>
      <div class="pr">
        <span class="price">{{ formatMoney(c.price) }}</span>
        <span class="tag" :class="{ 'tag-warn': stockTag(c).warn }">{{ stockTag(c).text }}</span>
      </div>
      <div v-if="!c.is_active" class="tag">Désactivée</div>
      <div class="dots">
        <span v-for="v in c.variants.slice(0, MAX_DOTS)" :key="v.id" class="dot" :aria-label="`${v.yarns?.color} : ${v.stock_quantity}`">
          <i class="swatch" :style="{ background: v.yarns?.color_hex || '#CDBE9F' }" />{{ v.stock_quantity }}
        </span>
        <span v-if="c.variants.length > MAX_DOTS" class="dot">+{{ c.variants.length - MAX_DOTS }}</span>
      </div>
    </RouterLink>
  </div>

  <RouterLink to="/inventaire/nouvelle" class="fab" aria-label="Ajouter une création">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
  </RouterLink>
</template>

<style scoped>
.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 16px; }
@media (min-width: 700px) { .grid { grid-template-columns: repeat(3, 1fr); } }
@media (min-width: 1000px) { .grid { grid-template-columns: repeat(4, 1fr); } }
.item { display: flex; flex-direction: column; gap: 6px; padding: 8px; color: inherit; text-decoration: none; }
.ph { height: 130px; border-radius: 10px; overflow: hidden; }
.nm { font: 600 15px 'Playfair Display', serif; color: var(--ink); line-height: 1.2; }
.pr { display: flex; justify-content: space-between; align-items: center; gap: 6px; flex-wrap: wrap; }
.price { font-weight: 600; color: var(--terra); }
.dots { display: flex; flex-wrap: wrap; gap: 4px 10px; font-size: 12px; font-weight: 500; }
.dot { display: inline-flex; align-items: center; gap: 4px; }
.swatch { width: 10px; height: 10px; }
.empty { margin-top: 16px; }
</style>
