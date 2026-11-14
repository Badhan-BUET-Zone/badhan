<template>
  <!-- A Badhan Agent transcript: user bubbles, plain-text answers, a card for every API call, and
       the notices. Drawn the same wherever a transcript is shown. -->
  <div class="agent-transcript">
    <template v-for="item in items">
      <div v-if="item.kind === 'user'" :key="item.key" class="agent-msg agent-msg--user">
        <div class="agent-bubble" data-cy="agentUserMessage">{{ item.message.content }}</div>
      </div>

      <div
        v-else-if="item.kind === 'answer'"
        :key="item.key"
        class="agent-msg"
        :class="{ 'agent-msg--lead': item.lead }"
        data-cy="agentAssistantMessage"
      >
        <!-- Plain text through {{ }}, never v-html: an answer can quote donor records, which are
             free text that anyone filling in a public form controls. A call marker in it becomes
             a Call button (see calls.js): with the donor's number when a response in this chat
             gave it, otherwise a link to the donor's profile, which has its own Direct call.
             The tags sit on separate lines on purpose: the build drops the whitespace between
             them, so none of it reaches the answer, which keeps its own line breaks. -->
        <div v-if="item.message.content" class="agent-answer">
          <template v-for="(part, index) in partsOf(item.message)">
            <span v-if="part.type === 'text'" :key="index">{{ part.text }}</span>
            <v-btn
              v-else-if="part.donor"
              :key="index"
              x-small
              rounded
              depressed
              color="secondary"
              class="agent-call text-none"
              :disabled="readOnly || !!calling[part.donorId]"
              :title="`+${part.donor.phone}`"
              data-cy="agentCallButton"
              @click="$emit('call', { donorId: part.donorId, phone: part.donor.phone })"
            ><v-icon x-small left>mdi-phone</v-icon>{{ part.donor.name ? `Call ${part.donor.name}` : 'Call' }}</v-btn>
            <v-btn
              v-else
              :key="index"
              x-small
              rounded
              outlined
              class="agent-call text-none"
              :disabled="readOnly"
              :to="{ path: '/home/details', query: { id: part.donorId } }"
              data-cy="agentProfileButton"
            ><v-icon x-small left>mdi-account-details</v-icon>See profile</v-btn>
          </template>
        </div>

        <!-- The model and what this answer cost in tokens. The review page only: members using the
             agent are not shown it. -->
        <div v-if="item.usage" class="caption text--secondary mt-1" data-cy="agentUsage">{{ usageLabel(item.message) }}</div>
      </div>

      <!-- A run of calls with no answer text between them, even across steps. Unless groupCalls is
           off, two or more are one group: folded, it shows only its latest call, or the one waiting
           for approval, so the Approve and Decline buttons are never folded away. -->
      <div
        v-else-if="item.kind === 'calls'"
        :key="item.key"
        class="agent-calls"
        :class="{ 'agent-group': isGroup(item) }"
        :data-cy="isGroup(item) ? 'agentToolGroup' : null"
      >
        <div
          v-if="isGroup(item)"
          class="agent-group-head"
          role="button"
          tabindex="0"
          :aria-expanded="String(!!openGroups[item.key])"
          data-cy="agentToolGroupHead"
          @click="toggleGroup(item)"
          @keydown.enter.prevent="toggleGroup(item)"
        >
          <v-icon small class="agent-chevron" :class="{ 'agent-chevron--open': openGroups[item.key] }">mdi-chevron-right</v-icon>
          <span class="agent-group-count">{{ item.entries.length }} actions</span>
          <span v-if="!openGroups[item.key] && hiddenFailures(item)" class="agent-group-failed" data-cy="agentToolGroupFailed">· {{ hiddenFailures(item) }} failed</span>
        </div>

        <template v-for="{ call, usage } in shownEntries(item)">
          <div
            :key="call.id"
            class="agent-tool"
            :class="`agent-tool--${toolTone(call)}`"
            data-cy="agentToolCard"
          >
            <!-- The heading is the route's own description, never its URL. The URL, the arguments and
                 the response are one click away. -->
            <div
              class="agent-tool-head"
              role="button"
              tabindex="0"
              :aria-expanded="String(!!openCards[call.id])"
              data-cy="agentToolCardHead"
              @click="toggleCard(call)"
              @keydown.enter.prevent="toggleCard(call)"
            >
              <v-icon small class="agent-chevron" :class="{ 'agent-chevron--open': openCards[call.id] }">mdi-chevron-right</v-icon>
              <span class="agent-tool-label" data-cy="agentToolLabel">{{ labelOf(call) }}</span>
              <v-chip x-small outlined :color="toneColor(call)" class="flex-shrink-0" data-cy="agentToolStatus">
                <v-progress-circular v-if="runOf(call).status === 'running'" indeterminate size="9" width="2" class="mr-1"></v-progress-circular>
                {{ statusLabel(call) }}
              </v-chip>
            </div>

            <!-- Waiting for the member. The card stays collapsed like any other; opening it shows
                 exactly what would be sent. -->
            <div v-if="!readOnly && runOf(call).status === 'awaiting-approval'" class="agent-approval" data-cy="agentApproval">
              <v-btn small depressed color="primary" class="text-none mr-2" data-cy="agentApproveButton" @click="$emit('approve', call.id)">Approve</v-btn>
              <v-btn small outlined class="text-none" data-cy="agentDeclineButton" @click="$emit('decline', call.id)">Decline</v-btn>
            </div>

            <div v-if="openCards[call.id]" class="agent-tool-body" data-cy="agentToolBody">
              <div v-if="runOf(call).method && runOf(call).path" class="agent-field">
                <div class="d-flex align-center justify-space-between">
                  <span class="agent-label">Request</span>
                  <v-btn x-small text class="text-none" @click="copyCurl(call)">{{ copiedCall === call.id ? 'Copied' : 'Copy as curl' }}</v-btn>
                </div>
                <pre class="agent-pre" data-cy="agentToolRequest">{{ runOf(call).method }} {{ urlOf(call) }}</pre>
              </div>
              <div class="agent-field">
                <span class="agent-label">Arguments</span>
                <pre class="agent-pre">{{ argsText(call) }}</pre>
              </div>
              <div v-if="runOf(call).body !== null && runOf(call).body !== undefined" class="agent-field">
                <span class="agent-label">Request body</span>
                <pre class="agent-pre">{{ pretty(runOf(call).body) }}</pre>
              </div>
              <div v-if="runOf(call).status === 'done'" class="agent-field">
                <span class="agent-label">Status</span>
                <pre class="agent-pre">{{ resultLine(call) }}</pre>
              </div>
              <div v-if="runOf(call).note" class="agent-field">
                <span class="agent-label">Note</span>
                <pre class="agent-pre">{{ runOf(call).note }}</pre>
              </div>
              <div v-if="runOf(call).response !== null && runOf(call).response !== undefined" class="agent-field">
                <span class="agent-label">Response</span>
                <pre class="agent-pre agent-pre--tall" data-cy="agentToolResponse">{{ runOf(call).response }}</pre>
              </div>
            </div>
          </div>
          <!-- After the last call of a step, what that step cost: the review page only. -->
          <div v-if="usage" :key="`${call.id}-usage`" class="caption text--secondary mt-1" data-cy="agentUsage">{{ usageLabel(usage) }}</div>
        </template>
      </div>

      <v-alert
        v-else-if="item.kind === 'notice'"
        :key="item.key"
        dense
        text
        :type="item.message.level === 'error' ? 'error' : 'info'"
        class="body-2 mb-4"
        data-cy="agentNotice"
      >
        <div class="d-flex align-center flex-wrap">
          <span class="flex-grow-1">{{ item.message.content }}</span>
          <v-btn v-if="!readOnly && lastIsError && item.message === lastMessage" small text class="text-none" data-cy="agentRetryButton" @click="$emit('retry')">Retry</v-btn>
        </div>
      </v-alert>
    </template>

    <!-- A step is running on the server: the answer arrives whole when it is ready. -->
    <div v-if="thinking" class="agent-thinking" data-cy="agentThinking"><span></span><span></span><span></span></div>
  </div>
</template>

<script>
/*
  One Badhan Agent transcript, drawn from a chat's messages. It only draws: it never sends a request
  or changes a message. What a member decides — Approve, Decline, Retry — is emitted for the
  page to act on.

  Props:
  - messages: the chat's messages in order, as the server stores them, plus the page's notices.
    A tool message is not drawn on its own: its result appears in the card of the call it answers.
  - server: { baseUrl } — where the requests go, for the full URL on an opened card.
  - readOnly: no approval buttons and no Retry, for a transcript that is only read.
  - thinking: a step is running, so the "thinking" dots show at the end.
  - showUsage: under each answer, the model and its token counts. For the Agent Chats review page.
  - groupCalls: fold a run of calls into one group (below). The review page turns it off, so a
    super admin sees every card at once; each card still starts collapsed.
  - calling: donor id → true while the page records a call to that donor, which disables its
    Call buttons so one press makes one record.

  Events: approve(toolCallId), decline(toolCallId), retry, call({ donorId, phone }). A call is
  emitted inside the click itself, so the page can open the dialler before anything waits.

  A message is one of:
    { _id, role: 'user', content }
    { _id, role: 'assistant', content, toolCalls, openaiModel, usage }
    { _id, role: 'tool', toolCallId, content, run }
    { id, role: 'notice', content, level }   — the page's own, never stored
  A tool message's run: { status, label, method, path, args, body, httpStatus, durationMs, response,
  note }. The server's statuses are pending, done, failed, denied and cancelled; while the page works
  on a call it also shows awaiting-approval and running.

  Calls with no answer text between them are drawn together, even when they come from several
  steps: a step that only calls tools continues the run, while answer text, a user message or a
  notice ends it. A run of two or more is a group, folded until the member opens it. Folded, it
  shows one card: the call awaiting approval or running, otherwise the latest one that has started.
*/
import { pretty, tokens } from './format'
import { donorsIn, splitAnswer } from './calls'

const TONE_COLORS = { ok: 'green', err: 'red', warn: 'orange darken-2' }

// What a card shows for a call that has no result message.
const NO_RUN = Object.freeze({
  status: 'pending',
  label: '',
  method: null,
  path: null,
  args: null,
  body: null,
  httpStatus: null,
  durationMs: null,
  response: null,
  note: null
})

export default {
  name: 'AgentThread',
  props: {
    messages: { type: Array, required: true },
    server: { type: Object, default: null },
    readOnly: { type: Boolean, default: false },
    thinking: { type: Boolean, default: false },
    showUsage: { type: Boolean, default: false },
    groupCalls: { type: Boolean, default: true },
    calling: { type: Object, default: () => ({}) }
  },
  data () {
    return {
      // tool call id → true when its card is expanded. Every card starts collapsed.
      openCards: {},
      // group key → true when the group shows all its calls. Every group starts folded.
      openGroups: {},
      copiedCall: null
    }
  },
  computed: {
    // Tool results are drawn inside the card of the call they answer, not as messages of their own.
    results () {
      const map = new Map()
      for (const message of this.messages) if (message.role === 'tool') map.set(message.toolCallId, message)
      return map
    },
    /**
     * What to draw, in order:
     *   { kind: 'user' | 'notice', key, message }
     *   { kind: 'answer', key, message, usage, lead } — an assistant message's text; lead when its
     *     own calls follow straight after
     *   { kind: 'calls', key, entries: [{ call, usage }] } — a run of calls; usage is the assistant
     *     message whose cost to show after that call (its last one), or null
     * Tool messages are not items, and no other role is drawn or ends a run.
     */
    items () {
      const items = []
      let run = null
      for (const message of this.messages) {
        if (message.role === 'user' || message.role === 'notice') {
          run = null
          items.push({ kind: message.role, key: this.keyOf(message), message })
          continue
        }
        if (message.role !== 'assistant') continue

        const calls = message.toolCalls || []
        const usage = this.showUsage && message.openaiModel ? message : null
        if (message.content || !calls.length) {
          run = null
          items.push({ kind: 'answer', key: this.keyOf(message), message, usage: calls.length ? null : usage, lead: calls.length > 0 })
        }
        if (!calls.length) continue
        if (!run) {
          // Keyed by its first call, so the group keeps its key, and its open state, as it grows.
          run = { kind: 'calls', key: `calls-${calls[0].id}`, entries: [] }
          items.push(run)
        }
        calls.forEach((call, index) => run.entries.push({ call, usage: index === calls.length - 1 ? usage : null }))
      }
      return items
    },
    // Donor id → { name, phone }, from the chat's own API responses, for the Call buttons.
    donors () {
      return donorsIn(this.messages)
    },
    lastMessage () {
      return this.messages.length ? this.messages[this.messages.length - 1] : null
    },
    lastIsError () {
      const last = this.lastMessage
      return !!last && last.role === 'notice' && last.level === 'error'
    }
  },
  methods: {
    pretty,

    keyOf (message) {
      return message._id || message.id
    },
    // An answer as text pieces and call buttons, each button with its donor when one is known.
    partsOf (message) {
      return splitAnswer(message.content).map((part) =>
        part.type === 'call' ? { ...part, donor: this.donors.get(part.donorId) || null } : part)
    },
    usageLabel (message) {
      const usage = message.usage
      if (!usage) return message.openaiModel
      const cached = usage.prompt_tokens_details && usage.prompt_tokens_details.cached_tokens
      return `${message.openaiModel} · ${tokens(usage.prompt_tokens)} in${cached ? ` (${tokens(cached)} cached)` : ''} · ${tokens(usage.completion_tokens)} out`
    },
    runOf (call) {
      const result = this.results.get(call.id)
      return (result && result.run) || NO_RUN
    },
    labelOf (call) {
      return this.runOf(call).label || (call.function && call.function.name) || 'An API request'
    },
    urlOf (call) {
      const base = this.server && this.server.baseUrl ? this.server.baseUrl.replace(/\/+$/, '') : ''
      return `${base}${this.runOf(call).path}`
    },
    toggleCard (call) {
      this.$set(this.openCards, call.id, !this.openCards[call.id])
    },
    isGroup (item) {
      return this.groupCalls && item.entries.length > 1
    },
    toggleGroup (item) {
      this.$set(this.openGroups, item.key, !this.openGroups[item.key])
    },
    // The one call a folded group shows: the call the member or the page is busy with, otherwise
    // the latest one that has started. Calls still queued behind it have not happened yet.
    featured (item) {
      const statusOf = (entry) => this.runOf(entry.call).status
      const active = item.entries.find((entry) => ['awaiting-approval', 'running'].includes(statusOf(entry)))
      if (active) return active
      for (let i = item.entries.length - 1; i >= 0; i--) if (statusOf(item.entries[i]) !== 'pending') return item.entries[i]
      return item.entries[item.entries.length - 1]
    },
    shownEntries (item) {
      return !this.isGroup(item) || this.openGroups[item.key] ? item.entries : [this.featured(item)]
    },
    // How many calls a folded group hides that went wrong, so a failure is not folded out of sight.
    hiddenFailures (item) {
      const shown = this.featured(item)
      return item.entries.filter((entry) => entry !== shown && this.toolTone(entry.call) === 'err').length
    },
    toolTone (call) {
      const run = this.runOf(call)
      if (run.status === 'done') return run.httpStatus && run.httpStatus < 400 ? 'ok' : 'err'
      if (run.status === 'failed') return 'err'
      if (run.status === 'awaiting-approval') return 'warn'
      return 'neutral'
    },
    toneColor (call) {
      return TONE_COLORS[this.toolTone(call)]
    },
    resultLine (call) {
      const run = this.runOf(call)
      return `${run.httpStatus || ''}${run.durationMs !== null && run.durationMs !== undefined ? ` · ${run.durationMs} ms` : ''}`
    },
    statusLabel (call) {
      const run = this.runOf(call)
      switch (run.status) {
        case 'pending': return 'queued'
        case 'awaiting-approval': return 'needs approval'
        case 'running': return 'running…'
        case 'denied': return 'declined'
        case 'cancelled': return 'cancelled'
        case 'failed': return 'not sent'
        default: return this.resultLine(call)
      }
    },
    argsText (call) {
      const run = this.runOf(call)
      if (run.args !== null && run.args !== undefined) return pretty(run.args)
      try {
        return pretty(JSON.parse((call.function && call.function.arguments) || '{}'))
      } catch {
        return call.function.arguments
      }
    },
    async copyCurl (call) {
      const run = this.runOf(call)
      if (!run.method || !run.path) return
      const parts = [`curl -X ${run.method} '${this.urlOf(call)}'`, '-H \'x-auth: $BADHAN_TOKEN\'']
      if (run.body !== null && run.body !== undefined) {
        parts.push('-H \'Content-Type: application/json\'', `-d '${JSON.stringify(run.body).replace(/'/g, "'\\''")}'`)
      }
      try {
        await this.$copyText(parts.join(' \\\n  '))
        this.copiedCall = call.id
        setTimeout(() => { if (this.copiedCall === call.id) this.copiedCall = null }, 1500)
      } catch {
        await this.$store.dispatch('notification/notifyError', 'Could not copy to clipboard')
      }
    }
  }
}
</script>

<style scoped>
/* Colours are translucent greys rather than fixed ones, so a transcript reads the same in day and
   night mode without a second set. Defined here as well as on the agent page, so the component
   looks the same wherever it is placed. */
.agent-transcript {
  --agent-line: rgba(128, 128, 128, 0.28);
  --agent-fill: rgba(128, 128, 128, 0.12);
  --agent-mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
}

.agent-msg { margin: 0 0 16px; line-height: 1.6; }
.agent-msg--user { display: flex; justify-content: flex-end; }
.agent-msg--lead { margin-bottom: 0; }
.agent-bubble {
  background: var(--agent-fill);
  border-radius: 16px 16px 4px 16px;
  padding: 8px 14px;
  max-width: min(640px, 85%);
  white-space: pre-wrap;
  word-break: break-word;
}
.agent-answer { white-space: pre-wrap; word-break: break-word; }
.agent-call { margin: 0 2px; white-space: nowrap; vertical-align: baseline; }

.agent-thinking { display: flex; gap: 4px; padding: 8px 0; }
.agent-thinking span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.25;
  animation: agent-blink 1.2s infinite ease-in-out;
}
.agent-thinking span:nth-child(2) { animation-delay: 0.15s; }
.agent-thinking span:nth-child(3) { animation-delay: 0.3s; }
@keyframes agent-blink { 0%, 80%, 100% { opacity: 0.25; } 40% { opacity: 0.9; } }

.agent-calls { margin: 6px 0 16px; }
.agent-group {
  border: 1px solid var(--agent-line);
  border-radius: 10px;
  padding: 2px 8px 2px;
}
.agent-group-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 -4px;
  padding: 4px;
  border-radius: 6px;
  font-size: 12.5px;
  cursor: pointer;
}
.agent-group-head:hover { background: var(--agent-fill); }
.agent-group-count { font-weight: 500; opacity: 0.75; }
.agent-group-failed { color: #e53935; }

.agent-tool {
  border: 1px solid var(--agent-line);
  border-left-width: 3px;
  border-radius: 8px;
  margin: 6px 0;
  overflow: hidden;
}
.agent-tool--ok { border-left-color: #43a047; }
.agent-tool--err { border-left-color: #e53935; }
.agent-tool--warn { border-left-color: #fb8c00; }
.agent-tool-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  font-size: 13.5px;
  cursor: pointer;
}
.agent-tool-head:hover { background: var(--agent-fill); }
.agent-chevron { flex: none; transition: transform 0.15s; }
.agent-chevron--open { transform: rotate(90deg); }
.agent-tool-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.agent-approval {
  padding: 10px 12px;
  background: rgba(251, 140, 0, 0.12);
  border-top: 1px solid var(--agent-line);
}
.agent-tool-body { display: grid; gap: 10px; padding: 10px 12px; border-top: 1px solid var(--agent-line); }
.agent-field { display: grid; gap: 4px; min-width: 0; }
.agent-label { font-size: 11.5px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; opacity: 0.7; }
.agent-pre {
  margin: 0;
  padding: 8px 10px;
  max-height: 240px;
  overflow: auto;
  border-radius: 8px;
  background: var(--agent-fill);
  color: inherit;
  font-family: var(--agent-mono);
  font-size: 12.5px;
  white-space: pre-wrap;
  word-break: break-word;
}
.agent-pre--tall { max-height: 400px; }
</style>
