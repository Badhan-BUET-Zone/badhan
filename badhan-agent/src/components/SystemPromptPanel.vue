<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { DEFAULT_SYSTEM_PROMPT, type Chat } from '../lib/chat.ts'
import { SERVERS } from '../lib/servers.ts'
import { saveChat, settings, state, systemMessage } from '../store.ts'
import Icon from './Icon.vue'

const props = defineProps<{ chat: Chat }>()

const open = ref(props.chat.messages.length === 0)
// Open while the chat is empty, the one time the prompt is most likely to be edited; out of the way
// once the conversation starts.
watch(() => props.chat.messages.length > 0, (started) => { if (started) open.value = false })
const preview = ref(false)
const savedAsDefault = ref(false)

const spec = computed(() => state.specs[props.chat.server])
const referenceKb = computed(() => Math.max(1, Math.round(spec.value.reference.length / 1024)))
const firstLine = computed(() => props.chat.systemPrompt.trim().split('\n')[0] || 'Empty')
const full = computed(() => systemMessage(props.chat))

const save = () => saveChat(props.chat)

function reset() {
  props.chat.systemPrompt = settings.defaultSystemPrompt
  save()
}

function makeDefault() {
  settings.defaultSystemPrompt = props.chat.systemPrompt
  savedAsDefault.value = true
  setTimeout(() => (savedAsDefault.value = false), 1500)
}

function restoreBuiltIn() {
  props.chat.systemPrompt = DEFAULT_SYSTEM_PROMPT
  settings.defaultSystemPrompt = DEFAULT_SYSTEM_PROMPT
  save()
}
</script>

<template>
  <section class="panel" :class="{ open }">
    <button class="head" @click="open = !open" :aria-expanded="open">
      <Icon name="chevron" :size="14" class="chev" :class="{ open }" />
      <strong>System prompt</strong>
      <span v-if="!open" class="muted summary">{{ firstLine }}</span>
    </button>
    <div v-if="open" class="body">
      <textarea v-model="chat.systemPrompt" rows="9" spellcheck="false" @input="save" />
      <label class="check">
        <input v-model="chat.attachReference" type="checkbox" @change="save" />
        <span>
          Attach the API reference from <code>{{ SERVERS[chat.server].baseUrl }}/llms.txt</code>
          <span v-if="spec.status === 'ready' && spec.reference" class="muted">({{ referenceKb }} KB)</span>
          <br />
          <span class="muted small">Every route, parameter and response shape, plus how blood groups, halls and dates are encoded. Without it the model has only the tool descriptions.</span>
        </span>
      </label>
      <p class="muted small">
        The app also adds a short session note under the prompt: the server, who is signed in, and the current time.
      </p>
      <div class="row actions">
        <button class="ghost" @click="preview = !preview"><Icon name="doc" :size="15" />{{ preview ? 'Hide' : 'Show' }} the full system message</button>
        <span class="grow" />
        <button class="ghost" @click="reset">Reset to default</button>
        <button class="ghost" @click="makeDefault">{{ savedAsDefault ? 'Saved' : 'Use for new chats' }}</button>
        <button v-if="settings.defaultSystemPrompt !== DEFAULT_SYSTEM_PROMPT" class="ghost" @click="restoreBuiltIn">Restore built-in</button>
      </div>
      <pre v-if="preview" class="preview">{{ full }}</pre>
    </div>
  </section>
</template>

<style scoped>
.panel {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  margin-bottom: 18px;
}
.head {
  width: 100%;
  border: 0;
  background: transparent;
  padding: 10px 12px;
  display: flex;
  gap: 8px;
  align-items: center;
  text-align: left;
  font-size: 14px;
}
.chev { transition: transform 0.15s; flex: none; color: var(--muted); }
.chev.open { transform: rotate(90deg); }
.head strong { white-space: nowrap; }
.summary { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; font-size: 13.5px; }
.body { padding: 0 12px 12px; display: grid; gap: 10px; }
textarea { resize: vertical; font-size: 14px; line-height: 1.45; }
.check { display: flex; gap: 10px; align-items: flex-start; font-size: 14px; }
.check input { margin-top: 4px; }
.actions { flex-wrap: wrap; gap: 4px; }
.actions button { font-size: 13px; padding: 4px 8px; }
.preview { max-height: 420px; font-size: 12px; }
p { margin: 0; }
</style>
