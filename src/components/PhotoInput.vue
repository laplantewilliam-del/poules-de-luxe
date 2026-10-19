<script setup>
import { ref } from 'vue'
import { uploadPhoto } from '../lib/photos'
import { friendlyError } from '../lib/errors'
import Photo from './Photo.vue'

defineProps({
  modelValue: { type: String, default: null },
  label: { type: String, default: 'Photo' },
})
const emit = defineEmits(['update:modelValue'])

const busy = ref(false)
const error = ref('')
const fileInput = ref(null)

async function onChange(e) {
  const file = e.target.files && e.target.files[0]
  e.target.value = ''
  if (!file) return
  error.value = ''
  busy.value = true
  try {
    emit('update:modelValue', await uploadPhoto(file))
  } catch (err) {
    error.value = friendlyError(err, "La photo n'a pas pu être envoyée.")
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="photo-input">
    <div class="preview"><Photo :path="modelValue" :alt="label" /></div>
    <div class="actions">
      <button type="button" class="btn btn-small" :disabled="busy" @click="fileInput.click()">
        {{ busy ? 'Envoi...' : modelValue ? 'Changer la photo' : 'Ajouter une photo' }}
      </button>
      <button
        v-if="modelValue"
        type="button"
        class="btn btn-small btn-ghost"
        :disabled="busy"
        @click="emit('update:modelValue', null)"
      >Retirer</button>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
    </div>
    <input ref="fileInput" type="file" accept="image/*" hidden @change="onChange" />
  </div>
</template>

<style scoped>
.photo-input { display: flex; align-items: center; gap: 16px; }
.preview { width: 96px; height: 96px; border-radius: 12px; overflow: hidden; flex: none; border: 1px solid var(--border); }
.actions { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; }
.actions p { margin: 0; }
</style>
