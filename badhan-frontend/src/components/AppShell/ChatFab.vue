<template>
  <!--
    A GLOBAL, App.vue-LEVEL COMPONENT. Exactly one instance, mounted outside <router-view>.

    No view imports this and no view mounts its own copy. That placement is what makes "a
    floating button on every signed-in screen" true without touching a single view file, and it
    is what keeps the button and its open panel alive across a route change: the component never
    unmounts when the route changes, so the panel does not blink shut and the badge does not
    re-mount and re-read local storage on every navigation.

    Visibility is decided by the guards below and by the /chat route check — never by which view
    happens to be rendered.
  -->
  <div v-if="visible" class="chat-fab-anchor" data-cy="chatFabAnchor">
    <!-- Wide screens: a menu anchored to the button. -->
    <v-menu
      v-if="!isNarrow"
      v-model="panelOpen"
      :close-on-content-click="false"
      content-class="rounded-xl"
      offset-y
      left
      nudge-bottom="8"
      max-width="380"
      min-width="380"
    >
      <template v-slot:activator="{ on, attrs }">
        <v-badge
          overlap
          color="error"
          :value="unreadCount > 0"
          :content="badgeLabel"
          data-cy="chatFabBadge"
        >
          <v-btn
            id="chatFabId"
            data-cy="chatFabId"
            fab
            small
            color="primary"
            v-bind="attrs"
            v-on="on"
          >
            <v-icon>mdi-forum</v-icon>
          </v-btn>
        </v-badge>
      </template>

      <!--
        ~420px, but never taller than the window can hold. The panel hangs from a button at a
        fixed 76px from the top, so on a short laptop screen a rigid 420px list pushes the
        composer off the bottom edge — a chat you can read and cannot reply in. The subtrahend
        is the panel's own chrome: the title bar, the fetch row, the composer and the margins.
      -->
      <ChatPanel
        list-height="min(420px, calc(100vh - 290px))"
        max-height="calc(100vh - 140px)"
        @close="panelOpen = false"
      ></ChatPanel>
    </v-menu>

    <!-- Phones: the same body in a full-width bottom sheet. -->
    <template v-else>
      <v-badge
        overlap
        color="error"
        :value="unreadCount > 0"
        :content="badgeLabel"
        data-cy="chatFabBadge"
      >
        <v-btn
          id="chatFabId"
          data-cy="chatFabId"
          fab
          small
          color="primary"
          @click="panelOpen = true"
        >
          <v-icon>mdi-forum</v-icon>
        </v-btn>
      </v-badge>

      <v-bottom-sheet v-model="panelOpen" content-class="rounded-t-xl">
        <!-- dvh where it exists: with the keyboard up, plain `vh` still measures the whole
             screen, including the part the keyboard now covers. -->
        <ChatPanel
          list-height="min(55vh, calc(100dvh - 260px))"
          max-height="90dvh"
          @close="panelOpen = false"
        ></ChatPanel>
      </v-bottom-sheet>
    </template>
  </div>
</template>

<script>
import ChatPanel from '@/views/Chat/ChatPanel'
import { DESIGNATIONS_INDEX } from '@/mixins/constants'

const BADGE_CAP = 99

export default {
  name: 'ChatFab',
  components: { ChatPanel },
  computed: {
    visible () {
      // Signed in, a member, and not already on the page this button opens — a floating button
      // that opens the page you are looking at is noise.
      if (!this.$store.getters.getToken) return false
      if (this.$store.getters.getDesignation < DESIGNATIONS_INDEX.VOLUNTEER) return false
      return this.$route.path !== '/chat'
    },
    isNarrow () {
      return !this.$vuetify.breakpoint.mdAndUp
    },
    unreadCount () {
      return this.$store.getters['chat/getUnreadCount']
    },
    badgeLabel () {
      return this.unreadCount > BADGE_CAP ? `${BADGE_CAP}+` : String(this.unreadCount)
    },
    // Backed by the store rather than local data, so the page and the panel agree about
    // whether the panel is open, and so that opening always goes through the action that
    // marks everything read.
    panelOpen: {
      get () {
        return this.$store.getters['chat/isPanelOpen']
      },
      set (open) {
        this.$store.dispatch(open ? 'chat/openPanel' : 'chat/closePanel')
      }
    }
  }
}
</script>

<style scoped>
/*
  Fixed to the VIEWPORT, deliberately below the app bar rather than inside it. The app bar is
  collapse-on-scroll, so a button anchored to it would slide away as the user scrolls, and a
  chat button that wanders is a chat button nobody hits.

  z-index sits above ordinary page content but below Vuetify's dialog and snackbar layers
  (v-menu content is 8, v-dialog 202+), so a confirmation dialog is never obscured by it.
*/
.chat-fab-anchor {
  position: fixed;
  top: 76px;
  right: 16px;
  z-index: 5;
}
</style>
