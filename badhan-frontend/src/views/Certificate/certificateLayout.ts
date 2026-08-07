// Every measurement on the certificate, in millimetres, in one place.
//
// The SVG's viewBox is "0 0 297 210", so one user unit IS one millimetre and the artwork maps onto
// an A4 landscape page 1:1 — no scale factor to get wrong. Phase 4 builds the PDF from this same
// module, so a value changed here moves the screen and the paper together. Two hand-maintained
// layouts drift, and they drift onto printed paper that cannot be recalled.

export const PAGE = {
  width: 297,
  height: 210
} as const

// The visible frame, inset from the page edge so nothing important lands in a printer's
// unprintable margin.
export const BORDER = {
  inset: 10,
  outerRadius: 4,
  outerStroke: 1.2,
  innerInset: 14,
  innerRadius: 2,
  innerStroke: 0.4
} as const

export const LOGO = {
  // 25 mm wide, matching the 300 px source at 300 DPI — see certificateLogo.ts.
  width: 25,
  height: 25,
  centerX: PAGE.width / 2,
  top: 20
} as const

export const ZONE_NAME = {
  centerX: PAGE.width / 2,
  baseline: 54,
  fontSize: 7,
  letterSpacing: 1.6
} as const

export const HEADING = {
  centerX: PAGE.width / 2,
  baseline: 70,
  fontSize: 5,
  letterSpacing: 2.4
} as const

// The name is the one element whose size is not fixed: Bangladeshi names run long, and a name that
// overflows the frame or gets clipped defeats the whole point, since verification is a name-on-paper
// against name-on-screen comparison.
export const NAME = {
  centerX: PAGE.width / 2,
  // Baseline used when the name fits on a single line.
  baselineSingleLine: 96,
  // When it wraps, the two lines straddle the single-line baseline so the block stays centred.
  baselineFirstOfTwo: 89,
  lineHeight: 15,
  maxWidth: 220,
  // Stepped down in order until the name fits maxWidth. Below the smallest, the name wraps to two
  // lines instead of shrinking further — past this point it stops reading as a certificate.
  fontSizeStops: [20, 17, 14, 12, 10] as const,
  minFontSize: 10
} as const

export const STUDENT_ID = {
  centerX: PAGE.width / 2,
  baselineSingleLine: 110,
  baselineAfterTwoLineName: 118,
  fontSize: 9,
  letterSpacing: 0.8
} as const

export const MESSAGE = {
  centerX: PAGE.width / 2,
  baseline: 132,
  fontSize: 6,
  maxWidth: 190
} as const

// The QR is the authenticity mechanism, so its geometry is a hard requirement rather than a design
// preference: at least 25 mm printed, with a clear quiet zone, and nothing overlapping it. A QR
// that scans on a monitor can still fail from paper if it is printed small or crowded.
export const QR = {
  size: 30,
  quietZone: 3,
  right: 32,
  bottom: 30,
  captionGap: 5,
  captionFontSize: 4
} as const

export const QR_BOX = {
  x: PAGE.width - QR.right - QR.size,
  y: PAGE.height - QR.bottom - QR.size,
  size: QR.size
} as const

export const COLORS = {
  ink: '#1a1a1a',
  accent: '#d32f2f',
  muted: '#5a5a5a',
  paper: '#ffffff'
} as const

// Latin only, and deliberately a family jsPDF also ships as a standard font, so phase 4's PDF can
// use the same face without embedding a TTF. The certificate is written entirely in English (D8),
// so there is no script here this cannot draw. A donor whose name is stored in Bangla renders as
// empty boxes — a known, accepted consequence, fixed by writing the name in English on the profile.
export const FONT_FAMILY = 'Helvetica, Arial, sans-serif'

export const COPY = {
  zoneName: 'BADHAN, BUET ZONE',
  heading: 'CERTIFICATE OF APPRECIATION',
  message: 'With sincere gratitude for your contribution, from Badhan, BUET Zone.',
  qrCaption: 'Scan to verify'
} as const
