<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { parseAmount, formatMoney } from '../lib/format'
import { friendlyError } from '../lib/errors'
import { toast } from '../lib/toast'
import { usePhotoField } from '../lib/photos'
import PhotoInput from '../components/PhotoInput.vue'
import VariantsPanel from '../components/VariantsPanel.vue'

const route = useRoute()
const router = useRouter()
const id = route.params.id ? Number(route.params.id) : null
const isNew = id === null

const form = reactive({ name: '', category_id: null, price: '', cost: '', is_active: true })
const categories = ref([])
const loading = ref(!isNew)
const saving = ref(false)
const error = ref('')
const { current: photoPath, init: initPhoto, set: setPhoto, commit: commitPhoto } = usePhotoField()

onMounted(async () => {
  const cats = await supabase.from('categories').select('id, name').order('name')
  if (cats.data) categories.value = cats.data
  if (isNew) return
  const { data, error: err } = await supabase
    .from('creations')
    .select('name, category_id, price, cost, photo_path, is_active')
    .eq('id', id)
    .single()
  loading.value = false
  if (err) return (error.value = friendlyError(err, 'Création introuvable.'))
  Object.assign(form, {
    name: data.name,
    category_id: data.category_id,
    price: String(data.price).replace('.', ','),
    cost: data.cost === null ? '' : String(data.cost).replace('.', ','),
    is_active: data.is_active,
  })
  initPhoto(data.photo_path)
})

function buildPayload() {
  if (!form.name.trim()) throw new Error('Le nom est obligatoire.')
  const price = parseAmount(form.price)
  if (price === null || Number.isNaN(price)) throw new Error('Entre un prix valide (ex. 27 ou 27,50).')
  const cost = parseAmount(form.cost)
  if (Number.isNaN(cost)) throw new Error('Le coût de revient est invalide (ex. 8 ou 8,50), ou laisse le champ vide.')
  return {
    name: form.name.trim(),
    category_id: form.category_id,
    price,
    cost,
    photo_path: photoPath.value,
    is_active: form.is_active,
  }
}

async function save() {
  error.value = ''
  let payload
  try {
    payload = buildPayload()
  } catch (e) {
    return (error.value = e.message)
  }
  saving.value = true
  if (isNew) {
    const { data, error: err } = await supabase.from('creations').insert(payload).select('id').single()
    saving.value = false
    if (err) return (error.value = friendlyError(err, "L'enregistrement a échoué."))
    await commitPhoto()
    toast('Création enregistrée. Ajoute maintenant ses couleurs.')
    router.replace(`/inventaire/${data.id}`)
  } else {
    const { error: err } = await supabase.from('creations').update(payload).eq('id', id)
    saving.value = false
    if (err) return (error.value = friendlyError(err, "L'enregistrement a échoué."))
    await commitPhoto()
    toast('Création enregistrée.')
  }
}

async function toggleActive() {
  const next = !form.is_active
  if (!next && !window.confirm("Désactiver cette création ? Elle n'apparaîtra plus dans l'inventaire. L'historique des ventes est conservé.")) return
  const { error: err } = await supabase.from('creations').update({ is_active: next }).eq('id', id)
  if (err) return (error.value = friendlyError(err))
  form.is_active = next
  toast(next ? 'Création réactivée.' : 'Création désactivée.')
}

const margin = computed(() => {
  const p = parseAmount(form.price)
  const c = parseAmount(form.cost)
  if (p === null || c === null || Number.isNaN(p) || Number.isNaN(c)) return null
  return p - c
})
</script>

<template>
  <RouterLink to="/inventaire" class="back">‹ Inventaire</RouterLink>
  <h1>{{ isNew ? 'Nouvelle création' : form.name || 'Création' }}</h1>
  <p v-if="loading" class="muted">Chargement...</p>

  <div v-else class="layout">
    <form class="card stack-lg" @submit.prevent="save">
      <PhotoInput :model-value="photoPath" label="Photo de la création" @update:model-value="setPhoto" />

      <div class="field">
        <label for="c-name">Nom</label>
        <input id="c-name" v-model="form.name" class="input" maxlength="100" required />
      </div>
      <div class="field">
        <label for="c-cat">Catégorie</label>
        <select id="c-cat" v-model="form.category_id" class="input">
          <option :value="null">Aucune</option>
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <RouterLink to="/plus/categories" class="muted small">Gérer les catégories</RouterLink>
      </div>
      <div class="field">
        <label for="c-price">Prix de vente ($)</label>
        <input id="c-price" v-model="form.price" class="input" inputmode="decimal" placeholder="27" required />
      </div>
      <div class="field">
        <label for="c-cost">Coût de revient ($, optionnel)</label>
        <input id="c-cost" v-model="form.cost" class="input" inputmode="decimal" placeholder="8" />
        <span v-if="margin !== null" class="muted small">Marge par pièce : {{ formatMoney(margin) }}</span>
      </div>

      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <div class="row-inline">
        <button class="btn btn-primary" type="submit" :disabled="saving">
          {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
        </button>
        <button v-if="!isNew" class="btn btn-danger" type="button" @click="toggleActive">
          {{ form.is_active ? 'Désactiver' : 'Réactiver' }}
        </button>
      </div>
      <p v-if="!isNew && !form.is_active" class="tag tag-warn">Cette création est désactivée.</p>
    </form>

    <VariantsPanel v-if="!isNew" :creation-id="id" />
    <p v-else class="muted">Enregistre la création pour pouvoir ajouter ses couleurs et son stock.</p>
  </div>
</template>

<style scoped>
.layout { display: flex; flex-direction: column; gap: 16px; margin-top: 16px; max-width: 640px; }
.small { font-size: 13px; }
</style>
