<template>
  <div>
    <!-- Day divider. Rendered by the LIST rather than decided here, so a bubble stays a bubble. -->
    <div v-if="dayLabel" class="text-center my-2" data-cy="chatDayDivider">
      <span class="caption grey--text px-2">{{ dayLabel }}</span>
    </div>

    <div class="d-flex mb-2" :class="isOwn ? 'justify-end' : 'justify-start'">
      <v-card
        flat
        class="pa-2 chat-bubble"
        :color="isOwn ? 'primary' : 'grey lighten-3'"
        :dark="isOwn"
        :data-cy="isOwn ? 'chatBubbleOwn' : 'chatBubbleOther'"
      >
        <!-- name · batch · hall · rank, or 'Former member' when the record is gone. -->
        <div class="caption font-weight-medium mb-1" data-cy="chatBubbleHeader">
          {{ headerLine }}
        </div>

        <!--
          THE TEXT IS RENDERED WITH {{ }} AND NOTHING ELSE. This interpolation is the entire
          XSS story for the feature: message bodies are stored RAW on the server, deliberately,
          so that "I can't come" does not reach the screen as "I can&#x27;t come". Safety is
          enforced here instead, by Vue escaping the text.

          NEVER v-html. NEVER VueMarkdown. NEVER a link autolinker that builds an <a> out of
          message text. Any of those hands every member of this room the ability to run script
          in every other member's browser.
        -->
        <div class="body-2 chat-text" data-cy="chatBubbleText">{{ message.text }}</div>

        <div class="d-flex align-center justify-end mt-1">
          <span class="caption" data-cy="chatBubbleTime">{{ timeLabel }}</span>
          <v-btn
            v-if="canDelete"
            icon
            x-small
            class="ml-1"
            data-cy="chatBubbleDeleteButton"
            @click="promptDelete"
          >
            <v-icon x-small>mdi-delete</v-icon>
          </v-btn>
        </div>
      </v-card>
    </div>
  </div>
</template>

<script>
import { DESIGNATIONS_INDEX } from '@/mixins/constants'

export default {
  name: 'MessageBubble',
  props: {
    message: {
      type: Object,
      required: true
    },
    // Supplied by the list when this message falls on a different date from the one before it.
    dayLabel: {
      type: String,
      default: null
    }
  },
  computed: {
    myId () {
      return this.$store.getters.getID
    },
    isOwn () {
      return this.message.sender !== null && this.message.sender._id === this.myId
    },
    /**
     * name · batch · hall · rank — e.g. "Mir Mahathir · 16 · Titumir · Hall Admin".
     *
     * A NULL SENDER MEANS A DELETED DONOR RECORD, AND NOTHING ELSE. It is not how a demoted
     * member appears. The bubble is still shown: deleting an account must not delete other
     * people's conversation.
     *
     * A SENDER AT designation 0 RENDERS AS "Donor", WITH NO SPECIAL CASE. The sender is joined
     * live on every read, so the rank shown is whatever that person's rank is now — which means
     * a members-only room will occasionally show a message labelled Donor, because somebody was
     * demoted after sending it. That is truthful and intended. Do not add a branch that hides
     * the rank, substitutes their rank at send time, or falls back to "Former member".
     */
    headerLine () {
      const sender = this.message.sender
      if (sender === null) {
        return 'Former member'
      }
      const parts = [sender.name]
      // Batch is the first two digits of the student id — the definition the glossary gives.
      const batch = typeof sender.studentId === 'string' ? sender.studentId.substring(0, 2) : ''
      if (batch) parts.push(batch)
      parts.push(this.$options.filters.getHallName(sender.hall))
      parts.push(this.$options.filters.getDesignationString(sender.designation))
      return parts.join(' · ')
    },
    timeLabel () {
      return new Date(this.message.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },
    // Author, or a Super Admin. The same rule the server enforces — this only decides whether
    // the affordance is worth showing, and a hidden button is not a permission check.
    canDelete () {
      if (this.$store.getters.getDesignation === DESIGNATIONS_INDEX.SUPER_ADMIN) {
        return true
      }
      return this.isOwn
    }
  },
  methods: {
    promptDelete () {
      // Through the existing confirmation box, as the sign-out flow does, rather than a
      // bespoke dialog. A delete here is permanent and leaves no trace.
      this.$store.commit('confirmationBox/setConfirmationMessage', {
        confirmationMessage: 'Delete this message? It cannot be undone.',
        confirmationAction: this.confirmDelete
      })
    },
    async confirmDelete () {
      await this.$store.dispatch('chat/deleteMessage', this.message._id)
    }
  }
}
</script>

<style scoped>
.chat-bubble {
  max-width: 85%;
}
/* A pasted phone number or a long URL must wrap rather than widen the scroller and give the
   whole page a horizontal scrollbar. */
.chat-text {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
