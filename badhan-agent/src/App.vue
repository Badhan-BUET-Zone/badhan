<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ChatPane from './components/ChatPane.vue'
import ChatSidebar from './components/ChatSidebar.vue'
import SettingsDialog from './components/SettingsDialog.vue'
import { activeChat, createChat, loadChats, settings, state } from './store.ts'

const showSettings = ref(false)
const drawer = ref(false)
const chat = computed(() => activeChat())

onMounted(async () => {
  await loadChats()
  if (!state.chats.length) createChat()
  // First visit: nothing works without a key, so say so up front.
  if (!settings.apiKey) showSettings.value = true
})
</script>

<template>
  <div class="app" :class="{ drawer }">
    <ChatSidebar class="side" @settings="showSettings = true; drawer = false" @picked="drawer = false" />
    <div class="scrim" @click="drawer = false" />
    <main class="main">
      <ChatPane v-if="chat" :key="chat.id" :chat="chat" @menu="drawer = true" @settings="showSettings = true" />
      <div v-else-if="state.loaded" class="nothing muted">
        <button class="primary" @click="createChat()">Start a chat</button>
      </div>
    </main>
    <SettingsDialog v-if="showSettings" @close="showSettings = false" />
  </div>
</template>

<style scoped>
.app { display: grid; grid-template-columns: 272px 1fr; height: 100%; }
.main { min-width: 0; height: 100%; }
.scrim { display: none; }
.nothing { height: 100%; display: grid; place-items: center; }

@media (max-width: 860px) {
  .app { grid-template-columns: 1fr; }
  .side {
    position: fixed;
    inset: 0 auto 0 0;
    width: min(300px, 85vw);
    z-index: 40;
    transform: translateX(-100%);
    transition: transform 0.2s;
  }
  .drawer .side { transform: none; box-shadow: var(--shadow); }
  .drawer .scrim { display: block; position: fixed; inset: 0; background: rgb(0 0 0 / 0.3); z-index: 30; }
}
</style>
