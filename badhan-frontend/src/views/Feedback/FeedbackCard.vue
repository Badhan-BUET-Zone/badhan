<template>
  <Container :data-cy="'feedbackCard-' + feedback._id">

    <!--
      The header is the whole row when collapsed: who it came from, and what a volunteer can do
      with it. Everything else — the message, the submitted fields, the date — is one tap away.
      The queue is meant to be read top to bottom and emptied, and a screenful of tables per row
      made that impossible; a name, a phone number and the two buttons is what triage actually
      needs.

      The full-width person card that used to sit here is gone on purpose. Its call button, its
      donation date picker and its availability chip were a second workflow inside a queue whose
      whole job is "read it, go and do the work on the profile, discard it" — See profile is the
      one part of it that step 2 actually uses, so that is the part that stayed.
    -->
    <v-row
      no-gutters
      align="center"
      class="pa-2"
      style="cursor: pointer"
      :data-cy="headerDataCy"
      @click="expanded = !expanded"
    >
      <v-col cols="12" sm="5" class="pa-1">
        <div style="font-size: small" class="text-wrap">
          <b data-cy="feedbackHeaderName">{{ headerName }}</b>
          <br/>
          <b>Phone: </b><span data-cy="feedbackHeaderPhone">{{ headerPhone }}</span>
        </div>
      </v-col>

      <v-col cols="12" sm="7" class="d-flex align-center justify-start justify-sm-end">
        <!-- @click.stop, or every button would also toggle the expansion it sits inside. It wraps
             the buttons only, not the column: whatever space is left beside them is still header,
             and header opens the row. -->
        <div @click.stop>
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
            v-if="feedback.donor"
            data-cy="feedbackSeeProfileButton"
            :icon="'mdi-account-details'"
            :text="'See profile'"
            :color="'primary'"
            :disabled="false"
            :click="seeProfile"
          ></Button>
          <Button
            data-cy="feedbackDiscardButton"
            :icon="'mdi-delete'"
            :text="'Discard'"
            :color="'warning'"
            :disabled="discardingFlag"
            :click="confirmDiscard"
          ></Button>
        </div>
      </v-col>
    </v-row>

    <transition name="expand">
      <div v-show="expanded" data-cy="feedbackCardDetails">

        <!-- A message whose donor we cannot find: deleted, or a pair that never matched. Expected,
             not an error. -->
        <div v-if="feedback.type === 'feedback' && !feedback.donor" data-cy="feedbackUnknownDonorDetails">
          <v-card-subtitle class="pb-0">
            Student ID: {{ feedback.feedbackJSON.studentId }} &nbsp;·&nbsp;
            {{ feedback.hall | getHallName }}
          </v-card-subtitle>
          <v-card-text>No donor record matches this phone number and student ID.</v-card-text>
        </div>

        <!-- A registration submission: everything the student typed, which is the only place it
             exists until somebody creates the donor. -->
        <div v-if="feedback.type === 'newDonor'">
          <!--
            The row's hall names the LIST this landed in, not the code that produced it. Under a code
            made for one named hall those are the same thing; under an "All Halls" code they are not —
            the student chose, and saying "sent from the Titumir registration code" would then be a
            plain untruth. The card cannot tell the two apart, because the row stores only the hall it
            was routed to, so it states the thing it does know.
          -->
          <v-card-subtitle>In the {{ feedback.hall | getHallName }} list</v-card-subtitle>
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
        <template v-if="feedback.type === 'feedback'">
          <v-card-subtitle class="pb-0">Feedback content</v-card-subtitle>
          <v-card-text
            style="white-space: pre-wrap"
            class="body-1"
            data-cy="feedbackMessageText"
          >{{ feedback.feedbackJSON.text }}</v-card-text>
        </template>

        <v-card-subtitle class="pb-0">Date</v-card-subtitle>
        <v-card-text data-cy="feedbackDate">{{ new Date(feedback.date).toLocaleString() }}</v-card-text>
      </div>
    </transition>
  </Container>
</template>

<script>
import Container from '@/components/Container/Container'
import Button from '@/components/UI Components/Button'
import { decodeEntities } from '@/views/Feedback/decodeEntities'

// One wrapper, three card shapes, chosen by the row's `type` column and by whether a donor was
// found. `donor: null` is a normal value here, not an error: every registration row has one, and so
// does any message whose donor was deleted.
//
// All three share the same collapsed header, so the queue reads as one list of rows rather than
// three kinds of card. What differs is what is behind the expansion and which button sits beside
// Discard.
export default {
  name: 'FeedbackCard',
  components: { Container, Button },
  props: {
    feedback: { type: Object, required: true },
    discardingFlag: { type: Boolean, default: false }
  },
  data: () => {
    return {
      expanded: false
    }
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
    },
    headerDataCy () {
      if (this.feedback.type === 'newDonor') return 'feedbackNewDonorCard'
      return this.feedback.donor ? 'feedbackDonorCard' : 'feedbackUnknownDonorHeader'
    },
    headerName () {
      if (this.feedback.type === 'newDonor') return this.decoded.name
      // A message carries no name of its own — it is the donor's name or nothing, and nothing is a
      // real case worth stating rather than leaving the row blank.
      return this.feedback.donor ? this.feedback.donor.name : 'Unknown donor'
    },
    headerPhone () {
      const phone = this.feedback.donor
        ? this.feedback.donor.phone
        : (this.feedback.feedbackJSON || {}).phone
      if (!phone) return 'Unknown'
      // Without the 88 country code, the way every other card in the app prints a number and the
      // way a volunteer would dial it.
      return String(phone).replace(/^88/, '')
    }
  },
  methods: {
    formatDate (timestamp) {
      if (!timestamp) return 'Never'
      return new Date(timestamp).toLocaleDateString()
    },
    seeProfile () {
      // Same route the person card used, so the profile still opens over the list and the
      // volunteer keeps their place in the queue.
      this.$router.push({ path: '/feedback/details', query: { id: this.feedback.donor._id } })
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

<style scoped>
/* Expansion animation, matching the person card's. */
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
