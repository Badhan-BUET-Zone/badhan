<template>
  <v-card class="rounded-xl d-flex flex-column" data-cy="chatPanel">
    <v-card-title class="py-2">
      <span class="subtitle-1">Member chat</span>
      <v-spacer></v-spacer>
      <v-btn icon small data-cy="chatPanelCloseButton" @click="$emit('close')">
        <v-icon small>mdi-close</v-icon>
      </v-btn>
    </v-card-title>

    <v-divider></v-divider>

    <!-- Pinned above the list, not below it: this button is how new messages arrive, so it
         must be visible without scrolling. -->
    <FetchMessagesButton></FetchMessagesButton>

    <v-divider></v-divider>

    <MessageList :height="listHeight" class="px-2"></MessageList>

    <v-divider></v-divider>

    <MessageComposer></MessageComposer>
  </v-card>
</template>

<script>
import MessageList from '@/views/Chat/MessageList'
import MessageComposer from '@/views/Chat/MessageComposer'
import FetchMessagesButton from '@/views/Chat/FetchMessagesButton'

/**
 * The BODY of the panel, shared by both presentations.
 *
 * On a wide screen this sits inside a v-menu anchored to the floating button; on a phone it
 * sits inside a bottom sheet at full width. Only the container differs — a 340px popup with a
 * text field in it is unusable on a phone, and the phone is where this will mostly be read.
 * Keeping the body in one component is what stops the two presentations drifting apart.
 */
export default {
  name: 'ChatPanel',
  components: { MessageList, MessageComposer, FetchMessagesButton },
  props: {
    listHeight: {
      type: String,
      default: '420px'
    }
  }
}
</script>
