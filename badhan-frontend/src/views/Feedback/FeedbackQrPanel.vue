<template>
  <!-- Its own group, because v-expansion-panels registers only direct v-expansion-panel children:
       a component wrapper is invisible to it and nothing renders. Built on the header's own click
       rather than the group's @change; buildQr guards itself. -->
  <v-expansion-panels flat>
    <v-expansion-panel data-cy="feedbackQrPanel">
      <v-expansion-panel-header data-cy="feedbackQrPanelHeader" @click="onExpand">
        Print a QR poster for donors
      </v-expansion-panel-header>
      <v-expansion-panel-content>
          <v-card-text class="subtitle-2">
            One sheet serves the whole of Badhan — every hall, every donor. Print it, pin it on a
            notice board, and any donor can scan it to see their record and send a message. The link
            is safe to share anywhere.
          </v-card-text>

          <!-- The code is generated on the spot, so the panel opens on a loader and the poster
               replaces it. mode="out-in" keeps the two from overlapping while the panel is still
               growing to its expanded height. -->
          <transition name="slide-fade-down-snapout" mode="out-in">
            <div v-if="loadingFlag" :key="'qrLoading'" data-cy="feedbackQrLoading">
              <LoadingMessage/>
            </div>

            <div v-else-if="qrMatrix" :key="'qrArtwork'" style="max-width: 420px" class="mx-auto">
              <FeedbackQrArtwork
                ref="artwork"
                :caption="caption"
                :qr-matrix="qrMatrix"
                :qr-url="donorUrl"
              />
            </div>
          </transition>

          <!--
            Chrome, not content: everything below sits OUTSIDE the artwork SVG, so none of it can
            reach the printed page. The sheet deliberately carries no readable URL — only the code —
            and this link is here for the volunteer looking at the screen, who may want to check
            where it goes or send it to somebody without printing anything.

            target=_blank with rel="noopener noreferrer": without noopener the opened page gets a
            handle on this one through window.opener.
          -->
          <v-card-text class="text-center">
            <a
              data-cy="feedbackQrLink"
              :href="donorUrl"
              target="_blank"
              rel="noopener noreferrer"
            >{{ donorUrl }}</a>
          </v-card-text>

          <v-card-actions class="justify-center">
            <Button
              data-cy="feedbackQrDownloadButton"
              :icon="'mdi-download'"
              :text="downloadingFlag ? 'Preparing…' : 'Download PDF'"
              :color="'primary'"
              :disabled="downloadingFlag || !qrMatrix"
              :click="download"
            ></Button>
          </v-card-actions>
      </v-expansion-panel-content>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<script>
import Button from '@/components/UI Components/Button'
import LoadingMessage from '@/components/LoadingMessage.vue'
import FeedbackQrArtwork from '@/views/FeedbackQr/FeedbackQrArtwork'
import { donorPageUrl } from '@/views/FeedbackQr/qrUrl'
import { COPY } from '@/views/FeedbackQr/feedbackQrLayout'
import { FEEDBACK_QR_FILE_NAME, downloadQrPdf } from '@/views/FeedbackQr/feedbackQrPdf'

// The printable poster, as a collapsed panel on the page a volunteer already opens rather than a
// menu entry of its own. It is downloaded once and then not again for months, which is too rare to
// earn a permanent line in the sidebar.
//
// NOTHING IS BUILT OR IMPORTED UNTIL IT IS EXPANDED. The Feedback page is a volunteer's daily page,
// so a QR built on mount would put the qrcode library into the load path of every visit.

export default {
  name: 'FeedbackQrPanel',
  components: { Button, LoadingMessage, FeedbackQrArtwork },
  data: () => {
    return {
      loadingFlag: false,
      downloadingFlag: false,
      qrMatrix: null,
      caption: COPY.feedbackCaption
    }
  },
  computed: {
    // The configured base URL, never window.location.href: the page generating this code and the
    // page it points at are different routes. Computed rather than stored, so the link is on screen
    // as soon as the panel opens — it does not wait for the QR library to load.
    donorUrl () {
      return donorPageUrl()
    }
  },
  methods: {
    async onExpand () {
      // Built once: collapsing and re-expanding does not rebuild it, and the guard also makes the
      // header's collapse click a no-op.
      if (this.qrMatrix || this.loadingFlag) return
      await this.buildQr()
    },
    async buildQr () {
      this.loadingFlag = true

      // Deferred to first expansion, exactly as the certificate page defers it to first load.
      const qrcode = await import(/* webpackChunkName: "feedback-qr" */ 'qrcode')

      // Error correction M, and create() rather than toDataURL() so the artwork gets the module
      // matrix and can draw vector rectangles.
      const code = qrcode.create(this.donorUrl, { errorCorrectionLevel: 'M' })
      this.qrMatrix = { size: code.modules.size, data: code.modules.data }

      this.loadingFlag = false
    },
    async download () {
      this.downloadingFlag = true
      try {
        await downloadQrPdf(this.$refs.artwork.$refs.artwork, FEEDBACK_QR_FILE_NAME)
      } finally {
        this.downloadingFlag = false
      }
    }
  }
}
</script>
