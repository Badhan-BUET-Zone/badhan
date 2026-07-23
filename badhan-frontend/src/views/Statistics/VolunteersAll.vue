<template>
  <Container>
    <v-card-title>List of all members</v-card-title>
    <transition name="slide-fade-down-snapout" mode="out-in">
      <v-data-table :key="'volunteerLoading'" v-if="volunteersLoaderFlag">
      </v-data-table>
      <v-data-table id="statisticsAllVolunteersTableId" data-cy="statisticsAllVolunteersTableId" :key="'volunteerLoaded'"
                    v-if="volunteersShown"
                    dense
                    :headers="volunteerListHeaders"
                    :items="volunteers"
                    :items-per-page="10"
                    class="elevation-1 mt-2"
                    sort-by="logCount"
                    sort-desc
      >
        <template v-slot:item="{ item }">
          <tr :data-cy="'volunteerRow'" style="cursor: pointer" @click="goToDonorProfile(item._id)">
            <td>{{ item.name }}</td>
            <td>{{ item.hall | getHallName }}</td>
            <td>{{ item.studentId }}</td>
            <td>{{ item.logCount }}</td>
          </tr>
        </template>
      </v-data-table>
    </transition>
  </Container>
</template>

<script>
import Container from '@/components/Container/Container'
import { handleGETDonorDesignatedAll } from '@/api'
import { createNewPopUpWindow } from '@/mixins/helpers'
import { environmentService } from '@/mixins/environment'
import { HTTP_STATUS } from '@/mixins/constants'

export default {
  name: 'VolunteersAll',
  components: {
    Container
  },
  data () {
    return {
      volunteerListHeaders: [
        { text: 'Name', value: 'name' },
        { text: 'Hall', value: 'hall' },
        { text: 'Student ID', value: 'studentId' },
        { text: 'Activity Count', value: 'logCount' }
      ],
      volunteersShown: false,
      volunteersLoaderFlag: false,
      volunteers: []
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
    this.volunteersLoaderFlag = true
    this.volunteers = []
    const response = await handleGETDonorDesignatedAll()
    this.volunteersLoaderFlag = false
    if (response.status !== HTTP_STATUS.OK) return
    this.volunteers = response.data.data
    this.volunteersShown = true
  }
}
</script>

<style scoped>

</style>
