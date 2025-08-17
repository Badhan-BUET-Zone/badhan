<template>
  <!--  Person card-->
  <div class="mb-2 rounded-xl" style="width: 100%">
    <v-card
        class="rounded-xl"
        style="width: 100%; height: 100%; overflow: hidden;"
        @click="expansionClicked" rounded
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
              <span>{{ availableInRendered }} day</span><br>
              <span>{{ donationCount }} donations</span>
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
              <span>{{ donationCount }} donations</span>
            </v-card-text>
          </v-card>

        </v-col>
        <v-col
            cols="8"
            align-self="center"
            class="d-flex align-content-center"
        >
          <div style="font-size: small; width: 100%" class="text-wrap pa-2">
            <b data-cy="search-person-name" style="width: 100%">{{ name }} <v-icon v-if="markedBy" small color="secondary">mdi-bookmark</v-icon></b>
            <br/>
            <b>Phone: </b>
            <span v-if="phone">{{ phone.toString().substr(2) }}</span>
            <br>
            <b>Hall: </b>
            <span>{{ hall |getHallName }}</span>
          </div>
        </v-col>
      </v-row>
    </v-card>

    <!--    Person card extension-->
    <transition name="slide-fade-down-snapout" mode="out-in">
      <v-card class="mt-2 rounded-xl" v-if="showExtensionFlag">
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
              <span v-if="comment!==undefined && comment!==null && comment.length !==0"><VueMarkdown>**Comment:** {{comment }} (Last Updated:
                {{commentTime == 0 ? 'Unknown' : new Date(commentTime).toLocaleString() }} )</VueMarkdown> </span>
            </v-col>
          </v-row>
          <div class="mt-1">
            <v-btn
                :id="'personCardSeeProfileButtonId_'+id"
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
            <v-btn :id="'personCardCallButtonId_'+id" :disabled="newCallRecordLoader" small rounded color="secondary"
                   class="ml-2" @click="callFromDialer"
            >
              <v-icon left>
                mdi-phone
              </v-icon>
              Direct call
            </v-btn
            >
          </div>
          <div class="mt-2">
            <v-menu
                ref="menu"
                v-model="menu"
                :close-on-content-click="false"
                :return-value.sync="newDonationDate"
                transition="scale-transition"
                offset-y
                min-width="auto"
            >
              <template v-slot:activator="{ on, attrs }">
                <v-text-field
                    :id="`personCardDatePickerId_${id}`"
                    rounded
                    v-model="newDonationDate"
                    label="Add a donation date"
                    prepend-icon="mdi-calendar"
                    readonly
                    outlined
                    v-bind="attrs"
                    v-on="on"
                    dense
                ></v-text-field>
              </template>
              <v-date-picker :id="`personCardDatePickerCalenderId_${id}`" v-model="newDonationDate" no-title scrollable>
                <v-spacer></v-spacer>
                <v-btn text color="primary" @click="menu = false">Cancel</v-btn>
                <v-btn
                    :id="`personCardDatePickerOkButtonId_${id}`"
                    text
                    color="primary"
                    @click="$refs.menu.save(newDonationDate)"
                >OK
                </v-btn
                >
              </v-date-picker>
            </v-menu>
          </div>
          <div class="mt-2">
            <v-radio-group v-model="newDonationType" row dense>
              <v-radio label="Blood" value="Blood"></v-radio>
              <v-radio label="Platelet" value="Platelet"></v-radio>
            </v-radio-group>
          </div>
          <v-btn
              :id="`personCardDonationButtonId_${id}`"
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
import { directCall, fixBackSlash } from '@/mixins/helpers'
import VueMarkdown from 'vue-markdown'
import { handlePOSTCallRecord, handlePOSTDonations, handlePOSTPlateletDonations } from '@/api'

export default {
  name: 'PersonCard',
  props: [
  'person'
  ],
  components: { VueMarkdown },
  data: function () {
    return {
      newDonationDate: '',
  newDonationType: 'Blood',
      error: '',
      success: '',

      // vuetify date picker
      menu: false,

      showExtensionFlag: false,
      seeDetailsLoaderFlag: false,
      donateLoaderFlag: false,
      availableInRendered: 0,

      newCallRecordLoader: false,

      profileDetailsClicked: false,
      profileDetailsLoading: false,

      phone: null,
      name: null,
      bloodGroup: null,
      availableIn: null,
      studentId: null,
      lastDonation: 0,
      comment: '(Unknown)',
      address: '(Unknown)',
      roomNumber: '(Unknown)',
      id: null,
      hall: null,
      commentTime: 0,
      callCountLast3Days: 0,
  donationCount: 0,

      markedBy: null,
      lastCalled: null,

      donationLoaderFlag: false,

    }
  },
  watch: {},
  computed: {
  },
  mounted () {
    this.setInformation(this.person)
  },
  methods: {
    async callFromDialer () {
      directCall(this.phone)
      this.newCallRecordLoader = true
      const response = await handlePOSTCallRecord({ donorId: this.id })
      this.newCallRecordLoader = false
      if (response.status!== 201) return
      this.$store.dispatch('notification/notifySuccess', 'Added call record')
      // this.callRecords.push({ date: new Date().getTime() })
      this.lastCalled = new Date().getTime()
      this.callCountLast3Days++
    },
    async loadPersonDetails () {
      await this.$router.push({
        path: '/home/details',
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

      if (response.status !== 201) return;

  // Recalculate availability after adding a donation
  this.setAvailableInFromPerson({ ...this.person, lastDonation: isPlatelet ? this.person.lastDonation : timestamp, lastPlateletDonation: isPlatelet ? timestamp : this.person.lastPlateletDonation })
  // optimistic count bump when possible
  this.donationCount = (this.donationCount || 0) + 1

      this.newDonationDate = ''
  // default radio back to Blood
  this.newDonationType = 'Blood'

      this.$store.dispatch('notification/notifySuccess', isPlatelet ? 'Platelet donation inserted successfully' : 'Donation inserted successfully')
    },
    async expansionClicked () {
      this.showExtensionFlag = !this.showExtensionFlag
    },

    setAvailableInFromPerson (person) {
      const daysSinceBlood = Math.floor((Date.now() - (person.lastDonation || 0)) / (1000*3600*24))
      const daysSincePlatelet = Math.floor((Date.now() - (person.lastPlateletDonation || 0)) / (1000*3600*24))
      const neededBlood = Math.max(0, 120 - daysSinceBlood)
      const neededPlatelet = Math.max(0, 12 - daysSincePlatelet)
      this.availableInRendered = Math.max(neededBlood, neededPlatelet)
    },

    setInformation (person) {
  this.setAvailableInFromPerson(person)
      this.phone = person.phone
      this.name = person.name
      this.hall = person.hall
      this.bloodGroup = person.bloodGroup
      this.studentId = person.studentId
  this.lastDonation = person.lastDonation
      this.comment = fixBackSlash(person.comment)
      this.address = person.address
      this.roomNumber = person.roomNumber
      this.id = person._id
      this.commentTime = person.commentTime
      this.callCountLast3Days = person.callCountLast3Days
  this.donationCount = person.donationCount
      this.markedBy = person.marker.name
      this.lastCalled = person.lastCalled
    }

  }
}
</script>

<style scoped>
</style>
