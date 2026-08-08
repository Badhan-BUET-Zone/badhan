<template>
  <!-- Its own group, for the same reason as the QR panel: v-expansion-panels only sees direct
       v-expansion-panel children, not components wrapping one. -->
  <v-expansion-panels flat>
    <v-expansion-panel data-cy="ownFeedbackPanel">
    <v-expansion-panel-header data-cy="ownFeedbackPanelHeader">
      Send a message about yourself
    </v-expansion-panel-header>
    <v-expansion-panel-content>
      <v-card-text class="subtitle-2">
        This files a message on your own donor record, exactly as it would arrive from the public
        page. It appears in the queue below like any other, and a volunteer — probably you — still
        has to act on it and discard it.
      </v-card-text>

      <v-card-text v-if="!canSubmit" class="title error--text" data-cy="ownFeedbackProfileMissing">
        Your own phone number and student ID could not be read from your profile, so a message
        cannot be sent. Try signing out and in again.
      </v-card-text>

      <template v-else>
        <v-card-text>
          <v-textarea
            data-cy="ownFeedbackInput"
            v-model="text"
            outlined
            counter="500"
            maxlength="500"
            label="Your message"
            rows="4"
          ></v-textarea>
        </v-card-text>

        <v-card-text v-if="errorMessage" class="title error--text" data-cy="ownFeedbackError">
          {{ errorMessage }}
        </v-card-text>

        <v-card-actions>
          <Button
            data-cy="ownFeedbackSubmitButton"
            :icon="'mdi-send'"
            :text="submittingFlag ? 'Sending…' : 'Send'"
            :color="'primary'"
            :disabled="text.trim().length === 0 || submittingFlag"
            :click="submit"
          ></Button>
        </v-card-actions>
      </template>
    </v-expansion-panel-content>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<script>
import Button from '@/components/UI Components/Button'
import { handlePOSTFeedbackToken, handlePOSTFeedback } from '@/api'
import { HTTP_STATUS } from '@/mixins/constants'

// Files a message on the signed-in member's own record, through exactly the same two public calls a
// donor at a notice board makes: mint a token from a phone and student ID, then submit with it.
//
// It deliberately does NOT take a shortcut. There is no authenticated write path for feedback and
// there should not be one — the public submit route is the only way a row is created, so this panel
// exercises the real contract rather than a private door around it. If the public journey breaks,
// this breaks with it, which is the point.

export default {
  name: 'OwnFeedbackPanel',
  components: { Button },
  data: () => {
    return {
      text: '',
      submittingFlag: false,
      errorMessage: ''
    }
  },
  computed: {
    // The mint route takes a phone and a student ID and nothing else, so without both there is
    // nothing to send. Sending undefined would be a 400 dressed up as a mystery.
    canSubmit () {
      const profile = this.$store.state.myprofile
      return Boolean(profile && profile.phone && profile.studentId)
    }
  },
  methods: {
    async submit () {
      this.submittingFlag = true
      this.errorMessage = ''

      const profile = this.$store.state.myprofile

      // Call one: mint. The token that comes back carries this member's hall and an expiry, and no
      // identity at all — which is why call two has to repeat the phone and student ID.
      const tokenResponse = await handlePOSTFeedbackToken({
        phone: profile.phone,
        studentId: profile.studentId
      })

      if (!tokenResponse) {
        this.submittingFlag = false
        this.errorMessage = 'Could not reach Badhan. Please check your connection and try again.'
        return
      }
      if (tokenResponse.status !== HTTP_STATUS.OK) {
        this.submittingFlag = false
        // The mint route answers one message for every kind of mismatch. Reaching this from your own
        // profile means the record behind your session no longer matches it.
        this.errorMessage = 'Your own donor record could not be matched. Please contact a super admin.'
        return
      }

      // Call two: submit. Phone and student ID travel inside feedbackJSON because the token does not
      // carry them; the hall on the stored row comes from the token regardless of anything here.
      const submitResponse = await handlePOSTFeedback({
        token: tokenResponse.data.token,
        type: 'feedback',
        feedbackJSON: {
          phone: profile.phone,
          studentId: profile.studentId,
          text: this.text.trim()
        }
      })

      this.submittingFlag = false

      if (!submitResponse) {
        this.errorMessage = 'Could not reach Badhan. Please check your connection and try again.'
        return
      }
      if (submitResponse.status !== HTTP_STATUS.CREATED) {
        this.errorMessage = submitResponse.data && submitResponse.data.message
          ? submitResponse.data.message
          : 'Could not send the message. Please try again.'
        return
      }

      // No success line here. The row appearing in the queue below IS the confirmation, and it says
      // more than a sentence could — the sender can see exactly what was filed. The public pages
      // still show the server's message, because there is no queue underneath them.
      this.text = ''
      this.$emit('submitted')
    }
  }
}
</script>
