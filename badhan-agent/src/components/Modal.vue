<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import Icon from './Icon.vue'

defineProps<{ title: string; wide?: boolean }>()
const emit = defineEmits<{ close: [] }>()

const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') emit('close') }
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="backdrop" @mousedown.self="emit('close')">
    <section class="modal" :class="{ wide }" role="dialog" :aria-label="title">
      <header>
        <h2>{{ title }}</h2>
        <button class="icon" title="Close" @click="emit('close')"><Icon name="close" /></button>
      </header>
      <div class="content"><slot /></div>
    </section>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  background: rgb(0 0 0 / 0.35);
  display: grid;
  place-items: center;
  padding: 16px;
  z-index: 50;
}
.modal {
  background: var(--surface);
  border-radius: 14px;
  box-shadow: var(--shadow);
  width: min(460px, 100%);
  max-height: calc(100vh - 32px);
  display: flex;
  flex-direction: column;
}
.modal.wide { width: min(640px, 100%); }
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 6px 20px;
}
h2 { font-size: 17px; margin: 0; }
.content { padding: 8px 20px 20px; overflow: auto; }
</style>
