<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import { formatDateRange } from '../lib/format'
import { sortMarkets } from '../lib/stats'

defineProps({ modelValue: { type: Number, default: null } })
const emit = defineEmits(['update:modelValue'])

const markets = ref([])

onMounted(async () => {
  const { data } = await supabase
    .from('markets')
    .select('id, name, start_date, end_date, is_open_ended')
  if (data) markets.value = sortMarkets(data)
})
</script>

<template>
  <div class="field">
    <label for="market-select">Marché</label>
    <select
      id="market-select"
      class="input"
      :value="modelValue"
      @change="emit('update:modelValue', $event.target.value ? Number($event.target.value) : null)"
    >
      <option value="">Choisir un marché...</option>
      <option v-for="m in markets" :key="m.id" :value="m.id">{{ m.name }} ({{ formatDateRange(m) }})</option>
    </select>
    <RouterLink v-if="!markets.length" to="/marches/nouveau" class="muted small">Ajoute d'abord un marché</RouterLink>
  </div>
</template>

<style scoped>
.small { font-size: 13px; }
</style>
