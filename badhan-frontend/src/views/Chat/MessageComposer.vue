<template>
  <div class="chat-composer d-flex align-end pa-2">
    <v-textarea
      v-model="text"
      data-cy="chatComposerInput"
      class="mr-2"
      :counter="MESSAGE_TEXT_MAX_LENGTH"
      :maxlength="MESSAGE_TEXT_MAX_LENGTH"
      :disabled="isSending"
      label="Message"
      rows="1"
      auto-grow
      outlined
      dense
      hide-details="auto"
      @keydown.enter="handleEnter"
    ></v-textarea>

    <v-btn
      icon
      color="primary"
      class="mb-1"
      data-cy="chatComposerSendButton"
      :disabled="!canSend"
      @click="send"
    >
      <v-icon>{{ isSending ? 'mdi-timer-sand' : 'mdi-send' }}</v-icon>
    </v-btn>
  </div>
</template>

<script>
// Kept in step with the server's own limit by hand — the same arrangement the constants files
// already have. The server refuses anything longer, so this is a courtesy, not the rule.
const MESSAGE_TEXT_MAX_LENGTH = 2000

export default {
  name: 'MessageComposer',
  data () {
    return {
      text: '',
      MESSAGE_TEXT_MAX_LENGTH
    }
  },
  computed: {
    isSending () {
      return this.$store.getters['chat/isSending']
    },
    canSend () {
      return !this.isSending && this.text.trim().length > 0
    },
    /**
     * ENTER MEANS DIFFERENT THINGS ON DIFFERENT DEVICES, AND THAT IS DELIBERATE.
     *
     * On a wide screen Enter sends and Shift+Enter inserts a newline, which is what every chat
     * on a keyboard does. On a phone the on-screen Return key is the only way to type a second
     * line, so Enter must always insert one and only the button sends — otherwise a member
     * writing a two-line request fires off half of it.
     */
    enterSends () {
      return this.$vuetify.breakpoint.mdAndUp
    }
  },
  methods: {
    handleEnter (event) {
      if (!this.enterSends || event.shiftKey) return
      event.preventDefault()
      if (!this.canSend) return
      this.send()
    },
    async send () {
      if (!this.canSend) return
      const sent = await this.$store.dispatch('chat/sendMessage', this.text.trim())
      // THE TEXT IS CLEARED ONLY ON SUCCESS. A failed send leaves it in the box so the user
      // retypes nothing — the store reports the failure and the notification says why.
      if (sent) {
        this.text = ''
      }
    }
  }
}
</script>

<style scoped>
/*
  A CEILING ON auto-grow. Left to itself the textarea grows a line at a time with no limit, and
  since the panel hangs from a fixed button the extra height pushes the send button — and the
  line being typed — off the bottom of the screen. Past about five lines the box scrolls
  internally instead of growing, which is what every chat composer does.
*/
.chat-composer ::v-deep textarea {
  max-height: 120px;
  overflow-y: auto;
}
</style>
