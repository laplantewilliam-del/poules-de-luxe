<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { signIn } from '../lib/auth'
import Wordmark from '../components/Wordmark.vue'

const router = useRouter()
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  const { error: err } = await signIn(email.value.trim(), password.value)
  loading.value = false
  if (err) {
    error.value = err.message === 'Invalid login credentials'
      ? 'Courriel ou mot de passe incorrect.'
      : 'Connexion impossible : ' + err.message
    return
  }
  router.replace({ name: 'home' })
}
</script>

<template>
  <main class="login">
    <div class="head">
      <Wordmark />
      <p class="tag muted">Créations au crochet faites à la main au Québec</p>
    </div>
    <form class="card form" @submit.prevent="submit">
      <h1>Connexion</h1>
      <div class="field">
        <label for="email">Courriel</label>
        <input id="email" v-model="email" class="input" type="email" autocomplete="username" required />
      </div>
      <div class="field">
        <label for="pw">Mot de passe</label>
        <input id="pw" v-model="password" class="input" type="password" autocomplete="current-password" required />
      </div>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <button class="btn btn-primary" type="submit" :disabled="loading">
        {{ loading ? 'Connexion...' : 'Se connecter' }}
      </button>
    </form>
  </main>
</template>

<style scoped>
.login {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 24px 16px;
}
.head { text-align: center; }
.tag { margin: 4px 0 0; font-size: 13px; letter-spacing: 0.04em; }
.form { width: 100%; max-width: 380px; display: flex; flex-direction: column; gap: 16px; }
</style>
