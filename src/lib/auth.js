import { ref } from 'vue'
import { supabase } from './supabase'

export const session = ref(null)

export const authReady = supabase.auth.getSession().then(({ data }) => {
  session.value = data.session
})

supabase.auth.onAuthStateChange((_event, s) => {
  session.value = s
})

export function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password })
}

export function signOut() {
  return supabase.auth.signOut()
}
