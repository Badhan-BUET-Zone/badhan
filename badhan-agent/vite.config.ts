import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    // The source is bind-mounted from the host into the container. Docker Desktop does not
    // always forward the host's file events across that mount, so poll rather than miss edits.
    watch: { usePolling: true, interval: 300 }
  }
})
