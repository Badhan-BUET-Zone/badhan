<template>
  <div :key="'donorCreation'">
    <PageTitle :title="$route.meta.title"></PageTitle>
    <Container>
      <v-card-title>
        Newly Created Donors
      </v-card-title>
      <v-card-text>
        <div class="mt-2">
          <v-menu
            ref="startDateMenu"
            v-model="startDateMenu"
            :close-on-content-click="false"
            :return-value.sync="startDate"
            transition="scale-transition"
            offset-y
            min-width="auto"
          >
            <template v-slot:activator="{ on, attrs }">
              <v-text-field rounded v-model="startDate" label="Start Date" prepend-icon="mdi-calendar" readonly outlined v-bind="attrs" v-on="on" dense></v-text-field>
            </template>
            <v-date-picker v-model="startDate" no-title scrollable :max="today">
              <v-spacer></v-spacer>
              <v-btn text color="primary" @click="startDateMenu = false">Cancel</v-btn>
              <v-btn text color="primary" @click="$refs.startDateMenu.save(startDate)">OK</v-btn>
            </v-date-picker>
          </v-menu>
        </div>
        <div class="mt-2">
          <v-menu
            ref="endDateMenu"
            v-model="endDateMenu"
            :close-on-content-click="false"
            :return-value.sync="endDate"
            transition="scale-transition"
            offset-y
            min-width="auto"
          >
            <template v-slot:activator="{ on, attrs }">
              <v-text-field rounded v-model="endDate" label="End Date" prepend-icon="mdi-calendar" readonly outlined v-bind="attrs" v-on="on" dense></v-text-field>
            </template>
            <v-date-picker v-model="endDate" no-title scrollable :max="today">
              <v-spacer></v-spacer>
              <v-btn text color="primary" @click="endDateMenu = false">Cancel</v-btn>
              <v-btn text color="primary" @click="$refs.endDateMenu.save(endDate)">OK</v-btn>
            </v-date-picker>
          </v-menu>
        </div>
      </v-card-text>
      <v-card-actions>
        <Button
          :disabled="disableFetchButton"
          :icon="'mdi-account-search'"
          :click="fetchNewDonors"
          :color="'primary'"
          :text="'Fetch Newly Created Donors'"
        />
      </v-card-actions>
      <transition name="slide-fade-down-snapout" mode="out-in">
        <LoadingMessage v-if="fetchLoader" :key="'fetchLoader'" />
        <div v-else-if="resultCount !== null" :key="'fetchResult'" style="white-space: pre-wrap;">
          <div style="max-width: 700px" class="mx-auto" v-if="donors.length">
            <PersonCardNew
              v-for="d in donors"
              :key="d._id"
              :donor="d"
              :detailsBasePath="'/newDonors'"
            />
            <transition name="slide-fade" mode="out-in">
              <router-view></router-view>
            </transition>
          </div>
        </div>
      </transition>
    </Container>
  </div>
</template>

<script>
import PageTitle from '../components/PageTitle'
import Container from '../components/Wrappers/Container'
import Button from '../components/UI Components/Button'
import LoadingMessage from '@/components/LoadingMessage.vue'
import PersonCardNew from '@/components/PersonCardNew'
import { handleGETDonorsNew } from '@/api'

export default {
  name: 'NewDonors',
  data: () => ({
    // date pickers
    startDateMenu: false,
    endDateMenu: false,
    startDate: '',
    endDate: '',
  // loader + result
  fetchLoader: false,
  resultCount: null,
  donors: [],
  today: new Date().toISOString().substr(0, 10)
  }),
  computed: {
    disableFetchButton () {
      return this.fetchLoader || !this.startDate || !this.endDate
    }
  },
  methods: {
    setDates () {
      const today = new Date()
  const twoDaysLater = new Date(today)
  twoDaysLater.setDate(today.getDate() + 2)
  let dd = String(twoDaysLater.getDate()).padStart(2, '0')
  let mm = String(twoDaysLater.getMonth() + 1).padStart(2, '0')
  let yyyy = twoDaysLater.getFullYear()

  this.endDate = `${yyyy}-${mm}-${dd}`

  // Start date: 1 month before end date
  const oneMonthBefore = new Date(twoDaysLater)
  oneMonthBefore.setMonth(oneMonthBefore.getMonth() - 1)
  dd = String(oneMonthBefore.getDate()).padStart(2, '0')
  mm = String(oneMonthBefore.getMonth() + 1).padStart(2, '0')
  yyyy = oneMonthBefore.getFullYear()

  this.startDate = `${yyyy}-${mm}-${dd}`
    },
    async fetchNewDonors () {
      // call backend to get donors created between dates
      this.fetchLoader = true
      this.resultCount = null
      this.donors = []

      const start = new Date(this.startDate)
      const end = new Date(this.endDate)

      const response = await handleGETDonorsNew({
        startTime: start.getTime(),
        endTime: end.getTime()
      })
      this.fetchLoader = false
      if (!response || response.status !== 200) return

      // Expecting response.data.donors as an array
      this.donors = response.data.donors || []
      this.resultCount = this.donors.length
    }
  },
  components: {
    Button,
    Container,
    PageTitle,
  LoadingMessage,
  PersonCardNew
  },
  mounted () {
    this.setDates()
  }
}
</script>

<style scoped>

</style>
