<template>
  <div>
    <PageTitle :title="$route.meta.title"></PageTitle>
    <Container>
      <v-card-title>Certificate Enabled Donors</v-card-title>
      <v-card-subtitle data-cy="certificateEnabledDonorsCountId">
        {{ subtitle }}
      </v-card-subtitle>
      <transition name="slide-fade-down-snapout" mode="out-in">
        <LoadingMessage v-if="donorsLoaderFlag" :key="'donorsLoading'" />
        <v-card-text :key="'donorsEmpty'" v-else-if="donorsShown && donors.length === 0"
                     data-cy="certificateEnabledDonorsEmptyId">
          No donor has a certificate enabled yet.
        </v-card-text>
        <v-data-table id="certificateEnabledDonorsTableId" data-cy="certificateEnabledDonorsTableId"
                      :key="'donorsLoaded'"
                      v-else-if="donorsShown"
                      dense
                      :headers="donorListHeaders"
                      :items="donors"
                      :items-per-page="-1"
                      hide-default-footer
                      class="elevation-1 mt-2"
        >
          <template v-slot:item="{ item }">
            <tr :data-cy="'certificateEnabledDonorRow'" style="cursor: pointer"
                @click="goToDonorProfile(item._id)">
              <td>
                {{ item.name }}
                <v-chip v-if="item.archiveFlag" :data-cy="'certificateEnabledDonorArchivedChipId_'+item._id"
                        x-small color="warning" class="ml-1">Archived</v-chip>
              </td>
              <td>{{ item.hall | getHallName }}</td>
              <td>{{ item.studentId }}</td>
              <td>{{ item.bloodGroup | getBloodGroupString }}</td>
              <td data-cy="certificateEnabledDonorRowDesignation">{{ item.designation | getDesignationString }}</td>
            </tr>
          </template>
        </v-data-table>
      </transition>
    </Container>
  </div>
</template>

<script>
import PageTitle from '@/components/PageTitle'
import Container from '@/components/Container/Container'
import LoadingMessage from '@/components/LoadingMessage.vue'
import { handleGETDonorsCertificateEnabled } from '@/api'
import { createNewPopUpWindow } from '@/mixins/helpers'
import { environmentService } from '@/mixins/environment'
import { HTTP_STATUS } from '@/mixins/constants'

export default {
  name: 'CertificateEnabledDonors',
  components: {
    Container,
    PageTitle,
    LoadingMessage
  },
  data () {
    return {
      donorListHeaders: [
        { text: 'Name', value: 'name' },
        { text: 'Hall', value: 'hall' },
        { text: 'Student ID', value: 'studentId' },
        { text: 'Blood Group', value: 'bloodGroup' },
        { text: 'Designation', value: 'designation' }
      ],
      donorsShown: false,
      donorsLoaderFlag: false,
      donors: []
    }
  },
  computed: {
    // The count is the number a super admin is actually here to check — an unexpected jump in it is
    // the signal this page exists to give — so it is stated rather than left to be counted by eye.
    subtitle () {
      if (!this.donorsShown) return 'Every donor who can produce a certificate'
      const count = this.donors.length
      return `${count} donor${count === 1 ? '' : 's'} can produce a certificate`
    }
  },
  methods: {
    // A separate window, as Statistics/DonorsAll does, rather than a nested details route: the list
    // is still here when the profile is closed, which is what checking down a list wants.
    goToDonorProfile (donorId) {
      createNewPopUpWindow(environmentService.getFrontendBaseURL() + '#/home/details?id=' + donorId)
    },
    async fetchDonors () {
      this.donorsLoaderFlag = true
      this.donorsShown = false
      this.donors = []
      const response = await handleGETDonorsCertificateEnabled()
      this.donorsLoaderFlag = false
      if (!response || response.status !== HTTP_STATUS.OK) return
      // Hall first, then name: grouping by hall is what makes the list checkable against the
      // person who would know whether a given name belongs on it.
      this.donors = (response.data.data || []).slice().sort((a, b) => {
        if (a.hall !== b.hall) return a.hall - b.hall
        return String(a.name).localeCompare(String(b.name))
      })
      this.donorsShown = true
    }
  },
  // No fetch button: the endpoint takes no parameters, so a button would be a click that asks
  // nothing. NewDonors has one only because it needs two dates first.
  async mounted () {
    await this.fetchDonors()
  }
}
</script>

<style scoped>

</style>
