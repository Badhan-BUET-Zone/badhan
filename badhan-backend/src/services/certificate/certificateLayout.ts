// Where every per-donor value sits on the certificate, in PDF points.
//
// The supplied Illustrator artwork uses a viewBox of "0 0 841.89 595.28" — A4 landscape measured
// in points — so one artwork unit is one PDF point and every number here was read straight out of
// that file rather than converted, eyeballed or re-derived. The background PNG
// (src/assets/certificate-background.png, baked by scripts/certificate-assets/) is the same artwork
// with these values removed, so the two are two halves of one drawing: move a number here and the
// text stops sitting on its ruled line.
//
// The supplied PDF is bigger than this — 858.9 x 612.3 pt — only because it carries a 3 mm print
// bleed. A certificate that is downloaded, viewed and printed on an office printer has no use for
// bleed, so the page is the artwork's trim size.

// tslint:disable-next-line:typedef  (`as const` supplies the type; an explicit one would widen it back)
export const PAGE = {
  width: 841.89,
  height: 595.28
} as const

// A blank is the ruled line a value is written onto: the span it may occupy, and the baseline the
// designer's own sample value sat on (slightly above the rule, as handwriting on a form is).
// Values are centred in the span, which is what the artwork's samples do.
export interface Blank {
  left: number
  right: number
  baseline: number
  fontSize: number
}

// The one value with a face of its own: the donor's name, in the same script the artwork uses,
// twice the size of every other field.
export const NAME: Blank = {
  left: 281.205,
  right: 681.105,
  baseline: 276.2131,
  fontSize: 35.7511
}

// "son/daughter of Mr. ____ and Mrs. ____". The honorifics are printed as part of the sentence in
// the artwork, so only the names are drawn.
export const FATHER_NAME: Blank = {
  left: 67.315,
  right: 299.485,
  baseline: 301.4865,
  fontSize: 22
}

export const MOTHER_NAME: Blank = {
  left: 329.545,
  right: 561.715,
  baseline: 301.7574,
  fontSize: 22
}

// "student of the department/faculty of ____".
export const DEPARTMENT: Blank = {
  left: 67.315,
  right: 280.135,
  baseline: 327.7237,
  fontSize: 22
}

// "residing/attached at/to ____".
export const HALL: Blank = {
  left: 67.315,
  right: 309.16,
  baseline: 354.091,
  fontSize: 22
}

// "President/General Secretary, BADHAN, ____ Unit", in the signature block. A BUET-zone unit is a
// hall, so this blank and HALL above carry the same value — "Sher-E-Bangla Hall", written out in
// full as a document writes it, rather than the bare "Sher-E-Bangla" the artwork's sample uses.
export const UNIT: Blank = {
  left: 341.058,
  right: 474.958,
  baseline: 548.8046,
  fontSize: 22
}

// A name in a script face overruns its rule long before an ordinary one would, and Bangladeshi
// names run long. Nothing is ever clipped or shortened: verification is a comparison of the name
// on paper against the name on screen, so a truncated name defeats the document. The size is
// reduced until the value fits instead — which is why there is a floor rather than a wrap. There is
// one ruled line per field, with the next line of the sentence 25 pt below it, so a second line
// would print on top of the sentence.
export const MINIMUM_FONT_SIZE: number = 9

// The placeholder frame the artwork reserves for the code, removed from the background and
// replaced by the real thing. Read off the rounded rectangle's own path.
// tslint:disable-next-line:typedef  (`as const` supplies the type; an explicit one would widen it back)
export const QR_FRAME = {
  left: 660.63,
  top: 77.17,
  width: 118.52,
  height: 85.49
} as const

// The code is square and as large as the frame's shorter side allows once a quiet zone is left on
// all four sides. 73.5 pt is 25.9 mm printed — above the 25 mm floor a printed code needs to
// survive being photographed by a stranger with a phone.
// tslint:disable-next-line:typedef  (`as const` supplies the type; an explicit one would widen it back)
export const QR = {
  size: 73.49,
  centerX: QR_FRAME.left + QR_FRAME.width / 2,
  centerY: QR_FRAME.top + QR_FRAME.height / 2
} as const

// The caption under the code, and the one thing on the certificate addressed to a reader looking at
// a screen rather than at paper. A certificate is handed over as a PDF at least as often as it is
// printed, and someone reading it in a PDF viewer cannot scan a code that is already on their
// screen — so the code and this caption are both link annotations pointing at the same verification
// page (see drawVerifyLink in certificateRenderer).
//
// It sits below the placeholder frame rather than inside it: the frame is filled by the code and
// its quiet zone with nothing to spare, and the quiet zone is the one part of a QR code that must
// not be encroached on. The blank paper between the frame and the body text is where this goes.
//
// 8 pt is small enough to read as a footnote next to a 22 pt document, and the artwork leaves this
// area empty, so nothing is displaced by it.
// tslint:disable-next-line:typedef  (`as const` supplies the type; an explicit one would widen it back)
export const VERIFY = {
  text: 'Click to Verify',
  fontSize: 8,
  baseline: QR_FRAME.top + QR_FRAME.height + 11.5
} as const

// A standard PDF font rather than the artwork's script face. GreatVibes is a handwriting script
// drawn for the donor's name at 35 pt; at 8 pt it is not legible, and this line is an instruction
// rather than part of the document's voice.
export const VERIFY_FONT: string = 'Helvetica'

// The artwork's own base paper colour. The quiet zone is painted in it rather than in white so the
// patch is invisible against the background, while still giving the code a clean, untextured
// margin — the diagonal hatching underneath is faint, but a printed code has to work from a bad
// photograph, and there is no reason to make it work harder.
export const PAPER: string = '#FCF8EF'

export const INK: string = '#000000'

// Bundled as a real font file in the image, not named and hoped for. Naming a font is exactly what
// the supplied SVG did, and why it rendered differently on every machine that opened it.
export const VALUE_FONT_FILE: string = 'GreatVibes-Regular.ttf'
