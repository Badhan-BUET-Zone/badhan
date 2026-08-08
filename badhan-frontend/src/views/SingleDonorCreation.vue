<template>
  <div>
    <PageTitle>
      <HelpTooltip>
        <div>
          Input information of new donor as specified below
          <ul>
            <li><b>Name: </b>String of non-zero length</li>
            <li><b>Phone: </b>Numeric string of 11 characters</li>
            <li><b>Student ID: </b>Input data type is a 7 digit number. E.g. 1605011. If department code is unknown, use
              00
            </li>
            <li><b>Blood Group: </b>Blood group of donor from dropdown</li>
            <li><b>Room: </b>Field can be null but must be a string if not null</li>
            <li><b>Address: </b>Field can be null but must be a string if not null</li>
            <li><b>Comment: </b>Field can be null but must be a string if not null</li>
            <li><b>Donation count: </b>Must be an integer number and minimum value should be 0.</li>
            <li><b>Select Hall: </b>If the hall name is unknown, the donor will be editable and accessible to members of
              all halls.
            </li>
            <li><b>Public Data: </b>If the information of the donor needs to be accessible by member of other halls,
              please put a tick here. Otherwise the donor will be restricted to be accessed only from the specified
              hall.
            </li>
            <li><b>Pick Last Donation Date: </b>If the donation count is non-zero, please specify the last donation date
              from the date picker.
            </li>
          </ul>
        </div>
      </HelpTooltip>
    </PageTitle>

    <NewPersonCard v-if="donor!==null" :donor="donor" :discard-donor="null"></NewPersonCard>

    <ContainerFlat v-if="prefilledFromFeedback">
      <v-card-text data-cy="singleDonorCreationPrefillNotice">
        These details came from a registration submission. Check every field before saving — the
        student typed them and nothing here has been verified. After saving, go back to the Feedback
        page and discard the submission; it does not disappear on its own.
      </v-card-text>
    </ContainerFlat>

    <ContainerFlat>
      <v-btn rounded to="/csvDonorCreation" color="secondary" style="text-decoration: none" text>
        Upload CSV of Donors
      </v-btn>
    </ContainerFlat>
    <transition name="slide-fade" mode="out-in">
      <router-view></router-view>
    </transition>
  </div>
</template>

<script>
import NewPersonCard from '@/views/SingleDonorCreation/components/NewPersonCard'
import PageTitle from '@/components/PageTitle'
import HelpTooltip from '@/components/UI Components/HelpTooltip'
import ContainerFlat from '@/components/Container/ContainerFlat'

export default {
  name: 'SingleDonorCreation',
  components: {
    ContainerFlat,
    NewPersonCard,
    PageTitle,
    HelpTooltip
  },
  data: () => {
    return {
      donor: null,
      prefilledFromFeedback: false
    }
  },
  computed: {
  },
  methods: {
    // The prefill arrives in the query string rather than through a fetch or a store handoff, so
    // the link survives a reload and a volunteer who refreshes mid-typing keeps the submission.
    // Only these keys are read: an unknown query parameter is ignored rather than passed into the
    // draft, so a hand-edited URL cannot inject a field and NewPersonCard's unexpected-key warning
    // stays quiet.
    //
    // Nothing is decoded here. The Feedback page decoded the HTML entities once already, and the
    // creation route this form posts to escapes them again itself — a second decode would be as
    // wrong as a missing one.
    prefillFromQuery () {
      const query = this.$route.query
      const text = (key) => (query[key] === undefined ? null : String(query[key]))
      const number = (key) => (query[key] === undefined || query[key] === '' ? null : Number(query[key]))

      // Query values are strings; NewPersonCard's blood group and hall selectors compare
      // numerically, so these three have to be coerced or the selectors show nothing.
      this.donor = {
        name: text('name'),
        phone: text('phone'),
        studentId: text('studentId'),
        bloodGroup: number('bloodGroup'),
        hall: query.hall === undefined ? this.$store.getters['getHall'] : Number(query.hall),
        address: text('address'),
        roomNumber: text('roomNumber'),
        comment: text('comment'),
        donationCount: query.donationCount === undefined ? 0 : Number(query.donationCount),
        lastDonation: number('lastDonation'),
        plateletDonationCount: query.plateletDonationCount === undefined ? 0 : Number(query.plateletDonationCount),
        lastPlateletDonation: number('lastPlateletDonation'),
        availableToAll: query.availableToAll === 'true',
        key: new Date().getTime()
      }
      this.prefilledFromFeedback = true
    },
    reset () {
      this.donor = {
        name: null,
        phone: null,
        studentId: null,
        bloodGroup: null,

        hall: this.$store.getters['getHall'],

        address: null,
        roomNumber: null,
        comment: null,
        donationCount: 0,
        lastDonation: null,
        plateletDonationCount: 0,
        lastPlateletDonation: null,

        availableToAll: false,

        key: new Date().getTime()
      }
    }
  },
  mounted () {
    const prefillKeys = ['name', 'phone', 'studentId', 'bloodGroup', 'hall', 'address', 'roomNumber', 'comment']
    if (prefillKeys.some((key) => this.$route.query[key] !== undefined)) {
      this.prefillFromQuery()
      return
    }
    this.reset()
  }
}
</script>

<style scoped>

</style>
