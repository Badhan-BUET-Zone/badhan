<template>
  <!--
    The whole printed sheet: a caption and a QR code on white A4 portrait. Nothing else belongs
    here — no logo, no border, no hall name, no readable URL, no Bangla line. If this renders
    anything more, it is wrong.

    The viewBox is millimetres, so every number below is a millimetre on paper and the SVG maps onto
    the PDF page 1:1.
  -->
  <svg
    ref="artwork"
    data-cy="feedbackQrArtwork"
    :viewBox="`0 0 ${PAGE.width} ${PAGE.height}`"
    xmlns="http://www.w3.org/2000/svg"
    style="width: 100%; height: auto; background: #ffffff"
  >
    <rect x="0" y="0" :width="PAGE.width" :height="PAGE.height" :fill="COLORS.paper"/>

    <text
      data-cy="feedbackQrCaption"
      :x="CAPTION.centerX"
      :y="CAPTION.baseline"
      text-anchor="middle"
      :font-size="CAPTION.fontSize"
      :font-family="CAPTION.fontFamily"
      :fill="COLORS.ink"
    >{{ caption }}</text>

    <!-- Only the registration sheet carries this: it says when the printed code stops working.
         Absent entirely on the feedback sheet, which never expires. -->
    <text
      v-if="subCaption"
      data-cy="feedbackQrSubCaption"
      :x="SUB_CAPTION.centerX"
      :y="SUB_CAPTION.baseline"
      text-anchor="middle"
      :font-size="SUB_CAPTION.fontSize"
      :font-family="SUB_CAPTION.fontFamily"
      :fill="COLORS.ink"
    >{{ subCaption }}</text>

    <!-- The quiet zone: white paper around the matrix, without which a scanner cannot find the
         code's edges. Nothing may be placed over this area. -->
    <rect
      :x="QR_BOX.x - quietZoneMm"
      :y="QR_BOX.y - quietZoneMm"
      :width="QR_BOX.size + 2 * quietZoneMm"
      :height="QR_BOX.size + 2 * quietZoneMm"
      :fill="COLORS.paper"
    />

    <!-- Drawn as vector rectangles from the module matrix rather than as an <image>. A rasterised
         QR is the classic way a printed code stops scanning. -->
    <path
      v-if="qrPath"
      data-cy="feedbackQrCode"
      :data-qr-url="qrUrl"
      :d="qrPath"
      :fill="COLORS.ink"
      shape-rendering="crispEdges"
    />
  </svg>
</template>

<script>
import { PAGE, CAPTION, SUB_CAPTION, QR, QR_BOX, COLORS } from '@/views/FeedbackQr/feedbackQrLayout'

export default {
  name: 'FeedbackQrArtwork',
  props: {
    caption: {
      type: String,
      required: true
    },
    // The expiry line, on the registration sheet only.
    subCaption: {
      type: String,
      default: ''
    },
    // The module matrix as qrcode's create() returns it: { size, data }, where data is a flat array
    // of one byte per module. Passed in rather than fetched here so the library import stays where
    // it can be deferred.
    qrMatrix: {
      type: Object,
      default: null
    },
    // Carried onto the rendered path as a data attribute so what the code actually encodes is
    // inspectable without decoding pixels.
    qrUrl: {
      type: String,
      default: ''
    }
  },
  data: () => {
    return { PAGE, CAPTION, SUB_CAPTION, QR, QR_BOX, COLORS }
  },
  computed: {
    quietZoneMm () {
      if (!this.qrMatrix || !this.qrMatrix.size) return 0
      return QR.quietZoneModules * (QR_BOX.size / this.qrMatrix.size)
    },
    qrPath () {
      if (!this.qrMatrix || !this.qrMatrix.size) return ''

      const moduleCount = this.qrMatrix.size
      const moduleSize = QR_BOX.size / moduleCount
      const segments = []

      for (let row = 0; row < moduleCount; row++) {
        for (let column = 0; column < moduleCount; column++) {
          if (!this.qrMatrix.data[row * moduleCount + column]) continue
          const x = QR_BOX.x + column * moduleSize
          const y = QR_BOX.y + row * moduleSize
          segments.push(`M${x} ${y}h${moduleSize}v${moduleSize}h${-moduleSize}z`)
        }
      }

      return segments.join('')
    }
  }
}
</script>
