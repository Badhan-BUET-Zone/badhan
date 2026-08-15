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
                              id="homeShareButtonId"
                              data-cy="homeShareButtonId"
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
              <!-- keys off the flag that produced these results, not the current setting,
                   so it can never claim the archive while live donors are on screen -->
              <v-alert v-if="archiveFlag" data-cy="archivedResultsBanner"
                       dense text type="info" class="rounded-xl">
                Showing archived donors
              </v-alert>
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
                  <!-- the hint is caption text rather than a :messages prop, which v-btn
                       has no support for: an unexplained disabled button is exactly what
                       the refusal must not be -->
                  <div v-if="isArchiveBatchVisible" class="ma-2">
                    <v-btn
                      id="archiveTheseDonorsButtonId"
                      data-cy="archiveTheseDonorsButtonId"
                      small rounded color="warning"
                      :loading="archiveBatchLoader"
                      :disabled="archiveBatchLoader || isArchiveBatchOverLimit"
                      @click="archiveTheseDonorsClicked"
                    >
                      <v-icon left>{{ archiveFlag ? 'mdi-archive-arrow-up' : 'mdi-archive-arrow-down' }}</v-icon>
                      {{ archiveBatchProgressLabel }}
                    </v-btn>
                    <div v-if="archiveBatchHint" data-cy="archiveBatchHintId"
                         class="caption text--secondary mt-1">
                      {{ archiveBatchHint }}
                    </div>
                  </div>
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
import { ARCHIVE_BATCH_LIMIT, BLOOD_GROUP_ANY, DESIGNATIONS_INDEX, HTTP_STATUS, SHARE_LINK_MARKER_KEYS, bloodGroups, halls, isHallRestricted, restrictedHallNames } from '@/mixins/constants'
import { minLength, maxLength, numeric, required } from 'vuelidate/lib/validators'
import { isGuestEnabled, handleGETDonors, handleGETSearchV3, handlePATCHDonors } from '@/api'
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
    // Visibility and enablement are separate on purpose: over the cap the button is still
    // rendered, so the refusal can explain itself instead of the control vanishing
    isArchiveBatchVisible () {
      return this.$store.getters['getDesignation'] === DESIGNATIONS_INDEX.SUPER_ADMIN &&
             this.searchResultShown && this.persons.length > 0
    },
    isArchiveBatchOverLimit () {
      return this.persons.length > ARCHIVE_BATCH_LIMIT
    },
    archiveBatchHint () {
      return this.isArchiveBatchOverLimit
        ? `Narrow your search to ${ARCHIVE_BATCH_LIMIT} donors or fewer to archive in bulk`
        : ''
    },
    // 2N requests means even a capped sweep is long enough that a bare spinner would read
    // as a hang
    archiveBatchProgressLabel () {
      if (this.archiveBatchLoader) {
        return `${this.archiveFlag ? 'Unarchiving' : 'Archiving'} ${this.archiveBatchDone} / ${this.persons.length}…`
      }
      return this.archiveFlag ? 'Unarchive these donors?' : 'Archive these donors?'
    },
    availableHalls () {
      if (this.$store.getters['getDesignation'] !== null) {
        if (this.$store.getters['getDesignation'] === DESIGNATIONS_INDEX.SUPER_ADMIN) {
          return restrictedHallNames()
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
      bloodGroup: BLOOD_GROUP_ANY,
      batch: '',
      address: '',
      hall: halls[this.$store.getters['getHall']],
      availability: true,
      notAvailability: false,
      // the flag that produced the results on screen — not the live setting
      archiveFlag: false,

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
      searchedHall: 0,

      archiveBatchLoader: false,
      archiveBatchDone: 0,

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
          return !(this.$store.getters['getHall'] !== this.halls.indexOf(hall) && isHallRestricted(this.halls.indexOf(hall)) && this.$store.getters['getDesignation'] !== DESIGNATIONS_INDEX.SUPER_ADMIN)
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
    // Honoured verbatim: no designation check and no setting check. `=== 'true'` makes
    // both the absent key and the string 'false' resolve to false, so a link generated
    // before this filter existed reopens on the live roster.
    this.archiveFlag = query.archiveFlag === 'true'

    // A statement about the link's shape rather than its size: counting keys would have
    // to change with every future filter, silently breaking links already in circulation
    const isSharedSearchLink = SHARE_LINK_MARKER_KEYS.every(key => query[key] !== undefined)
    if (isSharedSearchLink) {
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
        archiveFlag: payload.archiveFlag
      }

      const response = await handleGETSearchV3(sendData)
      
      // Hide loader gracefully
      this.searchLoaderFlag = false
      
      // Wait a moment for loader to disappear
      await new Promise(resolve => setTimeout(resolve, 200))
      
      if (response.status !== HTTP_STATUS.OK) {
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

      // every match is rendered: a sweep button next to a partially shown list would
      // archive batches the user never scrolled to
      sortedBatches.sort(this.compareObject)
      this.personGroups = sortedBatches

      // Show new results with animation
      this.searchResultShown = true
      
      this.searchedHall = payload.hall
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
      // a manual search wins over whatever the URL put here on mount
      this.archiveFlag = filterValues.archiveFlag

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

    archiveTheseDonorsClicked () {
      const verb = this.archiveFlag ? 'unarchive' : 'archive'
      this.$store.commit('confirmationBox/setConfirmationMessage', {
        confirmationMessage: `Are you sure you want to ${verb} these ${this.persons.length} donors?`,
        confirmationAction: this.archiveConfirmed
      })
    },

    // There is no batch route: this loops the one write primitive, once per donor. The
    // GET is not optional — PATCH /donors/v2 takes a full body including email, which the
    // search response projects away, and inventing one trips the email-permission 403.
    async archiveConfirmed () {
      // re-asserted here so the cap does not rest on the :disabled binding alone
      if (this.isArchiveBatchOverLimit) return

      const target = !this.archiveFlag
      this.archiveBatchLoader = true
      this.archiveBatchDone = 0
      const succeeded = []
      let stoppedEarly = false

      // sequential: concurrent writes buy little and make the progress count and the
      // audit-log ordering incoherent
      for (const person of this.persons) {
        const getResponse = await handleGETDonors({ donorId: person._id })
        if (getResponse.status !== HTTP_STATUS.OK) {
          stoppedEarly = true
          break
        }
        const donor = getResponse.data.donor
        // built field by field, not spread: the fetched donor carries donations, platelet
        // donations and call records that have no business on a PATCH body
        const patchResponse = await handlePATCHDonors({
          donorId: donor._id,
          name: donor.name,
          fatherName: donor.fatherName,
          motherName: donor.motherName,
          phone: donor.phone,
          studentId: donor.studentId,
          email: donor.email,
          bloodGroup: donor.bloodGroup,
          hall: donor.hall,
          roomNumber: donor.roomNumber,
          address: donor.address,
          availableToAll: donor.availableToAll,
          isCertificateEnabled: donor.isCertificateEnabled,
          archiveFlag: target
        })
        if (patchResponse.status !== HTTP_STATUS.OK) {
          stoppedEarly = true
          break
        }
        succeeded.push(person._id)
        this.archiveBatchDone++
      }
      this.archiveBatchLoader = false

      // the donors that moved have left the partition being viewed, so they are dropped
      // locally rather than re-running the search
      const sweptIds = new Set(succeeded)
      this.persons = this.persons.filter(person => !sweptIds.has(person._id))
      this.personGroups = this.personGroups
        .map(group => ({ batch: group.batch, people: group.people.filter(person => !sweptIds.has(person._id)) }))
        .filter(group => group.people.length > 0)
      this.numOfDonor = this.persons.length

      // a half-finished sweep must never read as a clean one; pressing the button again
      // resumes from what is still on screen
      if (stoppedEarly) {
        this.$store.dispatch('notification/notifyError',
          `Stopped after ${succeeded.length} of ${succeeded.length + this.persons.length} donors`)
        return
      }
      this.$store.dispatch('notification/notifySuccess',
        `${target ? 'Archived' : 'Unarchived'} ${succeeded.length} donors`)
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
        availableToAll: this.radios === 'AvailableToAll',
        archiveFlag: this.archiveFlag
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
          archiveFlag: this.archiveFlag
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
      if (redirectionTokenResponse.status !== HTTP_STATUS.CREATED) return
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
          download: true,
          archiveFlag: this.archiveFlag
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
