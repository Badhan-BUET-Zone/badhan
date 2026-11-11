<script setup lang="ts">
// Who the agent's requests are made as, on one server. Signing in here keeps the password out of
// the chat: it goes from this form straight to the Badhan server, never to OpenAI.
import { computed, ref } from 'vue'
import { SERVERS, type ServerId } from '../lib/servers.ts'
import { loadProfile, settings, signIn, signOut, state, useToken } from '../store.ts'

const props = defineProps<{ server: ServerId }>()

const profile = computed(() => state.profiles[props.server])
const server = computed(() => SERVERS[props.server])

const mode = ref<'password' | 'token'>('password')
const phone = ref('')
const password = ref('')
const token = ref('')
const busy = ref(false)
const error = ref('')

async function attempt(action: () => Promise<void>) {
  busy.value = true
  error.value = ''
  try {
    await action()
    password.value = ''
    token.value = ''
    if (profile.value.status === 'rejected' || profile.value.status === 'error') error.value = profile.value.error || ''
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="account">
    <div class="row top">
      <strong>{{ server.label }}</strong>
      <span class="muted small grow url">{{ server.baseUrl }}</span>
    </div>

    <template v-if="settings.tokens[props.server] && profile.status !== 'rejected'">
      <p v-if="profile.status === 'signed-in'" class="who">
        Signed in as <strong>{{ profile.name }}</strong>
        <span class="muted"> · {{ profile.designation }} · {{ profile.hall }}</span>
      </p>
      <p v-else-if="profile.status === 'checking'" class="muted">Checking the saved token…</p>
      <p v-else-if="profile.status === 'error'" class="error">
        Could not check the saved token: {{ profile.error }}
        <button class="ghost" @click="loadProfile(props.server)">Retry</button>
      </p>
      <button :disabled="busy" @click="attempt(() => signOut(props.server))">Sign out</button>
    </template>

    <template v-else>
      <p v-if="profile.status === 'rejected'" class="error">The saved token was rejected. Sign in again.</p>
      <div class="tabs row">
        <button :class="{ active: mode === 'password' }" class="ghost" @click="mode = 'password'">Phone and password</button>
        <button :class="{ active: mode === 'token' }" class="ghost" @click="mode = 'token'">Paste a token</button>
      </div>
      <form v-if="mode === 'password'" class="form" @submit.prevent="attempt(() => signIn(props.server, phone, password))">
        <input v-model="phone" type="tel" placeholder="Phone, e.g. 01521438557" autocomplete="username" required />
        <input v-model="password" type="password" placeholder="Password" autocomplete="current-password" required />
        <button class="primary" :disabled="busy">Sign in to {{ server.label }}</button>
      </form>
      <form v-else class="form" @submit.prevent="attempt(() => useToken(props.server, token))">
        <input v-model="token" type="password" placeholder="x-auth token" autocomplete="off" required />
        <button class="primary" :disabled="busy">Use this token</button>
        <p class="muted small">Any session token works — for example the one in the AI Integration setup file.</p>
      </form>
    </template>

    <p v-if="error && profile.status !== 'rejected'" class="error">{{ error }}</p>
  </div>
</template>

<style scoped>
.account { display: grid; gap: 8px; }
.top { align-items: baseline; }
.url { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.who { margin: 0; }
.form { display: grid; gap: 8px; }
.form p { margin: 0; }
.tabs { gap: 4px; }
.tabs button { font-size: 13px; padding: 4px 10px; color: var(--muted); }
.tabs button.active { background: var(--surface-2); color: var(--text); }
.error { color: var(--err); margin: 0; font-size: 14px; }
p { margin: 0; }
</style>
