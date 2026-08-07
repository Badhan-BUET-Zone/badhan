<template>
  <div>
    <Container>
      <transition name="slide-fade-down" mode="out-in">

        <v-card-text v-if="loadingFlag" :key="'certificateLoading'" class="title text-center">
          <LoadingMessage/>
        </v-card-text>

        <div v-else-if="certificate" :key="'certificateLoaded'" data-cy="certificateContent">
          <CertificateArtwork
            ref="artwork"
            :name="certificate.name"
            :student-id="certificate.studentId"
            :qr-matrix="qrMatrix"
            :qr-url="qrUrl"
          />
          <!--
            Chrome, not content: the button sits outside the artwork, so it can never appear in the
            PDF or on the printed page.
          -->
          <v-card-actions class="justify-center">
            <Button
              data-cy="certificateDownloadButton"
              :icon="'mdi-download'"
              :text="downloadingFlag ? 'Preparing…' : 'Download PDF'"
              :color="'primary'"
              :disabled="downloadingFlag"
              :click="downloadPdf"
            ></Button>
          </v-card-actions>
        </div>

        <v-card-text v-else-if="notFoundFlag" :key="'certificateNotFound'" class="title text-center"
                     data-cy="certificateNotFound">
          This certificate was not found.
        </v-card-text>

        <div v-else :key="'certificateError'" data-cy="certificateError">
          <v-card-text class="title text-center">
            Could not load this certificate. Please check your connection and try again.
          </v-card-text>
          <v-card-actions class="justify-center">
            <Button
              data-cy="certificateRetryButton"
              :icon="'mdi-refresh'"
              :text="'Try Again'"
              :color="'primary'"
              :click="loadCertificate"
            ></Button>
          </v-card-actions>
        </div>

      </transition>
    </Container>
  </div>
</template>

<script>
import Container from '@/components/Container/Container'
import LoadingMessage from '@/components/LoadingMessage.vue'
import Button from '@/components/UI Components/Button'
import CertificateArtwork from '@/views/Certificate/CertificateArtwork.vue'
import { downloadCertificatePdf } from '@/views/Certificate/certificatePdf'
import { handleGETCertificate } from '@/api'
import { HTTP_STATUS } from '@/mixins/constants'

// The verification page behind every printed certificate's QR code. It is deliberately reachable
// without a session: whoever scans the paper — an employer, a university, anyone — has no Badhan
// account and no reason to get one. Nothing here is rendered from the URL; the name and student ID
// are read from the database on every open, so correcting a typo in the app corrects what a scan
// shows (it does not, and cannot, correct paper already printed).

export default {
  name: 'CertificatePage',
  components: { CertificateArtwork, Button, LoadingMessage, Container },
  data: () => {
    return {
      loadingFlag: true,
      certificate: null,
      qrMatrix: null,
      qrUrl: '',
      downloadingFlag: false,
      // Distinguished from the error state on purpose: "not found" is a settled answer and offering
      // a retry button would invite someone to keep hammering a certificate that does not exist,
      // while a network failure is worth retrying.
      notFoundFlag: false
    }
  },
  watch: {
    // Going from one certificate to another changes only the query string, and the router reuses
    // the mounted component rather than rebuilding it. Without this the page would keep showing the
    // previous donor — and, worse, the previous donor's QR code, since the code is built from the
    // URL at load time. A certificate showing one person's name over another person's QR is
    // precisely the failure this whole feature exists to make impossible.
    '$route.query.id' () {
      this.loadCertificate()
    }
  },
  methods: {
    async loadCertificate () {
      this.loadingFlag = true
      this.certificate = null
      this.qrMatrix = null
      this.qrUrl = ''
      this.notFoundFlag = false

      const donorId = this.$route.query.id

      // A link with no id at all is answered exactly as an unknown id is. Anyone who arrives here
      // without one either mistyped the address or scanned something that is not ours, and neither
      // deserves a different explanation.
      if (!donorId) {
        this.notFoundFlag = true
        this.loadingFlag = false
        return
      }

      const response = await handleGETCertificate(donorId)

      // handleGETCertificate returns the error response rather than throwing, and returns undefined
      // when the request never reached a server at all.
      if (!response) {
        this.loadingFlag = false
        return
      }

      if (response.status === HTTP_STATUS.OK) {
        this.certificate = response.data.certificate
        await this.buildQrMatrix()
      } else if (response.status === HTTP_STATUS.NOT_FOUND) {
        this.notFoundFlag = true
      }

      this.loadingFlag = false
    },

    // The QR encodes this page's own address, so the printed code and the link are the same object
    // by construction and cannot drift apart. The consequence is that a PDF downloaded from a dev
    // or staging host encodes that host — print only from production.
    //
    // qrcode is imported here rather than at the top of the file so it stays out of the sign-in
    // bundle: most people who load this app never open a certificate.
    async buildQrMatrix () {
      try {
        const qrcode = await import(/* webpackChunkName: "certificate-qr" */ 'qrcode')
        const url = window.location.href
        // create() returns the module matrix rather than a picture, which lets the artwork draw the
        // code as vector geometry. Error correction M is the standard trade-off between density and
        // tolerance of a smudged or creased print.
        const code = qrcode.create(url, { errorCorrectionLevel: 'M' })
        this.qrUrl = url
        this.qrMatrix = { size: code.modules.size, data: code.modules.data }
      } catch (error) {
        // A certificate without its QR is still a readable, useful document — it simply cannot be
        // verified by scanning. Better that than an error page.
        this.qrMatrix = null
      }
    },

    async downloadPdf () {
      this.downloadingFlag = true
      try {
        // The artwork component's root element is the SVG itself, and it is what gets converted —
        // not a screenshot of the page, so nothing around it (this button included) can leak in.
        await downloadCertificatePdf(
          this.$refs.artwork.$el,
          this.certificate.studentId,
          this.$route.query.id
        )
      } catch (error) {
        this.$store.dispatch('notification/notifyError', 'Could not prepare the PDF. Please try again.')
      }
      this.downloadingFlag = false
    }
  },
  async mounted () {
    // No other page in the app touches document.title, but no other page is opened by someone
    // outside Badhan. A static title only: the donor's name would end up in the tab, in browser
    // history and in any screenshot of the verifier's phone.
    document.title = 'Certificate — Badhan, BUET Zone'
    await this.loadCertificate()
  }
}
</script>

<style scoped>

</style>
