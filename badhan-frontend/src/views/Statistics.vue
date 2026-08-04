<template>
  <div>
    <PageTitle></PageTitle>
    <v-tabs class="rounded-xl" centered
            next-icon="mdi-arrow-right-bold-box-outline"
            prev-icon="mdi-arrow-left-bold-box-outline"
            show-arrows
    >
      <v-tabs-slider></v-tabs-slider>
      <v-tab id="statisticsDonationReportTabId" data-cy="statisticsDonationReportTabId" to="/statistics/report" style="text-decoration: none">
        Donation Report
      </v-tab>
      <v-tab id="statisticsAllDonorsTabId" data-cy="statisticsAllDonorsTabId" to="/statistics/donorsAll" style="text-decoration: none">
        All Donors
      </v-tab>
      <v-tab id="statisticsLogsByDateTabId" data-cy="statisticsLogsByDateTabId" to="/statistics/logsByDate" style="text-decoration: none">
        App Activity
      </v-tab>
    </v-tabs>
    <transition name="slide-fade" mode="out-in">
    <router-view></router-view>
    </transition>

  </div>
</template>

<script>
import PageTitle from '@/components/PageTitle'

export default {
  name: 'StatisticsPage',
  components: { PageTitle },
  data () {
    return {}
  }

}
</script>

<style scoped>

</style>
