<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { safeUrl } from '../lib/format'
import { friendlyError } from '../lib/errors'
import { toast } from '../lib/toast'
import { usePhotoField } from '../lib/photos'
import PhotoInput from '../components/PhotoInput.vue'

const route = useRoute()
const router = useRouter()
const id = route.params.id ? Number(route.params.id) : null
const isNew = id === null

const form = reactive({
  brand: '',
  color: '',
  color_hex: '#C9B99A',
  sku: '',
  reorder_url: '',
  is_active: true,
})
const brands = ref([])
const loading = ref(!isNew)
const saving = ref(false)
const error = ref('')
const { current: photoPath, init: initPhoto, set: setPhoto, commit: commitPhoto } = usePhotoField()

onMounted(async () => {
  const known = await supabase.from('yarns').select('brand')
  if (known.data) brands.value = [...new Set(known.data.map((r) => r.brand))].sort()
  if (isNew) return
  const { data, error: err } = await supabase
    .from('yarns')
    .select('brand, color, color_hex, sku, reorder_url, photo_path, is_active')
    .eq('id', id)
    .single()
  loading.value = false
  if (err) return (error.value = friendlyError(err, 'Laine introuvable.'))
  Object.assign(form, {
    brand: data.brand,
    color: data.color,
    color_hex: data.color_hex || '#C9B99A',
    sku: data.sku || '',
    reorder_url: data.reorder_url || '',
    is_active: data.is_active,
  })
  initPhoto(data.photo_path)
})

async function save() {
  error.value = ''
  if (!form.brand.trim() || !form.color.trim()) {
    return (error.value = 'La marque et la couleur sont obligatoires.')
  }
  const url = form.reorder_url.trim()
  if (url && !safeUrl(url)) {
    return (error.value = "Le lien de recommande doit commencer par http:// ou https://.")
  }
  saving.value = true
  const payload = {
    brand: form.brand.trim(),
    color: form.color.trim(),
    color_hex: form.color_hex,
    sku: form.sku.trim() || null,
    reorder_url: url || null,
    photo_path: photoPath.value,
    is_active: form.is_active,
  }
  const q = isNew
    ? supabase.from('yarns').insert(payload)
    : supabase.from('yarns').update(payload).eq('id', id)
  const { error: err } = await q
  saving.value = false
  if (err) {
    if (err.code === '23505') {
      error.value = /sku/i.test(err.message)
        ? 'Ce SKU existe déjà pour une autre laine.'
        : 'Cette laine existe déjà (même marque et même couleur).'
    } else {
      error.value = friendlyError(err, "L'enregistrement a échoué.")
    }
    return
  }
  await commitPhoto()
  toast('Laine enregistrée.')
  router.push('/plus/laines')
}

const title = computed(() => (isNew ? 'Nouvelle laine' : 'Modifier la laine'))
</script>

<template>
  <RouterLink to="/plus/laines" class="back">‹ Laines</RouterLink>
  <h1>{{ title }}</h1>
  <p v-if="loading" class="muted">Chargement...</p>
  <form v-else class="card stack-lg form" @submit.prevent="save">
    <PhotoInput :model-value="photoPath" label="Photo de la laine" @update:model-value="setPhoto" />

    <div class="field">
      <label for="y-brand">Marque</label>
      <input id="y-brand" v-model="form.brand" class="input" list="brands" maxlength="80" required />
      <datalist id="brands"><option v-for="b in brands" :key="b" :value="b" /></datalist>
    </div>
    <div class="field">
      <label for="y-color">Couleur</label>
      <input id="y-color" v-model="form.color" class="input" maxlength="80" required />
    </div>
    <div class="field">
      <label for="y-hex">Couleur d'affichage (pour les pastilles)</label>
      <input id="y-hex" v-model="form.color_hex" class="input" type="color" />
    </div>
    <div class="field">
      <label for="y-sku">SKU (optionnel)</label>
      <input id="y-sku" v-model="form.sku" class="input" maxlength="80" />
    </div>
    <div class="field">
      <label for="y-url">Lien pour recommander (optionnel)</label>
      <input id="y-url" v-model="form.reorder_url" class="input" type="url" inputmode="url" placeholder="https://" />
    </div>
    <label v-if="!isNew" class="check"><input v-model="form.is_active" type="checkbox" /> Laine active</label>

    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <button class="btn btn-primary" type="submit" :disabled="saving">
      {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
    </button>
  </form>
</template>

<style scoped>
.form { margin-top: 16px; max-width: 520px; }
</style>
