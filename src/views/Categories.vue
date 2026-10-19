<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import { friendlyError } from '../lib/errors'
import { toast } from '../lib/toast'

const categories = ref([])
const loading = ref(true)
const error = ref('')
const newName = ref('')
const editingId = ref(null)
const editName = ref('')

async function load() {
  const { data, error: err } = await supabase.from('categories').select('id, name').order('name')
  loading.value = false
  if (err) return (error.value = friendlyError(err, 'Chargement impossible.'))
  categories.value = data
}
onMounted(load)

async function add() {
  error.value = ''
  const name = newName.value.trim()
  if (!name) return
  const { error: err } = await supabase.from('categories').insert({ name })
  if (err) {
    error.value = err.code === '23505' ? 'Cette catégorie existe déjà.' : friendlyError(err)
    return
  }
  newName.value = ''
  toast('Catégorie ajoutée.')
  await load()
}

function startEdit(c) {
  editingId.value = c.id
  editName.value = c.name
  error.value = ''
}

async function saveEdit(c) {
  error.value = ''
  const name = editName.value.trim()
  if (!name) return (error.value = 'Le nom est obligatoire.')
  const { error: err } = await supabase.from('categories').update({ name }).eq('id', c.id)
  if (err) {
    error.value = err.code === '23505' ? 'Cette catégorie existe déjà.' : friendlyError(err)
    return
  }
  editingId.value = null
  toast('Catégorie modifiée.')
  await load()
}

async function remove(c) {
  error.value = ''
  if (!window.confirm(`Supprimer la catégorie « ${c.name} » ?`)) return
  const { error: err } = await supabase.from('categories').delete().eq('id', c.id)
  if (err) {
    error.value =
      err.code === '23503'
        ? 'Cette catégorie est utilisée par des créations. Change d\'abord leur catégorie.'
        : friendlyError(err)
    return
  }
  toast('Catégorie supprimée.')
  await load()
}
</script>

<template>
  <RouterLink to="/plus" class="back">‹ Plus</RouterLink>
  <h1>Catégories</h1>

  <form class="card add" @submit.prevent="add">
    <div class="field grow">
      <label for="cat-new">Nouvelle catégorie</label>
      <input id="cat-new" v-model="newName" class="input" maxlength="60" placeholder="Ex. Poules" />
    </div>
    <button class="btn btn-primary" type="submit">Ajouter</button>
  </form>

  <p v-if="error" class="error" role="alert">{{ error }}</p>
  <p v-if="loading" class="muted">Chargement...</p>

  <section v-else class="card list">
    <p v-if="!categories.length" class="muted">Aucune catégorie pour le moment.</p>
    <div v-for="c in categories" :key="c.id" class="list-row">
      <template v-if="editingId === c.id">
        <input v-model="editName" class="input grow" :aria-label="`Nom de la catégorie ${c.name}`" maxlength="60" />
        <button class="btn btn-small btn-primary" @click="saveEdit(c)">Enregistrer</button>
        <button class="btn btn-small btn-ghost" @click="editingId = null">Annuler</button>
      </template>
      <template v-else>
        <span class="grow title">{{ c.name }}</span>
        <button class="btn btn-small" @click="startEdit(c)">Renommer</button>
        <button class="btn btn-small btn-danger" @click="remove(c)">Supprimer</button>
      </template>
    </div>
  </section>
</template>

<style scoped>
.add { display: flex; align-items: flex-end; gap: 12px; margin: 16px 0; }
.grow { flex: 1; min-width: 0; }
.list { margin-top: 16px; padding-top: 6px; padding-bottom: 6px; }
</style>
