<template>
  <div>
    <Container>
      <transition name="slide-fade-down" mode="out-in">

        <v-card-text v-if="loadingFlag" :key="'certificateLoading'" class="title text-center">
          <LoadingMessage/>
        </v-card-text>

        <div v-else-if="certificateUrl" :key="'certificateLoaded'" data-cy="certificateContent">
          <!--
            The certificate itself, shown on screen before anyone decides to download it. Whoever
            scans the QR on a piece of paper is standing there holding that paper: they need to see
            the document, compare it, and leave — not download a file first. The aspect ratio is the
            page's own (297:210), so the whole A4 landscape sheet is visible at once rather than the
            top corner of it.
          -->
          <div class="certificate-frame">
            <iframe
              data-cy="certificateFrame"
              :src="certificateUrl"
              title="Certificate"
            ></iframe>
          </div>
          <!--
            Chrome, not content: the button sits outside the frame, so it can never appear in the
            PDF or on the printed page.
          -->
          <v-card-actions class="justify-center">
            <Button
              data-cy="certificateDownloadButton"
              :icon="'mdi-download'"
              :text="'Download PDF'"
              :color="'primary'"
              :click="downloadPdf"
            ></Button>
          </v-card-actions>
        </div>

        <v-card-text v-else-if="notEnabledFlag" :key="'certificateNotEnabled'" class="title text-center"
                     data-cy="certificateNotEnabled">
          This donor's certificate has not been enabled yet.
        </v-card-text>

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
import { handleGETCertificate } from '@/api'
import { HTTP_STATUS } from '@/mixins/constants'

// The verification page behind every printed certificate's QR code. It is deliberately reachable
// without a session: whoever scans the paper — an employer, a university, anyone — has no Badhan
// account and no reason to get one.
//
// A session does change what comes back, though nothing here has to do anything about it. The
// backend draws the signature block only for a signed-in viewer, and it reads that from the x-auth
// header badhanAxios already attaches when the store holds a token — so a volunteer who opened this
// from a donor's profile gets the printable version and a stranger with the QR code does not. The
// token survives the new tab that the profile button opens because store.ts rehydrates it from
// localStorage on boot; if signature lines ever go missing for a signed-in user, check that first.
//
// This page draws nothing. The backend renders the finished PDF and this fetches it once, then both
// shows it and offers it for download from the same bytes. That is not an implementation detail: it
// is the only way the artwork can stay private, because everything a browser is sent — every image,
// font and layout constant in the bundle — is served to anyone who loads the page, with no auth.
//
// Nothing is rendered from the URL either. The donor's details are read from the database on every
// open, so correcting a typo in the app corrects what a scan shows (it does not, and cannot,
// correct paper already printed).

export default {
  name: 'CertificatePage',
  components: { Button, LoadingMessage, Container },
  data: () => {
    return {
      loadingFlag: true,
      // An object URL over the fetched PDF. One fetch feeds both the frame and the download, so
      // pressing download never asks the server for the certificate a second time.
      certificateUrl: '',
      fileName: 'certificate.pdf',
      // Three settled answers, told apart on purpose. "Not found" and "not enabled" are final and
      // offer no retry — hammering the server would not change either — while a network failure is
      // worth retrying, and gets the button.
      notFoundFlag: false,
      notEnabledFlag: false
    }
  },
  watch: {
    // Going from one certificate to another changes only the query string, and the router reuses
    // the mounted component rather than rebuilding it. Without this the page would keep showing the
    // previous donor's certificate.
    '$route.query.id' () {
      this.loadCertificate()
    }
  },
  methods: {
    // An object URL pins its blob in memory until it is revoked, and this page is opened, closed
    // and reopened by people scanning codes.
    releaseCertificate () {
      if (this.certificateUrl) {
        URL.revokeObjectURL(this.certificateUrl)
        this.certificateUrl = ''
      }
    },

    // The name the browser saves the file under. The Content-Disposition header carries the one the
    // backend chose; falling back to the donor id keeps the file identifiable if a proxy strips it.
    readFileName (response, donorId) {
      const disposition = response.headers ? response.headers['content-disposition'] : ''
      const match = disposition ? disposition.match(/filename="([^"]+)"/) : null
      return match ? match[1] : `Badhan-Certificate-${donorId}.pdf`
    },

    async loadCertificate () {
      this.loadingFlag = true
      this.releaseCertificate()
      this.notFoundFlag = false
      this.notEnabledFlag = false

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
        this.fileName = this.readFileName(response, donorId)
        this.certificateUrl = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      } else if (response.status === HTTP_STATUS.FORBIDDEN) {
        this.notEnabledFlag = true
      } else if (response.status === HTTP_STATUS.NOT_FOUND) {
        this.notFoundFlag = true
      }

      this.loadingFlag = false
    },

    // Saved from the bytes already in the page, so the file that lands on disk is byte-for-byte the
    // one on screen.
    downloadPdf () {
      const link = document.createElement('a')
      link.href = this.certificateUrl
      link.download = this.fileName
      // Attached before it is clicked and removed after: a detached anchor's click is ignored in
      // some browsers, which fails silently — the visitor presses Download and simply gets nothing.
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  },
  async mounted () {
    // No other page in the app touches document.title, but no other page is opened by someone
    // outside Badhan. A static title only: the donor's name would end up in the tab, in browser
    // history and in any screenshot of the verifier's phone.
    document.title = 'Certificate — Badhan, BUET Zone'
    await this.loadCertificate()
  },
  beforeDestroy () {
    this.releaseCertificate()
  }
}
</script>

<style scoped>
/*
  The A4 landscape page's own proportions, so the frame is the shape of the thing inside it and no
  scrollbar appears around a certificate that would otherwise fit.
*/
.certificate-frame {
  position: relative;
  width: 100%;
  padding-top: 70.7%;
}

.certificate-frame iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: none;
}
</style>
