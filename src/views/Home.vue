<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

const status = ref('checking')
const detail = ref('')

// Vérification temporaire de la connexion à la base de données
onMounted(async () => {
  const { count, error } = await supabase
    .from('markets')
    .select('id', { count: 'exact', head: true })
  if (error) {
    status.value = 'error'
    detail.value = error.message
  } else {
    status.value = 'ok'
    detail.value = `${count} marché(s) dans la base`
  }
})
</script>

<template>
  <h1>Accueil</h1>
  <section class="card status">
    <h2>État de la base de données</h2>
    <p v-if="status === 'checking'" class="muted">Vérification...</p>
    <p v-else-if="status === 'ok'">Connectée. {{ detail }}.</p>
    <p v-else class="error">Erreur : {{ detail }}</p>
    <p class="muted small">Ce bloc est temporaire. Le tableau de bord sera construit à une phase suivante.</p>
  </section>
</template>

<style scoped>
.status { margin-top: 16px; display: flex; flex-direction: column; gap: 8px; }
.status p { margin: 0; }
.small { font-size: 13px; }
</style>
