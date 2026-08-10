<template>
  <div v-if="showWatermark" class="env-watermark">
    {{ watermarkMessage }}
  </div>
</template>

<script>
import { environmentService } from '@/mixins/environment'

export default {
  name: 'EnvironmentWatermark',
  computed: {
    // Routed through the environment service rather than reading process.env here, so
    // exactly one place in the app knows how the environment name is spelled. Shows on
    // development and on local; hidden only in production.
    isNonProduction () {
      return !environmentService.isEnvironmentProduction()
    },
    isGuest () {
      return this.$store.getters['getIsGuest']
    },
    showWatermark () {
      return this.isNonProduction || this.isGuest
    },
    watermarkMessage () {
      if (this.isGuest) {
        return 'You are logged in as a guest. Any operation that you do won\'t get updated on the main app'
      }
      return 'This is not the production database. Any operation that you do won\'t get updated on the main app'
    }
  }
}
</script>

<style scoped>
.env-watermark {
  position: fixed;
  bottom: 12px;
  right: 12px;
  z-index: 9999;
  max-width: 280px;
  padding: 8px 12px;
  background: rgba(211, 211, 211, 0.85);
  color: #333333;
  font-size: 12px;
  line-height: 1.4;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  pointer-events: none;
}
</style>
