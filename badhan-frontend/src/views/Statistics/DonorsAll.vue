<template>
  <div>
    <!-- Its own title bar now: this was a tab of a Statistics page, which drew one for it. -->
    <PageTitle></PageTitle>
    <Container>
    <v-card-title>{{ pageTitle }}</v-card-title>
    <transition name="slide-fade-down-snapout" mode="out-in">
      <v-data-table :key="'donorsLoading'" v-if="donorsLoaderFlag">
      </v-data-table>
      <v-card-text :key="'donorsEmpty'" v-else-if="donorsShown && donors.length === 0"
                   data-cy="statisticsAllDonorsEmptyId">
        {{ archiveFlag ? 'No archived donors' : 'No donors' }}
      </v-card-text>
      <v-data-table id="statisticsAllDonorsTableId" data-cy="statisticsAllDonorsTableId" :key="'donorsLoaded'"
                    v-else-if="donorsShown"
                    dense
                    :headers="donorListHeaders"
                    :items="donors"
                    :items-per-page="-1"
                    hide-default-footer
                    class="elevation-1 mt-2"
                    sort-by="logCount"
                    sort-desc
      >
        <template v-slot:item="{ item }">
          <tr :data-cy="'donorRow'" style="cursor: pointer" @click="goToDonorProfile(item._id)">
            <td>{{ item.name }}</td>
            <td>{{ item.hall | getHallName }}</td>
            <td>{{ item.studentId }}</td>
            <td data-cy="donorRowDesignation">{{ item.designation | getDesignationString }}</td>
            <td>{{ item.logCount }}</td>
          </tr>
        </template>
      </v-data-table>
    </transition>
    </Container>
  </div>
</template>

<script>
import Container from '@/components/Container/Container'
import PageTitle from '@/components/PageTitle'
import { handleGETDonorsAll } from '@/api'
import { createNewPopUpWindow } from '@/mixins/helpers'
import { environmentService } from '@/mixins/environment'
import { HTTP_STATUS } from '@/mixins/constants'

export default {
  name: 'DonorsAll',
  components: {
    Container,
    PageTitle
  },
  data () {
    return {
      donorListHeaders: [
        { text: 'Name', value: 'name' },
        { text: 'Hall', value: 'hall' },
        { text: 'Student ID', value: 'studentId' },
        { text: 'Designation', value: 'designation' },
        { text: 'Activity Count', value: 'logCount' }
      ],
      donorsShown: false,
      donorsLoaderFlag: false,
      donors: []
    }
  },
  computed: {
    // `=== true` rather than truthiness: a route that forgets the meta key must resolve to
    // the live roster rather than send undefined to a required query param
    archiveFlag () {
      return this.$route.meta.archiveFlag === true
    },
    pageTitle () {
      return this.archiveFlag ? 'List of archived donors' : 'List of all donors'
    }
  },
  watch: {
    // both routes render this same component, so Vue reuses the instance and mounted() does
    // not run again — without this the second page would keep showing the first one's rows
    '$route.meta.archiveFlag': 'fetchDonors'
  },
  methods: {
    goToDonorProfile (donorId) {
      createNewPopUpWindow(environmentService.getFrontendBaseURL() + '#/home/details?id=' + donorId)
    },
    async fetchDonors () {
      this.donorsLoaderFlag = true
      this.donorsShown = false
      this.donors = []
      const response = await handleGETDonorsAll({ archiveFlag: this.archiveFlag })
      this.donorsLoaderFlag = false
      if (response.status !== HTTP_STATUS.OK) return
      this.donors = response.data.data
      this.donorsShown = true
    }
  },
  async mounted () {
    await this.fetchDonors()
  }
}
</script>

<style scoped>

</style>
