<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ToolMessage } from '../lib/chat.ts'
import type { ToolCall } from '../lib/openai.ts'
import { SERVERS } from '../lib/servers.ts'
import { resolveApproval } from '../store.ts'
import Icon from './Icon.vue'

const props = defineProps<{ call: ToolCall; result?: ToolMessage }>()

const run = computed(() => props.result?.run)
const status = computed(() => run.value?.status ?? 'pending')
const method = computed(() => run.value?.method ?? '')
const awaiting = computed(() => status.value === 'awaiting-approval')
const live = computed(() => !!run.value?.server && SERVERS[run.value.server].live)

const open = ref(false)
// A card that needs a decision opens itself: approving a request you cannot see is no approval.
watch(awaiting, (value) => { if (value) open.value = true }, { immediate: true })

const pretty = (value: unknown) => typeof value === 'string' ? value : JSON.stringify(value, null, 2)

const args = computed(() => {
  if (run.value?.args !== undefined) return pretty(run.value.args)
  try {
    return pretty(JSON.parse(props.call.function.arguments || '{}'))
  } catch {
    return props.call.function.arguments
  }
})

const label = computed(() => {
  const r = run.value
  switch (status.value) {
    case 'pending': return 'queued'
    case 'awaiting-approval': return 'needs approval'
    case 'running': return 'running…'
    case 'denied': return 'declined'
    case 'cancelled': return 'cancelled'
    case 'failed': return 'not sent'
    default: return `${r?.httpStatus ?? ''}${r?.durationMs !== undefined ? ` · ${r.durationMs} ms` : ''}`
  }
})

const tone = computed(() => {
  const r = run.value
  if (status.value === 'done') return r?.httpStatus && r.httpStatus < 400 ? 'ok' : 'err'
  if (status.value === 'failed') return 'err'
  if (status.value === 'awaiting-approval') return 'warn'
  return 'neutral'
})

const copied = ref(false)
async function copyCurl() {
  const r = run.value
  if (!r?.url) return
  const parts = [`curl -X ${r.method} '${r.url}'`, `-H 'x-auth: $BADHAN_TOKEN'`]
  if (r.body !== undefined) parts.push(`-H 'Content-Type: application/json'`, `-d '${JSON.stringify(r.body).replace(/'/g, "'\\''")}'`)
  await navigator.clipboard.writeText(parts.join(' \\\n  '))
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}
</script>

<template>
  <div class="card" :class="[tone, { awaiting }]">
    <button class="head" @click="open = !open" :aria-expanded="open">
      <Icon name="chevron" :size="14" class="chev" :class="{ open }" />
      <span v-if="method" class="method" :class="method.toLowerCase()">{{ method }}</span>
      <span class="path">{{ run?.path ?? call.function.name }}</span>
      <span class="name muted">{{ call.function.name }}</span>
      <span class="status" :class="tone">
        <span v-if="status === 'running'" class="spinner" />{{ label }}
      </span>
    </button>

    <div v-if="awaiting" class="approval">
      <p>
        This {{ method }} request {{ method === 'GET' ? 'reads from' : 'changes data on' }}
        <strong>{{ run?.server ? SERVERS[run.server].label : 'the server' }}</strong>{{ live ? ' — real donor records' : '' }}.
        Send it?
      </p>
      <div class="row">
        <button class="primary" @click="resolveApproval(call.id, true)">Send request</button>
        <button @click="resolveApproval(call.id, false)">Decline</button>
      </div>
    </div>

    <div v-if="open" class="body">
      <div v-if="run?.url" class="field">
        <div class="row label-row">
          <span class="label">Request</span>
          <button class="ghost small" @click="copyCurl">{{ copied ? 'Copied' : 'Copy as curl' }}</button>
        </div>
        <pre>{{ run.method }} {{ run.url }}</pre>
      </div>
      <div class="field">
        <span class="label">Arguments</span>
        <pre>{{ args }}</pre>
      </div>
      <div v-if="run?.body !== undefined" class="field">
        <span class="label">Request body</span>
        <pre>{{ pretty(run.body) }}</pre>
      </div>
      <div v-if="run?.note" class="field">
        <span class="label">Note</span>
        <pre>{{ run.note }}</pre>
      </div>
      <div v-if="run?.response !== undefined" class="field">
        <span class="label">Response</span>
        <pre class="response">{{ run.response }}</pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  border: 1px solid var(--border);
  border-left: 3px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  margin: 6px 0;
  overflow: hidden;
}
.card.ok { border-left-color: var(--ok); }
.card.err { border-left-color: var(--err); }
.card.warn, .card.awaiting { border-left-color: var(--warn); }
.head {
  width: 100%;
  border: 0;
  border-radius: 0;
  background: transparent;
  padding: 7px 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: left;
  font-size: 13.5px;
}
.chev { transition: transform 0.15s; flex: none; color: var(--muted); }
.chev.open { transform: rotate(90deg); }
.method {
  font: 600 11px/1 var(--mono);
  padding: 3px 5px;
  border-radius: 4px;
  background: var(--surface-2);
  flex: none;
}
.method.get { color: var(--get); }
.method.post { color: var(--post); }
.method.patch, .method.put { color: var(--patch); }
.method.delete { color: var(--delete); }
.path { font-family: var(--mono); font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.name { font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; flex: 1; }
.status {
  flex: none;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--muted);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.status.ok { background: var(--ok-soft); color: var(--ok); }
.status.err { background: var(--err-soft); color: var(--err); }
.status.warn { background: var(--warn-soft); color: var(--warn); }
.approval {
  background: var(--warn-soft);
  padding: 10px 12px;
  border-top: 1px solid var(--border);
}
.approval p { margin: 0 0 8px; font-size: 14px; }
.body { border-top: 1px solid var(--border); padding: 10px 12px; display: grid; gap: 10px; }
.field { display: grid; gap: 4px; min-width: 0; }
.label { font-size: 12px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
.label-row { justify-content: space-between; }
.ghost.small { font-size: 12px; padding: 2px 8px; }
.response { max-height: 360px; }
.spinner {
  width: 10px;
  height: 10px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 600px) { .name { display: none; } }
</style>
