<template>
  <div>
    <PageTitle></PageTitle>
    <ContainerFlat>
      <v-card-text>
      <v-bottom-sheet
          v-model="filterListMenu"
      >
        <template v-slot:activator="{ on, attrs }">
          <v-btn
              color="secondary"
              rounded
              small
              v-bind="attrs"
              v-on="on"
          >
            <v-icon left>
              mdi-filter-outline
            </v-icon>
            Filters
          </v-btn>
        </template>
        <v-sheet
            class="text-center"
        >
          <Button :icon="'mdi-close'" :text="'Close'" :click="()=>{this.filterListMenu = false}"
                  :color="'secondary'"></Button>
          <div style="height: 75vh;overflow-y: scroll;">
            <Filters :reset-clicked="resetClicked" :search-clicked="searchClicked"></Filters>
          </div>
        </v-sheet>
      </v-bottom-sheet>
      <Button :icon="'mdi-refresh'" :text="'Reload'" :click="getAllActiveDonors" :color="'primary'"></Button>
      <v-checkbox
        data-cy="activeDonorsMarkedByMeCheckbox"
        @change="checkBoxChanged"
        v-model="markedByMe"
        label="Show donors marked by me"
      ></v-checkbox>
      </v-card-text>
    </ContainerFlat>

    <!--
      The loader, "nothing found" and the list are three branches of ONE transition, not two
      transitions side by side. As two, the loader was still sliding out while the cards were
      already sliding in, and the whole list snapped upwards the moment the loader was finally
      removed from the flow. mode="out-in" makes the second only start once the first is gone.

      "No Donors Found" used to be a NoticeCard built with Vue.extend and appended into a holder
      div by hand, which put it outside anything a <transition> can see; as a plain v-else-if it
      both animates and stops needing two methods to add and remove it.
    -->
    <transition name="slide-fade-down-snapout" mode="out-in">
      <div
        v-if="activeDonorsLoader"
        :key="'activeDonorsLoading'"
        style="max-width: 700px"
        class="mx-auto"
      >
        <LoadingMessage/>
      </div>

      <NoticeCard v-else-if="noDonorsFound" :key="'activeDonorsEmpty'"/>

      <!-- A transition-group inside the branch, so the list arrives as one block but a card that
           leaves on its own still goes one at a time. -->
      <transition-group
        v-else
        :key="'activeDonorsList'"
        name="slide-fade-down"
        tag="div"
        style="max-width: 700px"
        class="mx-auto"
      >
        <PersonCardNew
          v-for="donor in activeDonors"
          :key="donor._id"
          :person="donor"
          :detailsBasePath="'/activeDonors'"
        ></PersonCardNew>
      </transition-group>
    </transition>
    <transition name="slide-fade" mode="out-in">
      <router-view></router-view>
    </transition>
  </div>
</template>

<script>
import PageTitle from '@/components/PageTitle'
import ContainerFlat from '@/components/Container/ContainerFlat'
import PersonCardNew from '@/components/PersonCardNew'
import Filters from '@/components/Filters'
import { BLOOD_GROUP_ANY, HALLS_INDEX, HTTP_STATUS, bloodGroups, halls } from '@/mixins/constants'
import Button from '@/components/UI Components/Button'
import NoticeCard from '@/components/UI Components/NoticeCard'
import LoadingMessage from '@/components/LoadingMessage.vue'
import { handleGETActiveDonors } from '@/api'
export default {
  name: 'ActiveDonors',
  components: { LoadingMessage, Filters, PersonCardNew, PageTitle, ContainerFlat, Button, NoticeCard },
  methods: {
    async checkBoxChanged (lastValueOfCheckbox) {
      await this.search({
        ...this.lastSearched,
        markedByMe: lastValueOfCheckbox
      })
    },
    processName (name) {
      if (name === null) {
        return ''
      }
      const newName = name.toLowerCase()
      let nameWithoutWs = ''
      for (let i = 0; i < newName.length; i++) {
        const currentChar = newName.charAt(i)
        if (currentChar < 'a' || currentChar > 'z') {
          continue
        }
        nameWithoutWs += currentChar
      }
      return nameWithoutWs
    },

  async getAllActiveDonors () {
      // Your own bookmarks, not everybody's. A bookmark is shared, so the unfiltered list is every
      // volunteer's work at once and the donors you put there yourself are buried in it; unticking
      // the box is one click away when the whole hall's list is what you want.
      this.markedByMe = true
      const payloadForGetActiveDonors = {
        bloodGroup: BLOOD_GROUP_ANY,
        hall: HALLS_INDEX.SUHRAWARDY,
        batch: '',
        name: '',
        address: '',
        isAvailable: true,
        isNotAvailable: true,
        availableToAll: true,
        markedByMe: true,
  availableToAllOrHall: true
      }
      this.lastSearched = payloadForGetActiveDonors
      await this.search(payloadForGetActiveDonors)
    },
    async searchClicked (searchQueries) {
      let inputBatch = 0

      if (searchQueries.batch === null) {
        searchQueries.batch = ''
      }

      inputBatch = parseInt(searchQueries.batch)
      if (searchQueries.batch.length === 0) {
        inputBatch = ''
      }

      // name input validation
      let inputName = this.processName(searchQueries.name)
      if (inputName.length === 0) {
        inputName = ''
      }

      let inputAddress = this.processName(searchQueries.address)
      if (inputAddress.length === 0) {
        inputAddress = ''
      }
      const payloadForGetActiveDonors = {
        name: inputName,
        bloodGroup: bloodGroups.indexOf(searchQueries.bloodGroup),
        batch: inputBatch.toString(),
        hall: halls.indexOf(searchQueries.hall),
        isAvailable: searchQueries.availability,
        isNotAvailable: searchQueries.notAvailability,
        address: inputAddress,
  availableToAll: searchQueries.availableToAll === 'AvailableToAll',
  markedByMe: this.markedByMe,
  availableToAllOrHall: false
      }
      this.lastSearched = payloadForGetActiveDonors
      this.filterListMenu = false
      await this.search(payloadForGetActiveDonors)
    },
    async search (payloadForGetActiveDonors) {
      this.activeDonorsLoader = true
      this.noDonorsFound = false
      const activeDonorsResult = await handleGETActiveDonors(payloadForGetActiveDonors)
      if (activeDonorsResult.status !== HTTP_STATUS.OK) return
      this.activeDonors = activeDonorsResult.data.activeDonors
      this.noDonorsFound = this.activeDonors.length === 0
      this.activeDonorsLoader = false
    },
    resetClicked () {
      // skip
    }
  },
  mounted () {
    this.getAllActiveDonors()
  },
  data: () => {
    return {
      activeDonors: [],
      // True from the first frame: mounted() searches immediately, and starting false left a blank
      // gap where the loader belongs until the first response came back.
      activeDonorsLoader: true,
      noDonorsFound: false,
      filterListMenu: false,
      // Ticked from the first frame, so the checkbox never disagrees with the search that
      // getAllActiveDonors() is already running underneath it.
      markedByMe: true,
  lastSearched: null
    }
  }
}
</script>

<style scoped>

</style>
