<template>
  <!--
    One user unit is one millimetre: the viewBox is the exact size of an A4 landscape page, so
    phase 4 can hand this straight to the PDF with no scale factor. Everything except the name,
    the student ID and the QR code is fixed artwork.

    width:100% / height:auto is what makes a verifier's phone show the whole certificate at once
    rather than a corner of it — they are standing there holding a piece of paper, not scrolling.
  -->
  <svg
    ref="svg"
    data-cy="certificateArtwork"
    xmlns="http://www.w3.org/2000/svg"
    :viewBox="`0 0 ${PAGE.width} ${PAGE.height}`"
    style="width: 100%; height: auto; display: block;"
    :font-family="FONT_FAMILY"
  >
    <rect x="0" y="0" :width="PAGE.width" :height="PAGE.height" :fill="COLORS.paper"/>

    <rect
      :x="BORDER.inset" :y="BORDER.inset"
      :width="PAGE.width - 2 * BORDER.inset" :height="PAGE.height - 2 * BORDER.inset"
      :rx="BORDER.outerRadius"
      fill="none" :stroke="COLORS.accent" :stroke-width="BORDER.outerStroke"
    />
    <rect
      :x="BORDER.innerInset" :y="BORDER.innerInset"
      :width="PAGE.width - 2 * BORDER.innerInset" :height="PAGE.height - 2 * BORDER.innerInset"
      :rx="BORDER.innerRadius"
      fill="none" :stroke="COLORS.ink" :stroke-width="BORDER.innerStroke"
    />

    <image
      :href="CERTIFICATE_LOGO_DATA_URI"
      :x="LOGO.centerX - LOGO.width / 2" :y="LOGO.top"
      :width="LOGO.width" :height="LOGO.height"
    />

    <text
      :x="ZONE_NAME.centerX" :y="ZONE_NAME.baseline"
      text-anchor="middle" :font-size="ZONE_NAME.fontSize" :letter-spacing="ZONE_NAME.letterSpacing"
      :fill="COLORS.ink" font-weight="bold"
    >{{ COPY.zoneName }}</text>

    <text
      :x="HEADING.centerX" :y="HEADING.baseline"
      text-anchor="middle" :font-size="HEADING.fontSize" :letter-spacing="HEADING.letterSpacing"
      :fill="COLORS.muted"
    >{{ COPY.heading }}</text>

    <text
      v-for="(line, index) in nameLines"
      :key="`nameLine${index}`"
      ref="nameLine"
      data-cy="certificateName"
      :x="NAME.centerX" :y="nameBaseline(index)"
      text-anchor="middle" :font-size="nameFontSize" :fill="COLORS.ink" font-weight="bold"
    >{{ line }}</text>

    <text
      v-if="studentId"
      data-cy="certificateStudentId"
      :x="STUDENT_ID.centerX" :y="studentIdBaseline"
      text-anchor="middle" :font-size="STUDENT_ID.fontSize" :letter-spacing="STUDENT_ID.letterSpacing"
      :fill="COLORS.muted"
    >{{ studentId }}</text>

    <text
      :x="MESSAGE.centerX" :y="MESSAGE.baseline"
      text-anchor="middle" :font-size="MESSAGE.fontSize" :fill="COLORS.ink"
    >{{ COPY.message }}</text>

    <!--
      The quiet zone is drawn as an explicit white rectangle rather than left to chance. Nothing may
      be placed over this area: a QR that reads fine on a screen can still fail from paper when it
      is crowded, and the paper is the only copy that matters.
    -->
    <rect
      :x="QR_BOX.x - QR.quietZone" :y="QR_BOX.y - QR.quietZone"
      :width="QR_BOX.size + 2 * QR.quietZone" :height="QR_BOX.size + 2 * QR.quietZone"
      fill="#ffffff"
    />
    <path
      v-if="qrPath"
      data-cy="certificateQr"
      :data-qr-url="qrUrl"
      :d="qrPath"
      fill="#000000"
      shape-rendering="crispEdges"
    />
    <text
      v-if="qrPath"
      :x="QR_BOX.x + QR_BOX.size / 2"
      :y="QR_BOX.y + QR_BOX.size + QR.quietZone + QR.captionGap"
      text-anchor="middle" :font-size="QR.captionFontSize" :fill="COLORS.muted"
    >{{ COPY.qrCaption }}</text>
  </svg>
</template>

<script>
import {
  PAGE, BORDER, LOGO, ZONE_NAME, HEADING, NAME, STUDENT_ID, MESSAGE, QR, QR_BOX,
  COLORS, FONT_FAMILY, COPY
} from './certificateLayout'
import { CERTIFICATE_LOGO_DATA_URI } from './certificateLogo'

export default {
  name: 'CertificateArtwork',
  props: {
    name: {
      type: String,
      required: true
    },
    studentId: {
      type: String,
      default: ''
    },
    // The QR module matrix as qrcode's `create()` returns it: { size, data }, where data is a flat
    // row-major array of size*size values and anything truthy is a dark module. Passed as a matrix
    // rather than an image so the code is drawn as vector geometry — a rasterised QR is the classic
    // way a printed code stops scanning.
    qrMatrix: {
      type: Object,
      default: null
    },
    // The address the matrix was built from. Rendered onto the path as a data attribute so that
    // what the QR actually encodes is inspectable — comparing module geometry tells you two codes
    // differ, never that either one points where it should.
    qrUrl: {
      type: String,
      default: ''
    }
  },
  data () {
    return {
      // exposed for the template, which cannot see module imports
      PAGE,
      BORDER,
      LOGO,
      ZONE_NAME,
      HEADING,
      NAME,
      STUDENT_ID,
      MESSAGE,
      QR,
      QR_BOX,
      COLORS,
      FONT_FAMILY,
      COPY,
      CERTIFICATE_LOGO_DATA_URI,

      nameLines: [],
      nameFontSize: NAME.fontSizeStops[0]
    }
  },
  computed: {
    // One path for the whole code, one rect per dark module. Merging them into a single filled path
    // keeps the SVG small and, more importantly, keeps every module on an exact user-unit boundary
    // so no anti-aliasing seam appears between neighbours when this is scaled up for print.
    qrPath () {
      if (!this.qrMatrix || !this.qrMatrix.size) {
        return ''
      }
      const moduleCount = this.qrMatrix.size
      const moduleSize = QR_BOX.size / moduleCount
      const segments = []

      for (let row = 0; row < moduleCount; row++) {
        for (let column = 0; column < moduleCount; column++) {
          if (!this.qrMatrix.data[row * moduleCount + column]) {
            continue
          }
          const x = QR_BOX.x + column * moduleSize
          const y = QR_BOX.y + row * moduleSize
          segments.push(`M${x} ${y}h${moduleSize}v${moduleSize}h${-moduleSize}z`)
        }
      }

      return segments.join('')
    },
    studentIdBaseline () {
      return this.nameLines.length > 1
        ? STUDENT_ID.baselineAfterTwoLineName
        : STUDENT_ID.baselineSingleLine
    }
  },
  watch: {
    name () {
      this.fitName()
    }
  },
  methods: {
    nameBaseline (index) {
      if (this.nameLines.length === 1) {
        return NAME.baselineSingleLine
      }
      return NAME.baselineFirstOfTwo + index * NAME.lineHeight
    },

    widestRenderedLine () {
      const lines = this.$refs.nameLine
      if (!lines || !lines.length || typeof lines[0].getComputedTextLength !== 'function') {
        // No measurement available (a non-rendering environment). Leave the name at whatever size
        // it currently has rather than guessing — better a slightly wrong size than a crash.
        return 0
      }
      return Math.max(...lines.map((line) => line.getComputedTextLength()))
    },

    // Long Bangladeshi names are the norm, not an edge case. Shrink through the defined stops
    // first, and only then wrap — never clip, and never ellipsise: verification is a comparison of
    // the name on paper against the name on screen, so a shortened name defeats the whole document.
    async fitName () {
      this.nameLines = [this.name]

      for (const fontSize of NAME.fontSizeStops) {
        this.nameFontSize = fontSize
        await this.$nextTick()
        if (this.widestRenderedLine() <= NAME.maxWidth) {
          return
        }
      }

      this.nameLines = this.splitIntoTwoLines(this.name)

      for (const fontSize of NAME.fontSizeStops) {
        this.nameFontSize = fontSize
        await this.$nextTick()
        if (this.widestRenderedLine() <= NAME.maxWidth) {
          return
        }
      }

      // Two lines at the smallest stop is the floor. A name that still overruns here would have to
      // be far longer than anything in the database, and stopping means it stays legible and
      // complete rather than being cut.
    },

    // Split at the word boundary that leaves the two lines closest in length, so the block reads as
    // a balanced pair rather than one long line and one orphan.
    splitIntoTwoLines (name) {
      const words = name.trim().split(/\s+/)
      if (words.length < 2) {
        return [name]
      }

      let bestSplit = 1
      let smallestDifference = Infinity

      for (let split = 1; split < words.length; split++) {
        const first = words.slice(0, split).join(' ').length
        const second = words.slice(split).join(' ').length
        const difference = Math.abs(first - second)
        if (difference < smallestDifference) {
          smallestDifference = difference
          bestSplit = split
        }
      }

      return [words.slice(0, bestSplit).join(' '), words.slice(bestSplit).join(' ')]
    }
  },
  async mounted () {
    await this.fitName()
  }
}
</script>

<style scoped>

</style>
