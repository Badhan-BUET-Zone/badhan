<template>
  <div
    ref="scroller"
    class="chat-scroller"
    :style="{ height: height }"
    data-cy="chatMessageList"
    @scroll="rememberScrollPosition"
  >
    <!-- The sentinel an IntersectionObserver watches, rather than a scroll-event handler:
         a scroll handler fires on every frame of a flick and has to be throttled by hand,
         while the observer fires once when the top actually comes into view. -->
    <div ref="topSentinel" class="chat-top-sentinel"></div>

    <div v-if="isLoadingOlder" class="text-center py-2" data-cy="chatLoadingOlder">
      <v-progress-circular indeterminate size="20" width="2" color="primary"></v-progress-circular>
    </div>

    <div v-else-if="!hasMore && messages.length > 0" class="text-center py-2">
      <span class="caption grey--text" data-cy="chatHistoryStart">This is the start of the chat</span>
    </div>

    <!--
      A REAL LOADING STATE, NOT AN EMPTY-ROOM MESSAGE THAT FLASHES FIRST.
      Nothing about the chat is cached on the device, so every cold start is a round trip and
      the room is genuinely blank until it lands. "No messages yet." appearing for that second
      would tell a member the room is empty when it has a thousand messages in it, so the
      empty copy renders ONLY once a fetch has completed and returned nothing.
    -->
    <div v-if="isFetching && messages.length === 0" class="text-center py-6" data-cy="chatLoading">
      <v-progress-circular indeterminate size="24" width="2" color="primary"></v-progress-circular>
    </div>

    <div v-else-if="messages.length === 0" class="text-center py-6">
      <span class="caption grey--text" data-cy="chatEmpty">No messages yet.</span>
    </div>

    <MessageBubble
      v-for="(message, index) in messages"
      :key="message._id"
      :message="message"
      :day-label="dayLabelFor(index)"
    ></MessageBubble>
  </div>
</template>

<script>
import MessageBubble from '@/views/Chat/MessageBubble'

/**
 * ONE LIST, MOUNTED TWICE — by the panel and by the page.
 *
 * `height` is the ONLY thing that differs between the two mounts, and that is deliberate. If
 * the panel and the page grew separate list implementations they would drift, and the drift
 * would be in the scroll and merge logic, which is precisely where the bugs are.
 */
export default {
  name: 'MessageList',
  components: { MessageBubble },
  props: {
    height: {
      type: String,
      required: true
    }
  },
  data () {
    return {
      observer: null,
      // Captured immediately before a prepend so the viewport can be put back afterwards.
      scrollHeightBeforePrepend: 0,
      // Whether the reader was at the bottom when the last message arrived. Recorded on
      // scroll rather than measured during the update, because by then the list has grown.
      wasAtBottom: true
    }
  },
  computed: {
    messages () {
      return this.$store.getters['chat/getMessages']
    },
    hasMore () {
      return this.$store.getters['chat/hasMoreMessages']
    },
    isLoadingOlder () {
      return this.$store.getters['chat/isLoadingOlder']
    },
    isFetching () {
      return this.$store.getters['chat/isFetching']
    }
  },
  watch: {
    messages (updated, previous) {
      const grewAtTop = updated.length > previous.length &&
        previous.length > 0 &&
        updated[0]._id !== previous[0]._id

      this.$nextTick(() => {
        if (grewAtTop) {
          // RULE 3: older messages were prepended. Restore the viewport onto the message the
          // reader was looking at, or scrolling up jumps and the history is unusable.
          const scroller = this.$refs.scroller
          if (!scroller) return
          scroller.scrollTop += scroller.scrollHeight - this.scrollHeightBeforePrepend
          return
        }
        // RULE 2: new messages arrived at the bottom. Follow them ONLY if the reader was
        // already there — someone reading history must not be yanked away mid-sentence.
        if (this.wasAtBottom) {
          this.scrollToBottom()
        }
      })
    }
  },
  mounted () {
    // RULE 1: open at the bottom, with no animation. The newest message is the one wanted.
    this.$nextTick(this.scrollToBottom)

    if (typeof IntersectionObserver === 'undefined') return
    this.observer = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return
      // The store refuses overlapping requests and no-ops when there is no more history, so
      // this does not need a guard of its own.
      const scroller = this.$refs.scroller
      this.scrollHeightBeforePrepend = scroller ? scroller.scrollHeight : 0
      this.$store.dispatch('chat/fetchOlderMessages')
    }, { root: this.$refs.scroller })
    this.observer.observe(this.$refs.topSentinel)
  },
  beforeDestroy () {
    if (this.observer) this.observer.disconnect()
  },
  methods: {
    scrollToBottom () {
      const scroller = this.$refs.scroller
      if (!scroller) return
      scroller.scrollTop = scroller.scrollHeight
    },
    rememberScrollPosition () {
      const scroller = this.$refs.scroller
      if (!scroller) return
      // ~100px of slack: a reader a line or two off the bottom still counts as "at the bottom",
      // because they are following the conversation rather than reading history.
      this.wasAtBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 100
    },
    // A divider is shown on the first message of each new date. Computed here rather than in
    // the bubble because it depends on the message BEFORE this one, which a bubble cannot see.
    dayLabelFor (index) {
      const current = new Date(this.messages[index].date)
      if (index > 0) {
        const previous = new Date(this.messages[index - 1].date)
        if (previous.toDateString() === current.toDateString()) return null
      }
      const today = new Date()
      if (current.toDateString() === today.toDateString()) return 'Today'
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      if (current.toDateString() === yesterday.toDateString()) return 'Yesterday'
      return current.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
    }
  }
}
</script>

<style scoped>
.chat-scroller {
  overflow-y: auto;
  overflow-x: hidden;
}
/* Height rather than zero so the observer has something to intersect with. */
.chat-top-sentinel {
  height: 1px;
}
</style>
