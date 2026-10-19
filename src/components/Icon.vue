<script setup>
defineProps({ name: { type: String, required: true } })

const paths = {
  home: 'M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z',
  box: 'M3 7l9-4 9 4-9 4zM3 7v10l9 4 9-4V7M12 11v10',
  calendar: 'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 10h18M8 3v4M16 3v4',
  receipt: 'M4 4h16v17l-3-2-2.5 2-2.5-2-2.5 2L7 19l-3 2zM8 9h8M8 13h5',
  chart: 'M5 20V10M12 20V4M19 20v-7',
  dots: 'M5 12h.01M12 12h.01M19 12h.01',
}
</script>

<template>
  <svg viewBox="0 0 24 24" aria-hidden="true" class="icon" :class="{ big: name === 'dots' }">
    <path :d="paths[name]" />
  </svg>
</template>

<style scoped>
.icon {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.icon.big { stroke-width: 3.2; }
</style>
