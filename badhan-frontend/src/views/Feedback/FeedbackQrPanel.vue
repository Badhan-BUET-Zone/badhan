<template>
  <ContainerFlat>
    <!-- @change lives on the container, which is what emits the open panel's index; the
         individual panel emits nothing. -->
    <v-expansion-panels flat data-cy="feedbackQrPanel" @change="onToggle">
      <v-expansion-panel>
        <v-expansion-panel-header data-cy="feedbackQrPanelHeader">
          Print a QR poster for donors
        </v-expansion-panel-header>
        <v-expansion-panel-content>
          <v-card-text class="subtitle-2">
            One sheet serves the whole of Badhan — every hall, every donor. Print it, pin it on a
            notice board, and any donor can scan it to see their record and send a message. The link
            is safe to share anywhere.
          </v-card-text>

          <div v-if="loadingFlag" data-cy="feedbackQrLoading">
            <LoadingMessage/>
          </div>

          <div v-else-if="qrMatrix" style="max-width: 420px" class="mx-auto">
            <FeedbackQrArtwork
              ref="artwork"
              :caption="caption"
              :qr-matrix="qrMatrix"
              :qr-url="qrUrl"
            />
          </div>

          <!--
            Chrome, not content: the button sits OUTSIDE the artwork SVG, so it can never appear on
            the printed page.
          -->
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
  </ContainerFlat>
</template>

<script>
import ContainerFlat from '@/components/Container/ContainerFlat'
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
  components: { ContainerFlat, Button, LoadingMessage, FeedbackQrArtwork },
  data: () => {
    return {
      loadingFlag: false,
      downloadingFlag: false,
      qrMatrix: null,
      qrUrl: '',
      caption: COPY.feedbackCaption
    }
  },
  methods: {
    async onToggle (openIndex) {
      // v-expansion-panels emits the open panel's index, or undefined when it closes. Built once:
      // collapsing and re-expanding does not rebuild it.
      if (openIndex === undefined || this.qrMatrix) return
      await this.buildQr()
    },
    async buildQr () {
      this.loadingFlag = true

      // Deferred to first expansion, exactly as the certificate page defers it to first load.
      const qrcode = await import(/* webpackChunkName: "feedback-qr" */ 'qrcode')

      // The configured base URL, never window.location.href: the page generating this code and the
      // page it points at are different routes.
      this.qrUrl = donorPageUrl()

      // Error correction M, and create() rather than toDataURL() so the artwork gets the module
      // matrix and can draw vector rectangles.
      const code = qrcode.create(this.qrUrl, { errorCorrectionLevel: 'M' })
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
