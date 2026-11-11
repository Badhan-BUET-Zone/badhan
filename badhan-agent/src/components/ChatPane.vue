<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import type { AssistantMessage, Chat, ToolMessage } from '../lib/chat.ts'
import { renderMarkdown } from '../lib/markdown.ts'
import { SERVERS, SERVER_IDS, type ServerId } from '../lib/servers.ts'
import { loadProfile, loadSpec, retry, saveChat, send, settings, state, stop } from '../store.ts'
import AccountPanel from './AccountPanel.vue'
import Icon from './Icon.vue'
import Modal from './Modal.vue'
import SystemPromptPanel from './SystemPromptPanel.vue'
import ToolCallCard from './ToolCallCard.vue'

const props = defineProps<{ chat: Chat }>()
const emit = defineEmits<{ menu: []; settings: [] }>()

const server = computed(() => SERVERS[props.chat.server])
const spec = computed(() => state.specs[props.chat.server])
const profile = computed(() => state.profiles[props.chat.server])
const running = computed(() => !!state.running[props.chat.id])
const showAccount = ref(false)

// Load the tools and check the account whenever the chat lands on a server.
watch(() => props.chat.server, (id) => {
  loadSpec(id)
  if (state.profiles[id].status === 'signed-out' && settings.tokens[id]) loadProfile(id)
}, { immediate: true })

function setServer(id: ServerId) {
  props.chat.server = id
  settings.server = id
  saveChat(props.chat)
}

// Tool results are drawn inside the card of the call they answer, not as messages of their own.
const results = computed(() => {
  const map = new Map<string, ToolMessage>()
  for (const message of props.chat.messages) if (message.role === 'tool') map.set(message.tool_call_id, message)
  return map
})
const visible = computed(() => props.chat.messages.filter((message) => message.role !== 'tool'))
const lastIsError = computed(() => {
  const last = props.chat.messages.at(-1)
  return last?.role === 'notice' && last.level === 'error'
})

const usage = (message: AssistantMessage) => {
  const u = message.usage
  if (!u) return message.model ?? ''
  const k = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n))
  const cached = u.prompt_tokens_details?.cached_tokens
  return `${message.model} · ${k(u.prompt_tokens)} in${cached ? ` (${k(cached)} cached)` : ''} · ${k(u.completion_tokens)} out`
}

// --- Composer ---------------------------------------------------------------------------------

const draft = ref('')
const input = ref<HTMLTextAreaElement>()

const blocker = computed(() => {
  if (!settings.apiKey) return 'Add your OpenAI API key in Settings to start.'
  if (spec.value.status === 'error') return `Tools unavailable: ${spec.value.error}`
  return ''
})

function grow() {
  const el = input.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 220)}px`
}

function submit() {
  if (running.value || blocker.value || !draft.value.trim()) return
  const text = draft.value
  draft.value = ''
  nextTick(grow)
  send(props.chat, text)
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    submit()
  }
}

const EXAMPLES = [
  'Who am I signed in as?',
  'Find B+ donors in Suhrawardy hall who can donate now',
  'Show this year\'s donation report',
  'List the newest 10 messages in the member room'
]

function useExample(text: string) {
  draft.value = text
  nextTick(() => { grow(); input.value?.focus() })
}

// --- Scrolling --------------------------------------------------------------------------------

const scroller = ref<HTMLElement>()
let pinned = true

function onScroll() {
  const el = scroller.value
  if (el) pinned = el.scrollHeight - el.scrollTop - el.clientHeight < 80
}

function toBottom(force = false) {
  nextTick(() => {
    const el = scroller.value
    if (el && (pinned || force)) el.scrollTop = el.scrollHeight
  })
}

// Follow the stream while the reader is at the bottom; leave them be once they scroll up to read.
watch(() => {
  const last = props.chat.messages.at(-1)
  return [props.chat.messages.length, last?.role === 'assistant' ? last.content.length : 0, last?.role === 'tool' ? last.run.status : '']
}, () => toBottom())

watch(() => props.chat.id, () => { pinned = true; toBottom(true); input.value?.focus() })
onMounted(() => { toBottom(true); input.value?.focus() })
</script>

<template>
  <div class="pane">
    <header class="bar">
      <button class="icon menu" title="Chats" @click="emit('menu')"><Icon name="menu" /></button>
      <input v-model="chat.title" class="title" aria-label="Chat title" @input="saveChat(chat)" />
      <div class="servers" role="radiogroup" aria-label="Server">
        <button
          v-for="id in SERVER_IDS"
          :key="id"
          role="radio"
          :aria-checked="chat.server === id"
          :class="{ active: chat.server === id, live: SERVERS[id].live }"
          @click="setServer(id)"
        >{{ SERVERS[id].label }}</button>
      </div>
      <span class="tools muted small" :title="spec.error || `${spec.tools.length} API routes available as tools`">
        <template v-if="spec.status === 'loading'">Loading tools…</template>
        <template v-else-if="spec.status === 'ready'"><Icon name="tool" :size="14" /> {{ spec.tools.length }}</template>
        <button v-else-if="spec.status === 'error'" class="ghost error" @click="loadSpec(chat.server, true)"><Icon name="refresh" :size="14" /> Retry</button>
      </span>
      <button class="account" :class="profile.status" @click="showAccount = true" :title="`Account on ${server.label}`">
        <Icon name="user" :size="16" />
        <span class="who">{{ profile.status === 'signed-in' ? profile.name : profile.status === 'checking' ? 'Checking…' : 'Sign in' }}</span>
      </button>
    </header>

    <div v-if="server.live" class="live">
      <strong>Production</strong> — real donor records. Every request is live, and every change asks you first.
    </div>

    <div ref="scroller" class="scroll" @scroll="onScroll">
      <div class="thread">
        <SystemPromptPanel :key="chat.id" :chat="chat" />

        <div v-if="!visible.length" class="empty">
          <p class="muted">Ask about donors, donations, call records or reports. Each API call the model makes shows up here as a card.</p>
          <div class="examples">
            <button v-for="text in EXAMPLES" :key="text" @click="useExample(text)">{{ text }}</button>
          </div>
        </div>

        <template v-for="message in visible" :key="message.id">
          <div v-if="message.role === 'user'" class="msg user">
            <div class="bubble">{{ message.content }}</div>
          </div>

          <div v-else-if="message.role === 'assistant'" class="msg assistant">
            <div v-if="message.content" class="markdown" v-html="renderMarkdown(message.content)" />
            <div v-else-if="message.streaming" class="thinking"><span /><span /><span /></div>
            <ToolCallCard
              v-for="call in message.tool_calls || []"
              :key="call.id"
              :call="call"
              :result="results.get(call.id)"
            />
            <div v-if="!message.streaming && (message.usage || message.model)" class="meta muted">{{ usage(message) }}</div>
          </div>

          <div v-else-if="message.role === 'notice'" class="notice" :class="message.level">
            <span>{{ message.content }}</span>
            <button v-if="lastIsError && message === chat.messages.at(-1)" class="ghost" @click="retry(chat)">Retry</button>
            <button v-if="!settings.apiKey" class="ghost" @click="emit('settings')">Settings</button>
          </div>
        </template>
      </div>
    </div>

    <footer class="composer">
      <div class="box">
        <textarea
          ref="input"
          v-model="draft"
          rows="1"
          :placeholder="blocker || `Message the agent on ${server.label}…`"
          @input="grow"
          @keydown="onKey"
        />
        <button v-if="running" class="stop" title="Stop" @click="stop(chat.id)"><Icon name="stop" /></button>
        <button v-else class="primary send" title="Send (Enter)" :disabled="!!blocker || !draft.trim()" @click="submit"><Icon name="send" /></button>
      </div>
      <div class="hint muted small">
        <template v-if="blocker">
          {{ blocker }} <button v-if="!settings.apiKey" class="ghost link" @click="emit('settings')">Open Settings</button>
        </template>
        <template v-else>{{ settings.model }} · Enter to send, Shift+Enter for a new line</template>
      </div>
    </footer>

    <Modal v-if="showAccount" :title="`Account on ${server.label}`" @close="showAccount = false">
      <AccountPanel :server="chat.server" />
    </Modal>
  </div>
</template>

<style scoped>
.pane { display: flex; flex-direction: column; height: 100%; min-width: 0; }

.bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}
.menu { display: none; }
.title {
  flex: 1;
  min-width: 80px;
  border: 1px solid transparent !important;
  background: transparent !important;
  font-weight: 600;
  font-size: 15.5px;
  padding: 5px 8px !important;
}
.title:hover { border-color: var(--border) !important; }
.servers { display: flex; background: var(--surface-2); border-radius: 9px; padding: 3px; gap: 2px; flex: none; }
.servers button { border: 0; background: transparent; padding: 4px 10px; font-size: 13px; border-radius: 7px; color: var(--muted); }
.servers button.active { background: var(--surface); color: var(--text); box-shadow: var(--shadow); }
.servers button.live.active { color: var(--brand); font-weight: 600; }
.tools { display: inline-flex; align-items: center; gap: 4px; flex: none; }
.tools .error { color: var(--err); font-size: 13px; padding: 3px 8px; }
.account { flex: none; font-size: 13.5px; max-width: 180px; }
.account .who { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.account.signed-in { border-color: color-mix(in srgb, var(--ok) 40%, var(--border)); }
.account.rejected, .account.signed-out { color: var(--muted); }

.live {
  background: var(--brand-soft);
  color: var(--brand);
  padding: 6px 16px;
  font-size: 13.5px;
  border-bottom: 1px solid color-mix(in srgb, var(--brand) 25%, transparent);
}

.scroll { flex: 1; overflow-y: auto; }
.thread { max-width: 860px; margin: 0 auto; padding: 20px 20px 32px; }

.empty { text-align: center; padding: 24px 0; }
.empty p { margin: 0 0 14px; }
.examples { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
.examples button { font-size: 13.5px; border-radius: 999px; padding: 6px 14px; white-space: normal; }

.msg { margin: 0 0 18px; }
.msg.user { display: flex; justify-content: flex-end; }
.bubble {
  background: var(--surface-2);
  border-radius: 14px 14px 4px 14px;
  padding: 9px 14px;
  max-width: min(640px, 85%);
  white-space: pre-wrap;
  word-break: break-word;
}
.msg.assistant { line-height: 1.6; }
.meta { font-size: 11.5px; margin-top: 4px; }

.thinking { display: flex; gap: 4px; padding: 8px 0; }
.thinking span {
  width: 6px; height: 6px; border-radius: 50%; background: var(--muted);
  animation: blink 1.2s infinite ease-in-out;
}
.thinking span:nth-child(2) { animation-delay: 0.15s; }
.thinking span:nth-child(3) { animation-delay: 0.3s; }
@keyframes blink { 0%, 80%, 100% { opacity: 0.25; } 40% { opacity: 1; } }

.notice {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  padding: 8px 12px;
  border-radius: 8px;
  margin: 0 0 18px;
  background: var(--surface-2);
  color: var(--muted);
}
.notice.error { background: var(--err-soft); color: var(--err); }
.notice span { flex: 1; }
.notice button { font-size: 13px; padding: 3px 10px; }

.composer { padding: 10px 16px 14px; background: var(--bg); }
.box {
  max-width: 860px;
  margin: 0 auto;
  display: flex;
  align-items: flex-end;
  gap: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 8px 8px 8px 14px;
  box-shadow: var(--shadow);
}
.box textarea { border: 0 !important; outline: none !important; padding: 6px 0 !important; resize: none; background: transparent; line-height: 1.45; max-height: 220px; }
.send, .stop { flex: none; width: 36px; height: 36px; padding: 0; justify-content: center; border-radius: 10px; }
.hint { max-width: 860px; margin: 6px auto 0; padding: 0 4px; }
.link { padding: 0 4px; color: var(--accent); font-size: inherit; }

@media (max-width: 860px) {
  .menu { display: inline-flex; }
  .bar { flex-wrap: wrap; padding: 8px 12px; gap: 6px; }
  .title { order: 1; flex-basis: calc(100% - 140px); }
  .account { order: 2; }
  .menu { order: 0; }
  .servers { order: 3; }
  .tools { order: 4; }
  .thread { padding: 16px 16px 24px; }
}
</style>
