<template>
  <Container>
    <v-card-title>List of all donors</v-card-title>
    <transition name="slide-fade-down-snapout" mode="out-in">
      <v-data-table :key="'donorsLoading'" v-if="donorsLoaderFlag">
      </v-data-table>
      <v-data-table id="statisticsAllDonorsTableId" data-cy="statisticsAllDonorsTableId" :key="'donorsLoaded'"
                    v-if="donorsShown"
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
</template>

<script>
import Container from '@/components/Container/Container'
import { handleGETDonorsAll } from '@/api'
import { createNewPopUpWindow } from '@/mixins/helpers'
import { environmentService } from '@/mixins/environment'
import { HTTP_STATUS } from '@/mixins/constants'

export default {
  name: 'DonorsAll',
  components: {
    Container
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
  },
  methods: {
    goToDonorProfile (donorId) {
      createNewPopUpWindow(environmentService.getFrontendBaseURL() + '#/home/details?id=' + donorId)
    }
  },
  async mounted () {
    this.donorsLoaderFlag = true
    this.donors = []
    const response = await handleGETDonorsAll()
    this.donorsLoaderFlag = false
    if (response.status !== HTTP_STATUS.OK) return
    this.donors = response.data.data
    this.donorsShown = true
  }
}
</script>

<style scoped>

</style>
