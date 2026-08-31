<template>
  <div class="d-flex align-center justify-space-between px-2 py-1">
    <span class="caption grey--text" data-cy="chatLastCheckedLabel">{{ lastCheckedLabel }}</span>

    <v-btn
      small
      rounded
      :color="moreToCatchUp ? 'primary' : 'secondary'"
      :outlined="!moreToCatchUp"
      :loading="isFetching"
      :disabled="isFetching"
      data-cy="chatFetchMessagesButton"
      @click="fetch"
    >
      <v-icon left small>{{ moreToCatchUp ? 'mdi-arrow-down-bold-circle' : 'mdi-refresh' }}</v-icon>
      {{ label }}
    </v-btn>
  </div>
</template>

<script>
/**
 * THE INTERACTION MODEL, NOT AN APOLOGY FOR A MISSING SOCKET.
 *
 * Nothing pushes messages to this app and nothing polls for them, so this button is how new
 * messages arrive. It is therefore labelled plainly and styled to be found, rather than tucked
 * away as a passive refresh somebody is embarrassed about.
 *
 * When the last catch-up came back truncated, the label CHANGES to say so. Without that, a
 * member returning from a week away presses it once, sees thirty messages, and concludes that
 * is all there was — which is exactly the failure the non-looping catch-up trades against.
 */
export default {
  name: 'FetchMessagesButton',
  data () {
    return {
      lastCheckedAt: null,
      // Re-rendered on a timer so "Last checked 4 minutes ago" does not sit at "just now" while
      // the panel stays open. A clock tick, not a poll: it issues no request.
      nowTick: Date.now(),
      tickHandle: null
    }
  },
  computed: {
    isFetching () {
      return this.$store.getters['chat/isFetching']
    },
    moreToCatchUp () {
      return this.$store.getters['chat/hasMoreToCatchUp']
    },
    label () {
      if (this.moreToCatchUp) return 'More messages waiting'
      return 'Fetch messages'
    },
    lastCheckedLabel () {
      if (this.lastCheckedAt === null) return 'Not checked yet'
      const seconds = Math.max(Math.floor((this.nowTick - this.lastCheckedAt) / 1000), 0)
      if (seconds < 60) return 'Last checked just now'
      const minutes = Math.floor(seconds / 60)
      if (minutes < 60) return `Last checked ${minutes} minute${minutes === 1 ? '' : 's'} ago`
      const hours = Math.floor(minutes / 60)
      return `Last checked ${hours} hour${hours === 1 ? '' : 's'} ago`
    }
  },
  mounted () {
    this.tickHandle = setInterval(() => {
      this.nowTick = Date.now()
    }, 30000)
  },
  beforeDestroy () {
    if (this.tickHandle) clearInterval(this.tickHandle)
  },
  methods: {
    async fetch () {
      await this.$store.dispatch('chat/fetchNewMessages')
      // The local clock is fine HERE and only here: this labels when this device last asked,
      // which is a fact about this device. It is never sent to the server as a cursor — that
      // is always the server's own serverTime, held in local storage by the store.
      this.lastCheckedAt = Date.now()
      this.nowTick = this.lastCheckedAt
    }
  }
}
</script>
