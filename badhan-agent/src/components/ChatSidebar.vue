<script setup lang="ts">
import { SERVERS } from '../lib/servers.ts'
import { createChat, deleteChat, state } from '../store.ts'
import Icon from './Icon.vue'

const emit = defineEmits<{ settings: []; picked: [] }>()

function when(time: number): string {
  const date = new Date(time)
  const today = new Date()
  const days = Math.round((new Date(today.toDateString()).getTime() - new Date(date.toDateString()).getTime()) / 86_400_000)
  if (days === 0) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  if (days === 1) return 'Yesterday'
  if (days < 7) return date.toLocaleDateString([], { weekday: 'long' })
  return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric' })
}

function pick(id: string) {
  state.activeId = id
  emit('picked')
}

function newChat() {
  createChat()
  emit('picked')
}

function remove(id: string, title: string) {
  if (confirm(`Delete "${title}"? This cannot be undone.`)) deleteChat(id)
}
</script>

<template>
  <aside class="sidebar">
    <div class="brand row">
      <img src="/favicon.svg" alt="" width="22" height="22" />
      <strong>Badhan Agent</strong>
    </div>
    <button class="new" @click="newChat"><Icon name="plus" /> New chat</button>

    <nav class="list" aria-label="Chats">
      <p v-if="!state.chats.length" class="muted small none">No chats yet.</p>
      <div
        v-for="chat in state.chats"
        :key="chat.id"
        class="item"
        :class="{ active: chat.id === state.activeId }"
        role="button"
        tabindex="0"
        @click="pick(chat.id)"
        @keydown.enter="pick(chat.id)"
      >
        <div class="text">
          <div class="title">
            <span v-if="state.running[chat.id]" class="dot" title="Running" />{{ chat.title }}
          </div>
          <div class="sub muted">
            <span :class="{ live: SERVERS[chat.server].live }">{{ SERVERS[chat.server].label }}</span>
            · {{ when(chat.updatedAt) }}
          </div>
        </div>
        <button class="icon delete" title="Delete chat" @click.stop="remove(chat.id, chat.title)"><Icon name="trash" :size="16" /></button>
      </div>
    </nav>

    <button class="ghost settings" @click="emit('settings')"><Icon name="gear" /> Settings</button>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--surface);
  border-right: 1px solid var(--border);
  padding: 14px 10px 10px;
  gap: 10px;
}
.brand { padding: 0 6px; gap: 10px; font-size: 16px; }
.new { justify-content: center; padding: 8px; font-weight: 500; }
.list { flex: 1; overflow-y: auto; overflow-x: hidden; display: grid; grid-template-columns: minmax(0, 1fr); align-content: start; gap: 2px; }
.none { padding: 8px; margin: 0; }
.item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 7px 6px 7px 10px;
  border-radius: 8px;
  cursor: pointer;
}
.item:hover { background: var(--surface-2); }
.item.active { background: var(--surface-2); }
.text { flex: 1; min-width: 0; }
.title { font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sub { font-size: 12px; }
.sub .live { color: var(--brand); }
.delete { opacity: 0; color: var(--muted); }
.item:hover .delete, .item.active .delete, .delete:focus-visible { opacity: 1; }
.dot { display: inline-block; width: 7px; height: 7px; margin: 0 6px 1px 0; vertical-align: middle; border-radius: 50%; background: var(--ok); animation: pulse 1.2s infinite; }
@keyframes pulse { 50% { opacity: 0.3; } }
.settings { justify-content: flex-start; }
@media (hover: none) { .delete { opacity: 1; } }
</style>
