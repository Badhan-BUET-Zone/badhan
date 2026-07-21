<template>
  <div>
    <PageTitle />

    <ContainerFlat>
      <v-card-text>
        <div class="d-flex align-center flex-wrap">
          <!-- data-cy on the wrapper: Vuetify binds fallthrough attrs onto the inner
               <input>, so the hook must sit here for [data-cy] input[type=file] to resolve. -->
          <div data-cy="csvFileInputId" class="flex-grow-1">
            <v-file-input
              id="csvFileInputId"
              v-model="selectedFile"
              accept=".csv"
              label="Select a CSV file of donors"
              prepend-icon="mdi-file-delimited"
              show-size
              :disabled="uploading"
              @change="onFileSelected"
            />
          </div>
          <v-btn
            text
            rounded
            color="primary"
            class="ml-2"
            data-cy="csvDownloadDemoButton"
            @click="downloadDemo"
          >
            <v-icon left>mdi-download</v-icon>
            Download demo CSV
          </v-btn>
        </div>

        <v-expansion-panels v-model="helpPanel" flat class="mt-2">
          <v-expansion-panel data-cy="csvHelpPanel">
            <v-expansion-panel-header>CSV format</v-expansion-panel-header>
            <v-expansion-panel-content>
              <div class="csv-scroll">
                <v-simple-table dense>
                  <thead>
                    <tr>
                      <th>Column</th>
                      <th>Required</th>
                      <th>Accepted format — nothing else</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="help in formatHelp" :key="help.column">
                      <td class="font-weight-medium">{{ help.column }}</td>
                      <td>{{ help.required }}</td>
                      <td>{{ help.accepted }}</td>
                    </tr>
                  </tbody>
                </v-simple-table>
              </div>
            </v-expansion-panel-content>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card-text>
    </ContainerFlat>

    <!-- While parsing (and the Phase 5 pre-flight) show only the default loader. -->
    <LoadingMessage v-if="loading" />

    <v-fade-transition mode="out-in">
      <v-alert v-if="fileError" type="error" class="ma-2" data-cy="csvFileErrorAlert">
        {{ fileError }}
      </v-alert>
    </v-fade-transition>

    <template v-if="reviewReady && !loading">
      <!-- Upload All + progress -->
      <ContainerFlat>
        <v-card-text>
          <div class="d-flex align-center flex-wrap">
            <v-btn
              id="csvUploadAllButtonId"
              data-cy="csvUploadAllButtonId"
              color="primary"
              rounded
              :loading="uploading"
              :disabled="uploading || table1.length === 0 || runCancelled"
              @click="uploadAll"
            >
              <v-icon left>mdi-cloud-upload</v-icon>
              Upload All
            </v-btn>
            <v-btn
              v-if="uploading"
              color="error"
              rounded
              outlined
              class="ml-2"
              data-cy="csvCancelButton"
              @click="cancelUpload"
            >
              <v-icon left>mdi-stop</v-icon>
              Cancel
            </v-btn>
            <span v-if="table1.length === 0 && !uploading" class="ml-3 text--secondary" data-cy="csvNoNewDonorsHint">
              No new donors to upload
            </span>
            <span v-else-if="runCancelled && !uploading" class="ml-3 text--secondary" data-cy="csvCancelledHint">
              Run cancelled — select the file again to upload the rest.
            </span>
            <div v-if="uploading" class="ml-4 flex-grow-1" style="min-width: 200px">
              <v-progress-linear
                :value="uploadTotal ? (uploadProgress / uploadTotal) * 100 : 0"
                height="20"
                rounded
                color="primary"
              >
                {{ uploadProgress }} / {{ uploadTotal }}
              </v-progress-linear>
            </div>
          </div>
        </v-card-text>
      </ContainerFlat>

      <!-- Table 1: donors to be created -->
      <v-expand-transition>
        <Container v-if="table1.length">
          <v-card-title data-cy="csvToCreateHeading">{{ table1.length }} of {{ totalRows }} donors to be created</v-card-title>
          <div class="csv-scroll">
            <v-simple-table dense>
              <thead>
                <tr>
                  <th>#</th>
                  <th v-for="col in donorColumns" :key="col.key">{{ col.text }}</th>
                  <th>Status</th>
                </tr>
              </thead>
              <v-fade-transition group tag="tbody">
                <tr v-for="row in table1" :key="row.line" data-cy="csvToCreateRow">
                  <td>{{ row.line }}</td>
                  <td v-for="col in donorColumns" :key="col.key">{{ row.raw[col.key] }}</td>
                  <td data-cy="csvStatusCell">
                    <v-chip x-small :color="statusColor(row.uploadStatus)" dark>
                      <v-progress-circular v-if="row.uploadStatus === 'uploading'" indeterminate size="12" width="2" class="mr-1" />
                      {{ statusLabel(row.uploadStatus) }}
                    </v-chip>
                  </td>
                </tr>
              </v-fade-transition>
            </v-simple-table>
          </div>
        </Container>
      </v-expand-transition>

      <!-- Table 2: donors that already exist -->
      <v-expand-transition>
        <Container v-if="table2.length">
          <v-card-title data-cy="csvExistingHeading">{{ table2.length }} of {{ totalRows }} donors already exist</v-card-title>
          <div class="csv-scroll">
            <v-simple-table dense>
              <thead>
                <tr>
                  <th>#</th>
                  <th v-for="col in donorColumns" :key="col.key">{{ col.text }}</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <v-fade-transition group tag="tbody">
                <tr v-for="row in table2" :key="row.line" data-cy="csvExistingRow">
                  <td>{{ row.line }}</td>
                  <td v-for="col in donorColumns" :key="col.key">{{ row.raw[col.key] }}</td>
                  <td>
                    <v-chip x-small :color="row.existenceStatus === 'created' ? 'success' : 'info'" dark>
                      {{ row.existenceStatus === 'created' ? 'Just created' : 'Already exists' }}
                    </v-chip>
                  </td>
                  <td>
                    <v-btn
                      v-if="row.donorId && row.donorId !== 'FORBIDDEN'"
                      x-small
                      rounded
                      color="primary"
                      data-cy="csvSeeDonorButton"
                      @click="seeDonor(row.donorId)"
                    >
                      See Donor
                    </v-btn>
                    <span v-else-if="row.donorId === 'FORBIDDEN'" class="text--secondary text-caption">
                      Exists in another hall — you do not have permission to view this donor.
                    </span>
                  </td>
                </tr>
              </v-fade-transition>
            </v-simple-table>
          </div>
        </Container>
      </v-expand-transition>

      <!-- Table 3: broken rows -->
      <v-expand-transition>
        <Container v-if="table3.length">
          <v-card-title data-cy="csvErrorHeading">
            {{ table3.length }} of {{ totalRows }} rows have errors and were not uploaded
            <v-spacer />
            <v-btn
              text
              rounded
              small
              color="primary"
              data-cy="csvDownloadFailedButton"
              @click="downloadFailed"
            >
              <v-icon left>mdi-download</v-icon>
              Download failed rows as CSV
            </v-btn>
          </v-card-title>
          <div class="csv-scroll">
            <v-simple-table dense>
              <thead>
                <tr>
                  <th>#</th>
                  <th v-for="col in donorColumns" :key="col.key">{{ col.text }}</th>
                </tr>
              </thead>
              <v-fade-transition group tag="tbody">
                <template v-for="row in table3">
                  <tr :key="row.line + '-values'" data-cy="csvErrorRow">
                    <td>{{ row.line }}</td>
                    <td
                      v-for="col in donorColumns"
                      :key="col.key"
                      :class="{ 'error lighten-4 font-weight-bold': row.errorFields.indexOf(col.key) !== -1 }"
                    >{{ row.raw[col.key] }}</td>
                  </tr>
                  <tr :key="row.line + '-errors'" data-cy="csvErrorArea">
                    <td :colspan="donorColumns.length + 1" class="pa-2">
                      <div v-for="(err, i) in row.errors" :key="i" class="error--text text-caption">
                        <strong>{{ err.field }}:</strong> {{ err.message }}
                      </div>
                    </td>
                  </tr>
                </template>
              </v-fade-transition>
            </v-simple-table>
          </div>
        </Container>
      </v-expand-transition>
    </template>
  </div>
</template>

<script>
import PageTitle from '@/components/PageTitle'
import Container from '@/components/Container/Container'
import ContainerFlat from '@/components/Container/ContainerFlat'
import LoadingMessage from '@/components/LoadingMessage'
import { parseDonorCsv, toDonorCsv, DEMO_CSV } from '@/utils/donorCsv'
import { handlePOSTDonors, handleGETDonorsPhoneList } from '@/api'
import { environmentService } from '@/mixins/environment'
import { createNewPopUpWindow, textFileDownloadInWeb } from '@/mixins/helpers'

export default {
  name: 'CsvDonorCreation',
  components: {
    PageTitle,
    Container,
    ContainerFlat,
    LoadingMessage
  },
  data () {
    return {
      selectedFile: null,
      loading: false,
      fileError: null,
      reviewReady: false,
      table1: [], // donors to be created
      table2: [], // donors that already exist
      table3: [], // broken rows
      uploading: false,
      uploadProgress: 0,
      uploadTotal: 0,
      cancelRequested: false,
      runCancelled: false,
      helpPanel: 0, // 0 = expanded until a file is selected, then null (collapsed)
      formatHelp: [
        { column: 'name', required: 'yes', accepted: 'text (non-blank)' },
        { column: 'phone', required: 'yes', accepted: '13 digits, 8801XXXXXXXXX' },
        { column: 'studentId', required: 'yes', accepted: '7 digits, e.g. 1605011' },
        { column: 'bloodGroup', required: 'yes', accepted: 'A+ A- B+ B- O+ O- AB+ AB-' },
        { column: 'hall', required: 'yes', accepted: 'Ahsanullah, Chatri, Nazrul, Rashid, Sher-e-Bangla, Suhrawardy, Titumir, Unknown' },
        { column: 'roomNumber', required: 'no', accepted: 'text; blank → (Unknown)' },
        { column: 'address', required: 'no', accepted: 'text; blank → (Unknown)' },
        { column: 'comment', required: 'no', accepted: 'text; blank → (Unknown)' },
        { column: 'donationCount', required: 'yes', accepted: 'integer 0–99 (total donations)' },
        { column: 'lastDonation', required: 'if count > 0', accepted: '23 September 2010 (<day> <Month> <year>)' },
        { column: 'plateletDonationCount', required: 'yes', accepted: 'integer 0–99 (total platelets)' },
        { column: 'lastPlateletDonation', required: 'if count > 0', accepted: '23 September 2010 (<day> <Month> <year>)' },
        { column: 'availableToAll', required: 'yes', accepted: 'yes or no' }
      ],
      donorColumns: [
        { text: 'Name', key: 'name' },
        { text: 'Phone', key: 'phone' },
        { text: 'Student ID', key: 'studentId' },
        { text: 'Blood Group', key: 'bloodGroup' },
        { text: 'Hall', key: 'hall' },
        { text: 'Room', key: 'roomNumber' },
        { text: 'Address', key: 'address' },
        { text: 'Comment', key: 'comment' },
        { text: 'Donations', key: 'donationCount' },
        { text: 'Last Donation', key: 'lastDonation' },
        { text: 'Platelets', key: 'plateletDonationCount' },
        { text: 'Last Platelet', key: 'lastPlateletDonation' },
        { text: 'Public', key: 'availableToAll' }
      ]
    }
  },
  computed: {
    totalRows () {
      return this.table1.length + this.table2.length + this.table3.length
    }
  },
  methods: {
    resetView () {
      this.fileError = null
      this.reviewReady = false
      this.table1 = []
      this.table2 = []
      this.table3 = []
      this.uploading = false
      this.uploadProgress = 0
      this.uploadTotal = 0
      this.cancelRequested = false
      this.runCancelled = false
    },
    readFileAsText (file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(reader.error)
        reader.readAsText(file, 'UTF-8')
      })
    },
    async onFileSelected (file) {
      // Selecting a file — including re-selecting after a finished run — fully resets first.
      this.resetView()
      this.helpPanel = null // collapse the "CSV format" help once a file is chosen
      if (!file) return

      this.loading = true
      let text
      try {
        text = await this.readFileAsText(file)
      } catch (e) {
        this.loading = false
        this.fileError = 'Could not read the file.'
        return
      }

      const result = parseDonorCsv(text)
      if ('fileError' in result) {
        this.loading = false
        this.fileError = result.fileError
        return
      }

      // Broken wins: a row failing client validation goes straight to Table 3 and is
      // never pre-flighted. Only valid rows contribute a phone.
      const brokenRows = []
      const validRows = []
      for (const csvRow of result.rows) {
        if (csvRow.status === 'broken') brokenRows.push(this.makeRow(csvRow))
        else validRows.push(this.makeRow(csvRow))
      }

      // Pre-flight existence check, chunked 100/sequential — the loader stays visible and
      // nothing renders until it finishes. Any chunk failure fails the whole pre-flight
      // (single alert, no tables, no retry); re-selecting the file is the only way forward.
      const phones = validRows.map(row => String(row.normalized.phone))
      const preflight = await handleGETDonorsPhoneList(phones)
      if (!preflight || preflight.status !== 200) {
        this.loading = false
        this.fileError = preflight && preflight.data && preflight.data.message
          ? 'Could not check which donors already exist: ' + preflight.data.message
          : 'Could not check which donors already exist. Please select the file again.'
        return
      }

      const existing = new Map()
      for (const donor of preflight.data.donors) existing.set(donor.phone, donor.donorId)

      this.table3 = brokenRows
      for (const row of validRows) {
        if (existing.has(row.normalized.phone)) {
          row.existenceStatus = 'existed'
          row.donorId = existing.get(row.normalized.phone)
          this.table2.push(row)
        } else {
          this.table1.push(row)
        }
      }

      this.loading = false
      this.reviewReady = true
    },
    makeRow (csvRow) {
      return {
        line: csvRow.line,
        raw: csvRow.raw,
        normalized: csvRow.normalized,
        errors: csvRow.errors,
        errorFields: csvRow.errors.map(e => e.field),
        uploadStatus: 'pending',
        existenceStatus: null,
        donorId: null
      }
    },
    async uploadAll () {
      this.uploading = true
      this.cancelRequested = false
      const queue = this.table1.slice()
      this.uploadTotal = queue.length
      this.uploadProgress = 0

      for (const row of queue) {
        // Cancel stops before the next request; the in-flight one already completed.
        if (this.cancelRequested) {
          this.runCancelled = true
          break
        }
        row.uploadStatus = 'uploading'
        const response = await handlePOSTDonors(row.normalized)

        const idx = this.table1.indexOf(row)
        if (idx !== -1) this.table1.splice(idx, 1)

        if (response && response.status === 201) {
          row.uploadStatus = 'created'
          row.existenceStatus = 'created'
          row.donorId = response.data && response.data.newDonor ? response.data.newDonor._id : null
          this.table2.push(row)
        } else if (response && response.status === 409) {
          row.uploadStatus = 'duplicate'
          row.existenceStatus = 'existed'
          row.donorId = response.data && response.data.donorId ? response.data.donorId : null
          this.table2.push(row)
        } else {
          row.uploadStatus = 'rejected'
          const message = response && response.data && response.data.message ? response.data.message : 'Upload failed'
          row.errors = row.errors.concat([{ field: 'server', message }])
          row.errorFields = row.errors.map(e => e.field)
          this.table3.push(row)
        }
        this.uploadProgress++
      }

      this.uploading = false
    },
    cancelUpload () {
      // No resume: the loop breaks before the next request and Upload All stays disabled
      // until the file is selected again (which fully resets).
      this.cancelRequested = true
    },
    downloadDemo () {
      textFileDownloadInWeb(DEMO_CSV, 'badhan-donor-demo.csv')
    },
    downloadFailed () {
      textFileDownloadInWeb(toDonorCsv(this.table3.map(row => row.raw)), 'badhan-failed-rows.csv')
    },
    statusColor (status) {
      switch (status) {
        case 'uploading': return 'primary'
        case 'created': return 'success'
        case 'duplicate': return 'info'
        case 'rejected': return 'error'
        default: return 'grey'
      }
    },
    statusLabel (status) {
      switch (status) {
        case 'uploading': return 'Uploading'
        case 'created': return 'Created'
        case 'duplicate': return 'Duplicate'
        case 'rejected': return 'Rejected'
        default: return 'Pending'
      }
    },
    seeDonor (donorId) {
      createNewPopUpWindow(environmentService.getFrontendBaseURL() + '#/home/details?id=' + donorId)
    }
  }
}
</script>

<style scoped>
.csv-scroll {
  overflow-x: auto;
}
</style>
