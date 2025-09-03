<template>
  <div class="mb-2 rounded-xl">
    <v-card
        style="width: 100%; height: 100%; overflow: hidden;"
        class="rounded-xl"
        @click="donorDetailsExpansion = !donorDetailsExpansion"
    >
      <v-row no-gutters>
        <v-col align-self="center" cols="4">
          <v-card
              v-if="availableIn > 0"
              class="text-center rounded-xl"
              color="errorLight"
              flat rounded
          >
            <v-card-text style="font-size: 10px;  line-height: 1.6;">
              <span>{{ bloodGroup | getBloodGroupString }}</span><br>
              <span>{{ availableIn }} day</span><br>
              <span>{{ totalDonationCount }} donations</span>
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
              <span>{{ totalDonationCount }} donations</span>
            </v-card-text>
          </v-card>

        </v-col>
        <v-col
            cols="8"
            align-self="center"
            class="d-flex align-content-center"
        >
          <div style="font-size: small; width: 100%" class="text-wrap pa-2">
            <b style="width: 100%">{{name}} <v-icon v-if="markerName" small color="secondary">mdi-bookmark</v-icon></b>
            <br/>
            <b>Phone: </b>
            <span>{{phone}}</span>
            <br/>
            <b>Hall: </b>
            <span>{{hall}}</span>
          </div>
        </v-col>
      </v-row>
    </v-card>
    <v-card v-if="donorDetailsExpansion" class="mt-2 rounded-xl" >
      <v-card-text style="font-size: small">
        <div style="float: right;">
          <v-btn @click="callFromDialer" :disabled="newCallRecordLoader" depressed class="ma-1" x-small fab color="green" dark><v-icon>mdi-phone</v-icon></v-btn>
          <v-btn style="text-decoration: none" :to="detailsBasePath + '/details?id='+id" depressed class="ma-1" x-small fab color="blue" dark><v-icon>mdi-account-details</v-icon></v-btn>
        </div>
    <span><b>Department: </b>{{department}}</span><br>
    <span><b>Address: </b>{{address}}</span><br>
  <span v-if="created"><b>Created: </b>{{ created }}</span><br v-if="created">
    <span v-if="markerName && markedTime">
      <b>Marked by: </b>{{markerName}} (On {{markedTime}})
      <br>
    </span>
    <span v-if="lastCallRecord">
      <b>Last called: </b>On {{lastCallRecord}}
      <br>
    </span>
    <span v-if="callCountLast3Days">
      Called {{callCountLast3Days}} times in last 3 days
      <br>
    </span>
    <span>
      <b>Blood donations:</b> {{ donationCount }} | <b>Platelet donations:</b> {{ plateletDonationCount }}
      <br>
    </span>
    <span>
      <b>Blood availability:</b> {{ neededBlood === 0 ? 'Available' : (neededBlood + ' day' + (neededBlood>1?'s':'')) }} |
      <b>Platelet availability:</b> {{ neededPlatelet === 0 ? 'Available' : (neededPlatelet + ' day' + (neededPlatelet>1?'s':'')) }}
      <br>
    </span>
    <span>
      <b>Overall availability:</b> {{ availableIn === 0 ? 'Available now' : ('Available in ' + availableIn + ' day' + (availableIn>1?'s':'')) }} (gated by {{ gatingType }})
      <br>
    </span>
  <span><VueMarkdown>**Comment:** {{comment }} (Last Updated:{{commentTime === 0 ? 'Unknown' : new Date(commentTime).toLocaleString() }} )</VueMarkdown></span>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import { halls, departments } from '@/mixins/constants'
import VueMarkdown from 'vue-markdown'
import { directCall } from '@/mixins/helpers'
import { handlePOSTCallRecord } from '@/api'

export default {
  props: {
    donor: {
      type: Object
    },
    detailsBasePath: {
      type: String,
      default: '/activeDonors'
  }
  },
  components: { VueMarkdown },
  name: 'PersonCardNew',
  mounted () {
    const donor = this.$props.donor
    this.id = donor._id
    this.bloodGroup = donor.bloodGroup
    this.name = donor.name
    this.hall = halls[donor.hall]
    this.phone = '+' + donor.phone
    this.department = departments[parseInt(donor.studentId.substr(2, 2))]
    this.address = donor.address
    this.comment = donor.comment
    this.commentTime = donor.commentTime === 0 ? 'Unknown' : new Date(donor.commentTime).toLocaleString()
    this.markerName = donor.markerName !== null ? donor.markerName : null
    this.markedTime = donor.markedTime !== null ? new Date(donor.markedTime).toLocaleString() : null
    // Created timestamp derived from ObjectId (if provided by API)
    if (typeof donor.created === 'number' && !isNaN(donor.created)) {
      this.created = new Date(donor.created).toLocaleString()
    } else {
      this.created = null
    }
    if (donor.lastCallRecord && !isNaN(new Date(donor.lastCallRecord))) {
      this.lastCallRecord = new Date(donor.lastCallRecord).toLocaleString()
    } else {
      this.lastCallRecord = null
    }
    this.callCountLast3Days = donor.callCountLast3Days !== null ? donor.callCountLast3Days : null
  // Determine next availability days based on combined rule
    const daysSinceBlood = Math.floor((Date.now() - (donor.lastDonation || 0)) / (1000*3600*24))
    const daysSincePlatelet = Math.floor((Date.now() - (donor.lastPlateletDonation || 0)) / (1000*3600*24))
    const neededBlood = Math.max(0, 120 - daysSinceBlood)
    const neededPlatelet = Math.max(0, 12 - daysSincePlatelet)
    this.availableIn = Math.max(neededBlood, neededPlatelet)
    this.lastDonation = donor.lastDonation
    this.donationCount = donor.donationCount
    this.plateletDonationCount = donor.plateletDonationCount || 0
    this.totalDonationCount = this.donationCount + this.plateletDonationCount

    // store detailed availability numbers
    this.neededBlood = neededBlood
    this.neededPlatelet = neededPlatelet
    this.gatingType = this.availableIn === neededBlood && this.availableIn === neededPlatelet
      ? 'blood & platelet'
      : (this.availableIn === neededBlood ? 'blood' : 'platelet')

    this.setAvailableIn(this.lastDonation)
  },
  methods: {
    async callFromDialer () {
      directCall(this.phone)
      this.newCallRecordLoader = true
      await handlePOSTCallRecord({ donorId: this.id })
      this.$store.dispatch('notification/notifySuccess', 'Added call record')
      this.newCallRecordLoader = false
      this.lastCallRecord = new Date().toLocaleString()
      this.callCountLast3Days++
    },
  setAvailableIn (lastDonation) {
      // Recompute availability days using both blood and platelet rules.
      const lastDon = typeof lastDonation === 'number' ? lastDonation : this.lastDonation
      const lastPlatelet = (this.$props.donor && this.$props.donor.lastPlateletDonation) ? this.$props.donor.lastPlateletDonation : 0
      const daysSinceBlood = Math.floor((Date.now() - (lastDon || 0)) / (1000 * 3600 * 24))
      const daysSincePlatelet = Math.floor((Date.now() - (lastPlatelet || 0)) / (1000 * 3600 * 24))
      const neededBlood = Math.max(0, 120 - daysSinceBlood)
      const neededPlatelet = Math.max(0, 12 - daysSincePlatelet)
      this.availableIn = Math.max(neededBlood, neededPlatelet)
  }
  },
  data: () => {
    return {
      id: '',
      name: '',
      hall: '',
      phone: '',
      department: '',
      address: '',
      comment: '',
      bloodGroup: -1,
      commentTime: '',
      markerName: null,
      markedTime: '',
      lastCallRecord: null,
      lastDonation: 0,
      callCount: 0,
      donationCount: 0,
    plateletDonationCount: 0,
    totalDonationCount: 0,
      callCountLast3Days: null,
      newCallRecordLoader: false,
      donorDetailsExpansion: false,
  created: null,
  availableIn: 0,
  neededBlood: 0,
  neededPlatelet: 0,
  gatingType: ''
    }
  }
}
</script>

<style scoped>

</style>
