<script setup>
import { watch } from 'vue'
import { photoUrl, requestPhoto } from '../lib/photos'

const props = defineProps({
  path: { type: String, default: null },
  alt: { type: String, default: '' },
})

watch(() => props.path, (p) => requestPhoto(p), { immediate: true })
</script>

<template>
  <img v-if="photoUrl(path)" :src="photoUrl(path)" :alt="alt" class="photo" loading="lazy" />
  <div v-else class="photo empty" role="img" :aria-label="path ? 'Photo en chargement' : 'Aucune photo'" />
</template>

<style scoped>
.photo {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #EADFC6;
}
</style>
