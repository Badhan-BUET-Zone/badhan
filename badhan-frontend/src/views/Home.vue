<template>
  <div :key="'home'">
    <v-fab-transition >
      <v-btn
          v-scroll="onScroll"
          v-show="showFab"
          color="secondary"
          dark
          fixed
          bottom
          right
          fab
          @click="fabClicked"
      >
        <v-icon>mdi-arrow-up</v-icon>
      </v-btn>
    </v-fab-transition>
    <div>
      <v-row>
        <v-col cols="12" lg="4">
          <Filters :reset-clicked="clearFields" :search-clicked="searchClickedFromFilterComponent"></Filters>
        </v-col>
        <v-col cols="12" lg="8" id="results" data-cy="homeResults">
          <transition name="loader-fade" appear>
            <div v-if="searchLoaderFlag" :key="'searchLoading'">
              <LoadingMessage/>
            </div>
          </transition>
          <transition name="search-results" appear>
            <div v-if="searchResultShown" :key="searchResultKey" class="search-results-container">
              <transition name="fade-in" appear>
                <div :key="`count-${searchResultKey}`">
                  <v-alert dense class="rounded-xl" color="tertiary">
                    <div class="d-flex align-center justify-space-between">
                      <span>Found {{ numOfDonor }} donors</span>
                      <div class="d-flex align-center">
                        <v-tooltip top>
                          <template v-slot:activator="{ attrs }">
                            <v-btn
                              @click="downloadInWeb"
                              small
                              color="secondary"
                              icon
                              v-bind="attrs"
                              class="mr-2"
                            >
                              <v-icon>mdi-download</v-icon>
                            </v-btn>
                          </template>
                          <span>Download Report</span>
                        </v-tooltip>
                        <v-tooltip
                          v-model="showTooltip"
                          top
                        >
                          <template v-slot:activator="{ attrs }">
                            <v-btn
                              small
                              color="secondary"
                              icon
                              v-bind="attrs"
                              @click="shareClicked"
                            >
                              <v-icon>mdi-share</v-icon>
                            </v-btn>
                          </template>
                          <span>Copied to clipboard</span>
                        </v-tooltip>
                      </div>
                    </div>
                  </v-alert>
                </div>
              </transition>
              <transition name="slide-up" appear>
                <div :key="`actions-${searchResultKey}`">
                  <transition-group name="staggered-fade" appear>
                    <div v-for="(obj, index) in personGroups" :key="`batch-${searchResultKey}-${index}`" class="batch-group">
                      <v-alert dense class="rounded-xl" color="tertiary">
                          Batch {{ obj.batch }}:
                      </v-alert>

                      <transition-group name="person-card-stagger" appear>
                        <person-card
                            :id="'personCardId_'+person._id"
                            :data-cy="'person-card'"
                            v-for="(person, personIndex) in obj.people"
                            :key="person._id"
                            :style="{ '--stagger-delay': `${personIndex * 0.1}s` }"
                            :person="person"
                        ></person-card>
                      </transition-group>
                    </div>
                  </transition-group>
                  <transition name="fade-in" appear>
                    <v-btn id="olderBatchResultsButton" v-if="isMorePersonGroupsAvailable" small color="secondary" rounded class="ma-2" @click="concatenateMorePersonGroups">
                      <v-icon left>
                        mdi-more
                      </v-icon>
                      Show results from older batches
                    </v-btn>
                  </transition>
                </div>
              </transition>
            </div>
          </transition>
        </v-col>
      </v-row>
      <transition name="slide-fade" mode="out-in">
      <router-view></router-view>
      </transition>
    </div>
  </div>
</template>

<script>
import PersonCardNew from '@/components/PersonCardNew'
import { bloodGroups, DESIGNATIONS_INDEX, halls } from '@/mixins/constants'
import { minLength, maxLength, numeric, required } from 'vuelidate/lib/validators'
import { isGuestEnabled, handleGETSearchV3 } from '@/api'
import { convertObjectToCSV, textFileDownloadInWeb, processPersonsForReport } from '@/mixins/helpers'
import Filters from '@/components/Filters'
import { environmentService } from '@/mixins/environment'
import LoadingMessage from '@/components/LoadingMessage.vue'

export default {
  name: 'HomePage',
  computed: {
    isGuestEnabled () {
      return isGuestEnabled()
    },
    availableHalls () {
      if (this.$store.getters['getDesignation'] !== null) {
        if (this.$store.getters['getDesignation'] === DESIGNATIONS_INDEX.SUPER_ADMIN) {
          return halls.slice(0, 7)
        } else {
          return [halls[this.$store.getters['getHall']]]
        }
      }
      return halls
    },
    batchErrors () {
      const errors = []
      if (!this.$v.batch.$dirty) return errors
      !this.$v.batch.minLength && errors.push('Batch number must be of 2 digits')
      !this.$v.batch.maxLength && errors.push('Batch number must be of 2 digits')
      !this.$v.batch.numeric && errors.push('Batch number must be numeric')
      return errors
    },
    hallErrors () {
      const errors = []
      if (!this.$v.hall.$dirty) return errors
      !this.$v.hall.required && errors.push('Hall is required')
      !this.$v.hall.permission && errors.push('You are not allowed to create donor for this hall')
      return errors
    }

  },
  components: {
    LoadingMessage,
    Filters,
    'person-card': PersonCardNew,
  },
  data: function () {
    return {
      name: '',
      bloodGroup: -1,
      batch: '',
      address: '',
      hall: halls[this.$store.getters['getHall']],
      availability: true,
      notAvailability: false,
  
      download: false,

      // GUI flags
      filterShown: true,

      // imported constants
      halls,
      bloodGroups,

      showTooltip: false,
      showFilterHelpTooltip: false,

      radios: 'AvailableToAll',
      showFab: false,

      downloadCSVMessageFlag: false,
      downloadCSVLoader: false,

      //vuex variables
      searchLoaderFlag: false,
      searchResultShown: false,
      personGroups: [],
      morePersonGroups: [],
      isMorePersonGroupsAvailable: false,
      searchedHall: 0,

      persons: [],
      numOfDonor: 0,
      searchResultKey: 0
    }
  },
  validations: () => {
    return {
      batch: {
        minLength: minLength(2),
        maxLength: maxLength(2),
        numeric
      },
      hall: {
        required,
        permission (hall) {
          // COVID DATABASE
          return !(this.$store.getters['getHall'] !== this.halls.indexOf(hall) && this.halls.indexOf(hall) !== 7 && this.halls.indexOf(hall) !== 8 && this.$store.getters['getDesignation'] !== 3)
        }
      }
    }
  },
  async mounted () {
    const query = this.$route.query

    this.name = query.name ? query.name : ''
    this.bloodGroup = query.bloodGroup ? query.bloodGroup : -1
    this.batch = query.batch ? query.batch : ''
    this.address = query.address ? query.address : ''
    this.hall = query.hall ? query.hall : halls[this.$store.getters['getHall']]
    this.availability = query.availability !== 'false'
    this.notAvailability = query.notAvailability === 'true'
    this.radios = query.radios === 'SpecifyHall' ? 'SpecifyHall' : 'AvailableToAll'
    this.download = query.download === 'true'
  

    if (Object.keys(this.$route.query).length === 9) {
      await this.searchClicked()
      if (this.download) {
        this.downloadInWeb()
      }
    }
  },
  beforeRouteLeave (to, from, next) {
    this.personGroups = []
    this.persons = []
    this.searchResultShown = false
    next()
  },
  methods: {
    compareObject(a, b){
      if (a.batch < b.batch) {
        return 1
      } else {
        return -1
      }
    },
    async search (payload) {
      // Increment search result key to trigger exit animation
      this.searchResultKey++
      
      // If there are existing results, hide them gracefully first
      if (this.searchResultShown) {
        this.searchResultShown = false
        // Wait for exit animation to complete (300ms)
        await new Promise(resolve => setTimeout(resolve, 300))
      }
      
      // Now show loader
      this.searchLoaderFlag = true

      const sendData = {
        name: payload.inputName,
        bloodGroup: bloodGroups.indexOf(payload.bloodGroup),
        batch: payload.inputBatch.toString(),
        hall: halls.indexOf(payload.hall),
        isAvailable: payload.availability,
        isNotAvailable: payload.notAvailability,
        address: payload.inputAddress,
        availableToAll: payload.availableToAll,
        
      }

      const response = await handleGETSearchV3(sendData)
      
      // Hide loader gracefully
      this.searchLoaderFlag = false
      
      // Wait a moment for loader to disappear
      await new Promise(resolve => setTimeout(resolve, 200))
      
      if (response.status !== 200) {
        return
      }
      
      // Clear previous data
      this.personGroups = []
      this.numOfDonor = response.data.filteredDonors.length

      const persons = response.data.filteredDonors

      this.persons = response.data.filteredDonors

      const groupedPersons = persons.reduce(function (obj, person) {
        const batch = person.studentId.substr(0, 2)
        if (!Object.prototype.hasOwnProperty.call(obj, batch)) {
          obj[batch] = []
        }
        obj[batch].push(person)
        return obj
      }, {})

      const sortedBatches = []

      Object.keys(groupedPersons).forEach(function (key) {
        sortedBatches.push({
          batch: key,
          people: groupedPersons[key]
        })
      })

      const countOfBatchesToShow = 5;

      sortedBatches.sort(this.compareObject)
      this.personGroups = sortedBatches.slice(0,countOfBatchesToShow)
      this.morePersonGroups = sortedBatches.slice(countOfBatchesToShow)
      this.isMorePersonGroupsAvailable = this.morePersonGroups.length !== 0

      // Show new results with animation
      this.searchResultShown = true
      
      this.searchedHall = payload.hall
    },
    concatenateMorePersonGroups () {
      if(this.isMorePersonGroupsAvailable){
        this.isMorePersonGroupsAvailable = false
        this.personGroups.push(...this.morePersonGroups)
      }
    },
    async searchClickedFromFilterComponent (filterValues) {
  this.name = filterValues.name
      this.batch = filterValues.batch
      this.address = filterValues.address
      this.bloodGroup = filterValues.bloodGroup
      this.hall = filterValues.hall
      this.radios = filterValues.availableToAll
      this.availability = filterValues.availability
      this.notAvailability = filterValues.notAvailability
  
      await this.searchClicked()
    },
    downloadInWeb () {
      const processedPersons = processPersonsForReport(this.persons)
      const keys = ['name', 'Hall', 'studentId', 'Last Donation', 'Blood Group', 'address', 'roomNumber', 'Donation Count']
      if (this.$store.getters['getDesignation'] === DESIGNATIONS_INDEX.SUPER_ADMIN) {
        keys.push('comment')
        keys.push('phone')
      }
      const csv = convertObjectToCSV(processedPersons, keys, ',')
      textFileDownloadInWeb(csv, 'badhan_' + this.searchedHall + '.csv')
      this.$store.commit('messageBox/setMessage', 'CSV downloaded');
    },

    onScroll (e) {
      if (typeof window === 'undefined') return
      const top = window.pageYOffset || e.target.scrollTop || 0
      this.showFab = top > 20
    },
    async searchClicked () {
      await this.$v.$touch()
      if (this.$v.$anyError) {
        return
      }

      let inputBatch = 0
      if (this.batch === null) {
        this.batch = ''
      }

      inputBatch = parseInt(this.batch)
      if (this.batch.length === 0) {
        inputBatch = ''
      }

      // name input validation
      let inputName = this.processName(this.name)
      if (inputName.length === 0) {
        inputName = ''
      }

      let inputAddress = this.processName(this.address)
      if (inputAddress.length === 0) {
        inputAddress = ''
      }

      this.$vuetify.goTo('#results')
      this.showFab = true

      await this.search({
        inputName: inputName,
        bloodGroup: this.bloodGroup,
        inputBatch: inputBatch,
        hall: this.hall,
        availability: this.availability,
        notAvailability: this.notAvailability,
        inputAddress: inputAddress,
        availableToAll: this.radios === 'AvailableToAll'
      })
    },

    shareClicked () {
    const routeData = this.$router.resolve({
        name: 'Home',
        query: {
          name: this.name,
          bloodGroup: this.bloodGroup,
          batch: this.batch,
          address: this.address,
          hall: this.hall,
          availability: this.availability,
          notAvailability: this.notAvailability,
          radios: this.radios,
      download: false,
      
        }
      })
      this.$copyText(environmentService.getFrontendBaseURL()+ '/' + routeData.href).then((_e) => {
        this.showTooltip = true
        setTimeout(() => {
          this.showTooltip = false
        }, 2000)
      })
    },

    async downloadInMobileClicked () {
      this.downloadCSVLoader = true
      const redirectionTokenResponse = this.$store.dispatch('requestRedirectionToken')
      this.downloadCSVLoader = false
      if (redirectionTokenResponse.status !== 201) return
      const searchRouteData = this.$router.resolve({
        name: 'Home',
        query: {
          name: this.name,
          bloodGroup: this.bloodGroup,
          batch: this.batch,
          address: this.address,
          hall: this.hall,
          availability: this.availability,
          notAvailability: this.notAvailability,
          radios: this.radios,
          download: true
        }
      })
      const redirectionURL = searchRouteData.href.substr(1, searchRouteData.href.length - 1)
      const routeData = this.$router.resolve({
        name: 'RedirectionPage',
        query: { token: redirectionTokenResponse.data.token, payload: redirectionURL }
      })
      window.open(environmentService.getFrontendBaseURL() + '/' + routeData.href, '_blank')
    },

    clearFields () {
      this.$v.$reset()
      this.batch = ''
      this.hall = halls[this.$store.getters['getHall']]
      this.bloodGroup = -1
      this.name = ''
      this.error = ''
      this.address = ''
      this.searchResultShown = false
      this.showFab = false
    },

    fabClicked () {
      this.$vuetify.goTo(0)
      this.showFab = false
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
    }
  }

}
</script>

<style scoped>
/* Loader fade animation */
.loader-fade-enter-active {
  transition: all 0.3s ease-out;
}

.loader-fade-leave-active {
  transition: all 0.2s ease-in;
}

.loader-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.loader-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.loader-fade-enter-to {
  opacity: 1;
  transform: translateY(0);
}

/* Search results container animation */
.search-results-enter-active {
  transition: all 0.5s ease-out;
}

.search-results-leave-active {
  transition: all 0.3s ease-in;
}

.search-results-enter-from {
  opacity: 0;
  transform: translateY(15px);
}

.search-results-leave-to {
  opacity: 0;
  transform: translateY(-15px);
}

.search-results-enter-to {
  opacity: 1;
  transform: translateY(0);
}

/* Fade in animation */
.fade-in-enter-active {
  transition: opacity 0.4s ease-out;
}

.fade-in-leave-active {
  transition: opacity 0.2s ease-in;
}

.fade-in-enter-from {
  opacity: 0;
}

.fade-in-leave-to {
  opacity: 0;
}

.fade-in-enter-to {
  opacity: 1;
}

/* Slide up animation */
.slide-up-enter-active {
  transition: all 0.4s ease-out;
}

.slide-up-leave-active {
  transition: all 0.2s ease-in;
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.slide-up-enter-to {
  opacity: 1;
  transform: translateY(0);
}

/* Staggered fade animation for batches */
.staggered-fade-enter-active {
  transition: all 0.3s ease-out;
}

.staggered-fade-leave-active {
  transition: all 0.2s ease-in;
}

.staggered-fade-enter-from {
  opacity: 0;
  transform: translateX(-15px);
}

.staggered-fade-leave-to {
  opacity: 0;
  transform: translateX(15px);
}

.staggered-fade-enter-to {
  opacity: 1;
  transform: translateX(0);
}

.staggered-fade-move {
  transition: transform 0.3s ease;
}

/* Person card stagger animation */
.person-card-stagger-enter-active {
  transition: all 0.25s ease-out;
  transition-delay: var(--stagger-delay, 0s);
}

.person-card-stagger-leave-active {
  transition: all 0.15s ease-in;
}

.person-card-stagger-enter-from {
  opacity: 0;
  transform: translateY(15px) scale(0.98);
}

.person-card-stagger-leave-to {
  opacity: 0;
  transform: translateY(-15px) scale(0.98);
}

.person-card-stagger-enter-to {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.person-card-stagger-move {
  transition: transform 0.3s ease;
}

/* Batch group styling */
.batch-group {
  margin-bottom: 16px;
}

/* Smooth transitions for all interactive elements */
.v-btn {
  transition: all 0.2s ease;
}

.v-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.v-alert {
  transition: all 0.3s ease;
}

/* Loading state animation */
.search-results-container {
  animation: slideInFromBottom 0.6s ease-out;
}

@keyframes slideInFromBottom {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
