<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { parseAmount } from '../lib/format'
import { friendlyError } from '../lib/errors'
import { toast } from '../lib/toast'

const route = useRoute()
const router = useRouter()
const id = route.params.id ? Number(route.params.id) : null
const isNew = id === null

const form = reactive({
  name: '',
  location: '',
  start_date: '',
  end_date: '',
  is_open_ended: false,
  booth_cost: '0',
  final_amount: '',
})
const loading = ref(!isNew)
const saving = ref(false)
const error = ref('')

onMounted(async () => {
  if (isNew) return
  const { data, error: err } = await supabase.from('markets').select('*').eq('id', id).single()
  loading.value = false
  if (err) return (error.value = friendlyError(err, 'Marché introuvable.'))
  Object.assign(form, {
    name: data.name,
    location: data.location || '',
    start_date: data.start_date,
    end_date: data.end_date || '',
    is_open_ended: data.is_open_ended,
    booth_cost: String(data.booth_cost).replace('.', ','),
    final_amount: data.final_amount === null ? '' : String(data.final_amount).replace('.', ','),
  })
})

function onStartChange() {
  if (!form.is_open_ended && !form.end_date) form.end_date = form.start_date
}

async function save() {
  error.value = ''
  if (!form.name.trim()) return (error.value = 'Le nom est obligatoire.')
  if (!form.start_date) return (error.value = 'La date de début est obligatoire.')
  if (!form.is_open_ended) {
    if (!form.end_date) return (error.value = 'La date de fin est obligatoire, ou coche « Marché sans fin ».')
    if (form.end_date < form.start_date) return (error.value = 'La date de fin doit être après la date de début.')
  }
  const booth = parseAmount(form.booth_cost)
  if (booth === null || Number.isNaN(booth)) return (error.value = "Le coût de l'emplacement est invalide (ex. 60 ou 60,50, ou 0).")
  const final = parseAmount(form.final_amount)
  if (Number.isNaN(final)) return (error.value = 'Le montant final encaissé est invalide, ou laisse le champ vide.')

  const payload = {
    name: form.name.trim(),
    location: form.location.trim() || null,
    start_date: form.start_date,
    end_date: form.is_open_ended ? null : form.end_date,
    is_open_ended: form.is_open_ended,
    booth_cost: booth,
    final_amount: final,
  }
  saving.value = true
  if (isNew) {
    const { data, error: err } = await supabase.from('markets').insert(payload).select('id').single()
    saving.value = false
    if (err) return (error.value = friendlyError(err, "L'enregistrement a échoué."))
    toast('Marché enregistré.')
    router.replace(`/marches/${data.id}`)
  } else {
    const { error: err } = await supabase.from('markets').update(payload).eq('id', id)
    saving.value = false
    if (err) return (error.value = friendlyError(err, "L'enregistrement a échoué."))
    toast('Marché enregistré.')
    router.replace(`/marches/${id}`)
  }
}

async function remove() {
  error.value = ''
  if (!window.confirm('Supprimer ce marché ? Cette action est définitive.')) return
  const { error: err } = await supabase.from('markets').delete().eq('id', id)
  if (err) {
    error.value =
      err.code === '23503'
        ? 'Ce marché a des ventes enregistrées, il ne peut pas être supprimé.'
        : friendlyError(err)
    return
  }
  toast('Marché supprimé.')
  router.replace('/marches')
}
</script>

<template>
  <RouterLink :to="isNew ? '/marches' : `/marches/${id}`" class="back">‹ {{ isNew ? 'Marchés' : 'Retour au marché' }}</RouterLink>
  <h1>{{ isNew ? 'Nouveau marché' : 'Modifier le marché' }}</h1>
  <p v-if="loading" class="muted">Chargement...</p>

  <form v-else class="card stack-lg form" @submit.prevent="save">
    <div class="field">
      <label for="m-name">Nom</label>
      <input id="m-name" v-model="form.name" class="input" maxlength="100" required />
    </div>
    <div class="field">
      <label for="m-loc">Lieu (optionnel)</label>
      <input id="m-loc" v-model="form.location" class="input" maxlength="120" />
    </div>
    <div class="field">
      <label for="m-start">Date de début</label>
      <input id="m-start" v-model="form.start_date" class="input" type="date" required @change="onStartChange" />
    </div>
    <label class="check"><input v-model="form.is_open_ended" type="checkbox" /> Marché sans fin (ex. Marketplace)</label>
    <div v-if="!form.is_open_ended" class="field">
      <label for="m-end">Date de fin</label>
      <input id="m-end" v-model="form.end_date" class="input" type="date" required />
    </div>
    <div class="field">
      <label for="m-booth">Coût de l'emplacement ($)</label>
      <input id="m-booth" v-model="form.booth_cost" class="input" inputmode="decimal" />
    </div>
    <div class="field">
      <label for="m-final">Montant final encaissé ($, optionnel)</label>
      <input id="m-final" v-model="form.final_amount" class="input" inputmode="decimal" />
      <span class="muted small">
        À remplir après le marché pour tenir compte des rabais. S'il est vide, le revenu est calculé avec les prix du catalogue.
      </span>
    </div>

    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <div class="row-inline">
      <button class="btn btn-primary" type="submit" :disabled="saving">
        {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
      </button>
      <button v-if="!isNew" class="btn btn-danger" type="button" @click="remove">Supprimer</button>
    </div>
  </form>
</template>

<style scoped>
.form { margin-top: 16px; max-width: 520px; }
.small { font-size: 13px; }
</style>
