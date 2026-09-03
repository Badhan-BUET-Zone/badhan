<template>
  <div :key="'backupRestore'">
    <PageTitle :title="$route.meta.title"></PageTitle>
    <Container>
      <v-card-title>
        Backup and Restore
      </v-card-title>
      <v-card-text>
        <!--
          Four states of one thing — loading, no credentials, unreachable, loaded — so they are
          branches of a single transition rather than four independent v-ifs. mode="out-in" keeps
          the outgoing one from still leaving while the next is already arriving, which is what
          makes a card jump the moment the first is finally removed from the flow.
        -->
        <transition name="slide-fade-down-snapout" mode="out-in">
        <div v-if="backupTimestampsLoaderFlag" :key="'backupsLoading'">
          <v-skeleton-loader type="card" class="mb-3 rounded-xl"/>
          <v-skeleton-loader type="card" class="rounded-xl"/>
        </div>

        <div v-else-if="firebaseCredentialsMissing" :key="'backupsFirebase'">
          <v-alert type="warning" outlined class="rounded-xl">
            <p class="font-weight-medium mb-2">Firebase credentials not found</p>
            <p class="mb-2">
              The backup server needs a Firebase service account file to reach cloud storage.
              Expected at: <code>{{ firebaseError.expectedPath }}</code>
            </p>
            <ol class="mb-0">
              <li v-for="(step, i) in firebaseError.instructions" :key="i">{{ step }}</li>
            </ol>
          </v-alert>
        </div>

        <div v-else-if="backupTimestampsErrorFlag" :key="'backupsError'">
          <p>
            Error loading backups. Ensure the backup server is running on localhost:4000 and reload this page.
            See
            <a href="https://github.com/Badhan-BUET-Zone/badhan#run-the-code" target="_blank" rel="noopener">setup docs</a>.
          </p>
        </div>

        <div v-else :key="'backupsLoaded'">
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
              :disabled="resetDevelopmentLoaderFlag"
              :click="handleResetDevelopmentDB"
              color="error"
              icon="mdi-database-refresh"
              text="Reset Development DB"
            />
            <Button
              :disabled="copyToLocalLoaderFlag"
              :click="handleCopyToLocal"
              color="secondary"
              icon="mdi-content-copy"
              text="Copy to Local DB"
            />
            <!-- Fades rather than blinking: it sits in a row of buttons, and a spinner that
                 appears and vanishes between them reads as the row twitching. -->
            <transition name="fade">
              <v-progress-circular
                v-if="createNewBackupLoaderFlag || trimBackupsLoaderFlag || resetLocalLoaderFlag || resetDevelopmentLoaderFlag || copyToLocalLoaderFlag"
                indeterminate
                color="primary"
                size="20"
                class="ml-3"
              />
            </transition>
          </div>

          <transition name="slide-fade-down" mode="out-in">
          <div v-if="backupTimestamps.length === 0" :key="'backupsEmpty'">
            <p>No Backup found</p>
          </div>

          <div v-else :key="'backupsList'">
            <v-subheader class="pl-0">Latest Backup</v-subheader>
            <!-- Keyed on the timestamp, so creating a backup or deleting the newest one swaps this
                 card instead of silently rewriting the one already on screen. -->
            <transition name="slide-fade-down" mode="out-in">
            <v-card outlined class="mb-4 rounded-xl" :key="backupTimestamps[0]">
              <v-card-title class="subtitle-1">{{ formatDateTime(backupTimestamps[0]) }}</v-card-title>
              <v-card-subtitle>Timestamp: {{ backupTimestamps[0] }}</v-card-subtitle>
                <v-btn rounded class="ma-2" small color="error"
                       :loading="deleteLoaderFlagsArray[0]"
                       :disabled="anyRowBusy(0)"
                       @click="handleBackupDelete(backupTimestamps[0], 0)">
                  <v-icon left>mdi-delete</v-icon>
                  Delete
                </v-btn>
                <v-btn rounded class="ma-2" small color="success"
                        :loading="restoreToLocalFlagsArray[0]"
                        :disabled="anyRowBusy(0)"
                        @click="handleRestoreToLocal(backupTimestamps[0], 0)">
                  <v-icon left>mdi-laptop</v-icon>
                  Restore to Local
                </v-btn>
                <v-btn rounded class="ma-2" small color="info"
                       :loading="restoreToDevelopmentFlagsArray[0]"
                       :disabled="anyRowBusy(0)"
                       @click="handleRestoreToDevelopment(backupTimestamps[0], 0)">
                  <v-icon left>mdi-database-import</v-icon>
                  Restore to Development
                </v-btn>
                <v-btn rounded class="ma-2" small color="primary"
                       :loading="restoreToProductionFlagsArray[0]"
                       :disabled="anyRowBusy(0)"
                       @click="handleRestoreToProduction(backupTimestamps[0], 0)">
                  <v-icon left>mdi-cloud-upload</v-icon>
                  Restore to Production
                </v-btn>

            </v-card>
            </transition>

            <v-subheader class="pl-0">All Backups</v-subheader>
            <!-- The v-row is the transition-group itself (`row` is all v-row renders), so a
                 deleted or trimmed card leaves on its own and the rest glide into the gap it
                 left rather than jumping across the grid. -->
            <transition-group name="backup-grid" tag="div" class="row">
              <v-col cols="12" md="4" v-for="(timestamp, index) in backupTimestamps" :key="timestamp">
                <v-card outlined class="mb-3 rounded-xl">
                  <v-card-title class="subtitle-2">{{ formatDateTime(timestamp) }}</v-card-title>
                  <v-card-subtitle>Timestamp: {{ timestamp }}</v-card-subtitle>

                    <v-btn rounded class="ma-2" x-small color="error"
                            :loading="deleteLoaderFlagsArray[index]"
                            :disabled="anyRowBusy(index)"
                            @click="handleBackupDelete(timestamp, index)">
                        <v-icon left small>mdi-delete</v-icon>
                        Delete
                    </v-btn>
                    <v-btn rounded class="ma-2" x-small color="success"
                        :loading="restoreToLocalFlagsArray[index]"
                        :disabled="anyRowBusy(index)"
                        @click="handleRestoreToLocal(timestamp, index)">
                      <v-icon left small>mdi-laptop</v-icon>
                      Restore to Local
                    </v-btn>
                    <v-btn rounded class="ma-2" x-small color="info"
                            :loading="restoreToDevelopmentFlagsArray[index]"
                            :disabled="anyRowBusy(index)"
                            @click="handleRestoreToDevelopment(timestamp, index)">
                        <v-icon left small>mdi-database-import</v-icon>
                        Restore to Development
                    </v-btn>
                    <v-btn rounded class="ma-2" x-small color="primary"
                            :loading="restoreToProductionFlagsArray[index]"
                            :disabled="anyRowBusy(index)"
                            @click="handleRestoreToProduction(timestamp, index)">
                        <v-icon left small>mdi-cloud-upload</v-icon>
                        Restore to Production
                    </v-btn>

                </v-card>
              </v-col>
            </transition-group>
          </div>
          </transition>
        </div>
        </transition>
      </v-card-text>
    </Container>
  </div>
</template>

<script>
import PageTitle from '@/components/PageTitle'
import Container from '@/components/Container/Container'
import Button from '@/components/UI Components/Button'
import axios from 'axios'
import { HTTP_STATUS } from '@/mixins/constants'

export default {
  name: 'BackupRestore',
  data: () => ({
  backupAPIAxios: null,
    backupTimestamps: [],
    backupTimestampsLoaderFlag: true,
    backupTimestampsErrorFlag: false,
    firebaseError: null,

    restoreToDevelopmentFlagsArray: [],
    restoreToProductionFlagsArray: [],
    deleteLoaderFlagsArray: [],
    restoreToLocalFlagsArray: [],

    createNewBackupLoaderFlag: false,
    trimBackupsLoaderFlag: false,
  copyToLocalLoaderFlag: false,
  resetLocalLoaderFlag: false,
  resetDevelopmentLoaderFlag: false,
  }),
  computed: {
    firebaseCredentialsMissing () {
      return !!this.firebaseError
    }
  },
  methods: {
    // The backend replies 503 with reason FIREBASE_CREDENTIALS_MISSING when the
    // service account file is absent. Returns the payload if that is the case.
    extractFirebaseError (e) {
      const data = e && e.response && e.response.data
      if (data && data.reason === 'FIREBASE_CREDENTIALS_MISSING') {
        return {
          expectedPath: data.expectedPath,
          instructions: data.instructions || []
        }
      }
      return null
    },
    formatDateTime (ts) {
      if (!ts) return ''
      try {
        return new Date(Number(ts)).toLocaleString()
      } catch (_e) {
        return String(ts)
      }
    },
    anyRowBusy (index) {
    return !!(this.deleteLoaderFlagsArray[index] || this.restoreToDevelopmentFlagsArray[index] || this.restoreToProductionFlagsArray[index] || this.restoreToLocalFlagsArray[index])
    },
    initRowFlags (length) {
  this.deleteLoaderFlagsArray = Array(length).fill(false)
  this.restoreToProductionFlagsArray = Array(length).fill(false)
  this.restoreToDevelopmentFlagsArray = Array(length).fill(false)
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
      this.firebaseError = null
      try {
        const response = await this.backupAPIAxios.get('/backup')
        this.backupTimestampsLoaderFlag = false
        if (response.status !== HTTP_STATUS.OK) {
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
        this.firebaseError = this.extractFirebaseError(e)
        const msg = (e && e.response && e.response.data && e.response.data.message) ? e.response.data.message : 'Unknown error occured'
        this.$store.dispatch('notification/notifyError', msg)
      }
    },
    async handleBackupDelete (timestamp, index) {
      this.deleteLoaderFlagsArray = this.setFlagForSpecificIndex(this.deleteLoaderFlagsArray, index)
      try {
        const response = await this.backupAPIAxios.delete(`/backup/date/${timestamp}`)
        this.initRowFlags(this.backupTimestamps.length)
        if (response.status !== HTTP_STATUS.OK) {
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
    async handleRestoreToDevelopment (timestamp, index) {
      this.restoreToDevelopmentFlagsArray = this.setFlagForSpecificIndex(this.restoreToDevelopmentFlagsArray, index)
      try {
        const response = await this.backupAPIAxios.post(`/restore/${timestamp}?environment=development`)
        this.initRowFlags(this.backupTimestamps.length)
        if (response.status !== HTTP_STATUS.OK) {
          this.$store.dispatch('notification/notifyError', response.data.message)
          return
        }
        this.$store.dispatch('notification/notifySuccess', 'Successfully restored backup to development environment')
      } catch (e) {
        this.initRowFlags(this.backupTimestamps.length)
        const msg = (e && e.response && e.response.data && e.response.data.message) ? e.response.data.message : 'Unknown error occured'
        this.$store.dispatch('notification/notifyError', msg)
      }
    },
    async handleRestoreToProduction (timestamp, index) {
      this.restoreToProductionFlagsArray = this.setFlagForSpecificIndex(this.restoreToProductionFlagsArray, index)
      try {
        const response = await this.backupAPIAxios.post(`/restore/${timestamp}?environment=production`)
        this.initRowFlags(this.backupTimestamps.length)
        if (response.status !== HTTP_STATUS.OK) {
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
          const response = await this.backupAPIAxios.post(`/restore/${timestamp}?environment=local`)
          this.initRowFlags(this.backupTimestamps.length)
          if (response.status !== HTTP_STATUS.OK) {
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
        if (response.status !== HTTP_STATUS.CREATED) {
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
        if (response.status !== HTTP_STATUS.OK) {
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
    // A reset is the purge and the reseed together: an emptied database with no super admin in
    // it is a database nobody can log in to, so the two are never offered separately here.
    async resetDatabase (environment, loaderFlagName) {
      this[loaderFlagName] = true
      try {
        const response = await this.backupAPIAxios.post(`/purge-${environment}-db`)
        const response2 = await this.backupAPIAxios.post(`/populate-${environment}-db`)
        this[loaderFlagName] = false
        if (response.status !== HTTP_STATUS.OK) {
          this.$store.dispatch('notification/notifyError', response.data.message)
          return
        }
        if (response2.status !== HTTP_STATUS.OK) {
          this.$store.dispatch('notification/notifyError', response2.data.message)
          return
        }
        this.$store.dispatch('notification/notifySuccess', `Successfully reset ${environment} database`)
      } catch (e) {
        this[loaderFlagName] = false
        const msg = (e && e.response && e.response.data && e.response.data.message) ? e.response.data.message : 'Unknown error occured'
        this.$store.dispatch('notification/notifyError', msg)
      }
    },
    async handleResetLocalDB () {
      await this.resetDatabase('local', 'resetLocalLoaderFlag')
    },
    async handleResetDevelopmentDB () {
      await this.resetDatabase('development', 'resetDevelopmentLoaderFlag')
    },
    async handleCopyToLocal () {
      this.copyToLocalLoaderFlag = true
      try {
        // Step 1: Create a new backup
        const backupResponse = await this.backupAPIAxios.post('/backup')
        if (backupResponse.status !== HTTP_STATUS.CREATED) {
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
        const restoreResponse = await this.backupAPIAxios.post(`/restore/${createdAt}?environment=local`)
        this.copyToLocalLoaderFlag = false
        if (restoreResponse.status !== HTTP_STATUS.OK) {
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
    // local axios for backup API. In guest mode, hit the internal server's /guest
    // routes so no real backup/restore/firebase/DB operation is performed.
    const baseURL = this.$store.getters['getIsGuest']
      ? 'http://localhost:4000/guest'
      : 'http://localhost:4000'
    this.backupAPIAxios = axios.create({ baseURL })
    this.loadBackups()
  }
}
</script>

<style scoped>
/* The app-wide slide-fade-down with one addition: a -move rule, so the cards still on screen
   travel to their new grid positions after one is removed instead of appearing there. */
.backup-grid-enter-active {
  transition: all .3s ease;
}

.backup-grid-leave-active {
  transition: all .3s cubic-bezier(1.0, 0.5, 0.8, 1.0);
}

.backup-grid-enter, .backup-grid-leave-to {
  transform: translateY(-40px);
  opacity: 0;
}

.backup-grid-move {
  transition: transform .3s ease;
}
</style>
