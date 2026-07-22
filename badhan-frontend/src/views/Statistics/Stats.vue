<template>
    <Container>
      <v-card-title>
        Activity Summary
      </v-card-title>
      <transition name="slide-fade-down-snapout" mode="out-in">
        <LoadingMessage :key="'loadingStats'" v-if="statisticsLoaderFlag"/>
        <v-card-text :key="'loadedStats'" v-if="statistics!==null">
          <p id="statsNumberOfDonors" data-cy="statsNumberOfDonors"><b>Number of donors: </b><br>{{ statistics.donorCount }}</p>
          <p><b>Number of whole blood donations: </b><br>{{ statistics.donationCount }}</p>
          <p v-if="statistics.plateletDonationCount !== undefined"><b>Number of platelet donations: </b><br>{{ statistics.plateletDonationCount }}</p>
          <p data-cy="statsNumberOfVolunteers"><b>Number of volunteers: </b><br>{{ statistics.volunteerCount }}</p>
        </v-card-text>
      </transition>
    </Container>
</template>

<script>
import Container from '@/components/Container/Container'
import LoadingMessage from '@/components/LoadingMessage.vue'
import { handleGETStatistics } from '@/api'
import { HTTP_STATUS } from '@/mixins/constants'

export default {
  name: 'StatsPage',
  components: {
    LoadingMessage,
    Container
  },
  data: () => {
    return {
      statsShown: false,
      statistics: null,
      statisticsLoaderFlag: false,
    }
  },
  computed: {
  },
  methods: {
  },
  async mounted () {
    this.statisticsLoaderFlag = true
    const response = await handleGETStatistics()
    if (response.status !== HTTP_STATUS.OK) return
    this.statistics = response.data.statistics
    this.statsShown = true
    this.statisticsLoaderFlag = false
  }
}
</script>

<style scoped>

</style>
