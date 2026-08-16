<template>
  <div>
    <Container>
      <!--
        after-enter is what paints the certificate. mode="out-in" holds this branch out of the DOM
        until the loading message has finished leaving, so the canvas does not exist at the moment
        the page finishes rendering — see paintCertificate.
      -->
      <transition name="slide-fade-down" mode="out-in" @after-enter="paintCertificate">

        <v-card-text v-if="loadingFlag" :key="'certificateLoading'" class="title text-center">
          <LoadingMessage/>
        </v-card-text>

        <div v-else-if="certificateUrl" :key="'certificateLoaded'" data-cy="certificateContent">
          <!--
            The certificate itself, shown on screen before anyone decides to download it. Whoever
            scans the QR on a piece of paper is standing there holding that paper: they need to see
            the document, compare it, and leave — not download a file first.

            It is a canvas rather than an <iframe> over the PDF, and that is the whole point. An
            embedded PDF is only shown if the visitor's browser is willing to render one, and Edge
            (and Chrome) can be set — or told by an enterprise policy — to download PDFs instead,
            at which point the frame shows the browser's own "PDF reader is disabled" notice and
            the verification page verifies nothing. This page is opened by strangers whose browser
            settings Badhan has no say over, so it draws the document itself.
          -->
          <div v-show="!renderFailedFlag" class="certificate-frame">
            <canvas
              ref="certificateCanvas"
              data-cy="certificateFrame"
              aria-label="Certificate"
            ></canvas>
          </div>

          <v-card-text v-if="renderFailedFlag" class="text-center"
                       data-cy="certificateRenderFailed">
            This certificate could not be shown on this screen. It arrived complete and is still
            valid — use the button below to download it and open it yourself.
          </v-card-text>
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
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf'
import pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.entry'
import Container from '@/components/Container/Container'
import LoadingMessage from '@/components/LoadingMessage.vue'
import Button from '@/components/UI Components/Button'
import { handleGETCertificate } from '@/api'
import { HTTP_STATUS } from '@/mixins/constants'

// The worker is bundled by webpack rather than fetched from a CDN: this page is loaded by people on
// bad connections in the field, and a second origin is one more thing that can be blocked, slow or
// down when someone is standing there with a piece of paper.
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

// The width the certificate is drawn at, in device pixels. The page is 841.89 pt wide, so this is
// roughly 205 DPI — crisp on any phone or laptop, and enough to zoom into a name without it going
// soft. It is a fixed size rather than one measured from the viewport because the canvas is scaled
// to fit by CSS: rendering once at a generous size avoids re-rasterising the page on every resize
// or device-rotation, which on a phone is the common case rather than the rare one.
const RENDER_WIDTH = 2400

// The verification page behind every printed certificate's QR code. It is deliberately reachable
// without a session: whoever scans the paper — an employer, a university, anyone — has no Badhan
// account and no reason to get one.
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
      // An object URL over the fetched PDF. One fetch feeds both the canvas and the download, so
      // pressing download never asks the server for the certificate a second time.
      certificateUrl: '',
      fileName: 'certificate.pdf',
      // Three settled answers, told apart on purpose. "Not found" and "not enabled" are final and
      // offer no retry — hammering the server would not change either — while a network failure is
      // worth retrying, and gets the button.
      notFoundFlag: false,
      notEnabledFlag: false,
      // Drawing the page failed even though the bytes arrived. The certificate is still downloadable
      // and still valid, so this only replaces the picture, never the page.
      renderFailedFlag: false
    }
  },
  created () {
    // Deliberately not in data(). Vue 2 walks a data object and makes every property reactive, and
    // neither of these is state the template reads: pdfDocument is a pdf.js handle holding a worker,
    // renderedPage is a canvas element. Making either reactive costs a deep walk and buys nothing.
    this.pdfDocument = null
    this.renderedPage = null
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
    // and reopened by people scanning codes. The pdf.js document holds a worker and goes with it.
    releaseCertificate () {
      if (this.certificateUrl) {
        URL.revokeObjectURL(this.certificateUrl)
        this.certificateUrl = ''
      }
      if (this.pdfDocument) {
        this.pdfDocument.destroy()
        this.pdfDocument = null
      }
      this.renderedPage = null
    },

    // Blob.arrayBuffer is missing on Safari before 14. Whoever scans a printed code arrives on
    // whatever phone they happen to own, so the old path stays.
    readArrayBuffer (blob) {
      if (typeof blob.arrayBuffer === 'function') {
        return blob.arrayBuffer()
      }

      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(reader.error)
        reader.readAsArrayBuffer(blob)
      })
    },

    // Draws page one onto the canvas. The certificate is a single page by construction; if a future
    // template ever grows a second, this still shows the one that carries the donor's details.
    async renderCertificate (arrayBuffer) {
      // isEvalSupported turns off the font compiler's use of eval, which is the vector behind
      // CVE-2024-4367. These bytes come from Badhan's own backend, so the risk is already remote —
      // but nothing on this page needs eval, and the page is served to the public.
      this.pdfDocument = await pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
        isEvalSupported: false,
        // Where vue.config.js copied pdf.js's standard-14 outlines to. Without this the
        // certificate's "Click to Verify" caption renders in a substitute face, because Helvetica
        // is not embedded in the PDF — by specification it is the reader's to supply.
        standardFontDataUrl: `${process.env.BASE_URL}standard_fonts/`
      }).promise

      const page = await this.pdfDocument.getPage(1)
      const viewport = page.getViewport({
        scale: RENDER_WIDTH / page.getViewport({ scale: 1 }).width
      })

      // Drawn detached from the document, because the visible canvas does not exist yet: this view
      // sits behind a <transition mode="out-in">, which keeps the branch out of the DOM until the
      // loading message has finished animating away. Rendering has no reason to wait for an
      // animation, so it does not — only painting does.
      const rendered = document.createElement('canvas')
      rendered.width = Math.floor(viewport.width)
      rendered.height = Math.floor(viewport.height)

      await page.render({ canvasContext: rendered.getContext('2d'), viewport }).promise

      this.renderedPage = rendered
      this.paintCertificate()
    },

    // Copies the finished page onto the visible canvas. Called both when the render finishes and
    // when the transition finishes, so whichever of the two happens second does the work and the
    // order between them stops mattering.
    paintCertificate () {
      const canvas = this.$refs.certificateCanvas
      if (!canvas || !this.renderedPage) {
        return
      }

      canvas.width = this.renderedPage.width
      canvas.height = this.renderedPage.height
      canvas.getContext('2d').drawImage(this.renderedPage, 0, 0)
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
      this.renderFailedFlag = false

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
        this.loadingFlag = false

        // The canvas is behind v-else-if on certificateUrl, so it only exists once the line above
        // has been rendered. Drawing is deliberately not part of the loading state: the frame keeps
        // the page's shape while it happens, and a certificate that arrived but could not be drawn
        // is still a certificate somebody can download.
        await this.$nextTick()

        try {
          await this.renderCertificate(await this.readArrayBuffer(response.data))
        } catch (error) {
          this.renderFailedFlag = true
        }

        return
      }

      if (response.status === HTTP_STATUS.FORBIDDEN) {
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

/*
  The canvas is rasterised once at a fixed width and scaled to fit by the browser, so it stays sharp
  when the window is resized or a phone is rotated without the page being drawn again.
*/
.certificate-frame canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
</style>
