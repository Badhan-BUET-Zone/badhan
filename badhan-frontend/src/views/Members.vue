<template>
  <div>
    <PageTitle>
    </PageTitle>
    <Container>
      <transition name="slide-fade-down" mode="out-in">
        <LoadingMessage v-if="memberLoaderFlag" :key="'membersLoading'"/>
        <div v-else :key="'membersLoaded'">
          <v-card-title :key="'volunteerTitle'">
            Volunteers of {{ $store.getters.getHall | getHallName }} hall
          </v-card-title>
          <v-card-subtitle>
            List is sorted based on activity
          </v-card-subtitle>
          <v-card-text>
            <v-simple-table>
              <template v-slot:default>
                <thead>
                <tr>
                  <th class="text-left">Name</th>
                  <th class="text-left">Batch</th>
                  <th class="text-left">Department</th>
                </tr>
                </thead>
                <tbody>
                <tr
                  v-for="(volunteer,index) in volunteers"
                  :key="index"
                  :id="`volunteerId_${volunteer._id}`"
                >
                  <td><span :id="`volunteerNameId_${volunteer._id}`">{{ volunteer.name }}</span><span v-if="index<3"><v-icon style="color: gold">mdi-star</v-icon></span></td>
                  <td :id="`volunteerBatchId_${volunteer._id}`">{{ volunteer.studentId.substr(0, 2) }}</td>
                  <td>{{ volunteer.studentId | idToDept }}</td>
                </tr>
                </tbody>
              </template>
            </v-simple-table>
          </v-card-text>
          <v-card-title>
            Hall Admins of all halls
          </v-card-title>
          <v-card-text>
            <v-simple-table>
              <template v-slot:default>
                <thead>
                <tr>
                  <th class="text-left">
                    Hall
                  </th>
                  <th class="text-left">
                    Name
                  </th>
                </tr>
                </thead>
                <tbody>
                <tr
                  v-for="(hallAdmin,index) in hallAdmins"
                  :key="index"
                  :id="`hallAdminId_${hallAdmin._id}`"
                >
                  <td>{{ hallAdmin.hall | getHallName }}</td>
                  <td>{{ hallAdmin.name }}</td>
                </tr>
                </tbody>
              </template>
            </v-simple-table>
          </v-card-text>
          <v-card-title>
            Super Admins
          </v-card-title>
          <v-card-text>
            <v-simple-table>
              <template v-slot:default>
                <thead>
                <tr>
                  <th class="text-left">
                    Name
                  </th>
                  <th class="text-left">
                    Phone
                  </th>
                </tr>
                </thead>
                <tbody>
                <tr
                  v-for="(superAdmin,index) in superAdmins"
                  :key="index"
                  :id="`superAdminId_${superAdmin._id}`"
                >
                  <td>{{ superAdmin.name }}</td>
                  <td>+{{ superAdmin.phone }}</td>
                </tr>
                </tbody>
              </template>
            </v-simple-table>
          </v-card-text>
        </div>
      </transition>
    </Container>

  </div>
</template>

<script>
import PageTitle from '../components/PageTitle'
import Container from '../components/Container/Container'
import LoadingMessage from '@/components/LoadingMessage.vue'
import { handleGETDonorsDesignation } from '@/api'

export default {
  name: 'MembersPage',
  components: { LoadingMessage, Container, PageTitle },
  computed: {
  },
  methods: {
  },
  data: function () {
    return {
      memberLoaderFlag: false,
      hallAdmins: [],
      superAdmins: [],
      volunteers: []
    }
  },
  async mounted () {
    this.memberLoaderFlag = true;
    const response = await handleGETDonorsDesignation();
    if (response.status !== 200) return
    this.hallAdmins = response.data.adminList
    this.superAdmins = response.data.superAdminList
    this.volunteers = response.data.volunteerList
    this.memberLoaderFlag = false;
  }
}
</script>

<style scoped>

</style>
