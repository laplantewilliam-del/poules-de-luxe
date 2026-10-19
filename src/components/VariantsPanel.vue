<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { supabase } from '../lib/supabase'
import { parseInteger } from '../lib/format'
import { friendlyError } from '../lib/errors'
import { toast } from '../lib/toast'
import { usePhotoField } from '../lib/photos'
import Photo from './Photo.vue'
import PhotoInput from './PhotoInput.vue'
import AdjustForm from './AdjustForm.vue'
import VariantEdit from './VariantEdit.vue'

const props = defineProps({ creationId: { type: Number, required: true } })

const variants = ref([])
const yarns = ref([])
const loading = ref(true)
const error = ref('')
const open = ref({ id: null, mode: null }) // mode : 'adjust' | 'edit'

const newYarnId = ref(null)
const newStock = ref('0')
const adding = ref(false)
const addError = ref('')
const { current: newPhoto, init: initNewPhoto, set: setNewPhoto, commit: commitNewPhoto } = usePhotoField()

async function load() {
  const [v, y] = await Promise.all([
    supabase
      .from('variants')
      .select('id, photo_path, stock_quantity, is_active, yarns(id, brand, color, color_hex, sku, photo_path)')
      .eq('creation_id', props.creationId)
      .order('id'),
    supabase
      .from('yarns')
      .select('id, brand, color, sku')
      .eq('is_active', true)
      .order('brand')
      .order('color'),
  ])
  loading.value = false
  if (v.error || y.error) return (error.value = friendlyError(v.error || y.error, 'Chargement impossible.'))
  variants.value = v.data
  yarns.value = y.data
}
onMounted(load)

const availableYarns = computed(() => {
  const used = new Set(variants.value.map((v) => v.yarns?.id))
  return yarns.value.filter((y) => !used.has(y.id))
})

function toggle(v, mode) {
  open.value = open.value.id === v.id && open.value.mode === mode ? { id: null, mode: null } : { id: v.id, mode }
}

async function afterChange() {
  open.value = { id: null, mode: null }
  await load()
}

async function addVariant() {
  addError.value = ''
  if (!newYarnId.value) return (addError.value = 'Choisis une laine.')
  const stock = parseInteger(newStock.value)
  if (Number.isNaN(stock) || stock < 0) return (addError.value = 'Le stock de départ doit être un nombre entier, 0 ou plus.')
  adding.value = true
  const { data, error: err } = await supabase
    .from('variants')
    .insert({ creation_id: props.creationId, yarn_id: newYarnId.value, photo_path: newPhoto.value })
    .select('id')
    .single()
  if (err) {
    adding.value = false
    addError.value = err.code === '23505' ? 'Cette laine est déjà utilisée dans cette création.' : friendlyError(err, "L'ajout a échoué.")
    return
  }
  await commitNewPhoto()
  if (stock > 0) {
    const { error: sErr } = await supabase.rpc('adjust_stock', {
      p_variant_id: data.id,
      p_change: stock,
      p_type: 'ajout',
      p_note: 'Stock de départ',
    })
    if (sErr) {
      addError.value = `La couleur est ajoutée, mais le stock de départ n'a pas été enregistré : ${friendlyError(sErr)}`
    }
  }
  adding.value = false
  newYarnId.value = null
  newStock.value = '0'
  initNewPhoto(null)
  if (!addError.value) toast('Couleur ajoutée.')
  await load()
}
</script>

<template>
  <section class="card stack-lg">
    <h2>Couleurs et stock</h2>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-if="loading" class="muted">Chargement...</p>

    <div v-else>
      <p v-if="!variants.length" class="muted">Aucune couleur pour le moment. Ajoute-en une ci-dessous.</p>

      <div v-for="v in variants" :key="v.id" class="variant" :class="{ inactive: !v.is_active }">
        <div class="list-row">
          <div class="thumb"><Photo :path="v.photo_path || v.yarns?.photo_path" :alt="v.yarns?.color" /></div>
          <div class="grow">
            <div class="title">
              <i class="swatch" :style="{ background: v.yarns?.color_hex || '#CDBE9F' }" />
              {{ v.yarns?.color }}
              <span v-if="!v.is_active" class="tag">Désactivée</span>
            </div>
            <div class="sub">{{ v.yarns?.brand }}<template v-if="v.yarns?.sku"> · {{ v.yarns.sku }}</template></div>
          </div>
          <div class="qty" :class="{ neg: v.stock_quantity < 0 }" :aria-label="`Stock : ${v.stock_quantity}`">
            {{ v.stock_quantity }}
          </div>
        </div>
        <div class="row-inline actions">
          <button class="btn btn-small" type="button" @click="toggle(v, 'adjust')">Ajuster le stock</button>
          <button class="btn btn-small btn-ghost" type="button" @click="toggle(v, 'edit')">Modifier</button>
          <RouterLink :to="{ path: '/plus/ajustements', query: { variante: v.id } }" class="link">Historique</RouterLink>
        </div>
        <div v-if="open.id === v.id" class="panel">
          <AdjustForm
            v-if="open.mode === 'adjust'"
            :variant-id="v.id"
            :variants="[{ id: v.id, label: v.yarns?.color, stock: v.stock_quantity }]"
            lock-variant
            @saved="afterChange"
            @cancel="open = { id: null, mode: null }"
          />
          <VariantEdit v-else :variant="v" @saved="afterChange" @cancel="open = { id: null, mode: null }" />
        </div>
      </div>
    </div>

    <form class="add stack" @submit.prevent="addVariant">
      <h3>Ajouter une couleur</h3>
      <p v-if="!availableYarns.length" class="muted small">
        Aucune laine disponible.
        <RouterLink to="/plus/laines/nouvelle">Ajoute d'abord une laine</RouterLink>.
      </p>
      <div class="field">
        <label for="v-yarn">Laine (marque et couleur)</label>
        <select id="v-yarn" v-model="newYarnId" class="input">
          <option :value="null" disabled>Choisir...</option>
          <option v-for="y in availableYarns" :key="y.id" :value="y.id">
            {{ y.brand }} · {{ y.color }}<template v-if="y.sku"> ({{ y.sku }})</template>
          </option>
        </select>
      </div>
      <div class="field">
        <label for="v-stock">Stock de départ</label>
        <input id="v-stock" v-model="newStock" class="input" inputmode="numeric" />
      </div>
      <PhotoInput :model-value="newPhoto" label="Photo de cette couleur (optionnelle)" @update:model-value="setNewPhoto" />
      <p v-if="addError" class="error" role="alert">{{ addError }}</p>
      <button class="btn btn-primary" type="submit" :disabled="adding || !availableYarns.length">
        {{ adding ? 'Ajout...' : 'Ajouter la couleur' }}
      </button>
    </form>
  </section>
</template>

<style scoped>
.variant { border-bottom: 1px solid var(--border); padding-bottom: 10px; margin-bottom: 10px; }
.variant.inactive { opacity: 0.65; }
.variant .list-row { border-bottom: 0; padding-bottom: 6px; }
.qty { font: 600 22px 'Playfair Display', serif; color: var(--ink); min-width: 36px; text-align: right; }
.qty.neg { color: var(--terra); }
.actions { gap: 8px; }
.link { color: var(--sage); font-weight: 500; min-height: 44px; display: inline-flex; align-items: center; }
.panel { margin-top: 12px; padding: 12px; background: var(--cream); border-radius: var(--radius); }
.add { border-top: 1px solid var(--border); padding-top: 16px; }
.small { font-size: 13px; margin: 0; }
.swatch { display: inline-block; vertical-align: middle; margin-right: 4px; }
</style>
