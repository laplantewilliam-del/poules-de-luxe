<script setup>
import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { friendlyError } from '../lib/errors'
import { toast } from '../lib/toast'
import { usePhotoField } from '../lib/photos'
import PhotoInput from './PhotoInput.vue'

const props = defineProps({ variant: { type: Object, required: true } })
const emit = defineEmits(['saved', 'cancel'])

const isActive = ref(props.variant.is_active)
const error = ref('')
const saving = ref(false)
const { current: photoPath, init: initPhoto, set: setPhoto, commit: commitPhoto } = usePhotoField()
initPhoto(props.variant.photo_path)

async function save() {
  error.value = ''
  saving.value = true
  const { error: err } = await supabase
    .from('variants')
    .update({ photo_path: photoPath.value, is_active: isActive.value })
    .eq('id', props.variant.id)
  saving.value = false
  if (err) return (error.value = friendlyError(err, "L'enregistrement a échoué."))
  await commitPhoto()
  toast('Couleur modifiée.')
  emit('saved')
}
</script>

<template>
  <form class="stack" @submit.prevent="save">
    <PhotoInput :model-value="photoPath" label="Photo de cette couleur" @update:model-value="setPhoto" />
    <label class="check"><input v-model="isActive" type="checkbox" /> Couleur active</label>
    <p v-if="!isActive" class="muted small">
      Une couleur désactivée n'apparaît plus dans l'inventaire ni dans les décomptes. L'historique est conservé.
    </p>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <div class="row-inline">
      <button class="btn btn-primary" type="submit" :disabled="saving">Enregistrer</button>
      <button class="btn btn-ghost" type="button" @click="emit('cancel')">Annuler</button>
    </div>
  </form>
</template>

<style scoped>
.small { font-size: 13px; margin: 0; }
</style>
