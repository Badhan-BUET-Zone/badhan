<template>
  <div :key="'backupRestore'">
    <PageTitle :title="$route.meta.title"></PageTitle>
    <Container>
      <v-card-title>
        Backup and Restore
      </v-card-title>
      <v-card-text>
        <div v-if="backupTimestampsLoaderFlag">
          <v-skeleton-loader type="card" class="mb-3"/>
          <v-skeleton-loader type="card"/>
        </div>

        <div v-else-if="backupTimestampsErrorFlag">
          <p>
            Error loading backups. Ensure the backup server is running on localhost:4000 and reload this page.
            See
            <a href="https://github.com/Badhan-BUET-Zone/badhan-admin-frontend" target="_blank" rel="noopener">setup docs</a>.
          </p>
        </div>

        <div v-else>
          <div class="mb-4 d-flex align-center flex-wrap">
            <Button
              :disabled="createNewBackupLoaderFlag"
              :click="handleCreateBackup"
              color="primary"
              icon="mdi-database-plus"
              text="Create New Backup"
            />
            <Button
              :disabled="trimBackupsLoaderFlag"
              :click="handleTrimBackups"
              color="warning"
              icon="mdi-content-cut"
              text="Trim Backups"
            />
            <Button
              :disabled="resetLocalLoaderFlag"
              :click="handleResetLocalDB"
              color="error"
              icon="mdi-database-refresh"
              text="Reset Local DB"
            />
            <Button
              :disabled="copyToLocalLoaderFlag"
              :click="handleCopyToLocal"
              color="secondary"
              icon="mdi-content-copy"
              text="Copy to Local DB"
            />
            <v-progress-circular
              v-if="createNewBackupLoaderFlag || trimBackupsLoaderFlag || resetLocalLoaderFlag || copyToLocalLoaderFlag"
              indeterminate
              color="primary"
              size="20"
              class="ml-3"
            />
          </div>

          <div v-if="backupTimestamps.length === 0">
            <p>No Backup found</p>
          </div>

          <template v-else>
            <v-subheader class="pl-0">Latest Backup</v-subheader>
            <v-card outlined class="mb-4">
              <v-card-title class="subtitle-1">{{ formatDateTime(backupTimestamps[0]) }}</v-card-title>
              <v-card-subtitle>Timestamp: {{ backupTimestamps[0] }}</v-card-subtitle>
                <v-btn class="ma-2" small color="error"
                       :loading="deleteLoaderFlagsArray[0]"
                       :disabled="anyRowBusy(0)"
                       @click="handleBackupDelete(backupTimestamps[0], 0)">
                  <v-icon left>mdi-delete</v-icon>
                  Delete
                </v-btn>
                <v-btn class="ma-2" small color="success"
                        :loading="restoreToLocalFlagsArray[0]"
                        :disabled="anyRowBusy(0)"
                        @click="handleRestoreToLocal(backupTimestamps[0], 0)">
                  <v-icon left>mdi-laptop</v-icon>
                  Restore to Local
                </v-btn>
                <v-btn class="ma-2" small color="info"
                       :loading="restoreToTestFlagsArray[0]"
                       :disabled="anyRowBusy(0)"
                       @click="handleRestoreToTest(backupTimestamps[0], 0)">
                  <v-icon left>mdi-database-import</v-icon>
                  Restore to Test
                </v-btn>
                <v-btn class="ma-2" small color="primary"
                       :loading="restoreToProductionFlagsArray[0]"
                       :disabled="anyRowBusy(0)"
                       @click="handleRestoreToProduction(backupTimestamps[0], 0)">
                  <v-icon left>mdi-cloud-upload</v-icon>
                  Restore to Production
                </v-btn>

            </v-card>

            <v-subheader class="pl-0">All Backups</v-subheader>
            <v-row>
              <v-col cols="12" md="4" v-for="(timestamp, index) in backupTimestamps" :key="timestamp">
                <v-card outlined class="mb-3">
                  <v-card-title class="subtitle-2">{{ formatDateTime(timestamp) }}</v-card-title>
                  <v-card-subtitle>Timestamp: {{ timestamp }}</v-card-subtitle>

                    <v-btn class="ma-2" x-small color="error"
                            :loading="deleteLoaderFlagsArray[index]"
                            :disabled="anyRowBusy(index)"
                            @click="handleBackupDelete(timestamp, index)">
                        <v-icon left small>mdi-delete</v-icon>
                        Delete
                    </v-btn>
                    <v-btn class="ma-2" x-small color="success"
                        :loading="restoreToLocalFlagsArray[index]"
                        :disabled="anyRowBusy(index)"
                        @click="handleRestoreToLocal(timestamp, index)">
                      <v-icon left small>mdi-laptop</v-icon>
                      Restore to Local
                    </v-btn>
                    <v-btn class="ma-2" x-small color="info"
                            :loading="restoreToTestFlagsArray[index]"
                            :disabled="anyRowBusy(index)"
                            @click="handleRestoreToTest(timestamp, index)">
                        <v-icon left small>mdi-database-import</v-icon>
                        Restore Test
                    </v-btn>
                    <v-btn class="ma-2" x-small color="primary"
                            :loading="restoreToProductionFlagsArray[index]"
                            :disabled="anyRowBusy(index)"
                            @click="handleRestoreToProduction(timestamp, index)">
                        <v-icon left small>mdi-cloud-upload</v-icon>
                        Restore Prod
                    </v-btn>

                </v-card>
              </v-col>
            </v-row>
          </template>
        </div>
      </v-card-text>
    </Container>
  </div>
</template>

<script>
import PageTitle from '../components/PageTitle'
import Container from '../components/Wrappers/Container'
import Button from '../components/UI Components/Button'
import axios from 'axios'

export default {
  name: 'BackupRestore',
  data: () => ({
  backupAPIAxios: null,
    backupTimestamps: [],
    backupTimestampsLoaderFlag: true,
    backupTimestampsErrorFlag: false,

    restoreToTestFlagsArray: [],
    restoreToProductionFlagsArray: [],
    deleteLoaderFlagsArray: [],
    restoreToLocalFlagsArray: [],

    createNewBackupLoaderFlag: false,
    trimBackupsLoaderFlag: false,
  copyToLocalLoaderFlag: false,
  resetLocalLoaderFlag: false,
  }),
  computed: {
  },
  methods: {
    formatDateTime (ts) {
      if (!ts) return ''
      try {
        return new Date(Number(ts)).toLocaleString()
      } catch (_e) {
        return String(ts)
      }
    },
    anyRowBusy (index) {
    return !!(this.deleteLoaderFlagsArray[index] || this.restoreToTestFlagsArray[index] || this.restoreToProductionFlagsArray[index] || this.restoreToLocalFlagsArray[index])
    },
    initRowFlags (length) {
  this.deleteLoaderFlagsArray = Array(length).fill(false)
  this.restoreToProductionFlagsArray = Array(length).fill(false)
  this.restoreToTestFlagsArray = Array(length).fill(false)
  this.restoreToLocalFlagsArray = Array(length).fill(false)
    },
    setFlagForSpecificIndex (arr, index) {
      const copy = [...arr]
      copy[index] = true
      return copy
    },
    async loadBackups () {
      this.backupTimestampsLoaderFlag = true
      this.backupTimestampsErrorFlag = false
      try {
        const response = await this.backupAPIAxios.get('/backup')
        this.backupTimestampsLoaderFlag = false
        if (response.status !== 200) {
          this.backupTimestampsErrorFlag = true
          this.$store.dispatch('notification/notifyError', response.data.message)
          return
        }
        const list = response.data.backups || (response.data.data && response.data.data.backups) || []
        this.backupTimestamps = list
        this.initRowFlags(list.length)
        this.$store.dispatch('notification/notifySuccess', 'Successfully loaded backups')
      } catch (e) {
        this.backupTimestampsLoaderFlag = false
        this.backupTimestampsErrorFlag = true
        const msg = (e && e.response && e.response.data && e.response.data.message) ? e.response.data.message : 'Unknown error occured'
        this.$store.dispatch('notification/notifyError', msg)
      }
    },
    async handleBackupDelete (timestamp, index) {
      this.deleteLoaderFlagsArray = this.setFlagForSpecificIndex(this.deleteLoaderFlagsArray, index)
      try {
        const response = await this.backupAPIAxios.delete(`/backup/date/${timestamp}`)
        this.initRowFlags(this.backupTimestamps.length)
        if (response.status !== 200) {
          this.$store.dispatch('notification/notifyError', response.data.message)
          return
        }
        this.backupTimestamps = this.backupTimestamps.filter(t => t !== timestamp)
        this.initRowFlags(this.backupTimestamps.length)
        this.$store.dispatch('notification/notifySuccess', 'Successfully deleted backup')
      } catch (e) {
        this.initRowFlags(this.backupTimestamps.length)
        const msg = (e && e.response && e.response.data && e.response.data.message) ? e.response.data.message : 'Unknown error occured'
        this.$store.dispatch('notification/notifyError', msg)
      }
    },
    async handleRestoreToTest (timestamp, index) {
      this.restoreToTestFlagsArray = this.setFlagForSpecificIndex(this.restoreToTestFlagsArray, index)
      try {
        const response = await this.backupAPIAxios.post(`/restore/${timestamp}?development=true`)
        this.initRowFlags(this.backupTimestamps.length)
        if (response.status !== 200) {
          this.$store.dispatch('notification/notifyError', response.data.message)
          return
        }
        this.$store.dispatch('notification/notifySuccess', 'Successfully restored backup to test environment')
      } catch (e) {
        this.initRowFlags(this.backupTimestamps.length)
        const msg = (e && e.response && e.response.data && e.response.data.message) ? e.response.data.message : 'Unknown error occured'
        this.$store.dispatch('notification/notifyError', msg)
      }
    },
    async handleRestoreToProduction (timestamp, index) {
      this.restoreToProductionFlagsArray = this.setFlagForSpecificIndex(this.restoreToProductionFlagsArray, index)
      try {
        const response = await this.backupAPIAxios.post(`/restore/${timestamp}?production=true`)
        this.initRowFlags(this.backupTimestamps.length)
        if (response.status !== 200) {
          this.$store.dispatch('notification/notifyError', response.data.message)
          return
        }
        this.$store.dispatch('notification/notifySuccess', 'Successfully restored backup to production environment')
      } catch (e) {
        this.initRowFlags(this.backupTimestamps.length)
        const msg = (e && e.response && e.response.data && e.response.data.message) ? e.response.data.message : 'Unknown error occured'
        this.$store.dispatch('notification/notifyError', msg)
      }
      },
      async handleRestoreToLocal (timestamp, index) {
        this.restoreToLocalFlagsArray = this.setFlagForSpecificIndex(this.restoreToLocalFlagsArray, index)
        try {
          const response = await this.backupAPIAxios.post(`/restore/${timestamp}`)
          this.initRowFlags(this.backupTimestamps.length)
          if (response.status !== 200) {
            this.$store.dispatch('notification/notifyError', response.data.message)
            return
          }
          this.$store.dispatch('notification/notifySuccess', 'Successfully restored backup to local environment')
        } catch (e) {
          this.initRowFlags(this.backupTimestamps.length)
          const msg = (e && e.response && e.response.data && e.response.data.message) ? e.response.data.message : 'Unknown error occured'
          this.$store.dispatch('notification/notifyError', msg)
        }
    },
    async handleCreateBackup () {
      this.createNewBackupLoaderFlag = true
      try {
        const response = await this.backupAPIAxios.post('/backup')
        this.createNewBackupLoaderFlag = false
        if (response.status !== 201) {
          this.$store.dispatch('notification/notifyError', response.data.message)
          return
        }
        const createdAt = response.data.time || (response.data.data && response.data.data.time)
        if (createdAt) this.backupTimestamps = [createdAt, ...this.backupTimestamps]
        this.initRowFlags(this.backupTimestamps.length)
        this.$store.dispatch('notification/notifySuccess', 'Successfully created backup')
      } catch (e) {
        this.createNewBackupLoaderFlag = false
        const msg = (e && e.response && e.response.data && e.response.data.message) ? e.response.data.message : 'Unknown error occured'
        this.$store.dispatch('notification/notifyError', msg)
      }
    },
    async handleTrimBackups () {
      this.trimBackupsLoaderFlag = true
      try {
        const response = await this.backupAPIAxios.delete('/backup/old')
        this.trimBackupsLoaderFlag = false
        if (response.status !== 200) {
          this.$store.dispatch('notification/notifyError', response.data.message)
          return
        }
        this.backupTimestamps = this.backupTimestamps.slice(0, 3)
        this.initRowFlags(this.backupTimestamps.length)
        this.$store.dispatch('notification/notifySuccess', 'Successfully trimmed backups')
      } catch (e) {
        this.trimBackupsLoaderFlag = false
        const msg = (e && e.response && e.response.data && e.response.data.message) ? e.response.data.message : 'Unknown error occured'
        this.$store.dispatch('notification/notifyError', msg)
      }
    }
    ,
    async handleResetLocalDB () {
      this.resetLocalLoaderFlag = true
      try {
        const response = await this.backupAPIAxios.post('/reset-local-db')
        const response2 = await this.backupAPIAxios.post('/populate-local-db')
        this.resetLocalLoaderFlag = false
        if (response.status !== 200) {
          this.$store.dispatch('notification/notifyError', response.data.message)
          return
        }
        if(response2.status !== 200){
          this.$store.dispatch('notification/notifyError', response2.data.message)
          return
        }
        this.$store.dispatch('notification/notifySuccess', 'Successfully reset local database')
      } catch (e) {
        this.resetLocalLoaderFlag = false
        const msg = (e && e.response && e.response.data && e.response.data.message) ? e.response.data.message : 'Unknown error occured'
        this.$store.dispatch('notification/notifyError', msg)
      }
    },
    async handleCopyToLocal () {
      this.copyToLocalLoaderFlag = true
      try {
        // Step 1: Create a new backup
        const backupResponse = await this.backupAPIAxios.post('/backup')
        if (backupResponse.status !== 201) {
          this.copyToLocalLoaderFlag = false
          this.$store.dispatch('notification/notifyError', backupResponse.data.message || 'Failed to create backup')
          return
        }
        const createdAt = backupResponse.data.time || (backupResponse.data.data && backupResponse.data.data.time)
        if (createdAt) {
          this.backupTimestamps = [createdAt, ...this.backupTimestamps]
          this.initRowFlags(this.backupTimestamps.length)
        }
        // Step 2: Restore that backup to local
        const restoreResponse = await this.backupAPIAxios.post(`/restore/${createdAt}`)
        this.copyToLocalLoaderFlag = false
        if (restoreResponse.status !== 200) {
          this.$store.dispatch('notification/notifyError', restoreResponse.data.message || 'Failed to restore newly created backup locally')
          return
        }
        this.$store.dispatch('notification/notifySuccess', 'Successfully copied to local database')
      } catch (e) {
        this.copyToLocalLoaderFlag = false
        const msg = (e && e.response && e.response.data && e.response.data.message) ? e.response.data.message : 'Unknown error occured during copy to local'
        this.$store.dispatch('notification/notifyError', msg)
      }
    }
  },
  components: {
    Button,
    Container,
    PageTitle,
  },
  mounted () {
    // local axios for backup API
    this.backupAPIAxios = axios.create({ baseURL: 'http://localhost:4000' })
    this.loadBackups()
  }
}
</script>

<style scoped>

</style>
