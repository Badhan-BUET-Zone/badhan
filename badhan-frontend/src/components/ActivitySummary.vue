<template>
  <div>
    <v-card-title>Activity Summary</v-card-title>
    <transition name="slide-fade-down-snapout" mode="out-in">
      <LoadingMessage :key="'loadingStats'" v-if="statisticsLoaderFlag"/>
      <v-card-text :key="'loadedStats'" v-if="statistics!==null">
        <v-row>
          <v-col cols="12" md="6">
            <p id="statsNumberOfDonors" data-cy="statsNumberOfDonors" class="mb-0"><b>Number of donors: </b>{{ statistics.donorCount }}</p>
          </v-col>
          <v-col cols="12" md="6">
            <p class="mb-0"><b>Number of whole blood donations: </b>{{ statistics.donationCount }}</p>
          </v-col>
          <v-col v-if="statistics.plateletDonationCount !== undefined" cols="12" md="6">
            <p class="mb-0"><b>Number of platelet donations: </b>{{ statistics.plateletDonationCount }}</p>
          </v-col>
          <v-col cols="12" md="6">
            <p data-cy="statsNumberOfVolunteers" class="mb-0"><b>Number of volunteers: </b>{{ statistics.volunteerCount }}</p>
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
