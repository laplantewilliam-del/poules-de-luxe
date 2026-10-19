import { reactive, ref, onBeforeUnmount } from 'vue'
import { supabase } from './supabase'

const BUCKET = 'photos'
const MAX_SIDE = 1200
const QUALITY = 0.8
const URL_TTL = 60 * 60 * 24 // secondes

// Cache des adresses signées (l'espace de photos est privé)
const urlCache = reactive({})
const queue = new Set()
let timer = null

async function loadPhotoUrls(paths) {
  if (!paths.length) return
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, URL_TTL)
  if (error || !data) return
  for (const item of data) {
    if (item.signedUrl && item.path) urlCache[item.path] = item.signedUrl
  }
}

// Regroupe les demandes de plusieurs photos en un seul appel
export function requestPhoto(path) {
  if (!path || urlCache[path] || queue.has(path)) return
  queue.add(path)
  if (timer) return
  timer = setTimeout(async () => {
    const batch = [...queue]
    queue.clear()
    timer = null
    await loadPhotoUrls(batch)
  }, 20)
}

export function photoUrl(path) {
  return path ? urlCache[path] || null : null
}

async function toBitmap(file) {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return await createImageBitmap(file)
  }
}

// Réduit la photo (côté max 1200 px, JPEG) avant l'envoi
async function resizeImage(file) {
  const bitmap = await toBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h)
  if (bitmap.close) bitmap.close()
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY))
  if (!blob) throw new Error('Image non lisible')
  return blob
}

export async function uploadPhoto(file) {
  const blob = await resizeImage(file)
  const path = `${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' })
  if (error) throw error
  return path
}

export async function removePhoto(path) {
  if (!path) return
  try {
    await supabase.storage.from(BUCKET).remove([path])
  } catch {
    // sans importance : au pire, un fichier orphelin reste dans le stockage
  }
}

// Gère la photo d'un formulaire : supprime les envois non enregistrés
// et l'ancienne photo une fois la nouvelle enregistrée.
export function usePhotoField() {
  const original = ref(null) // chemin enregistré en base
  const current = ref(null) // chemin affiché dans le formulaire

  function init(path) {
    original.value = path || null
    current.value = path || null
  }

  function set(path) {
    if (current.value && current.value !== original.value && current.value !== path) {
      removePhoto(current.value)
    }
    current.value = path || null
  }

  // À appeler après l'enregistrement réussi
  async function commit() {
    const old = original.value
    original.value = current.value
    if (old && old !== current.value) await removePhoto(old)
  }

  onBeforeUnmount(() => {
    if (current.value && current.value !== original.value) removePhoto(current.value)
  })

  return { current, init, set, commit }
}
