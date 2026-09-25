<template>
  <!-- A root div rather than the panel group alone: the full-screen overlay is a sibling of the
       group, not something inside a collapsed panel's content. -->
  <div>
    <!--
      Full-screen mode: the code alone on white, filling the viewport. Everything else — the app
      chrome, the form, the caption — is gone, because a QR competing with a sidebar for a
      projector's pixels is a QR the back row cannot scan.
    -->
    <transition name="fade">
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
          The hall line survives into full screen; the caption does not. A projected code should
          say which hall it is for — the back row can read four words — and everything else is
          chrome nobody reads from there anyway.
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
    </transition>

    <!-- Its own group, for the same reason as the other two panels: v-expansion-panels only sees
         direct v-expansion-panel children, not components wrapping one. -->
    <v-expansion-panels flat>
      <v-expansion-panel data-cy="registrationQrPanel">
        <v-expansion-panel-header data-cy="registrationQrPanelHeader">
          Generate a registration QR for students
        </v-expansion-panel-header>
        <v-expansion-panel-content>
          <!--
            Removed from the DOM in full screen, not merely covered. Covering it would leave the
            form focusable and readable by a screen reader behind an overlay, and would make "is the
            form gone?" a question about z-index rather than about the page.

            The two fade at the same time rather than one after the other: the overlay is opaque
            white, so a form that vanished on the first frame would be visible doing it through a
            half-faded sheet.
          -->
          <transition name="fade">
          <div v-if="!fullScreenFlag">
            <v-card-text class="subtitle-1">
              Generate a code for students to scan and enter their own details. What they send
              arrives in the queue below as a new donor submission — it does not create a donor.
            </v-card-text>

            <!--
              For most members the hall is not a control: a code is for the hall you belong to, and
              the server refuses any other. A super admin may state any hall, so they get the
              dropdown — and one option that is not a hall at all.
            -->
            <v-card-text v-if="!canChooseHall" data-cy="registrationQrHall">
              This code will be for <b>{{ hall | getHallName }}</b>. A code is always for your own
              hall; if another hall needs one, a super admin can make it.
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
                 choosing rather than being discovered at the desk. It slides out of the dropdown it
                 belongs to rather than appearing under the cursor, so the eye follows the change it
                 just made instead of hunting for what moved. -->
            <transition name="slide-fade-down">
              <v-card-text v-if="isAllHalls" class="subtitle-2" data-cy="registrationQrAllHallsNotice">
                Students who scan this code will be asked which hall they are in, and their
                submission goes to that hall's volunteers.
              </v-card-text>
            </transition>

            <!-- Always visible, generated or not. There is no expiry and no revocation anywhere in
                 this feature, so this is the only thing standing between a volunteer and a
                 permanent door into their hall's queue. It says so before the button, not after. -->
            <v-card-text class="subtitle-2" data-cy="registrationQrWarning">
              Anyone who has this code can submit new donors to this hall <b>forever</b>. It never
              expires and <b>it cannot be cancelled</b>. Take the sheet down and delete the link
              when the event is over.
            </v-card-text>

            <v-card-actions>
              <Button
                data-cy="registrationQrGenerateButton"
                :icon="'mdi-qrcode'"
                :text="generatingFlag ? 'Generating…' : 'Generate'"
                :color="'primary'"
                :disabled="generatingFlag"
                :click="generate"
              ></Button>
            </v-card-actions>

            <!-- A failure is the one thing in this panel that can appear while somebody is looking
                 straight at it, so it arrives with movement rather than materialising in place. -->
            <transition name="slide-fade-down">
              <v-card-text v-if="errorMessage" class="title error--text" data-cy="registrationQrError">
                {{ errorMessage }}
              </v-card-text>
            </transition>

            <!--
              The result of pressing Generate, and the only thing here that was not present a moment
              ago. Sliding it in is what connects it to the button: a block that simply exists on the
              next frame reads as a page that reloaded rather than as an answer to what was pressed.
            -->
            <transition name="slide-fade-down">
            <div v-if="qrMatrix">
              <div style="max-width: 420px" class="mx-auto">
                <!-- The same sentence on screen and on paper: this code does not expire, and the
                     sheet has to say so or somebody leaves it pinned up for a year believing it
                     went stale on its own. -->
                <FeedbackQrArtwork
                  ref="artwork"
                  :caption="caption"
                  :sub-caption="permanenceLine"
                  :hall-line="generatedHallLine"
                  :qr-matrix="qrMatrix"
                  :qr-url="qrUrl"
                />
              </div>

              <!--
                Chrome, not content: outside the artwork SVG, so it never reaches the printed sheet.

                Unlike the poster's link, THIS ONE IS THE CREDENTIAL. The token is in the address, so
                anyone who has the link can submit forever, exactly as if they had scanned the code.
                That is why the wording here is a warning and the poster's is an invitation to
                share.
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
                This link contains the code itself. Sharing it is the same as letting somebody scan
                the QR — permanently — so send it only where you would show the code.
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
                A printed registration code never expires — an old sheet left on a notice board is a
                live door into this hall's queue, so take it down when the event is over.
              </v-card-text>
            </div>
            </transition>
          </div>
          </transition>
        </v-expansion-panel-content>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
</template>

<script>
import Button from '@/components/UI Components/Button'
import FeedbackQrArtwork from '@/views/FeedbackQr/FeedbackQrArtwork'
import { registrationPageUrl } from '@/views/FeedbackQr/qrUrl'
import { COPY } from '@/views/FeedbackQr/feedbackQrLayout'
import { REGISTRATION_QR_FILE_NAME, downloadQrPdf } from '@/views/FeedbackQr/feedbackQrPdf'
import { handlePOSTRegistrationToken } from '@/api'
import {
  DESIGNATIONS_INDEX, HALL_ANY, HTTP_STATUS, halls, restrictedHallNames
} from '@/mixins/constants'

// A generator, not a document — and a collapsed panel on the Feedback page rather than a menu entry
// of its own, for the same reason the poster is: a code is made for an event, which is a few times a
// year, and the page a volunteer already opens is where the submissions it produces arrive.
//
// Its primary use is still on screen: a laptop propped on a desk, or — the case that earns the whole
// feature — a code projected at a new-intake event so a room full of students enters itself instead
// of one volunteer typing a hundred names.
//
// THE CODE IT MAKES IS PERMANENT. There is no duration to choose and no way to withdraw one once
// it exists, so every surface here — the warning above the button, the sentence printed onto the
// sheet, the note under the link — says so in as many words. That warning IS the feature's only
// safeguard; do not soften it.
//
// Nothing here builds a QR until Generate is pressed, so an expanded panel costs a form and the
// qrcode library stays out of the load path of a page volunteers open every day.

export default {
  name: 'RegistrationQrPanel',
  components: { Button, FeedbackQrArtwork },
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
      generatingFlag: false,
      downloadingFlag: false,
      fullScreenFlag: false,
      qrMatrix: null,
      qrUrl: '',
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
    // What Generate actually sends, and the whole body of the request. For everybody but a super
    // admin there is no control, so it is simply their own hall — read here rather than copied at
    // mount, so it cannot depend on whether the profile had loaded by then.
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
    // One string, rendered on screen and printed into the PDF, so the two can never disagree. It
    // replaces the expiry line that used to sit here, and it carries the opposite news: whoever
    // finds this sheet in six months is holding a working code.
    permanenceLine () {
      return 'This code does not expire. Take this sheet down when the event is over.'
    }
  },
  mounted () {
    this.selectedHall = this.hall
  },
  methods: {
    async generate () {
      this.generatingFlag = true
      this.errorMessage = ''

      // An authenticated route with one field. The session says who is asking — which is what
      // makes "who made this code" answerable for every code, not just the ones a super admin
      // aimed somewhere — and the hall is the only thing the caller states.
      //
      // The token that comes back carries that hall and NOTHING else: no identity, and no expiry
      // either, so the code works until the secret changes.
      const response = await handlePOSTRegistrationToken({
        hall: this.hallToMint
      })

      this.generatingFlag = false

      if (!response) {
        this.errorMessage = 'Could not reach Badhan. Please check your connection and try again.'
        return
      }
      // The 403 should be unreachable — the panel only offers halls the signed-in member may state
      // — so if it ever appears, the panel and the server have drifted. The 401 is a different
      // matter now that the mint is authenticated outright: a session that expired while the page
      // sat open lands here, and it is worth its own sentence rather than the generic failure.
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
