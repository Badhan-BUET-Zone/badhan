<template>
  <div>
    <Container>
      <transition name="slide-fade-down" mode="out-in">

        <!-- State 1 — the identity check -->
        <div v-if="state === 'form'" :key="'publicDonorForm'" data-cy="publicDonorForm">
          <v-card-title>Send a message to Badhan BUET Zone</v-card-title>
          <v-card-text class="subtitle-1">
            Enter your phone number and student ID to see your donation record and leave a message
            for the volunteers.
          </v-card-text>

          <v-card-text v-if="expiredNotice" class="title" data-cy="publicDonorExpiredNotice">
            That took a little too long. Please enter your phone number and student ID again; your
            message is still here.
          </v-card-text>

          <v-card-text>
            <TextField
              id="publicDonorPhone"
              data-cy="publicDonorPhoneInput"
              label="Phone number"
              hint="11 digits, starting with 01"
              type="tel"
              maxlength="11"
              :value="phone"
              @input="phone = $event"
            />
            <TextField
              id="publicDonorStudentId"
              data-cy="publicDonorStudentIdInput"
              label="Student ID"
              hint="7 digits"
              maxlength="7"
              :value="studentId"
              @input="studentId = $event"
            />
          </v-card-text>

          <!--
            One message for every kind of failure. Never say which field was wrong and never echo
            the typed values back: anything that distinguishes "this phone exists" from "it does
            not" turns the page into a tool for probing who is in the database.
          -->
          <v-card-text v-if="mismatchFlag" class="title error--text" data-cy="publicDonorMismatch">
            Information does not match. Please contact a volunteer.
          </v-card-text>
          <v-card-text v-if="networkErrorFlag" class="title error--text" data-cy="publicDonorNetworkError">
            Could not reach Badhan. Please check your connection and try again.
          </v-card-text>

          <v-card-actions>
            <Button
              data-cy="publicDonorVerifyButton"
              :icon="'mdi-account-search'"
              :text="verifyingFlag ? 'Checking…' : 'Continue'"
              :color="'primary'"
              :disabled="!formValid || verifyingFlag"
              :click="verify"
            ></Button>
          </v-card-actions>
        </div>

        <!-- State 2 — the read-only summary, and the message box -->
        <div v-else-if="state === 'summary'" :key="'publicDonorSummary'" data-cy="publicDonorSummary">
          <v-card-title>Your record</v-card-title>
          <v-card-text>
            <!--
              Read-only, and exactly the nine fields the route returns. No edit control and no link
              into the app: a donor cannot change anything from here, by design.
            -->
            <v-simple-table data-cy="publicDonorTable">
              <tbody>
                <tr><td>Name</td><td data-cy="publicDonorName">{{ donor.name }}</td></tr>
                <tr><td>Phone</td><td data-cy="publicDonorPhoneValue">+{{ donor.phone }}</td></tr>
                <tr><td>Student ID</td><td data-cy="publicDonorStudentIdValue">{{ donor.studentId }}</td></tr>
                <tr><td>Blood group</td><td data-cy="publicDonorBloodGroup">{{ donor.bloodGroup | getBloodGroupString }}</td></tr>
                <tr><td>Hall</td><td data-cy="publicDonorHall">{{ donor.hall | getHallName }}</td></tr>
                <tr><td>Blood donations</td><td data-cy="publicDonorDonationCount">{{ donor.donationCount }}</td></tr>
                <tr><td>Last blood donation</td><td data-cy="publicDonorLastDonation">{{ formatDate(donor.lastDonation) }}</td></tr>
                <tr><td>Platelet donations</td><td data-cy="publicDonorPlateletCount">{{ donor.plateletDonationCount }}</td></tr>
                <tr><td>Last platelet donation</td><td data-cy="publicDonorLastPlatelet">{{ formatDate(donor.lastPlateletDonation) }}</td></tr>
              </tbody>
            </v-simple-table>
          </v-card-text>

          <v-card-title>Your message</v-card-title>
          <v-card-text class="subtitle-2">
            For example:
            <ul>
              <li>I donated blood on 12 March, please add it to my record.</li>
              <li>My phone number has changed.</li>
              <li>I have moved to a different hall.</li>
              <li>Please do not call me for the next few months.</li>
            </ul>
          </v-card-text>
          <v-card-text>
            <v-textarea
              data-cy="publicDonorMessageInput"
              v-model="text"
              outlined
              counter="500"
              maxlength="500"
              label="Your message"
              rows="5"
            ></v-textarea>
          </v-card-text>

          <v-card-text v-if="networkErrorFlag" class="title error--text" data-cy="publicDonorNetworkError">
            Could not reach Badhan. Please check your connection and try again.
          </v-card-text>

          <v-card-actions>
            <Button
              data-cy="publicDonorSubmitButton"
              :icon="'mdi-send'"
              :text="submittingFlag ? 'Sending…' : 'Submit'"
              :color="'primary'"
              :disabled="text.trim().length === 0 || submittingFlag"
              :click="submit"
            ></Button>
          </v-card-actions>
        </div>

        <!-- State 3 — thank you, and nothing else to click -->
        <div v-else :key="'publicDonorThanks'" data-cy="publicDonorThanks">
          <v-card-title>Thank you</v-card-title>
          <v-card-text class="title" data-cy="publicDonorThanksMessage">
            {{ thanksMessage }}
          </v-card-text>
          <v-card-text class="subtitle-1">
            A volunteer will read it. You will not get a reply here — scan the code again later and
            your record will show any change they made.
          </v-card-text>
        </div>

      </transition>
    </Container>
  </div>
</template>

<script>
import Container from '@/components/Container/Container'
import Button from '@/components/UI Components/Button'
import TextField from '@/components/UI Components/TextField'
import { handlePOSTFeedbackToken, handlePOSTFeedback } from '@/api'
import { HTTP_STATUS } from '@/mixins/constants'

// The page behind every printed QR code on a notice board. Most donors in the database have no
// account and cannot sign in, so this is the only way they can tell Badhan anything.
//
// It can speak, but it cannot act: the single write it performs is appending a row to the feedbacks
// collection, which a volunteer later reads and discards by hand. Nothing here changes a donor.
//
// Every string on this page is English, matching the printed caption and the rest of the app.

export default {
  name: 'PublicDonorPage',
  components: { Container, Button, TextField },
  data: () => {
    return {
      state: 'form',
      phone: '',
      studentId: '',
      // The token lives here and nowhere else — never localStorage, never the URL, never a cookie.
      // It dies with the page, which is the point of a fifteen-minute default.
      token: '',
      donor: null,
      text: '',
      verifyingFlag: false,
      submittingFlag: false,
      mismatchFlag: false,
      networkErrorFlag: false,
      expiredNotice: false,
      thanksMessage: ''
    }
  },
  computed: {
    formValid () {
      // Mirrors the server's rules so a donor is told about a typo before a request goes out. The
      // server validates again regardless; this is courtesy, not enforcement.
      return /^01\d{9}$/.test(this.phone) && /^\d{7}$/.test(this.studentId)
    }
  },
  mounted () {
    document.title = 'Badhan Donor'
  },
  methods: {
    formatDate (timestamp) {
      if (!timestamp) return 'No record'
      return new Date(timestamp).toLocaleDateString()
    },
    async verify () {
      this.verifyingFlag = true
      this.mismatchFlag = false
      this.networkErrorFlag = false
      this.expiredNotice = false

      // The app's convention: the donor types 11 digits and the client prefixes 88. Asking a donor
      // standing at a notice board to type a country code is asking for a mistake.
      const response = await handlePOSTFeedbackToken({
        phone: Number('88' + this.phone),
        studentId: this.studentId
      })

      this.verifyingFlag = false

      // The api helpers return the error response rather than throwing, and return undefined when
      // the request never reached a server at all. That last case is a network problem, not a
      // mismatch, and telling them apart is the difference between "try again" and "ask a
      // volunteer".
      if (!response) {
        this.networkErrorFlag = true
        return
      }
      if (response.status !== HTTP_STATUS.OK) {
        this.mismatchFlag = true
        return
      }

      this.token = response.data.token
      this.donor = response.data.donor
      this.state = 'summary'
    },
    async submit () {
      this.submittingFlag = true
      this.networkErrorFlag = false

      const response = await handlePOSTFeedback({
        token: this.token,
        type: 'feedback',
        feedbackJSON: {
          phone: Number('88' + this.phone),
          studentId: this.studentId,
          text: this.text.trim()
        }
      })

      this.submittingFlag = false

      if (!response) {
        this.networkErrorFlag = true
        return
      }

      // The token expired while they were typing. Fifteen minutes is generous, but a phone that
      // sleeps mid-sentence spends the whole window doing nothing, so this path is reached in
      // practice — and it is the most likely everyday failure in the feature.
      //
      // KEEP THE TYPED TEXT. A donor who loses their words to an expiry does not type them again.
      // Re-verifying re-mints a token and submits the very same message.
      if (response.status === HTTP_STATUS.UNAUTHORIZED) {
        this.token = ''
        this.donor = null
        this.expiredNotice = true
        this.state = 'form'
        return
      }

      if (response.status !== HTTP_STATUS.CREATED) {
        this.networkErrorFlag = true
        return
      }

      // Shown verbatim, and there is deliberately nothing here to click. Returning to the form
      // automatically would invite a second submission nobody meant to make.
      this.thanksMessage = response.data.message
      this.state = 'thanks'
    }
  }
}
</script>
