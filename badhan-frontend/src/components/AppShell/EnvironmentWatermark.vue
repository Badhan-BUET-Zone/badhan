<template>
  <div v-if="showWatermark" class="env-watermark">
    This is not the production database. Any operation that you do won't get updated on the main app
  </div>
</template>

<script>
export default {
  name: 'EnvironmentWatermark',
  computed: {
    showWatermark () {
      return process.env.VUE_APP_ENVIRONMENT !== 'production'
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
  background: rgba(238, 0, 0, 0.85);
  color: #ffffff;
  font-size: 12px;
  line-height: 1.4;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  pointer-events: none;
}
</style>
