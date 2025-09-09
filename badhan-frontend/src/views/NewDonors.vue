<template>
  <div :key="'donorCreation'">
    <PageTitle :title="$route.meta.title"></PageTitle>
    <Container>
      <v-card-title>
        Newly Created Donors
      </v-card-title>
      <v-card-text>
        <div class="mt-2">
          <DatePicker v-model="startDate" label="Start Date" />
        </div>
        <div class="mt-2">
          <DatePicker v-model="endDate" label="End Date" />
        </div>
      </v-card-text>
      <v-card-actions>
        <Button
          data-cy="fetchNewlyCreatedDonorsButton"
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
              :person="d"
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
import PageTitle from '@/components/PageTitle'
import Container from '@/components/Container/Container'
import Button from '@/components/UI Components/Button'
import LoadingMessage from '@/components/LoadingMessage.vue'
import PersonCardNew from '@/components/PersonCardNew'
import DatePicker from '@/components/UI Components/DatePicker.vue'
import { handleGETDonorsNew } from '@/api'

export default {
  name: 'NewDonors',
  data: () => ({
    // date pickers
    startDate: '',
    endDate: '',
  // loader + result
  fetchLoader: false,
  resultCount: null,
  donors: [],
  today: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).toISOString().substr(0, 10)
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
  PersonCardNew,
  DatePicker
  },
  mounted () {
    this.setDates()
  }
}
</script>

<style scoped>

</style>
