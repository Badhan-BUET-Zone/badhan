<template>
  <div>
    <!--
      Full-screen mode: the code alone on white, filling the viewport. Everything else — the app
      chrome, the form, the expiry line — is gone, because a QR competing with a sidebar for a
      projector's pixels is a QR the back row cannot scan.
    -->
    <div
      v-if="fullScreenFlag"
      data-cy="registrationQrFullScreen"
      style="position: fixed; inset: 0; z-index: 300; background: #ffffff;
             display: flex; align-items: center; justify-content: center;"
      @click="fullScreenFlag = false"
    >
      <!-- Square and centred at any aspect ratio: a projector's is not a laptop's. -->
      <div style="width: min(90vw, 90vh); height: min(90vw, 90vh)">
        <!--
          The hall line survives into full screen; the caption and the expiry do not. A projected
          code should say which hall it is for — the back row can read four words — and everything
          else is chrome nobody reads from there anyway.
        -->
        <FeedbackQrArtwork
          :caption="''"
          :hall-line="generatedHallLine"
          :qr-matrix="qrMatrix"
          :qr-url="qrUrl"
          data-cy="registrationQrFullScreenArtwork"
        />
      </div>
      <div style="position: fixed; bottom: 8px; width: 100%; text-align: center; color: #888">
        Tap anywhere to leave full screen
      </div>
    </div>

    <!--
      Everything below is removed from the DOM in full screen, not merely covered. Covering it
      would leave the form focusable and readable by a screen reader behind an overlay, and would
      make "is the form gone?" a question about z-index rather than about the page.
    -->
    <template v-if="!fullScreenFlag">
    <PageTitle></PageTitle>

    <Container>
      <v-card-text class="subtitle-1">
        Generate a code for students to scan and enter their own details. What they send arrives on
        the Feedback page as a new donor submission — it does not create a donor.
      </v-card-text>

      <!--
        For most members the hall is not a control: a code is for the hall you belong to, and the
        server refuses any other. A super admin may state any hall, so they get the dropdown — and
        one option that is not a hall at all.
      -->
      <v-card-text v-if="!canChooseHall" data-cy="registrationQrHall">
        This code will be for <b>{{ hall | getHallName }}</b>. A code is always for your own hall;
        if another hall needs one, a super admin can make it.
      </v-card-text>

      <v-card-text v-else>
        <v-select
          id="registrationQrHallSelector"
          data-cy="registrationQrHallSelector"
          v-model="selectedHall"
          :items="hallOptions"
          label="Which hall is this code for?"
          outlined
          rounded
          dense
          hide-details
        ></v-select>
      </v-card-text>

      <!-- An All Halls code changes what the student is asked, so it says so at the moment of
           choosing rather than being discovered at the desk. -->
      <v-card-text v-if="isAllHalls" class="subtitle-2" data-cy="registrationQrAllHallsNotice">
        Students who scan this code will be asked which hall they are in, and their submission goes
        to that hall's volunteers.
      </v-card-text>

      <v-card-text v-if="!canGenerate" class="title error--text" data-cy="registrationQrProfileMissing">
        Your own phone number and student ID could not be read from your profile, so a code cannot be
        generated. Try signing out and in again.
      </v-card-text>

      <v-card-text>
        <!-- A plain v-select rather than the Selector wrapper, which takes a String value; these
             are minutes and are sent as an integer. -->
        <v-select
          id="registrationQrDuration"
          data-cy="registrationQrDurationSelector"
          v-model="durationMinutes"
          :items="durations"
          label="How long should it work?"
          outlined
          rounded
          dense
        ></v-select>
      </v-card-text>

      <!-- Always visible, generated or not. There is no revocation anywhere in this feature. -->
      <v-card-text class="subtitle-2" data-cy="registrationQrWarning">
        Anyone who has this code can submit until it expires, and <b>it cannot be cancelled</b>.
        Generate a short one for a short event.
      </v-card-text>

      <v-card-actions>
        <Button
          data-cy="registrationQrGenerateButton"
          :icon="'mdi-qrcode'"
          :text="generatingFlag ? 'Generating…' : 'Generate'"
          :color="'primary'"
          :disabled="generatingFlag || !canGenerate"
          :click="generate"
        ></Button>
      </v-card-actions>

      <v-card-text v-if="errorMessage" class="title error--text" data-cy="registrationQrError">
        {{ errorMessage }}
      </v-card-text>
    </Container>

    <Container v-if="qrMatrix">
      <v-card-text class="title" data-cy="registrationQrExpiry">
        {{ expiryLine }}
      </v-card-text>

      <div style="max-width: 420px" class="mx-auto">
        <!-- The same sentence on screen and on paper: a printed code expires, and the sheet has to
             say so or somebody pins it up and trusts it past its lifetime. -->
        <FeedbackQrArtwork
          ref="artwork"
          :caption="caption"
          :sub-caption="expiryLine"
          :hall-line="generatedHallLine"
          :qr-matrix="qrMatrix"
          :qr-url="qrUrl"
        />
      </div>

      <!--
        Chrome, not content: outside the artwork SVG, so it never reaches the printed sheet.

        Unlike the poster's link, THIS ONE IS THE CREDENTIAL. The token is in the address, so anyone
        who has the link can submit until it expires, exactly as if they had scanned the code. That
        is why the wording here is a warning and the poster's is an invitation to share.
      -->
      <v-card-text class="text-center" style="word-break: break-all">
        <a
          data-cy="registrationQrLink"
          :href="qrUrl"
          target="_blank"
          rel="noopener noreferrer"
        >{{ qrUrl }}</a>
      </v-card-text>
      <v-card-text class="subtitle-2" data-cy="registrationQrLinkWarning">
        This link contains the code itself. Sharing it is the same as letting somebody scan the QR,
        so send it only where you would show the code.
      </v-card-text>

      <v-card-actions class="justify-center">
        <Button
          data-cy="registrationQrFullScreenButton"
          :icon="'mdi-fullscreen'"
          :text="'Full screen'"
          :color="'secondary'"
          :disabled="false"
          :click="() => { fullScreenFlag = true }"
        ></Button>
        <Button
          data-cy="registrationQrDownloadButton"
          :icon="'mdi-download'"
          :text="downloadingFlag ? 'Preparing…' : 'Download PDF'"
          :color="'primary'"
          :disabled="downloadingFlag"
          :click="download"
        ></Button>
      </v-card-actions>

      <v-card-text class="subtitle-2">
        A printed registration code expires too — the duration above is baked into it, so a sheet
        printed for a four-hour event is waste paper the next morning.
      </v-card-text>
    </Container>
    </template>
  </div>
</template>

<script>
import PageTitle from '@/components/PageTitle'
import Container from '@/components/Container/Container'
import Button from '@/components/UI Components/Button'
import FeedbackQrArtwork from '@/views/FeedbackQr/FeedbackQrArtwork'
import { registrationPageUrl } from '@/views/FeedbackQr/qrUrl'
import { COPY } from '@/views/FeedbackQr/feedbackQrLayout'
import { REGISTRATION_QR_FILE_NAME, downloadQrPdf } from '@/views/FeedbackQr/feedbackQrPdf'
import { handlePOSTFeedbackToken } from '@/api'
import {
  DESIGNATIONS_INDEX, HALL_ANY, HTTP_STATUS, halls, restrictedHallNames
} from '@/mixins/constants'

// A generator, not a document. Its primary use is on screen: a laptop propped on a desk, or — the
// case that earns the whole feature — a code projected at a new-intake event so a room full of
// students enters itself instead of one volunteer typing a hundred names.

export default {
  name: 'RegistrationQrPage',
  components: { PageTitle, Container, Button, FeedbackQrArtwork },
  data: () => {
    return {
      // The dropdown's value, for a super admin. Set at mount to their own hall — a default of All
      // Halls would make the most permissive code the easiest one to make by accident. Nobody else
      // sees this control, and the server refuses anybody else who posts a hall anyway.
      selectedHall: null,
      // The hall the generated code is actually for. Set from what was sent, and only after a
      // successful mint, so the label and the code cannot disagree and no label appears before
      // there is a code to label.
      generatedHall: null,
      durationMinutes: 240,
      durations: [
        { text: '1 hour', value: 60 },
        { text: '2 hours', value: 120 },
        { text: '4 hours', value: 240 },
        { text: '8 hours', value: 480 },
        { text: '24 hours', value: 1440 }
      ],
      generatingFlag: false,
      downloadingFlag: false,
      fullScreenFlag: false,
      qrMatrix: null,
      qrUrl: '',
      expiresAt: null,
      errorMessage: '',
      caption: COPY.registrationCaption
    }
  },
  computed: {
    hall () {
      return this.$store.getters.getHall
    },
    canChooseHall () {
      return this.$store.getters.getDesignation === DESIGNATIONS_INDEX.SUPER_ADMIN
    },
    // The seven halls, and one option that is not a hall at all. Narrower than the list a student
    // may pick from on the registration page: that one includes (Unknown), because a student may
    // genuinely not know, but a code is aimed at a room of people and no room is (Unknown).
    hallOptions () {
      return [
        ...restrictedHallNames().map((text, value) => ({ text, value })),
        { text: COPY.allHallsLabel, value: HALL_ANY }
      ]
    },
    isAllHalls () {
      return this.selectedHall === HALL_ANY
    },
    // What Generate actually sends. For everybody but a super admin there is no control, so it is
    // simply their own hall — read here rather than copied at mount, so it cannot depend on whether
    // the profile had loaded by then. A hall is sent ALWAYS, which is what puts every QR mint on
    // the authenticated, logged branch.
    hallToMint () {
      if (!this.canChooseHall) return this.hall
      return this.selectedHall === null ? this.hall : this.selectedHall
    },
    // Printed onto the sheet and shown on screen, from the hall the server minted for.
    generatedHallLine () {
      if (this.generatedHall === null) return ''
      if (this.generatedHall === HALL_ANY) return COPY.allHallsLabel
      const name = halls[this.generatedHall]
      return name === undefined ? '' : `${name} Hall`
    },
    // The mint route is the ordinary public one and takes a phone and a student ID, so the page
    // sends the signed-in member's own. Without them there is nothing to send, and sending
    // undefined would be a 400 dressed up as a mystery.
    canGenerate () {
      const profile = this.$store.state.myprofile
      return Boolean(profile && profile.phone && profile.studentId)
    },
    expiryClock () {
      if (!this.expiresAt) return ''
      return new Date(this.expiresAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    },
    // One string, rendered on screen and printed into the PDF, so the two can never disagree.
    expiryLine () {
      if (!this.expiresAt) return ''
      return `This code stops working at ${this.expiryClock} — valid for ${this.durationLabel}.`
    },
    durationLabel () {
      const match = this.durations.find((option) => option.value === this.durationMinutes)
      return match ? match.text : `${this.durationMinutes} minutes`
    }
  },
  mounted () {
    this.selectedHall = this.hall
  },
  methods: {
    async generate () {
      this.generatingFlag = true
      this.errorMessage = ''

      const profile = this.$store.state.myprofile
      // The same route /#/donor calls, with one field more. A `hall` is sent ALWAYS — even by a
      // volunteer, for whom it is simply their own — because that is the branch the server
      // authenticates and logs, and "who made this code" should be answerable for every code and
      // not only for the ones a super admin aimed somewhere.
      //
      // The token that comes back carries a hall and an expiry and nothing else, so nothing about
      // this member reaches the code.
      const response = await handlePOSTFeedbackToken({
        phone: profile.phone,
        studentId: profile.studentId,
        durationMinutes: this.durationMinutes,
        hall: this.hallToMint
      })

      this.generatingFlag = false

      if (!response) {
        this.errorMessage = 'Could not reach Badhan. Please check your connection and try again.'
        return
      }
      // Both of these should be unreachable from this page — it only offers halls the signed-in
      // member may state — so they are worth naming rather than folding into the generic failure.
      // If one ever appears, the page and the server have drifted.
      if (response.status === HTTP_STATUS.FORBIDDEN) {
        this.errorMessage = 'You can only generate a code for your own hall.'
        return
      }
      if (response.status === HTTP_STATUS.UNAUTHORIZED) {
        this.errorMessage = 'Your session has expired. Please sign in again.'
        return
      }
      if (response.status !== HTTP_STATUS.OK) {
        this.errorMessage = 'Could not generate a code. Please try again, or ask a super admin.'
        return
      }

      // The donor summary comes back with it and is deliberately ignored: this page is about the
      // token, not about the member who happened to mint it.
      this.expiresAt = response.data.expiresAt
      this.generatedHall = this.hallToMint
      this.qrUrl = registrationPageUrl(response.data.token)

      const qrcode = await import(/* webpackChunkName: "feedback-qr" */ 'qrcode')
      const code = qrcode.create(this.qrUrl, { errorCorrectionLevel: 'M' })
      this.qrMatrix = { size: code.modules.size, data: code.modules.data }
    },
    async download () {
      this.downloadingFlag = true
      try {
        await downloadQrPdf(this.$refs.artwork.$refs.artwork, REGISTRATION_QR_FILE_NAME)
      } finally {
        this.downloadingFlag = false
      }
    }
  }
}
</script>
