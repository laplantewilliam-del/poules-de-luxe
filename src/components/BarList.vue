<script setup>
import { computed, ref } from 'vue'

// items : [{ key, label, value, text, sub }] ; value = longueur de la barre
const props = defineProps({
  items: { type: Array, required: true },
  limit: { type: Number, default: 10 },
})
const all = ref(false)

const shown = computed(() => (all.value ? props.items : props.items.slice(0, props.limit)))
const max = computed(() => Math.max(1, ...props.items.map((i) => i.value)))
</script>

<template>
  <div>
    <ul class="bars">
      <li v-for="i in shown" :key="i.key" :title="`${i.label} : ${i.text}${i.sub ? ' · ' + i.sub : ''}`">
        <div class="head">
          <span class="label">{{ i.label }}</span>
          <span class="val">{{ i.text }}</span>
        </div>
        <div class="track" aria-hidden="true">
          <div class="fill" :style="{ width: (i.value / max) * 100 + '%' }" />
        </div>
        <div v-if="i.sub" class="sub">{{ i.sub }}</div>
      </li>
    </ul>
    <button v-if="items.length > limit" type="button" class="btn btn-small btn-ghost more" @click="all = !all">
      {{ all ? 'Afficher moins' : `Afficher tout (${items.length})` }}
    </button>
  </div>
</template>

<style scoped>
.bars { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.head { display: flex; justify-content: space-between; gap: 12px; font-size: 14px; }
.label { color: var(--ink); font-weight: 500; min-width: 0; overflow-wrap: anywhere; }
.val { color: var(--ink); font-weight: 600; flex: none; }
.track { height: 10px; margin-top: 4px; }
.fill { height: 100%; min-width: 2px; background: var(--brown); border-radius: 0 4px 4px 0; }
.sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
.more { margin-top: 12px; }
</style>
