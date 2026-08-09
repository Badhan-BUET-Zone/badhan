// Every measurement on the printed sheet, in millimetres, in one place.
//
// The SVG's viewBox is "0 0 210 297", so one user unit IS one millimetre and the artwork maps onto
// an A4 portrait page 1:1 — no scale factor to get wrong. feedbackQrPdf.ts builds the PDF from this
// same module, so a value changed here moves the screen and the paper together. Two hand-maintained
// layouts drift, and they drift onto printed paper that cannot be recalled.

export const PAGE = {
  width: 210,
  height: 297
} as const

// The feedback sheet is a caption and a QR code: no logo, no border, no hall name, no readable URL
// and no Bangla line — each of those was withdrawn deliberately, and the missing Bangla is why no
// font has to be embedded (see feedbackQrPdf.ts). The registration sheet adds two short lines and
// nothing else: when the code expires, and which hall it is for.
export const CAPTION = {
  centerX: PAGE.width / 2,
  baseline: 60,
  fontSize: 7,
  // One of jsPDF's standard 14, so svg2pdf resolves it with no addFileToVFS, no base64 TTF and no
  // risk of a silent fallback to a font that is not on the printing machine.
  fontFamily: 'Helvetica, Arial, sans-serif'
} as const

// Only the registration sheet uses this. A printed registration code expires, and a sheet that does
// not say when is a sheet somebody pins up and trusts past its lifetime. The feedback sheet has no
// sub-caption because it never expires.
export const SUB_CAPTION = {
  centerX: PAGE.width / 2,
  baseline: 72,
  fontSize: 5,
  fontFamily: 'Helvetica, Arial, sans-serif'
} as const

// Which hall the code is for, in words — a hall name, or "All Halls". Registration sheets only; the
// feedback poster is zone-wide and has no hall to name.
//
// It sits in the gap that already existed between the sub-caption (72) and the QR box (90), so
// adding it moves no other measurement and does not shrink the code.
export const HALL_LINE = {
  centerX: PAGE.width / 2,
  baseline: 82,
  fontSize: 6,
  fontFamily: 'Helvetica, Arial, sans-serif'
} as const

export const QR = {
  // 120 mm, comfortably past the 80 mm floor below which a printed code stops being reliable at
  // notice-board distance. Nothing else is competing for the page, so there is no reason to be shy.
  size: 120,
  // In modules, not millimetres — the quiet zone is a property of the code, and four is the spec's
  // minimum. It is rendered as white space around the matrix.
  quietZoneModules: 4
} as const

export const QR_BOX = {
  x: (PAGE.width - QR.size) / 2,
  y: 90,
  size: QR.size
} as const

export const COLORS = {
  // Pure black on pure white. No grey, because a printer's grey is a scanner's noise.
  ink: '#000000',
  paper: '#ffffff'
} as const

export const COPY = {
  feedbackCaption: 'Scan to submit feedback to Badhan BUET Zone',
  registrationCaption: 'Scan to register as a blood donor with Badhan BUET Zone',
  // What the hall line says for a code that names no hall. The student is asked which hall they
  // are in, so the sheet cannot claim one.
  allHallsLabel: 'All Halls'
} as const
