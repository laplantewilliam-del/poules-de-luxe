<script setup>
import { useRoute } from 'vue-router'
const route = useRoute()
</script>

<template>
  <h1>{{ route.meta.title }}</h1>
  <p class="muted">Cet écran sera construit à une phase suivante.</p>
</template>
