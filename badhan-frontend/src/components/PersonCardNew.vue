<template>
  <div class="mb-2 rounded-xl">
    <v-card
        :id="`personCardId_${id}`"
        data-cy="person-card"
        style="width: 100%; height: 100%; overflow: hidden;"
        class="rounded-xl"
        @click="expansionClicked"
    >
      <v-row no-gutters>
        <v-col align-self="center" cols="4">
          <v-card
              v-if="availableInRendered > 0"
              class="text-center rounded-xl"
              color="errorLight"
              flat rounded
          >
            <v-card-text style="font-size: 10px;  line-height: 1.6;">
              <span>{{ bloodGroup | getBloodGroupString }}</span><br>
              <span>{{ availableInRendered }} day<span v-if="availableInRendered>1">s</span><span v-if="availabilityType"> ({{ availabilityType }})</span></span><br>
              <span>{{ totalDonations }} Donations</span>
            </v-card-text>
          </v-card>
          <v-card
              v-else
              class="text-center rounded-xl"
              color="successLight"
              flat rounded
          >
            <v-card-text style="font-size: 10px; line-height: 1.6;">
              <span>{{ bloodGroup | getBloodGroupString }}</span><br>
              <span>Available</span><br>
              <span>{{ totalDonations }} Donations</span>
            </v-card-text>
          </v-card>

        </v-col>
        <v-col
            cols="8"
            align-self="center"
            class="d-flex align-content-center"
        >
          <div style="font-size: small; width: 100%" class="text-wrap pa-2">
            <b style="width: 100%">{{ name }} <v-icon v-if="markedBy" small color="secondary">mdi-bookmark</v-icon></b>
            <!-- unguarded by designation: this card is also the Active Donors card, which
                 still lists archived donors for every member -->
            <v-chip v-if="archiveFlag" :data-cy="'personCardArchivedChipId_'+id" x-small color="warning" class="ml-1">
              Archived
            </v-chip>
            <br/>
            <b>Phone: </b>
            <span v-if="phone">{{ phone.toString().substr(2) }}</span>
            <br/>
            <b>Hall: </b>
            <span>{{ hall |getHallName }}</span>
          </div>
        </v-col>
      </v-row>
    </v-card>
    <!--    Person card extension-->
    <transition name="expand">
      <v-card class="mt-2 rounded-xl" v-show="showExtensionFlag">
        <v-card-text>
        <v-row no-gutters>
          <v-col cols="12" sm="6">
            <span><b>Department: </b>{{ studentId | idToDept }} <br></span>
            <span v-if="address!==undefined && address!==null && address.length !==0"><b>Address:</b> {{
                address
              }} <br></span>
            <span v-if="roomNumber!==undefined && roomNumber!==null && roomNumber.length !==0"><b>Room:</b>
            {{ roomNumber }}</span>
          </v-col>
          <v-col cols="12" sm="6">
            <span><b>Last called: </b>
            <span v-if="lastCalled">{{ new Date(lastCalled).toLocaleString() }}</span>
            <span v-else>Unknown</span>
            <br>
          </span>
            <span>Called <span :id="`callCountId_${id}`">{{ callCountLast3Days }}</span> times in last 3 days</span>
            <br>
            <span><b>Blood Donations:</b> {{ donationCount }}</span><br>
            <span><b>Platelet Donations:</b> {{ plateletDonationCount }}</span>
            <span v-if="comment!==undefined && comment!==null && comment.length !==0"><VueMarkdown>**Comment:** {{comment }} {{ commentUpdatedText }}</VueMarkdown> </span>
          </v-col>
        </v-row>
        <div class="mt-1">
          <v-btn
              :id="'personCardSeeProfileButtonId_'+id"
              :data-cy="'personCardSeeProfileButtonId_'+id"
              small
              rounded
              color="primary"
              v-b-modal="'detailsModal'"
              @click="loadPersonDetails()"
              :disabled="seeDetailsLoaderFlag"
          >
            <v-icon left>
              mdi-account-details
            </v-icon>
            See profile
          </v-btn>
          <v-btn :id="'personCardCallButtonId_'+id" :data-cy="'personCardCallButtonId_'+id" :disabled="newCallRecordLoader" small rounded color="secondary"
                 class="ml-2" @click="callFromDialer"
          >
            <v-icon left>
              mdi-phone
            </v-icon>
            Direct call
          </v-btn
          >
        </div>
        <div class="mt-4">
          <DatePicker
            v-model="newDonationDate"
            label="Add a donation date"
            :text-field-id="`personCardDatePickerId_${id}`"
            :picker-id="`personCardDatePickerCalenderId_${id}`"
            :ok-button-id="`personCardDatePickerOkButtonId_${id}`"
          />
        </div>
        <div style="margin-top: -30px;">
          <v-radio-group v-model="newDonationType" row dense>
            <v-radio label="Blood" value="Blood" :data-cy="'personCardDonationRadioBloodId_'+id"></v-radio>
            <v-radio label="Platelet" value="Platelet" :data-cy="'personCardDonationRadioPlateletId_'+id"></v-radio>
          </v-radio-group>
        </div>
        <v-btn
            :id="`personCardDonationButtonId_${id}`"
            :data-cy="`personCardDonationButtonId_${id}`"
            color="primary"
            rounded
            small
            style="width: 100%"
            @click="donateClicked"
            :disabled="donationLoaderFlag || newDonationDate.length === 0 || newDonationType.length === 0"
        >Done
        </v-btn>
      </v-card-text>
    </v-card>
    </transition>
  </div>
</template>

<script>
import VueMarkdown from 'vue-markdown'
import DatePicker from '@/components/UI Components/DatePicker.vue'
import { directCall, fixBackSlash } from '@/mixins/helpers'
import { handlePOSTCallRecord, handlePOSTDonations, handlePOSTPlateletDonations } from '@/api'
import { BLOOD_GROUP_ANY, HTTP_STATUS, COMMENT_NEVER_UPDATED_TIME } from '@/mixins/constants'

export default {
  props: {
    person: {
      type: Object
    },
    detailsBasePath: {
      type: String,
      default: '/home'
  }
  },
  components: { VueMarkdown, DatePicker },
  name: 'PersonCardNew',
  mounted () {
    this.setInformation(this.$props.person)
  },
  methods: {
    async callFromDialer () {
      directCall(this.phone)
      this.newCallRecordLoader = true
      const response = await handlePOSTCallRecord({ donorId: this.id })
      this.newCallRecordLoader = false
      if (response.status!== HTTP_STATUS.CREATED) return
      this.$store.dispatch('notification/notifySuccess', 'Added call record')
      this.lastCalled = new Date().getTime()
      this.callCountLast3Days++
    },
    async loadPersonDetails () {
      await this.$router.push({
        path: `${this.detailsBasePath}/details`,
        query: { id: this.id }
      })
    },
    async donateClicked () {
      this.donationLoaderFlag = true;
      const timestamp = new Date(this.newDonationDate).getTime()
      const isPlatelet = this.newDonationType === 'Platelet'
      const response = isPlatelet
        ? await handlePOSTPlateletDonations({ donorId: this.id, date: timestamp })
        : await handlePOSTDonations({ phone: this.phone, donorId: this.id, date: timestamp })
      this.donationLoaderFlag = false;

      if (response.status !== HTTP_STATUS.CREATED) return;

      if (isPlatelet) {
        this.lastPlateletDonation = timestamp
      } else {
        this.lastDonation = timestamp
      }

      this.setAvailableInFromPerson({
        lastDonation: isPlatelet ? this.lastDonation : timestamp,
        lastPlateletDonation: isPlatelet ? timestamp : this.lastPlateletDonation
      })

      if (isPlatelet) {
        this.plateletDonationCount = (this.plateletDonationCount || 0) + 1
      } else {
        this.donationCount = (this.donationCount || 0) + 1
      }

      this.newDonationDate = ''
      this.newDonationType = 'Blood'

      this.$store.dispatch('notification/notifySuccess', isPlatelet ? 'Platelet donation inserted successfully' : 'Donation inserted successfully')
    },
    expansionClicked () {
      this.showExtensionFlag = !this.showExtensionFlag
    },
    setAvailableInFromPerson (person) {
      const now = Date.now()
      const daysSinceBlood = Math.floor((now - (person.lastDonation || 0)) / (1000 * 3600 * 24))
      const daysSincePlatelet = Math.floor((now - (person.lastPlateletDonation || 0)) / (1000 * 3600 * 24))
      const neededBlood = Math.max(0, 120 - daysSinceBlood)
      const neededPlatelet = Math.max(0, 12 - daysSincePlatelet)
      if (neededBlood === 0 && neededPlatelet === 0) {
        this.availableInRendered = 0
        this.availabilityType = ''
      } else if (neededBlood >= neededPlatelet) {
        this.availableInRendered = neededBlood
        this.availabilityType = 'Blood'
      } else {
        this.availableInRendered = neededPlatelet
        this.availabilityType = 'Platelet'
      }
    },
    setInformation (person) {
      if (!person) return
      this.setAvailableInFromPerson(person)
      this.phone = person.phone
      this.name = person.name
      this.hall = person.hall
      this.bloodGroup = person.bloodGroup
      this.studentId = person.studentId
      this.lastDonation = person.lastDonation
      this.lastPlateletDonation = person.lastPlateletDonation
      this.comment = fixBackSlash(person.comment)
      this.address = person.address
      this.roomNumber = person.roomNumber
      this.id = person._id
      this.commentTime = person.commentTime
      this.callCountLast3Days = person.callCountLast3Days
      this.donationCount = person.donationCount
      this.plateletDonationCount = person.plateletDonationCount || 0
      this.markedBy = person.marker && person.marker.name ? person.marker.name : (person.markerName || null)
      this.lastCalled = person.lastCalled
      this.archiveFlag = person.archiveFlag
    }
  },
  computed: {
    totalDonations () {
      return (this.donationCount || 0) + (this.plateletDonationCount || 0)
    },
    commentUpdatedText () {
      if (this.commentTime === 0 || this.commentTime === COMMENT_NEVER_UPDATED_TIME) {
        return '(Never Updated)'
      }
      return '(Last Updated: ' + new Date(this.commentTime).toLocaleString() + ' )'
    }
  },
  data: () => {
    return {
      id: '',
      name: '',
      hall: '',
      phone: '',
      address: '',
      comment: '',
      bloodGroup: BLOOD_GROUP_ANY,
      commentTime: 0,
      markedBy: null,
      archiveFlag: false,
      lastCalled: null,
      lastDonation: 0,
      lastPlateletDonation: 0,
      callCount: 0,
      donationCount: 0,
      plateletDonationCount: 0,
      callCountLast3Days: 0,
      newCallRecordLoader: false,
      showExtensionFlag: false,
      seeDetailsLoaderFlag: false,
      donationLoaderFlag: false,
      availableInRendered: 0,
      availabilityType: '',
      studentId: null,
      roomNumber: '(Unknown)',
      newDonationDate: '',
      newDonationType: 'Blood'
    }
  }
}
</script>

<style scoped>
/* Expansion animation */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease-in-out;
  overflow: hidden;
}

.expand-enter,
.expand-leave-to {
  opacity: 0;
  transform: translateY(-10px);
  max-height: 0;
}

.expand-enter-to,
.expand-leave {
  opacity: 1;
  transform: translateY(0);
  max-height: 1000px;
}
</style>
