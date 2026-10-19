<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import { normalize, safeUrl } from '../lib/format'
import { friendlyError } from '../lib/errors'
import Photo from '../components/Photo.vue'

const yarns = ref([])
const loading = ref(true)
const error = ref('')
const search = ref('')
const showInactive = ref(false)

onMounted(async () => {
  const { data, error: err } = await supabase
    .from('yarns')
    .select('id, sku, brand, color, color_hex, photo_path, reorder_url, is_active')
    .order('brand')
    .order('color')
  loading.value = false
  if (err) return (error.value = friendlyError(err, 'Chargement impossible.'))
  yarns.value = data
})

const shown = computed(() => {
  const q = normalize(search.value)
  return yarns.value.filter((y) => {
    if (!showInactive.value && !y.is_active) return false
    if (!q) return true
    return normalize(`${y.brand} ${y.color} ${y.sku || ''}`).includes(q)
  })
})
</script>

<template>
  <RouterLink to="/plus" class="back">‹ Plus</RouterLink>
  <div class="page-head">
    <h1>Laines</h1>
    <RouterLink to="/plus/laines/nouvelle" class="btn btn-primary add-btn">Ajouter</RouterLink>
  </div>

  <div class="stack">
    <input v-model="search" class="input" type="search" aria-label="Rechercher une laine" placeholder="Rechercher (marque, couleur, SKU)" />
    <label class="check"><input v-model="showInactive" type="checkbox" /> Afficher les laines désactivées</label>
  </div>

  <p v-if="error" class="error" role="alert">{{ error }}</p>
  <p v-if="loading" class="muted">Chargement...</p>
  <section v-else class="card list">
    <p v-if="!shown.length" class="muted">
      {{ yarns.length ? 'Aucune laine ne correspond.' : 'Aucune laine pour le moment. Ajoute la première avec le bouton Ajouter.' }}
    </p>
    <div v-for="y in shown" :key="y.id" class="list-row">
      <RouterLink :to="`/plus/laines/${y.id}`" class="link-row grow">
        <div class="thumb"><Photo :path="y.photo_path" :alt="`${y.brand} ${y.color}`" /></div>
        <div class="grow">
          <div class="title">
            <i class="swatch" :style="{ background: y.color_hex || '#CDBE9F' }" /> {{ y.color }}
            <span v-if="!y.is_active" class="tag">Désactivée</span>
          </div>
          <div class="sub">{{ y.brand }}<template v-if="y.sku"> · {{ y.sku }}</template></div>
        </div>
      </RouterLink>
      <a
        v-if="safeUrl(y.reorder_url)"
        :href="safeUrl(y.reorder_url)"
        class="btn btn-small btn-ghost"
        target="_blank"
        rel="noopener noreferrer"
      >Commander</a>
    </div>
  </section>
</template>

<style scoped>
.add-btn { display: inline-flex; align-items: center; text-decoration: none; }
.list { margin-top: 16px; padding-top: 6px; padding-bottom: 6px; }
.link-row { display: flex; align-items: center; gap: 12px; color: inherit; text-decoration: none; min-height: 48px; }
.grow { flex: 1; min-width: 0; }
.swatch { display: inline-block; vertical-align: middle; margin-right: 4px; }
</style>
