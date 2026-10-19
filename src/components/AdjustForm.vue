<script setup>
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { parseInteger } from '../lib/format'
import { friendlyError } from '../lib/errors'
import { toast } from '../lib/toast'

// variants : [{ id, label, stock }] pour la liste déroulante.
// Si variantId est fourni avec lockVariant, la variante est fixe.
const props = defineProps({
  variants: { type: Array, default: () => [] },
  variantId: { type: Number, default: null },
  lockVariant: { type: Boolean, default: false },
})
const emit = defineEmits(['saved', 'cancel'])

const selected = ref(props.variantId)
const type = ref('ajout')
const quantity = ref('')
const note = ref('')
const error = ref('')
const saving = ref(false)

const current = computed(() => props.variants.find((v) => v.id === selected.value))

async function save() {
  error.value = ''
  if (!selected.value) return (error.value = 'Choisis une création et une couleur.')
  const n = parseInteger(quantity.value)
  if (Number.isNaN(n)) return (error.value = 'Entre un nombre entier (ex. 3).')
  if (type.value === 'ajout' && n <= 0) return (error.value = "Un ajout doit être supérieur à 0.")
  if (n === 0) return (error.value = 'La quantité ne peut pas être 0.')
  saving.value = true
  const { error: err } = await supabase.rpc('adjust_stock', {
    p_variant_id: selected.value,
    p_change: n,
    p_type: type.value,
    p_note: note.value.trim() || null,
  })
  saving.value = false
  if (err) return (error.value = friendlyError(err, "L'ajustement a échoué."))
  toast('Stock mis à jour.')
  quantity.value = ''
  note.value = ''
  emit('saved')
}
</script>

<template>
  <form class="stack" @submit.prevent="save">
    <div v-if="!lockVariant" class="field">
      <label for="adj-variant">Création et couleur</label>
      <select id="adj-variant" v-model="selected" class="input">
        <option :value="null" disabled>Choisir...</option>
        <option v-for="v in variants" :key="v.id" :value="v.id">{{ v.label }}</option>
      </select>
      <p v-if="current" class="muted small">Stock actuel : {{ current.stock }}</p>
    </div>

    <div class="field">
      <label for="adj-type">Type de mouvement</label>
      <select id="adj-type" v-model="type" class="input">
        <option value="ajout">Ajout de stock (création terminée)</option>
        <option value="ajustement">Ajustement (perte, cadeau, erreur de comptage)</option>
      </select>
    </div>

    <div class="field">
      <label for="adj-qty">
        {{ type === 'ajout' ? 'Quantité à ajouter' : 'Quantité (négative pour retirer)' }}
      </label>
      <input
        id="adj-qty"
        v-model="quantity"
        class="input"
        inputmode="numeric"
        :placeholder="type === 'ajout' ? '3' : '-1'"
      />
    </div>

    <div class="field">
      <label for="adj-note">Note (optionnelle)</label>
      <input id="adj-note" v-model="note" class="input" maxlength="200" />
    </div>

    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <div class="row-inline">
      <button class="btn btn-primary" type="submit" :disabled="saving">
        {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
      </button>
      <button v-if="lockVariant" class="btn btn-ghost" type="button" @click="emit('cancel')">Annuler</button>
    </div>
  </form>
</template>

<style scoped>
.small { font-size: 13px; margin: 0; }
</style>
