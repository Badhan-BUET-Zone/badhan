<template>
  <div class="review-page" data-cy="agentChatsPage">
    <PageTitle></PageTitle>

    <!-- The instructions the assistant reads before anything a member types. Shown here, to super
         admins, and nowhere else: the Badhan Agent page does not show it to anyone. -->
    <div class="review-bar mx-auto mt-2">
      <v-btn small text rounded class="text-none" :disabled="!systemPrompt" data-cy="agentChatsSystemPromptButton" @click="promptOpen = true">
        <v-icon small left>mdi-text-box-outline</v-icon>System prompt
      </v-btn>
    </div>
    <v-dialog v-model="promptOpen" max-width="860" scrollable>
      <v-card data-cy="agentChatsSystemPromptDialog">
        <v-card-title class="subtitle-1">
          System prompt
          <v-spacer></v-spacer>
          <v-btn icon small title="Close" @click="promptOpen = false"><v-icon>mdi-close</v-icon></v-btn>
        </v-card-title>
        <v-card-text>
          <p class="caption text--secondary mb-2">
            Fixed, and the same for every chat and every member. The session note at the end — the server, who is
            signed in and the current time — is filled in afresh on every request, so in a member's chat it names
            them; here it names you, at the time this page opened.
          </p>
          <pre class="review-pre" data-cy="agentChatsSystemPrompt">{{ systemPrompt }}</pre>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-card class="review-card rounded-xl mx-auto mt-1">
      <div v-if="membersStatus === 'loading'" class="review-center">
        <v-progress-circular indeterminate size="28" width="2"></v-progress-circular>
      </div>
      <div v-else-if="membersStatus === 'error'" class="review-center text--secondary">
        The chats could not be loaded. Reload the page to try again.
      </div>
      <div v-else-if="!members.length" class="review-center text--secondary" data-cy="agentChatsEmpty">
        No member has an agent chat yet.
      </div>

      <template v-else>
        <!-- 1. Members -->
        <section v-show="showColumn('members')" class="review-col review-col--members" data-cy="agentChatsMembers">
          <header class="review-head">
            <span class="subtitle-2">Members</span>
            <span class="caption text--secondary">{{ members.length }}</span>
          </header>
          <div class="review-list">
            <div
              v-for="row in members"
              :key="row.donorId"
              class="review-item"
              :class="{ 'review-item--active': row.donorId === selectedDonorId }"
              role="button"
              tabindex="0"
              data-cy="agentChatsMember"
              @click="pickMember(row)"
              @keydown.enter="pickMember(row)"
            >
              <div class="review-item-title">{{ memberName(row.member) }}</div>
              <div class="caption text--secondary">{{ memberDetails(row.member) }}</div>
              <div class="caption text--secondary">
                {{ row.chatCount }} {{ row.chatCount === 1 ? 'chat' : 'chats' }}<template v-if="row.deletedChatCount">, {{ row.deletedChatCount }} deleted by user</template>
                · {{ when(row.lastActivity) }}
              </div>
            </div>
          </div>
        </section>

        <!-- 2. The selected member's chats, the ones they deleted included -->
        <section v-show="showColumn('chats')" class="review-col review-col--chats" data-cy="agentChatsChats">
          <header class="review-head">
            <v-btn v-if="narrow" icon small title="Back to members" data-cy="agentChatsBackToMembers" @click="column = 'members'">
              <v-icon>mdi-arrow-left</v-icon>
            </v-btn>
            <span class="subtitle-2 review-ellipsis">{{ selectedDonorId ? memberName(chatsMember) : 'Chats' }}</span>
          </header>
          <div v-if="!selectedDonorId" class="review-hint text--secondary">Choose a member to see their chats.</div>
          <div v-else-if="chatsStatus === 'loading'" class="review-hint">
            <v-progress-circular indeterminate size="24" width="2"></v-progress-circular>
          </div>
          <div v-else class="review-list">
            <div
              v-for="item in chats"
              :key="item._id"
              class="review-item review-item--chat"
              :class="{ 'review-item--active': item._id === selectedChatId }"
              role="button"
              tabindex="0"
              data-cy="agentChatsChat"
              @click="pickChat(item)"
              @keydown.enter="pickChat(item)"
            >
              <div class="review-item-text">
                <div class="review-item-title">{{ item.title }}</div>
                <div class="caption text--secondary">
                  {{ when(item.updatedAt) }} · {{ tokens(item.promptTokens) }} in · {{ tokens(item.completionTokens) }} out
                </div>
                <v-chip v-if="item.userDeletedChat" x-small outlined color="orange darken-2" class="mt-1" data-cy="agentChatsDeletedTag">
                  {{ deletedTag(item) }}
                </v-chip>
              </div>
              <v-btn
                icon
                x-small
                title="Download as stored"
                :loading="exportingChatId === item._id"
                :disabled="!!exportingChatId && exportingChatId !== item._id"
                data-cy="agentChatsDownloadButton"
                @click.stop="downloadChat(item)"
              >
                <v-icon small>mdi-download-outline</v-icon>
              </v-btn>
              <v-btn icon x-small title="Delete permanently" data-cy="agentChatsDeleteButton" @click.stop="confirmDelete(item)">
                <v-icon small>mdi-delete-outline</v-icon>
              </v-btn>
            </div>
          </div>
        </section>

        <!-- 3. One transcript, read-only: a super admin reads other members' chats but never continues them. -->
        <section v-show="showColumn('transcript')" class="review-col review-col--transcript" data-cy="agentChatsTranscript">
          <header class="review-head">
            <v-btn v-if="narrow" icon small title="Back to chats" data-cy="agentChatsBackToChats" @click="column = 'chats'">
              <v-icon>mdi-arrow-left</v-icon>
            </v-btn>
            <template v-if="transcript">
              <div class="review-head-text">
                <div class="subtitle-2 review-ellipsis" data-cy="agentChatsTranscriptTitle">{{ transcript.chat.title }}</div>
                <div class="caption text--secondary review-ellipsis">
                  {{ memberName(transcript.member) }} · created {{ day(transcript.chat.createdAt) }}
                </div>
              </div>
              <v-chip v-if="transcript.chat.userDeletedChat" x-small outlined color="orange darken-2" class="flex-shrink-0">
                {{ deletedTag(transcript.chat) }}
              </v-chip>
              <v-btn
                icon
                small
                title="Download as stored"
                :loading="exportingChatId === transcript.chat._id"
                :disabled="!!exportingChatId && exportingChatId !== transcript.chat._id"
                data-cy="agentChatsTranscriptDownloadButton"
                @click="downloadChat(transcript.chat)"
              >
                <v-icon small>mdi-download-outline</v-icon>
              </v-btn>
              <v-btn icon small title="Delete permanently" data-cy="agentChatsTranscriptDeleteButton" @click="confirmDelete(transcript.chat)">
                <v-icon small>mdi-delete-outline</v-icon>
              </v-btn>
            </template>
            <span v-else class="subtitle-2">Transcript</span>
          </header>
          <div v-if="!selectedChatId" class="review-hint text--secondary">Choose a chat to read it.</div>
          <div v-else-if="transcriptStatus === 'loading'" class="review-hint">
            <v-progress-circular indeterminate size="24" width="2"></v-progress-circular>
          </div>
          <div v-else-if="transcript" class="review-scroll">
            <div class="review-thread">
              <p v-if="!transcript.messages.length" class="text--secondary text-center">This chat has no messages.</p>
              <AgentThread :messages="transcript.messages" :server="server" read-only show-usage></AgentThread>
            </div>
          </div>
        </section>
      </template>
    </v-card>
  </div>
</template>

<script>
/*
  Agent Chats: super admins read every member's Badhan Agent chats, and delete one for good.

  Three columns — members, the selected member's chats, one transcript — side by side on a wide
  screen, one at a time on a narrow one. It uses the review routes only (/agent/review/...), which
  include the chats members deleted: a member's delete only hides a chat from them, and it stays
  here, tagged, until a super admin deletes it permanently.

  There is no composer. A transcript is drawn by AgentThread in read-only mode: no approval
  buttons, no Retry, answers as plain text. Opening one is recorded in App Activity by the backend.

  The System prompt button is the only place the agent's system prompt is shown.

  The download button saves one chat as a JSON file, for debugging: the chat and its messages
  exactly as the database holds them (the export route projects nothing away), the owner's donor
  record beside them, when and from which server it was taken, and every recorded model call with
  the full request that was sent to OpenAI and the answer or error that came back.
*/
import PageTitle from '@/components/PageTitle'
import AgentThread from '@/components/Agent/AgentThread'
import { agentServer, day, tokens, when } from '@/components/Agent/format'
import { designations, halls } from '@/mixins/constants'
import { textFileDownloadInWeb } from '@/mixins/helpers'
import {
  handleGETAgentConfig,
  handleGETAgentReviewMembers,
  handleGETAgentReviewMemberChats,
  handleGETAgentReviewChat,
  handleGETAgentReviewChatExport,
  handleDELETEAgentReviewChat
} from '@/api'

export default {
  name: 'AgentChats',
  components: { PageTitle, AgentThread },
  data () {
    return {
      membersStatus: 'loading',
      members: [],
      selectedDonorId: null,
      chatsStatus: 'idle',
      chats: [],
      // Who column 2 belongs to, as the chats route reports it.
      chatsMember: null,
      selectedChatId: null,
      transcriptStatus: 'idle',
      // { chat, member, messages }
      transcript: null,
      // On a narrow screen, the one column showing: 'members', 'chats' or 'transcript'.
      column: 'members',
      // From GET /agent/config, which sends it to super admins only.
      systemPrompt: '',
      promptOpen: false,
      // The chat whose download is being fetched; one at a time.
      exportingChatId: null
    }
  },
  computed: {
    server () {
      return agentServer()
    },
    narrow () {
      return !this.$vuetify.breakpoint.mdAndUp
    }
  },
  created () {
    this.loadMembers()
    this.loadSystemPrompt()
  },
  methods: {
    when,
    day,
    tokens,

    showColumn (name) {
      return !this.narrow || this.column === name
    },
    // A member whose donor record is gone comes back as null.
    memberName (member) {
      return member ? member.name : 'Deleted member'
    },
    memberDetails (member) {
      if (!member) return 'The donor record no longer exists'
      return `${halls[member.hall] || 'Unknown hall'} · ${designations[member.designation] || 'Unknown role'}`
    },
    deletedTag (chat) {
      return `Deleted by user · ${day(chat.userDeletedAt)}`
    },

    async loadSystemPrompt () {
      const response = await handleGETAgentConfig()
      if (response && response.status === 200) this.systemPrompt = response.data.systemPrompt || ''
    },
    async loadMembers () {
      const response = await handleGETAgentReviewMembers()
      if (!response || response.status !== 200) {
        this.membersStatus = 'error'
        return
      }
      this.members = response.data.members
      this.membersStatus = 'ready'
    },
    async pickMember (row) {
      this.selectedDonorId = row.donorId
      this.chatsMember = row.member
      this.selectedChatId = null
      this.transcript = null
      this.column = 'chats'
      await this.loadChats()
    },
    async loadChats () {
      const donorId = this.selectedDonorId
      this.chatsStatus = 'loading'
      const response = await handleGETAgentReviewMemberChats(donorId)
      // A slower answer for a member no longer selected is dropped.
      if (donorId !== this.selectedDonorId) return
      if (!response || response.status !== 200) {
        this.chatsStatus = 'error'
        this.chats = []
        return
      }
      this.chats = response.data.chats
      this.chatsMember = response.data.member
      this.chatsStatus = 'ready'
    },
    async pickChat (item) {
      this.selectedChatId = item._id
      this.transcript = null
      this.transcriptStatus = 'loading'
      this.column = 'transcript'
      const response = await handleGETAgentReviewChat(item._id)
      if (item._id !== this.selectedChatId) return
      if (!response || response.status !== 200) {
        this.transcriptStatus = 'error'
        this.selectedChatId = null
        return
      }
      this.transcript = response.data
      this.transcriptStatus = 'ready'
    },
    // A failed request has already been shown by the API layer's error toast.
    async downloadChat (chat) {
      if (this.exportingChatId) return
      this.exportingChatId = chat._id
      const response = await handleGETAgentReviewChatExport(chat._id)
      this.exportingChatId = null
      if (!response || response.status !== 200) return

      const { exportedAt, member, chat: stored, messages, conversation, modelCalls } = response.data
      const file = {
        exportedAt: new Date(exportedAt).toISOString(),
        server: this.server.baseUrl,
        member,
        chat: stored,
        messages,
        modelCalls: modelCalls.map((call) => this.expandModelCall(call, conversation))
      }
      textFileDownloadInWeb(JSON.stringify(file, null, 2) + '\n', `badhan-agent-chat-${chat._id}.json`, 'application/json;charset=utf-8')
    },
    // The backend sends each call's messages as a length into `conversation`, so its answer stays
    // small however long the chat. The file spells every request out in full, as it was sent.
    expandModelCall (call, conversation) {
      const { systemMessage, conversationLength, messages, request, ...rest } = call
      const sent = [systemMessage, ...(messages || conversation.slice(0, conversationLength))].filter(Boolean)
      return {
        seq: rest.seq,
        outcome: rest.outcome,
        requestId: rest.requestId,
        durationMs: rest.durationMs,
        request: { ...(request || {}), messages: sent },
        response: rest.response,
        error: rest.error,
        ...(rest.missingParts ? { missingParts: rest.missingParts } : {})
      }
    },
    confirmDelete (chat) {
      const member = this.memberName(this.transcript && this.transcript.chat._id === chat._id ? this.transcript.member : this.chatsMember)
      this.$store.commit('confirmationBox/setConfirmationMessage', {
        confirmationMessage: `Permanently delete "${chat.title}" by ${member}? It is removed from Badhan for good and cannot be undone.`,
        confirmationAction: () => this.deleteChat(chat)
      })
    },
    // Afterwards the members list is fetched again rather than worked out here: whether the member
    // still has a chat is the server's to say.
    async deleteChat (chat) {
      const response = await handleDELETEAgentReviewChat(chat._id)
      if (!response || (response.status !== 200 && response.status !== 404)) return

      if (this.selectedChatId === chat._id) {
        this.selectedChatId = null
        this.transcript = null
        if (this.column === 'transcript') this.column = 'chats'
      }
      await this.loadMembers()
      const stillListed = this.members.some((row) => row.donorId === this.selectedDonorId)
      if (stillListed) {
        await this.loadChats()
      } else {
        // That was the member's last chat: they leave column 1, and columns 2 and 3 go back to
        // their hints.
        this.selectedDonorId = null
        this.chats = []
        this.chatsMember = null
        this.column = 'members'
      }
    }
  }
}
</script>

<style scoped>
/* The same translucent greys as the agent page, so it reads the same in day and night mode. */
.review-page {
  --review-line: rgba(128, 128, 128, 0.28);
  --review-fill: rgba(128, 128, 128, 0.12);
}

.review-bar { display: flex; justify-content: flex-end; max-width: 1400px; }
.review-pre {
  margin: 0;
  padding: 8px 10px;
  border-radius: 8px;
  /* Literal, not var(--review-fill): a dialog is drawn outside the page's own element. */
  background: rgba(128, 128, 128, 0.12);
  color: inherit;
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 12.5px;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Fills the screen below the title bar, so each column scrolls on its own. */
.review-card {
  display: flex;
  max-width: 1400px;
  /* Below the title bar and the System prompt button. */
  height: calc(100vh - 188px);
  min-height: 440px;
  overflow: hidden;
}
.review-center { flex: 1; display: flex; align-items: center; justify-content: center; padding: 16px; text-align: center; }

.review-col { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.review-col--members { flex: 0 0 260px; border-right: 1px solid var(--review-line); }
.review-col--chats { flex: 0 0 300px; border-right: 1px solid var(--review-line); }
.review-col--transcript { flex: 1; }

.review-head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 52px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--review-line);
}
.review-head-text { flex: 1; min-width: 0; }
.review-ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.review-hint { padding: 24px 16px; text-align: center; }

.review-list { flex: 1; min-height: 0; overflow-y: auto; padding: 6px; }
.review-item { padding: 8px 10px; border-radius: 10px; cursor: pointer; }
.review-item:hover, .review-item--active { background: var(--review-fill); }
.review-item--chat { display: flex; align-items: flex-start; gap: 4px; }
.review-item-text { flex: 1; min-width: 0; }
.review-item-title { font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.review-scroll { flex: 1; min-height: 0; overflow-y: auto; }
.review-thread { max-width: 860px; margin: 0 auto; padding: 16px 16px 24px; }

/* Narrow screens: one column at a time, filling the card. */
@media (max-width: 959px) {
  .review-card { height: calc(100vh - 180px); }
  .review-col--members, .review-col--chats { flex: 1; border-right: 0; }
  .review-thread { padding: 12px 12px 20px; }
}
</style>
