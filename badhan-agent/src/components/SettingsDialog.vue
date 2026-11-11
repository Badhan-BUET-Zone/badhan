<script setup lang="ts">
import { ref } from 'vue'
import { listChatModels } from '../lib/openai.ts'
import { SERVER_IDS } from '../lib/servers.ts'
import { settings } from '../store.ts'
import AccountPanel from './AccountPanel.vue'
import Modal from './Modal.vue'

const emit = defineEmits<{ close: [] }>()

const showKey = ref(false)
const models = ref<string[]>([])
const modelsError = ref('')
const loadingModels = ref(false)

async function loadModels() {
  loadingModels.value = true
  modelsError.value = ''
  try {
    models.value = await listChatModels(settings.apiKey)
    if (!models.value.length) modelsError.value = 'This key lists no chat models.'
  } catch (error) {
    modelsError.value = error instanceof Error ? error.message : String(error)
  } finally {
    loadingModels.value = false
  }
}
</script>

<template>
  <Modal title="Settings" wide @close="emit('close')">
    <section>
      <h3>OpenAI</h3>
      <label class="field">
        <span>API key</span>
        <div class="row">
          <input v-model.trim="settings.apiKey" :type="showKey ? 'text' : 'password'" placeholder="sk-…" autocomplete="off" spellcheck="false" />
          <button class="ghost" @click="showKey = !showKey">{{ showKey ? 'Hide' : 'Show' }}</button>
        </div>
        <span class="muted small">Kept in this browser's local storage and sent only to api.openai.com.</span>
      </label>
      <label class="field">
        <span>Model</span>
        <div class="row">
          <input v-model.trim="settings.model" type="text" list="models" placeholder="gpt-5-mini" spellcheck="false" />
          <button :disabled="!settings.apiKey || loadingModels" @click="loadModels">{{ loadingModels ? 'Loading…' : 'List models' }}</button>
        </div>
        <datalist id="models"><option v-for="model in models" :key="model" :value="model" /></datalist>
        <span v-if="modelsError" class="error small">{{ modelsError }}</span>
        <span v-else-if="models.length" class="muted small">{{ models.length }} models on this key — pick one from the field's suggestions.</span>
        <span v-else class="muted small">Any chat model that supports tool calling.</span>
      </label>
    </section>

    <section>
      <h3>Tool calls</h3>
      <div class="options">
        <label class="option">
          <input v-model="settings.approval" type="radio" value="writes" />
          <span><strong>Ask before changes</strong><br /><span class="muted small">Reads run on their own; POST, PATCH, PUT and DELETE wait for you.</span></span>
        </label>
        <label class="option">
          <input v-model="settings.approval" type="radio" value="all" />
          <span><strong>Ask before every request</strong></span>
        </label>
        <label class="option">
          <input v-model="settings.approval" type="radio" value="none" />
          <span><strong>Never ask</strong><br /><span class="muted small">Production still asks before changes: its records are real.</span></span>
        </label>
      </div>
      <label class="field inline">
        <span>Model calls per message, at most</span>
        <input v-model.number="settings.maxSteps" type="number" min="1" max="100" />
      </label>
    </section>

    <section>
      <h3>Badhan accounts</h3>
      <p class="muted small">Every tool call is made as the account signed in on that chat's server.</p>
      <div class="accounts">
        <AccountPanel v-for="id in SERVER_IDS" :key="id" :server="id" class="account-box" />
      </div>
    </section>
  </Modal>
</template>

<style scoped>
section { padding: 6px 0 14px; border-bottom: 1px solid var(--border); }
section:last-child { border-bottom: 0; }
h3 { font-size: 14px; margin: 8px 0 10px; }
.field { display: grid; gap: 4px; margin-bottom: 12px; }
.field > span:first-child { font-size: 14px; font-weight: 500; }
.field.inline { grid-template-columns: 1fr 90px; align-items: center; margin: 12px 0 0; }
.options { display: grid; gap: 8px; }
.option { display: flex; gap: 10px; align-items: flex-start; font-size: 14px; }
.option input { margin-top: 4px; }
.accounts { display: grid; gap: 10px; }
.account-box { border: 1px solid var(--border); border-radius: var(--radius); padding: 12px; }
.error { color: var(--err); }
p { margin: 0 0 10px; }
</style>
