import { ref } from 'vue'

export const toastMessage = ref('')
let timer

export function toast(message) {
  toastMessage.value = message
  clearTimeout(timer)
  timer = setTimeout(() => { toastMessage.value = '' }, 3500)
}
