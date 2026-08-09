<template>
  <div>
    <Container>
      <transition name="slide-fade-down" mode="out-in">

        <!-- No token, or one we cannot read. No first question: do not let a student answer twelve
             screens and fail at submit. -->
        <v-card-text v-if="state === 'invalid'" :key="'registrationInvalid'" class="title"
                     data-cy="registrationInvalidLink">
          This link is not valid. Please ask a volunteer for the QR code.
        </v-card-text>

        <v-card-text v-else-if="state === 'expired'" :key="'registrationExpired'" class="title"
                     data-cy="registrationExpired">
          This QR code has expired. Please ask a volunteer for a new one.
        </v-card-text>

        <div v-else-if="state === 'submitted'" :key="'registrationDone'" data-cy="registrationThanks">
          <v-card-title>Thank you</v-card-title>
          <v-card-text class="title" data-cy="registrationThanksMessage">{{ thanksMessage }}</v-card-text>
          <v-card-text class="subtitle-1">
            A volunteer will add you to the donor list. This is not an account — you do not need to
            sign in anywhere, and nobody will send you a password.
          </v-card-text>
        </div>

        <!-- The review screen. The only place the whole thing can be sent. -->
        <div v-else-if="onReview" :key="'registrationReview'" data-cy="registrationReview">
          <v-card-title>Check your answers</v-card-title>
          <v-card-text class="subtitle-2" data-cy="registrationReviewHall">
            <span v-if="hallLocked">This form was opened for {{ lockedHallName }}.</span>
            <span v-else>You chose {{ chosenHallName }}.</span>
          </v-card-text>
          <v-card-text v-if="expiryLabel" class="subtitle-2" data-cy="registrationExpiryNotice">
            This form is open until {{ expiryLabel }}.
          </v-card-text>

          <v-simple-table data-cy="registrationReviewTable">
            <tbody>
              <tr v-for="step in visibleSteps" :key="step.field">
                <td>{{ step.question }}</td>
                <td :data-cy="'registrationReviewValue-' + step.field">{{ displayValue(step) }}</td>
                <td>
                  <v-btn text small :data-cy="'registrationEdit-' + step.field"
                         @click="goToStep(step.field)">Edit</v-btn>
                </td>
              </tr>
            </tbody>
          </v-simple-table>

          <v-card-text v-if="errorMessage" class="title error--text" data-cy="registrationError">
            {{ errorMessage }}
          </v-card-text>

          <v-card-actions>
            <Button
              data-cy="registrationBackButton"
              :icon="'mdi-arrow-left'"
              :text="'Back'"
              :color="'secondary'"
              :disabled="false"
              :click="back"
            ></Button>
            <Button
              data-cy="registrationSubmitButton"
              :icon="'mdi-send'"
              :text="submittingFlag ? 'Sending…' : 'Submit'"
              :color="'primary'"
              :disabled="submittingFlag"
              :click="submit"
            ></Button>
          </v-card-actions>
        </div>

        <!-- Exactly one question, replaced rather than stacked. -->
        <QuestionShell
          v-else
          :key="'registrationStep-' + currentStep.field"
          :field="currentStep.field"
          :question="currentStep.question"
          :hint="currentStep.hint || ''"
          :position="position"
          :total="visibleSteps.length"
          :valid="currentValid"
          :optional="currentStep.optional === true"
          :can-go-back="stepIndex > 0"
          :is-last="position === visibleSteps.length"
          @back="back"
          @skip="skip"
          @next="next"
        >
          <!--
            The hall under a code made for one named hall: a field showing a value, disabled.
            Not a sentence and not a hidden field — a student should see where their submission
            is going, in the same place they would have chosen it under an All Halls code, and
            should be able to see at a glance that it is not theirs to change.
          -->
          <div v-if="currentStep.field === 'hall' && hallLocked">
            <v-text-field
              data-cy="registrationLockedHall"
              :value="lockedHallName"
              disabled
              outlined
              rounded
              dense
              hide-details
            ></v-text-field>
            <v-card-text class="subtitle-2 pl-0" data-cy="registrationLockedHallNotice">
              This code was made for {{ lockedHallName }}. Your submission goes to that hall's
              volunteers. If you live somewhere else, say so in the last question.
            </v-card-text>
          </div>
          <ChoiceQuestion
            v-else-if="currentStep.kind === 'choice'"
            :value="answers[currentStep.field]"
            :choices="currentStep.choices"
            @input="setAnswer(currentStep.field, $event)"
          />
          <DatePicker
            v-else-if="currentStep.kind === 'date'"
            :text-field-id="'registrationInput-' + currentStep.field"
            :picker-id="'registrationPicker-' + currentStep.field"
            :ok-button-id="'registrationDateOk-' + currentStep.field"
            :label="'Date'"
            :value="answers[currentStep.field] || ''"
            @input="setAnswer(currentStep.field, $event)"
          />
          <AnswerInput
            v-else
            :field="currentStep.field"
            :label="currentStep.question"
            :hint="currentStep.hint || ''"
            :input-type="currentStep.inputType || 'text'"
            :maxlength="currentStep.maxlength || 500"
            :value="answers[currentStep.field]"
            @input="setAnswer(currentStep.field, $event)"
            @enter="onEnter"
          />
        </QuestionShell>

      </transition>
    </Container>
  </div>
</template>

<script>
import Container from '@/components/Container/Container'
import Button from '@/components/UI Components/Button'
import DatePicker from '@/components/UI Components/DatePicker'
import QuestionShell from '@/views/PublicRegistration/QuestionShell'
import ChoiceQuestion from '@/views/PublicRegistration/ChoiceQuestion'
import AnswerInput from '@/views/PublicRegistration/AnswerInput'
import { REGISTRATION_STEPS, SKIP_DEFAULTS, HALL_CHOICES } from '@/views/PublicRegistration/steps'
import { handlePOSTFeedback } from '@/api'
import { HTTP_STATUS, HALL_ANY, halls } from '@/mixins/constants'

// The page a student reaches by scanning a volunteer's registration QR code.
//
// One question per screen, and nothing is sent until the review screen: there is no partial save and
// no draft on the server, so a student who closes the tab halfway has sent nothing at all. That also
// means an abandoned sequence leaves no trace, which is the cost of this shape and is accepted.
//
// The token in ?t= is a capability, not a secret about anybody: it names a hall and an expiry and
// nothing else, which is why it is safe in a URL, in a QR code and in a browser history.
//
// The hall it names may be HALL_ANY, which is not a hall: it is what an "All Halls" code carries,
// and it means the student is asked which hall they are in rather than being shown one. That is the
// only difference between the two modes — same sequence, same step count, same submission.

export default {
  name: 'PublicRegistrationPage',
  components: { Container, Button, DatePicker, QuestionShell, ChoiceQuestion, AnswerInput },
  data: () => {
    return {
      state: 'loading',
      token: '',
      hall: null,
      // True when the token names a real hall, false under an "All Halls" code. It decides how
      // the hall step renders and nothing else — the step itself is always in the sequence.
      hallLocked: false,
      expiresAt: null,
      stepIndex: 0,
      onReview: false,
      answers: {},
      submittingFlag: false,
      errorMessage: '',
      thanksMessage: ''
    }
  },
  computed: {
    // The steps this particular student will actually see. The two date questions drop out when the
    // count before them is zero — asking "when did you last donate?" of somebody who has just
    // answered "never" is a screen with no valid answer.
    //
    // The progress counter is computed from this list rather than from the full twelve, because a
    // denominator that silently shrinks halfway through is worse than one that was honest.
    visibleSteps () {
      return REGISTRATION_STEPS.filter((step) => {
        if (!step.conditionalOn) return true
        return Number(this.answers[step.conditionalOn]) > 0
      })
    },
    currentStep () {
      return this.visibleSteps[this.stepIndex] || this.visibleSteps[0]
    },
    position () {
      return this.stepIndex + 1
    },
    currentValid () {
      return this.currentStep.valid(this.answers[this.currentStep.field])
    },
    expiryLabel () {
      if (!this.expiresAt) return ''
      return new Date(this.expiresAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    },
    lockedHallName () {
      const choice = HALL_CHOICES.find((option) => option.value === this.hall)
      return choice ? choice.label + ' Hall' : ''
    },
    chosenHallName () {
      const choice = HALL_CHOICES.find((option) => option.value === this.answers.hall)
      return choice ? choice.label + ' Hall' : ''
    }
  },
  mounted () {
    document.title = 'Register with Badhan'
    this.readToken()
  },
  methods: {
    readToken () {
      this.token = this.$route.query.t || ''
      if (!this.token) {
        this.state = 'invalid'
        return
      }

      // Decoded FOR DISPLAY ONLY, and never trusted. A JWT payload is base64url, so anyone holding
      // the token can read it — that is exactly why it carries nothing but a hall and an expiry.
      // The server is the authority on both; this read exists so the page can fail early and kindly
      // instead of after a student has answered twelve questions.
      let payload = null
      try {
        payload = JSON.parse(atob(String(this.token).split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
      } catch (e) {
        this.state = 'invalid'
        return
      }

      // HALL_ANY is legal and means "All Halls"; every other value must be a real hall. Widening
      // this by exactly one value is the point — a token claiming any other number is still an
      // invalid link.
      const claimsRealHall = typeof payload.hall === 'number' && halls[payload.hall] !== undefined
      const claimsAnyHall = payload.hall === HALL_ANY
      if (payload === null || (!claimsRealHall && !claimsAnyHall)) {
        this.state = 'invalid'
        return
      }

      this.hall = payload.hall
      this.hallLocked = claimsRealHall
      this.expiresAt = payload.exp ? payload.exp * 1000 : null

      if (this.expiresAt && this.expiresAt <= Date.now()) {
        this.state = 'expired'
        return
      }

      // Under a code made for a named hall the answer is given here, once, and the step renders
      // disabled. Under an All Halls code it is left unset so the student has to choose — Next
      // stays disabled until they do.
      this.answers = this.hallLocked ? { hall: this.hall } : {}
      this.state = 'ready'
    },
    setAnswer (field, value) {
      this.$set(this.answers, field, this.coerce(field, value))

      // Changing a count to zero removes its date question, so any date already given has to go
      // with it — otherwise the payload would carry a date the student can no longer see or edit.
      const dependent = REGISTRATION_STEPS.find((step) => step.conditionalOn === field)
      if (dependent && Number(this.answers[field]) === 0) {
        this.$set(this.answers, dependent.field, null)
      }
    },
    coerce (field, value) {
      if (field === 'donationCount' || field === 'plateletDonationCount') {
        const n = Number(value)
        return Number.isNaN(n) ? value : n
      }
      return value
    },
    next () {
      if (!this.currentValid) return
      if (this.position === this.visibleSteps.length) {
        this.onReview = true
        return
      }
      this.stepIndex += 1
    },
    skip () {
      this.$set(this.answers, this.currentStep.field, SKIP_DEFAULTS[this.currentStep.field])
      const dependent = REGISTRATION_STEPS.find((step) => step.conditionalOn === this.currentStep.field)
      if (dependent) {
        this.$set(this.answers, dependent.field, null)
      }
      if (this.position === this.visibleSteps.length) {
        this.onReview = true
        return
      }
      this.stepIndex += 1
    },
    back () {
      // Going back never clears the answer already given: a student who mistypes a digit and
      // notices two screens later should not have to restart.
      if (this.onReview) {
        this.onReview = false
        this.stepIndex = this.visibleSteps.length - 1
        return
      }
      if (this.stepIndex > 0) this.stepIndex -= 1
    },
    goToStep (field) {
      const index = this.visibleSteps.findIndex((step) => step.field === field)
      if (index === -1) return
      this.onReview = false
      this.stepIndex = index
    },
    onEnter () {
      if (this.currentValid) this.next()
    },
    displayValue (step) {
      const value = this.answers[step.field]
      if (value === null || value === undefined || value === '') return 'Not given'
      if (step.kind === 'choice') {
        const choice = step.choices.find((c) => c.value === value)
        return choice ? choice.label : String(value)
      }
      return String(value)
    },
    buildPayload () {
      // Every key is present, always. A skipped step sends its default rather than being omitted,
      // because the server rejects unknown and missing keys alike, and because a payload matching
      // keysExpected exactly is what makes the volunteer's prefilled form a straight handoff.
      return {
        name: String(this.answers.name || '').trim(),
        phone: Number('88' + String(this.answers.phone || '')),
        studentId: String(this.answers.studentId || ''),
        bloodGroup: this.answers.bloodGroup,
        // The token's hall when it named one, the student's answer when it did not. Never
        // HALL_ANY: the step's own validator only accepts a real hall, and the server rejects
        // -1 in this field regardless.
        hall: this.answers.hall,
        address: String(this.answers.address || ''),
        roomNumber: String(this.answers.roomNumber || ''),
        comment: String(this.answers.comment || ''),
        donationCount: Number(this.answers.donationCount || 0),
        lastDonation: this.answers.lastDonation ? new Date(this.answers.lastDonation).getTime() : null,
        plateletDonationCount: Number(this.answers.plateletDonationCount || 0),
        lastPlateletDonation: this.answers.lastPlateletDonation
          ? new Date(this.answers.lastPlateletDonation).getTime()
          : null,
        availableToAll: this.answers.availableToAll === true
      }
    },
    async submit () {
      // Re-checked here as well as at mount: the sequence takes minutes, and finding out at submit
      // is the one place this shape is worse than a single form.
      if (this.expiresAt && this.expiresAt <= Date.now()) {
        this.state = 'expired'
        return
      }

      this.submittingFlag = true
      this.errorMessage = ''

      const response = await handlePOSTFeedback({
        token: this.token,
        type: 'newDonor',
        feedbackJSON: this.buildPayload()
      })

      this.submittingFlag = false

      if (!response) {
        this.errorMessage = 'Could not reach Badhan. Please check your connection and try again.'
        return
      }
      if (response.status === HTTP_STATUS.UNAUTHORIZED) {
        this.state = 'expired'
        return
      }
      if (response.status !== HTTP_STATUS.CREATED) {
        this.errorMessage = response.data && response.data.message
          ? response.data.message
          : 'Something went wrong. Please ask a volunteer for help.'
        return
      }

      this.thanksMessage = response.data.message
      this.state = 'submitted'
    }
  }
}
</script>
