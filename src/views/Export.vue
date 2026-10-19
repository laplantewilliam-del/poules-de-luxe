<script setup>
import { ref } from 'vue'
import { loadExportData } from '../lib/exportData'
import { buildSheets } from '../lib/exportSheets'
import { friendlyError } from '../lib/errors'

const busy = ref(false)
const error = ref('')
const done = ref('')

function dateKey() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

async function run() {
  busy.value = true
  error.value = ''
  done.value = ''
  try {
    const { data, error: err } = await loadExportData()
    if (err) throw err
    const sheets = buildSheets(data)
    const { default: writeExcelFile } = await import('write-excel-file/browser')
    const name = `poules-de-luxe-export-${dateKey()}.xlsx`
    await writeExcelFile(sheets).toFile(name)
    done.value = `Fichier créé : ${name}`
  } catch (e) {
    error.value = friendlyError(e, "L'export a échoué.")
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <RouterLink to="/plus" class="back">Retour</RouterLink>
  <h1>Export des données</h1>
  <section class="card stack">
    <p>Crée un seul fichier Excel (.xlsx) avec une feuille par type de donnée :</p>
    <ul>
      <li>Créations</li>
      <li>Couleurs et stock</li>
      <li>Laines</li>
      <li>Marchés</li>
      <li>Ventes (y compris les ventes annulées, marquées « Oui »)</li>
      <li>Mouvements de stock</li>
    </ul>
    <p class="muted">Les photos ne sont pas incluses. Le fichier reflète l'état de la base au moment du clic.</p>
    <button type="button" class="btn btn-primary" :disabled="busy" @click="run">
      {{ busy ? 'Préparation du fichier...' : 'Télécharger le fichier Excel' }}
    </button>
    <p v-if="done" role="status">{{ done }}</p>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
  </section>
</template>
