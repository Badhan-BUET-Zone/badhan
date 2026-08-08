<template>
  <ContainerOutlined :data-cy="'feedbackCard-' + feedback._id">

    <!-- (a) A message from a donor we can find. The card is PersonCardNew itself rather than an
         imitation of it, so the call button, the expansion, See profile and adding a donation date
         all keep working — which is exactly the workflow a volunteer needs here. -->
    <PersonCardNew
      v-if="feedback.type === 'feedback' && feedback.donor"
      :person="feedback.donor"
      :detailsBasePath="'/feedback'"
      data-cy="feedbackDonorCard"
    ></PersonCardNew>

    <!-- (b) A message whose donor we cannot find: deleted, or a pair that never matched. Expected,
         not an error. -->
    <div v-else-if="feedback.type === 'feedback'" data-cy="feedbackUnknownDonorHeader">
      <v-card-title>Unknown donor</v-card-title>
      <v-card-subtitle>
        Phone: +{{ feedback.feedbackJSON.phone }} &nbsp;·&nbsp;
        Student ID: {{ feedback.feedbackJSON.studentId }} &nbsp;·&nbsp;
        {{ feedback.hall | getHallName }}
      </v-card-subtitle>
      <v-card-text>No donor record matches this phone number and student ID.</v-card-text>
    </div>

    <!-- (c) A registration submission. Nobody to render a card for — that is the whole point. -->
    <div v-else data-cy="feedbackNewDonorCard">
      <v-card-title>New donor submission</v-card-title>
      <v-card-subtitle>Sent from the {{ feedback.hall | getHallName }} registration code</v-card-subtitle>
      <v-simple-table>
        <tbody>
          <tr><td>Name</td><td data-cy="feedbackNewDonorName">{{ decoded.name }}</td></tr>
          <tr><td>Phone</td><td data-cy="feedbackNewDonorPhone">+{{ feedback.feedbackJSON.phone }}</td></tr>
          <tr><td>Student ID</td><td data-cy="feedbackNewDonorStudentId">{{ feedback.feedbackJSON.studentId }}</td></tr>
          <tr><td>Blood group</td><td data-cy="feedbackNewDonorBloodGroup">{{ feedback.feedbackJSON.bloodGroup | getBloodGroupString }}</td></tr>
          <tr><td>Hall</td><td data-cy="feedbackNewDonorHall">{{ feedback.feedbackJSON.hall | getHallName }}</td></tr>
          <tr><td>Room</td><td>{{ decoded.roomNumber || 'Not given' }}</td></tr>
          <tr><td>Address</td><td>{{ decoded.address || 'Not given' }}</td></tr>
          <tr><td>Contactable by other halls</td><td>{{ feedback.feedbackJSON.availableToAll ? 'Yes' : 'No' }}</td></tr>
          <tr><td>Comment</td><td style="white-space: pre-wrap" data-cy="feedbackNewDonorComment">{{ decoded.comment || 'Not given' }}</td></tr>
        </tbody>
      </v-simple-table>

      <!-- Labelled as the student's own claim. None of it has been checked against anything, and a
           volunteer reading it as a Badhan record is exactly the mistake to prevent. -->
      <v-card-subtitle>Donation history, as reported by the student</v-card-subtitle>
      <v-simple-table>
        <tbody>
          <tr><td>Blood donations</td><td data-cy="feedbackNewDonorDonationCount">{{ feedback.feedbackJSON.donationCount }}</td></tr>
          <tr><td>Last blood donation</td><td>{{ formatDate(feedback.feedbackJSON.lastDonation) }}</td></tr>
          <tr><td>Platelet donations</td><td>{{ feedback.feedbackJSON.plateletDonationCount }}</td></tr>
          <tr><td>Last platelet donation</td><td>{{ formatDate(feedback.feedbackJSON.lastPlateletDonation) }}</td></tr>
        </tbody>
      </v-simple-table>
    </div>

    <!-- The message. Rendered with {{ }} and pre-wrap: NEVER v-html and NEVER VueMarkdown, which the
         donor comment field does use. This text is attacker-controlled and is stored exactly as it
         was typed, so Vue's escaping of interpolated output is the only thing making it inert. -->
    <v-card-text
      v-if="feedback.type === 'feedback'"
      style="white-space: pre-wrap"
      class="body-1"
      data-cy="feedbackMessageText"
    >{{ feedback.feedbackJSON.text }}</v-card-text>

    <v-card-subtitle data-cy="feedbackDate">{{ new Date(feedback.date).toLocaleString() }}</v-card-subtitle>

    <v-card-actions>
      <Button
        v-if="feedback.type === 'newDonor'"
        data-cy="feedbackCreateDonorButton"
        :icon="'mdi-account-plus'"
        :text="'Create donor'"
        :color="'primary'"
        :disabled="false"
        :click="createDonor"
      ></Button>
      <Button
        data-cy="feedbackDiscardButton"
        :icon="'mdi-delete'"
        :text="'Discard'"
        :color="'warning'"
        :disabled="discardingFlag"
        :click="confirmDiscard"
      ></Button>
    </v-card-actions>
  </ContainerOutlined>
</template>

<script>
import ContainerOutlined from '@/components/Container/ContainerOutlined'
import PersonCardNew from '@/components/PersonCardNew'
import Button from '@/components/UI Components/Button'
import { decodeEntities } from '@/views/Feedback/decodeEntities'

// One wrapper, three card shapes, chosen by the row's `type` column and by whether a donor was
// found. `donor: null` is a normal value here, not an error: every registration row has one, and so
// does any message whose donor was deleted.
export default {
  name: 'FeedbackCard',
  components: { ContainerOutlined, PersonCardNew, Button },
  props: {
    feedback: { type: Object, required: true },
    discardingFlag: { type: Boolean, default: false }
  },
  computed: {
    // Decoded once, here, at the read boundary. See decodeEntities.ts for the other half.
    decoded () {
      const payload = this.feedback.feedbackJSON || {}
      return {
        name: decodeEntities(payload.name),
        comment: decodeEntities(payload.comment),
        address: decodeEntities(payload.address),
        roomNumber: decodeEntities(payload.roomNumber)
      }
    }
  },
  methods: {
    formatDate (timestamp) {
      if (!timestamp) return 'Never'
      return new Date(timestamp).toLocaleDateString()
    },
    createDonor () {
      const payload = this.feedback.feedbackJSON

      // The whole draft goes into the query string rather than a store handoff, so the link
      // survives a reload and a volunteer who refreshes mid-typing does not lose the submission.
      // The values are decoded first: the creation route escapes them again itself, and passing
      // them on still-escaped would escape them twice.
      const query = {
        name: this.decoded.name,
        phone: String(payload.phone),
        studentId: payload.studentId,
        bloodGroup: String(payload.bloodGroup),
        hall: String(payload.hall),
        roomNumber: this.decoded.roomNumber,
        address: this.decoded.address,
        comment: this.decoded.comment,
        donationCount: String(payload.donationCount),
        plateletDonationCount: String(payload.plateletDonationCount),
        availableToAll: String(payload.availableToAll)
      }
      if (payload.lastDonation) query.lastDonation = String(payload.lastDonation)
      if (payload.lastPlateletDonation) query.lastPlateletDonation = String(payload.lastPlateletDonation)

      this.$router.push({ path: '/singleDonorCreation', query })
    },
    confirmDiscard () {
      // The wording says what actually happens, because "discard" reads like "reject" and the
      // single most likely misunderstanding is that it does something to the donor.
      this.$store.commit('confirmationBox/setConfirmationMessage', {
        confirmationMessage:
          'Discard this message permanently? It will be deleted and nothing will be added to or ' +
          'changed on any donor record. This cannot be undone.',
        confirmationAction: () => {
          this.$emit('discard', this.feedback._id)
        }
      })
    }
  }
}
</script>
