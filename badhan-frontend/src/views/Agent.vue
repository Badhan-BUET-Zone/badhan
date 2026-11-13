<template>
  <div class="agent-page" data-cy="agentPage">
    <PageTitle></PageTitle>

    <v-card class="agent-card rounded-xl mx-auto mt-2" :class="{ 'agent-card--list-open': listOpen }">
      <!-- The chat list. A column beside the chat on a wide screen; on a narrow one the same element
           slides in over the chat from the left (see the media query in the styles). -->
      <v-sheet tag="aside" class="agent-sidebar" data-cy="agentChatList">
        <!-- flex-grow-0: `block` makes a v-btn flex: 1, which in this column stretches it to fill
             the sidebar's height. -->
        <v-btn block depressed rounded color="primary" class="text-none flex-grow-0 mb-2" data-cy="agentNewChatButton" @click="newChat">
          <v-icon left>mdi-plus</v-icon>New chat
        </v-btn>
        <nav class="agent-chat-list" aria-label="Chats">
          <p v-if="listStatus === 'loading'" class="caption text--secondary pa-2 mb-0">Loading chats…</p>
          <p v-else-if="listStatus === 'error'" class="caption text--secondary pa-2 mb-0">Your chats could not be loaded.</p>
          <p v-else-if="!chats.length" class="caption text--secondary pa-2 mb-0">No chats yet.</p>
          <div
            v-for="item in chats"
            :key="item.key"
            class="agent-chat-item"
            :class="{ 'agent-chat-item--active': item === chat }"
            role="button"
            tabindex="0"
            data-cy="agentChatListItem"
            @click="pickChat(item)"
            @keydown.enter="pickChat(item)"
          >
            <div class="agent-chat-item-text">
              <div class="agent-chat-item-title">
                <span v-if="item.running" class="agent-dot" title="Running"></span>{{ item.title }}
              </div>
              <div class="caption text--secondary">{{ item.draft ? 'Not sent yet' : when(item.updatedAt) }}</div>
            </div>
            <v-btn icon x-small class="agent-chat-item-delete" title="Delete chat" data-cy="agentDeleteChatButton" @click.stop="confirmDelete(item)">
              <v-icon small>mdi-delete-outline</v-icon>
            </v-btn>
          </div>
        </nav>
      </v-sheet>
      <div class="agent-scrim" @click="listOpen = false"></div>

      <section v-if="chat" class="agent-pane">
        <header class="agent-bar">
          <v-btn icon small class="d-md-none" title="Chats" data-cy="agentChatsButton" @click="listOpen = true">
            <v-icon>mdi-menu</v-icon>
          </v-btn>
          <!-- A new chat takes its title from its first message, so there is nothing to rename yet. -->
          <v-text-field
            v-model="chat.title"
            class="agent-title"
            aria-label="Chat title"
            dense
            flat
            solo
            rounded
            hide-details
            :readonly="chat.draft"
            background-color="transparent"
            data-cy="agentChatTitle"
            @input="renameSoon(chat)"
            @blur="restoreEmptyTitle(chat)"
          ></v-text-field>
        </header>

        <div v-if="server.live" class="agent-live body-2">
          <strong>Production</strong> — real donor records. Every request is live, and every change asks you first.
        </div>

        <div ref="scroller" class="agent-scroll" @scroll="onScroll">
          <div class="agent-thread">

            <div v-if="chat.loading" class="text-center py-4">
              <v-progress-circular indeterminate size="24" width="2"></v-progress-circular>
            </div>
            <p v-else-if="!chat.messages.length && !chat.running" class="text--secondary text-center py-4 mb-0" data-cy="agentEmptyHint">
              Ask about donors, donations, call records or reports.
            </p>

            <AgentThread
              :messages="chat.messages"
              :server="server"
              :thinking="chat.thinking"
              :calling="calling"
              @call="callDonor"
              @approve="resolveApproval($event, true)"
              @decline="resolveApproval($event, false)"
              @retry="retry(chat)"
            ></AgentThread>
          </div>
        </div>

        <footer class="agent-composer">
          <div class="d-flex align-end">
            <v-textarea
              ref="input"
              v-model="draft"
              class="agent-input"
              outlined
              rounded
              dense
              auto-grow
              rows="1"
              hide-details
              :placeholder="blocker || `Message the agent on ${server.label}…`"
              data-cy="agentInput"
              @keydown="onKey"
            ></v-textarea>
            <v-btn v-if="chat.running" fab small depressed class="ml-2 mb-1" title="Stop" data-cy="agentStopButton" @click="stop(chat)">
              <v-icon>mdi-stop</v-icon>
            </v-btn>
            <v-btn
              v-else
              fab
              small
              depressed
              color="primary"
              class="ml-2 mb-1"
              title="Send (Enter)"
              :disabled="!!blocker || !draft.trim()"
              data-cy="agentSendButton"
              @click="submit"
            >
              <v-icon>mdi-send</v-icon>
            </v-btn>
          </div>
          <div class="caption text--secondary mt-1 px-1" data-cy="agentComposerNote">
            <template v-if="blocker">{{ blocker }}</template>
            <template v-else>Enter to send, Shift+Enter for a new line</template>
          </div>
        </footer>
      </section>

      <div v-else-if="listStatus !== 'loading'" class="agent-nothing">
        <v-btn rounded depressed color="primary" class="text-none" data-cy="agentStartChatButton" @click="newChat">Start a chat</v-btn>
      </div>
    </v-card>
  </div>
</template>

<script>
/*
  Badhan Agent: a chat in which an OpenAI model works the Badhan API. Every member from Volunteer up.

  The backend holds the organisation's OpenAI key, makes every model call, and stores every chat
  (badhan-backend/src/services/agent/). This page is the part of a turn that has to happen in the
  member's browser: it runs the API calls the model asks for, with the member's own session.

  How a turn runs:
  1. The member's message goes to POST /agent/chats (a new chat) or /agent/chats/{id}/messages.
     The backend makes ONE model call and answers with the new messages: the answer, and one tool
     message per API call the model asked for, each already turned into a request with a label.
  2. For each pending call, in order: a GET runs straight away; every other method waits for the
     member to press Approve or Decline. The request goes from this page with the member's
     x-auth, so it is made as them and within their permissions — and nothing new is signed in.
     Its outcome is reported straight away with PUT /agent/chats/{id}/toolCalls/{toolCallId}.
  3. With nothing left pending, the page calls /agent/chats/{id}/continue for the next step.
  4. The loop ends on an answer with no calls, or after MAX_MODEL_CALLS model calls in a turn.
     The backend refuses the next one anyway; the page simply stops first.
  Stop sends nothing further. Calls never reported are closed out by the backend the next time the
  chat moves on.

  Answers do not stream: App Engine sends each response whole, so the "thinking" dots show until
  the step returns. The transcript is drawn by src/components/Agent/AgentThread.vue.

  Notices — "Stopped.", errors, the limit — belong to this page only. The backend never stores them.

  A Call button in an answer is not a step of the turn. It is the member's own action, like the
  donor card's Direct call: the dialler opens, then POST /callrecords logs the call through
  badhanAxios, as the card does, and the model is never told.

  The step calls and the requests the model asks for go through fetch, not badhanAxios: its
  interceptors toast every error, and a failed step belongs in the chat with Retry, while a 404 the
  model asked for is an answer to hand back, not an app error.
*/
import PageTitle from '@/components/PageTitle'
import AgentThread from '@/components/Agent/AgentThread'
import { agentServer, when } from '@/components/Agent/format'
import { environmentService } from '@/mixins/environment'
import { directCall } from '@/mixins/helpers'
import {
  isGuestEnabled,
  handlePOSTCallRecord,
  handleGETAgentConfig,
  handleGETAgentChats,
  handleGETAgentChat,
  handlePATCHAgentChat,
  handleDELETEAgentChat,
  handlePOSTAgentChat,
  handlePOSTAgentMessage,
  handlePOSTAgentContinue,
  handlePUTAgentToolCall
} from '@/api'

// Model calls for one member message. The backend enforces the same number.
const MAX_MODEL_CALLS = 20

// What a card shows of a response, and so what is reported. The backend clips to the same.
const MAX_DISPLAY_CHARS = 250000

const NOT_SET_UP = 'The agent is not set up on this server yet. Ask a super admin.'

const clip = (text, max, note) =>
  text.length <= max ? text : `${text.slice(0, max)}\n… [${note}: ${text.length - max} more characters]`

const throwIfAborted = (signal) => {
  if (signal.aborted) throw new DOMException('The run was stopped.', 'AbortError')
}

const lastOf = (list) => list[list.length - 1]

// A step the backend refused, drawn in the chat rather than thrown as a failure.
class AgentNotice extends Error {
  constructor (message, level = 'error') {
    super(message)
    this.level = level
  }
}

// Before this page talked to the backend it kept chats in IndexedDB and a member's own OpenAI key
// in localStorage. Both go the first time the page loads: the chats would never be read again, and
// the key must not linger. ldb.reset() deletes the database too, for browsers that never open
// this page again.
function forgetBrowserChats () {
  try {
    localStorage.removeItem('badhan-agent:settings')
  } catch {
    // Storage blocked: there is nothing to remove.
  }
  try {
    indexedDB.deleteDatabase('badhan-agent')
  } catch {
    // IndexedDB unavailable: there is nothing to delete.
  }
}

let localCounter = 0
const localId = (kind) => `${kind}-${++localCounter}`

// A chat as this page holds it. Every key exists from the start, because Vue 2 only sees changes
// to keys an object had when it became reactive.
const chatFromSummary = (summary) => ({
  key: summary._id,
  id: summary._id,
  title: summary.title,
  savedTitle: summary.title,
  createdAt: summary.createdAt,
  updatedAt: summary.updatedAt,
  draft: false,
  messages: [],
  loaded: false,
  loading: false,
  running: false,
  thinking: false,
  // The text of a message the server never saved, which Retry sends again.
  retryContent: null
})

// A new chat exists only on this page until its first message is sent, so the server never holds
// an empty chat.
const newDraft = () => ({
  ...chatFromSummary({ _id: null, title: 'New chat', createdAt: Date.now(), updatedAt: Date.now() }),
  key: localId('draft'),
  draft: true,
  loaded: true
})

// Sends one request the model asked for, with the member's own session, and reads the answer back
// as text for the card: JSON pretty-printed, text as sent, a binary body as a one-line note.
async function sendRequest (request, token, signal) {
  const headers = { Accept: 'application/json' }
  // The Badhan API reads its session token from x-auth, not from an Authorization header.
  if (token) headers['x-auth'] = token
  const hasBody = request.body !== null && request.body !== undefined
  if (hasBody) headers['Content-Type'] = 'application/json'

  const started = performance.now()
  const response = await fetch(request.url, {
    method: request.method,
    headers,
    body: hasBody ? JSON.stringify(request.body) : undefined,
    signal
  })

  const contentType = response.headers.get('content-type') || ''
  let text
  if (/json/i.test(contentType)) {
    const raw = await response.text()
    try {
      text = JSON.stringify(JSON.parse(raw), null, 2)
    } catch {
      text = raw
    }
  } else if (/^text\//i.test(contentType) || contentType === '') {
    text = await response.text()
  } else {
    // The certificate PDF, for one: the model can do nothing with the bytes.
    const blob = await response.blob()
    text = `[binary response: ${contentType}, ${blob.size} bytes — not shown]`
  }

  return { httpStatus: response.status, durationMs: Math.round(performance.now() - started), text }
}

export default {
  name: 'AgentPage',
  components: { PageTitle, AgentThread },
  data () {
    return {
      // From GET /agent/config, of which this page uses only whether the agent is set up. The
      // model name and tool count are not shown, and the system prompt it also sends a super admin
      // is shown on the Agent Chats page.
      config: { status: 'loading', configured: false },
      listStatus: 'loading',
      chats: [],
      chat: null,
      listOpen: false,
      draft: '',
      // Donor id → true while a Call button's call record is being written.
      calling: {}
    }
  },
  computed: {
    // The backend the rest of the app talks to, which is also where the model's requests go.
    server () {
      return agentServer()
    },
    blocker () {
      if (this.config.status === 'guest') return 'Badhan Agent is not available in the demo.'
      if (this.config.status === 'loading') return 'Loading…'
      if (this.config.status === 'error') return 'Badhan Agent could not be reached. Reload the page to try again.'
      if (!this.config.configured) return NOT_SET_UP
      if (this.chat && this.chat.loading) return 'Loading the chat…'
      return ''
    },
    // What the thread scrolls along with: a new message, a card changing state, the dots.
    scrollSignature () {
      const chat = this.chat
      if (!chat) return ''
      const statuses = chat.messages.filter((m) => m.role === 'tool').map((m) => (m.run ? m.run.status : '')).join(',')
      return [chat.messages.length, statuses, chat.thinking].join('|')
    }
  },
  watch: {
    chat () {
      this.$_pinned = true
      this.toBottom(true)
      this.focusInput()
    },
    scrollSignature () {
      this.toBottom(false)
    }
  },
  created () {
    // Not reactive on purpose: none of these is ever drawn.
    this.$_controllers = new Map() // chat → AbortController of its running turn
    this.$_approvals = new Map() // tool call id → resolve(approved)
    this.$_renames = new Map() // chat → { timer, run }
    this.$_pinned = true

    forgetBrowserChats()

    // The agent has no guest mirror: a demo session has no real records to work on.
    if (isGuestEnabled()) {
      this.config.status = 'guest'
      this.listStatus = 'ready'
      return
    }
    this.loadConfig()
    this.loadChats()
  },
  beforeDestroy () {
    // Leaving the page stops whatever is running and sends any rename still waiting.
    for (const controller of this.$_controllers.values()) controller.abort()
    for (const pending of this.$_renames.values()) {
      clearTimeout(pending.timer)
      pending.run()
    }
  },
  methods: {
    when,

    // --- Loading -------------------------------------------------------------------------------

    // A 403 means the member is no longer a member (a demotion leaves a working token behind).
    // As for the member chat, the honest answer is to sign them out, so the app learns who they
    // are now. Returns true when it did.
    async signedOutIfForbidden (status) {
      if (status !== 403) return false
      await this.$store.dispatch('logout')
      if (this.$router.currentRoute.path !== '/') this.$router.push('/').catch(() => undefined)
      return true
    },
    async loadConfig () {
      const response = await handleGETAgentConfig()
      if (response && await this.signedOutIfForbidden(response.status)) return
      if (!response || response.status !== 200) {
        this.config.status = 'error'
        return
      }
      const data = response.data
      this.config = {
        status: 'ready',
        configured: !!data.configured
      }
    },
    async loadChats () {
      const response = await handleGETAgentChats()
      if (response && await this.signedOutIfForbidden(response.status)) return
      if (!response || response.status !== 200) {
        this.listStatus = 'error'
        return
      }
      // A New chat made while the list was loading stays at the top.
      this.chats = [...this.chats.filter((chat) => chat.draft), ...response.data.chats.map(chatFromSummary)]
      this.listStatus = 'ready'
      // The newest chat opens by itself. With none, the page waits for New chat: it never makes
      // one on its own.
      if (this.chats.length && !this.chat) this.pickChat(this.chats[0])
    },
    async loadMessages (chat) {
      chat.loading = true
      try {
        const response = await handleGETAgentChat(chat.id)
        if (response && await this.signedOutIfForbidden(response.status)) return false
        if (response && response.status === 404) {
          // Deleted on another device since the list was loaded.
          this.removeChat(chat)
          return false
        }
        if (!response || response.status !== 200) return false
        chat.messages = response.data.messages
        chat.loaded = true
        return true
      } finally {
        chat.loading = false
      }
    },

    // --- The chat list -------------------------------------------------------------------------

    newChat () {
      // One unsent chat at a time: New chat again just goes back to it.
      const existing = this.chats.find((item) => item.draft)
      if (existing) {
        this.pickChat(existing)
        return
      }
      const chat = newDraft()
      this.chats.unshift(chat)
      this.pickChat(chat)
    },
    pickChat (chat) {
      this.chat = chat
      this.listOpen = false
      if (!chat.loaded && !chat.loading) this.loadMessages(chat)
    },
    // To the top of the list: the conversation just moved.
    touch (chat, updatedAt) {
      chat.updatedAt = updatedAt || Date.now()
      const index = this.chats.indexOf(chat)
      if (index > 0) {
        this.chats.splice(index, 1)
        this.chats.unshift(chat)
      }
    },
    removeChat (chat) {
      const index = this.chats.indexOf(chat)
      if (index < 0) return
      this.chats.splice(index, 1)
      if (this.chat === chat) {
        const next = this.chats[Math.min(index, this.chats.length - 1)]
        this.chat = null
        if (next) this.pickChat(next)
      }
    },
    confirmDelete (chat) {
      this.$store.commit('confirmationBox/setConfirmationMessage', {
        confirmationMessage: `Delete "${chat.title}"? This cannot be undone.`,
        confirmationAction: () => this.deleteChat(chat)
      })
    },
    async deleteChat (chat) {
      this.stop(chat)
      if (!chat.draft) {
        const response = await handleDELETEAgentChat(chat.id)
        if (response && await this.signedOutIfForbidden(response.status)) return
        // 404: already gone, from another device. Either way it leaves the list.
        if (!response || (response.status !== 200 && response.status !== 404)) return
      }
      this.removeChat(chat)
    },
    // Renaming is sent once the member stops typing for a moment.
    renameSoon (chat) {
      if (chat.draft) return
      const pending = this.$_renames.get(chat)
      if (pending) clearTimeout(pending.timer)
      const run = () => {
        this.$_renames.delete(chat)
        this.rename(chat)
      }
      this.$_renames.set(chat, { timer: setTimeout(run, 600), run })
    },
    async rename (chat) {
      const title = chat.title.trim()
      if (!title || title.length > 100 || title === chat.savedTitle) return
      const response = await handlePATCHAgentChat(chat.id, { title })
      if (response && await this.signedOutIfForbidden(response.status)) return
      if (response && response.status === 200) chat.savedTitle = response.data.chat.title
    },
    restoreEmptyTitle (chat) {
      if (!chat.title.trim()) chat.title = chat.savedTitle
    },

    // --- A turn --------------------------------------------------------------------------------

    notice (chat, content, level) {
      chat.messages.push({ id: localId('notice'), role: 'notice', content, level })
    },
    resolveApproval (toolCallId, approved) {
      const resolve = this.$_approvals.get(toolCallId)
      this.$_approvals.delete(toolCallId)
      if (resolve) resolve(approved)
    },
    // A Call button. The dialler opens first, while this is still the click: a browser may block
    // a window opened after an await. Then the call is logged, exactly as the donor card logs it,
    // so whoever looks the donor up next sees it. badhanAxios shows any refusal itself.
    async callDonor ({ donorId, phone }) {
      if (this.calling[donorId]) return
      directCall(phone)
      this.$set(this.calling, donorId, true)
      try {
        const response = await handlePOSTCallRecord({ donorId })
        if (response && response.status === 201) {
          await this.$store.dispatch('notification/notifySuccess', 'Added call record')
        }
      } finally {
        this.$delete(this.calling, donorId)
      }
    },
    stop (chat) {
      const controller = this.$_controllers.get(chat)
      if (controller) controller.abort()
    },
    // The first step of a turn that carries the member's message.
    messageStep (chat, content) {
      return (signal) => (chat.draft
        ? handlePOSTAgentChat({ content }, signal)
        : handlePOSTAgentMessage(chat.id, { content }, signal))
    },
    send (chat, text) {
      const content = text.trim()
      if (!content || chat.running) return
      // A message the server never saved, from an earlier failure, is replaced by this one.
      chat.messages = chat.messages.filter((message) => !message.local)
      // Shown straight away; replaced by the server's copy once it is saved.
      chat.messages.push({ id: localId('local'), role: 'user', content, local: true })
      chat.retryContent = content
      this.runTurn(chat, this.messageStep(chat, content))
    },
    // After a failed step: send the message again if the server never saved it, otherwise let the
    // assistant carry on from where the chat stands.
    retry (chat) {
      while (chat.messages.length && lastOf(chat.messages).role === 'notice') chat.messages.pop()
      if (chat.retryContent !== null) this.runTurn(chat, this.messageStep(chat, chat.retryContent))
      else this.runTurn(chat, (signal) => handlePOSTAgentContinue(chat.id, signal))
    },
    async runTurn (chat, firstStep) {
      if (chat.running) return
      const controller = new AbortController()
      this.$_controllers.set(chat, controller)
      chat.running = true
      let modelCalls = 0

      try {
        let step = firstStep
        for (;;) {
          chat.thinking = true
          let result
          try {
            result = await step(controller.signal)
          } finally {
            chat.thinking = false
          }
          const { pending, asked, finishReason } = await this.applyStep(chat, result)
          modelCalls += 1

          if (!asked) {
            if (finishReason === 'length') this.notice(chat, 'The answer was cut off at the model\'s output limit.', 'info')
            break
          }
          // In order, one at a time: a turn often reads, then writes on what it read.
          for (const toolMessage of pending) {
            throwIfAborted(controller.signal)
            await this.runTool(chat, toolMessage, controller.signal)
          }
          throwIfAborted(controller.signal)

          if (modelCalls >= MAX_MODEL_CALLS) {
            this.notice(chat, `Stopped after ${MAX_MODEL_CALLS} model calls for one message. Send a message to carry on.`, 'info')
            break
          }
          step = (signal) => handlePOSTAgentContinue(chat.id, signal)
        }
      } catch (error) {
        if (controller.signal.aborted) this.notice(chat, 'Stopped.', 'info')
        else if (error instanceof AgentNotice) this.notice(chat, error.message, error.level)
        else this.notice(chat, this.unreachable(error), 'error')
      } finally {
        // Calls this turn never finished. The backend closes them out as cancelled the next time
        // the chat moves on; the cards say so now.
        for (const message of chat.messages) {
          if (message.role !== 'tool' || !message.run) continue
          if (['pending', 'awaiting-approval', 'running'].includes(message.run.status)) {
            this.resolveApproval(message.toolCallId, false)
            message.run.status = 'cancelled'
          }
        }
        this.$_controllers.delete(chat)
        chat.running = false
        chat.thinking = false
      }
    },
    /**
     * One step's answer. On success, its messages join the chat and the calls to run are handed
     * back. Anything else is an AgentNotice — except a 502, whose saved user message still joins
     * the chat first, so Retry can carry on from it.
     */
    async applyStep (chat, { status, data }) {
      if (await this.signedOutIfForbidden(status)) throw new AgentNotice('You were signed out.', 'info')

      if (status === 200 || status === 201 || status === 502) {
        if (data && data.chat) this.adopt(chat, data.chat)
        const messages = (data && data.messages) || []
        if (messages.some((message) => message.role === 'user')) chat.retryContent = null
        await this.absorb(chat, messages)
        if (status === 502) throw new AgentNotice(data.message, 'error')

        const assistant = messages.find((message) => message.role === 'assistant')
        const askedFor = new Set(messages.filter((m) => m.role === 'tool').map((m) => m.toolCallId))
        // Read back from the chat itself: absorb may have reloaded it, and the cards draw these.
        const pending = chat.messages.filter((m) => m.role === 'tool' && askedFor.has(m.toolCallId) && m.run && m.run.status === 'pending')
        return {
          asked: !!(assistant && assistant.toolCalls && assistant.toolCalls.length),
          pending,
          finishReason: data && data.finishReason
        }
      }

      const message = data && data.message
      if (status === 409) {
        // Told apart by reason. The busy message is already the one to show.
        if (data.reason === 'busy') throw new AgentNotice(message, 'error')
        throw new AgentNotice(message, 'info')
      }
      if (status === 404) throw new AgentNotice('This chat no longer exists. It may have been deleted on another device.', 'info')
      if (status === 503) throw new AgentNotice(NOT_SET_UP, 'error')
      if (status === 401) throw new AgentNotice('Your session has ended. Sign in to Badhan again.', 'error')
      throw new AgentNotice(message || `The server answered ${status}.`, 'error')
    },
    // A new chat becomes a real one once the server has created it.
    adopt (chat, summary) {
      if (chat.draft) {
        chat.draft = false
        chat.id = summary._id
        chat.title = summary.title
        chat.savedTitle = summary.title
        chat.createdAt = summary.createdAt
      }
      this.touch(chat, summary.updatedAt)
    },
    /**
     * Add a step's messages to the chat. They are numbered, so a gap — a step this page stopped
     * waiting for, or one run from another tab — shows, and the chat is read again whole instead.
     */
    async absorb (chat, messages) {
      chat.messages = chat.messages.filter((message) => !message.local)
      if (!messages.length) return
      const stored = chat.messages.filter((message) => typeof message.seq === 'number')
      const expected = stored.length ? Math.max(...stored.map((message) => message.seq)) + 1 : 0
      if (messages[0].seq === expected) {
        chat.messages.push(...messages)
        return
      }
      const notices = chat.messages.filter((message) => message.role === 'notice')
      if (!(await this.loadMessages(chat))) chat.messages.push(...messages)
      else chat.messages.push(...notices)
    },
    async runTool (chat, toolMessage, signal) {
      const run = toolMessage.run

      // One rule, everywhere: a GET runs on its own, anything else waits for the member.
      if (run.method !== 'GET') {
        run.status = 'awaiting-approval'
        const approved = await new Promise((resolve) => {
          this.$_approvals.set(toolMessage.toolCallId, resolve)
          signal.addEventListener('abort', () => resolve(false), { once: true })
        })
        this.$_approvals.delete(toolMessage.toolCallId)
        throwIfAborted(signal)
        if (!approved) {
          await this.report(chat, toolMessage, { status: 'denied' })
          return
        }
      }

      run.status = 'running'
      let response
      try {
        // The member's own session: the same token the rest of the app sends.
        response = await sendRequest({ method: run.method, url: `${this.server.baseUrl}${run.path}`, body: run.body }, this.$store.getters.getToken, signal)
      } catch (error) {
        if (signal.aborted) throw error
        await this.report(chat, toolMessage, { status: 'failed', note: `The request did not complete: ${this.unreachable(error)}` })
        return
      }
      await this.report(chat, toolMessage, {
        status: 'done',
        httpStatus: response.httpStatus,
        durationMs: response.durationMs,
        response: clip(response.text, MAX_DISPLAY_CHARS, 'not shown')
      })
    },
    // Tell the backend what happened to one call, and draw the stored result in its card.
    async report (chat, toolMessage, payload) {
      const { status, data } = await handlePUTAgentToolCall(chat.id, toolMessage.toolCallId, payload)
      if (await this.signedOutIfForbidden(status)) throw new AgentNotice('You were signed out.', 'info')
      if (status !== 200) {
        throw new AgentNotice(`The result could not be saved: ${(data && data.message) || `the server answered ${status}`}`, 'error')
      }
      const index = chat.messages.findIndex((message) => message.role === 'tool' && message.toolCallId === toolMessage.toolCallId)
      if (index >= 0) chat.messages.splice(index, 1, data.toolMessage)
    },
    unreachable (error) {
      const message = error instanceof Error ? error.message : String(error)
      return /failed to fetch|networkerror|load failed/i.test(message)
        ? `${this.server.baseUrl} is unreachable${environmentService.isEnvironmentLocal() ? ' — is the backend container up?' : ''}`
        : message
    },

    // --- Composer and scrolling ----------------------------------------------------------------

    submit () {
      if (!this.chat || this.chat.running || this.blocker || !this.draft.trim()) return
      const text = this.draft
      this.draft = ''
      this.send(this.chat, text)
    },
    onKey (event) {
      if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
        event.preventDefault()
        this.submit()
      }
    },
    // Not on a phone unless asked: focusing the box there throws the keyboard up over the chat.
    focusInput (always = false) {
      if (!always && !this.$vuetify.breakpoint.mdAndUp) return
      this.$nextTick(() => {
        const input = this.$refs.input
        if (input && input.focus) input.focus()
      })
    },
    onScroll () {
      const el = this.$refs.scroller
      if (el) this.$_pinned = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    },
    // Follow the turn while the reader is at the bottom; leave them be once they scroll up to read.
    toBottom (force) {
      this.$nextTick(() => {
        const el = this.$refs.scroller
        if (el && (this.$_pinned || force)) el.scrollTop = el.scrollHeight
      })
    }
  }
}
</script>

<style scoped>
/* Colours are translucent greys rather than fixed ones, so the page reads the same in day and
   night mode without a second set. */
.agent-page {
  --agent-line: rgba(128, 128, 128, 0.28);
  --agent-fill: rgba(128, 128, 128, 0.12);
  --agent-mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
}

/* Fills the screen below the title bar, so the thread scrolls and the box to type in stays put. */
.agent-card {
  position: relative;
  display: flex;
  max-width: 1200px;
  height: calc(100vh - 152px);
  min-height: 440px;
  overflow: hidden;
}

.agent-sidebar {
  flex: 0 0 260px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 12px 8px 8px;
  border-right: 1px solid var(--agent-line);
}
.agent-chat-list { flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; }
.agent-chat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 4px 6px 10px;
  border-radius: 10px;
  cursor: pointer;
}
.agent-chat-item:hover, .agent-chat-item--active { background: var(--agent-fill); }
.agent-chat-item-text { flex: 1; min-width: 0; }
.agent-chat-item-title { font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.agent-chat-item-delete { opacity: 0; }
.agent-chat-item:hover .agent-chat-item-delete,
.agent-chat-item--active .agent-chat-item-delete,
.agent-chat-item-delete:focus { opacity: 1; }
@media (hover: none) { .agent-chat-item-delete { opacity: 1; } }
.agent-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin: 0 6px 1px 0;
  vertical-align: middle;
  border-radius: 50%;
  background: #43a047;
  animation: agent-pulse 1.2s infinite;
}
@keyframes agent-pulse { 50% { opacity: 0.3; } }
.agent-scrim { display: none; }

.agent-pane { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.agent-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  border-bottom: 1px solid var(--agent-line);
}
.agent-title { flex: 1; min-width: 80px; }
.agent-title ::v-deep input { font-weight: 600; }
.agent-live {
  padding: 6px 16px;
  color: #c62828;
  background: rgba(229, 57, 53, 0.1);
  border-bottom: 1px solid rgba(229, 57, 53, 0.25);
}

.agent-scroll { flex: 1; min-height: 0; overflow-y: auto; }
.agent-thread { max-width: 860px; margin: 0 auto; padding: 16px 16px 24px; }
.agent-composer { padding: 8px 12px 10px; border-top: 1px solid var(--agent-line); }
.agent-input ::v-deep textarea { max-height: 200px; overflow-y: auto !important; line-height: 1.45; }
.agent-nothing { flex: 1; display: flex; align-items: center; justify-content: center; }

/* Narrow screens: the chat list becomes a drawer over the chat, opened from the menu button. */
@media (max-width: 959px) {
  .agent-card { height: calc(100vh - 144px); }
  .agent-sidebar {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 3;
    width: min(300px, 85%);
    border-right: 0;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
    transform: translateX(-110%);
    transition: transform 0.2s;
  }
  .agent-card--list-open .agent-sidebar { transform: none; }
  .agent-card--list-open .agent-scrim {
    display: block;
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 2;
    background: rgba(0, 0, 0, 0.3);
  }
  .agent-thread { padding: 12px 12px 20px; }
}
</style>
