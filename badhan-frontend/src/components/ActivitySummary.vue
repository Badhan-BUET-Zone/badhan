<template>
  <div>
    <v-card-title>Activity Summary</v-card-title>
    <transition name="slide-fade-down-snapout" mode="out-in">
      <LoadingMessage :key="'loadingStats'" v-if="statisticsLoaderFlag"/>
      <v-card-text :key="'loadedStats'" v-if="statistics!==null">
        <v-row no-gutters>
          <v-col cols="12" class="py-1">
            <p id="statsNumberOfDonors" data-cy="statsNumberOfDonors" class="mb-0"><b>Registered donor count to date: </b>{{ statistics.donorCount }}</p>
          </v-col>
          <v-col cols="12" class="py-1">
            <p class="mb-0"><b>Whole blood donation count recorded to date: </b>{{ statistics.donationCount }}</p>
          </v-col>
          <v-col v-if="statistics.donationCountMadeByApp !== undefined" cols="12" class="py-1">
            <p class="mb-0"><b>Whole blood donation count made through the app: </b>{{ statistics.donationCountMadeByApp }}</p>
          </v-col>
          <v-col v-if="statistics.plateletDonationCount !== undefined" cols="12" class="py-1">
            <p class="mb-0"><b>Platelet donation count recorded to date: </b>{{ statistics.plateletDonationCount }}</p>
          </v-col>
          <v-col cols="12" class="py-1">
            <p data-cy="statsNumberOfVolunteers" class="mb-0"><b>Volunteer count recorded to date: </b>{{ statistics.volunteerCount }}</p>
          </v-col>
        </v-row>
      </v-card-text>
    </transition>
  </div>
</template>

<script>
import LoadingMessage from '@/components/LoadingMessage.vue'
import { handleGETStatistics } from '@/api'
import { HTTP_STATUS } from '@/mixins/constants'

export default {
  name: 'ActivitySummary',
  components: {
    LoadingMessage
  },
  data: () => {
    return {
      statistics: null,
      statisticsLoaderFlag: false,
    }
  },
  async mounted () {
    this.statisticsLoaderFlag = true
    const response = await handleGETStatistics()
    if (response.status !== HTTP_STATUS.OK) return
    this.statistics = response.data.statistics
    this.statisticsLoaderFlag = false
  }
}
</script>

<style scoped>

</style>
