<template>
  <div :key="'schemaInconsistencies'">
    <PageTitle :title="$route.meta.title" />
    <Container>
      <v-card-title>Schema Inconsistencies</v-card-title>
      <v-card-text>
        <div class="mb-4 d-flex align-center">
          <Button :click="loadData" :disabled="loading" color="primary" icon="mdi-refresh" text="Refresh" />
          <v-progress-circular v-if="loading" indeterminate size="24" color="primary" class="ml-3"/>
        </div>
        <div v-if="serverUnreachable" class="mb-4">
          <v-alert type="warning" outlined>
            <p class="font-weight-medium mb-2">Internal server not reachable</p>
            <p class="mb-2">
              This page reads the schema report from the internal server. Ensure it is running on
              <code>localhost:4000</code> and press Refresh.
            </p>
            <p class="mb-0">
              See
              <a href="https://github.com/Badhan-BUET-Zone/badhan#run-the-code" target="_blank" rel="noopener">setup docs</a>.
            </p>
          </v-alert>
        </div>

        <div v-else-if="error" class="mb-4">
          <v-alert type="error" outlined>
            <p class="font-weight-medium mb-2">Could not load schema inconsistencies</p>
            <p class="mb-0">{{ error }}</p>
          </v-alert>
        </div>

        <div v-if="!loading && !error && data">
          <JsonTree :data="data" />
        </div>
        <div v-if="!loading && !error && !data" class="caption grey--text">
          No data loaded yet.
        </div>
        <div v-if="loading">
          <v-skeleton-loader type="card" class="mb-3" />
          <v-skeleton-loader type="card" />
        </div>
      </v-card-text>
    </Container>
  </div>
</template>

<script>
import axios from 'axios'
import PageTitle from '@/components/PageTitle'
import Container from '@/components/Container/Container'
import Button from '@/components/UI Components/Button'
import JsonTree from '@/components/UI Components/JsonTree.vue'
import { HTTP_STATUS } from '@/mixins/constants'

export default {
  name: 'SchemaInconsistencies',
  components: { PageTitle, Container, Button, JsonTree },
  data: () => ({
    loading: false,
    error: null,
    serverUnreachable: false,
    data: null,
    internalAxios: null
  }),
  methods: {
    async loadData () {
      this.loading = true
      this.error = null
      this.serverUnreachable = false
      try {
        const resp = await this.internalAxios.get('/schema-inconsistencies')
        if (resp.status !== HTTP_STATUS.OK) {
          this.error = (resp.data && resp.data.message) || 'Failed to load data'
          this.$store.dispatch('notification/notifyError', this.error)
        } else {
          this.data = resp.data
        }
      } catch (e) {
        // No response object means the request never reached the internal server —
        // it is not running on localhost:4000, or the browser blocked the call.
        this.serverUnreachable = !(e && e.response)
        const msg = (e && e.response && e.response.data && (e.response.data.message || e.response.data.error)) ||
          (this.serverUnreachable ? 'Internal server not reachable on localhost:4000' : 'Network error')
        this.error = msg
        this.$store.dispatch('notification/notifyError', msg)
      } finally {
        this.loading = false
      }
    }
  },
  mounted () {
    // internal server assumed at localhost:4000 like backup API
    this.internalAxios = axios.create({ baseURL: 'http://localhost:4000' })
    this.loadData()
  }
}
</script>

<style scoped>
.json-tree-node { font-family: monospace; font-size: 13px; }
.json-tree-header { cursor: pointer; user-select: none; display: flex; align-items: center; }
.json-tree-children { border-left: 1px dashed #ccc; margin-left: 6px; padding-left: 6px; }
.json-tree-child { margin: 2px 0; }
.primitive { color: #1a237e; }

</style>
