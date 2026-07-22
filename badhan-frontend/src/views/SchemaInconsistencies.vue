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
        <div v-if="error" class="error red--text mb-4">{{ error }}</div>
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
    data: null,
    internalAxios: null
  }),
  methods: {
    async loadData () {
      this.loading = true
      this.error = null
      try {
        const resp = await this.internalAxios.get('/schema-inconsistencies')
        if (resp.status !== HTTP_STATUS.OK) {
          this.error = (resp.data && resp.data.message) || 'Failed to load data'
          this.$store.dispatch('notification/notifyError', this.error)
        } else {
          this.data = resp.data
        }
      } catch (e) {
        const msg = (e && e.response && e.response.data && (e.response.data.message || e.response.data.error)) || 'Network error'
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
