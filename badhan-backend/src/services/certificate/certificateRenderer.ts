import fs from 'fs'
import path from 'path'
import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'
import { IDonor } from '../../db/models/Donor'
import { departments, halls } from '../../constants'
import dotenvEnvFile from '../../dotenv'
import {
  Blank, DEPARTMENT, FATHER_NAME, HALL, INK, MINIMUM_FONT_SIZE, MOTHER_NAME, NAME, PAGE, PAPER,
  QR, UNIT, VALUE_FONT_FILE, VERIFY, VERIFY_FONT
} from './certificateLayout'

// Draws a donor's certificate as a finished PDF, on the server, and hands back the bytes.
//
// Everything about the template stays here. The background image, the font file and the layout
// never reach a browser, because a browser cannot be given a private asset: whatever the frontend
// bundle contains is served to anyone who loads the page. So the page gets the rendered document
// and nothing else.
//
// Two things this deliberately does NOT do. It never draws a field it was not asked for — the
// donor document is read one property at a time, never spread — so blood group, phone, email,
// room number and donation history cannot reach the page by someone later widening a response
// object. And it never rasterises the QR code: the code is drawn as filled vector rectangles, all
// the way to paper, because a flattened QR is the classic way a printed code stops scanning, and
// the print is the copy that has to keep working months later.

// tsc copies .ts and nothing else, so the PNG and the TTF stay in src/ and are read from there.
// Both layouts are listed because __dirname is dist/services/certificate for the built server and
// src/services/certificate under ts-node.
const ASSET_DIRECTORY_CANDIDATES: string[] = [
  path.resolve(__dirname, '../../../src/assets'),
  path.resolve(__dirname, '../../assets')
]

const assetDirectory = (): string => {
  const found: string | undefined = ASSET_DIRECTORY_CANDIDATES.find(fs.existsSync)
  if (!found) {
    throw new Error(`certificate assets not found in ${ASSET_DIRECTORY_CANDIDATES.join(' or ')}`)
  }
  return found
}

// One background per viewer, both baked from the one artwork by scripts/certificate-assets/. They
// differ by the signature block at the foot of the page and by nothing else.
//
// The pairing below is the correctness condition of this file: the UNIT blank — the "____ Unit"
// rule in the third signature line — exists ONLY in the signed background. Drawing it on the public
// one would print a hall name onto empty paper near the bottom edge, with no rule under it and no
// sentence around it. Background and UNIT move together or not at all.
const BACKGROUND_FILE: string = 'certificate-background.png'
const PUBLIC_BACKGROUND_FILE: string = 'certificate-background-public.png'

// One registered name for the one face the renderer draws with. Every value on the certificate is
// in the artwork's script face; all the fixed wording is already part of the background.
const VALUE_FONT: string = 'value'

// A department is stored only as the two digits inside a student ID. The name that goes with it is
// already carried by the shared constants, listed as "MME (11)" for the drop-downs the app shows;
// a certificate wants the name on its own.
const departmentName = (studentId: string): string => {
  const code: number = parseInt(studentId.substr(2, 2), 10)
  const listed: string | undefined = departments[code]

  if (!listed || listed === 'NULL') {
    // Code 00 is accepted by the studentId validator but has no department name. Printing the
    // digits is honest — it is what the record actually says.
    return studentId.substr(2, 2)
  }

  return listed.replace(/\s*\(\d+\)$/, '')
}

const hallName = (hall: number): string => halls[hall] || halls[halls.length - 1]

// The address the certificate's own QR points at, which is the page a verifier lands on when they
// scan the paper. Built from the backend's configured frontend base: a server has no
// window.location to read, and reading it from a request header would let whoever asked for the
// certificate choose where the printed code sends people.
//
// The `/#/` is load-bearing. The frontend router runs in hash mode, so the certificate page's real
// address is `<base>/#/certificate?id=…`. Without the hash the browser sends `?id=…` to the server,
// the hosting rewrite answers with index.html, and the router — seeing an empty hash — routes to
// the app's default page instead. The scan appears to do nothing.
export const certificateVerificationUrl = (donorId: string): string => {
  const base: string = dotenvEnvFile.VUE_APP_FRONTEND_BASE.replace(/\/+$/, '')
  return `${base}/#/certificate?id=${donorId}`
}

// Anything that is not a letter, digit, dash or underscore is dropped: this becomes a filename on
// someone else's computer.
export const certificateFileName = (donor: IDonor): string => {
  const identifier: string = (donor.studentId || String(donor._id)).replace(/[^A-Za-z0-9_-]/g, '')
  return `Badhan-Certificate-${identifier || 'certificate'}.pdf`
}

// Fit by shrinking, never by clipping or wrapping. Widths scale linearly with font size, so one
// measurement gives the exact size that fits — no search, and no stepping past the right answer.
const fittedFontSize = (document: PDFKit.PDFDocument, value: string, blank: Blank): number => {
  const available: number = blank.right - blank.left
  const naturalWidth: number = document.font(VALUE_FONT).fontSize(blank.fontSize)
    .widthOfString(value)

  if (naturalWidth <= available || naturalWidth === 0) {
    return blank.fontSize
  }

  return Math.max(MINIMUM_FONT_SIZE, blank.fontSize * available / naturalWidth)
}

// Centred on its rule, sitting on the baseline the artwork's own sample value sat on.
const drawValue = (document: PDFKit.PDFDocument, value: string, blank: Blank): void => {
  const text: string = value.trim()
  if (!text) {
    return
  }

  const fontSize: number = fittedFontSize(document, text, blank)
  const width: number = document.font(VALUE_FONT).fontSize(fontSize).widthOfString(text)
  const left: number = blank.left + (blank.right - blank.left - width) / 2

  document.fillColor(INK).text(text, left, blank.baseline, {
    lineBreak: false,
    baseline: 'alphabetic'
  })
}

const drawQrCode = (document: PDFKit.PDFDocument, url: string): void => {
  const code: QRCode.QRCode = QRCode.create(url, { errorCorrectionLevel: 'M' })
  const moduleCount: number = code.modules.size
  const moduleSize: number = QR.size / moduleCount
  const left: number = QR.centerX - QR.size / 2
  const top: number = QR.centerY - QR.size / 2

  // The quiet zone: the artwork's paper colour over the frame the placeholder occupied, so the code
  // sits on a clean, untextured field without a visible patch appearing on the certificate.
  document.save()
  document.rect(left - 6, top - 6, QR.size + 12, QR.size + 12).fill(PAPER)

  // Every dark module into one path, then one fill. Each module lands on an exact coordinate, so
  // no anti-aliasing seam opens between neighbours when this is printed or zoomed.
  for (let row: number = 0; row < moduleCount; row++) {
    for (let column: number = 0; column < moduleCount; column++) {
      if (code.modules.data[row * moduleCount + column]) {
        document.rect(left + column * moduleSize, top + row * moduleSize, moduleSize, moduleSize)
      }
    }
  }
  document.fill(INK)
  document.restore()
}

// Makes the code clickable, and captions it.
//
// A printed certificate is scanned; a certificate read on a screen cannot be, and until now offered
// a reader nothing to do about the code at all. Both the code's own square and the caption under it
// become link annotations pointing at the same page the code encodes, so a PDF viewer opens the
// verification page on a click. Annotations are metadata, not marks on the page: nothing here
// changes what prints, and the caption is the only new ink.
const drawVerifyLink = (document: PDFKit.PDFDocument, url: string): void => {
  const left: number = QR.centerX - QR.size / 2
  const top: number = QR.centerY - QR.size / 2

  document.link(left, top, QR.size, QR.size, url)

  document.save()
  document.font(VERIFY_FONT).fontSize(VERIFY.fontSize).fillColor(INK)

  // Centred under the code on the code's own centre line, so caption and QR read as one object.
  const width: number = document.widthOfString(VERIFY.text)
  const captionLeft: number = QR.centerX - width / 2

  document.text(VERIFY.text, captionLeft, VERIFY.baseline, {
    lineBreak: false,
    baseline: 'alphabetic'
  })

  // The annotation box is drawn from the baseline outwards rather than from the text's own metrics:
  // a link target wants to be comfortably clickable, and a couple of points of slack around an 8 pt
  // line costs nothing because the paper around it is blank.
  document.link(
    captionLeft,
    VERIFY.baseline - VERIFY.fontSize,
    width,
    VERIFY.fontSize * 1.35,
    url
  )
  document.restore()
}

// `withSignatureBlock` is the caller's answer to "is whoever asked for this signed in", not a
// judgement this file makes. See CertificatesController for how it is decided.
export const renderCertificatePdf = async (donor: IDonor, withSignatureBlock: boolean): Promise<Buffer> => {
  const assets: string = assetDirectory()

  // Sized from the artwork rather than by naming A4, so the background lands 1:1 with no scaling
  // and no rounding between the two.
  const document: PDFKit.PDFDocument = new PDFDocument({
    size: [PAGE.width, PAGE.height],
    margin: 0,
    // A static title: this ends up in the viewer's tab and in any screenshot a verifier takes, and
    // the donor's name has no business there.
    info: { Title: 'Certificate — Badhan, BUET Zone' }
  })

  document.registerFont(VALUE_FONT, path.join(assets, 'fonts', VALUE_FONT_FILE))
  document.image(path.join(assets, withSignatureBlock ? BACKGROUND_FILE : PUBLIC_BACKGROUND_FILE), 0, 0, {
    width: PAGE.width,
    height: PAGE.height
  })

  drawValue(document, donor.name, NAME)
  drawValue(document, donor.fatherName, FATHER_NAME)
  drawValue(document, donor.motherName, MOTHER_NAME)
  drawValue(document, departmentName(donor.studentId), DEPARTMENT)
  drawValue(document, hallName(donor.hall), HALL)

  // Paired with the background chosen above — see the note beside PUBLIC_BACKGROUND_FILE.
  if (withSignatureBlock) {
    drawValue(document, hallName(donor.hall), UNIT)
  }

  const verificationUrl: string = certificateVerificationUrl(String(donor._id))
  drawQrCode(document, verificationUrl)
  drawVerifyLink(document, verificationUrl)

  const chunks: Buffer[] = []
  document.on('data', (chunk: Buffer): number => chunks.push(chunk))

  const finished: Promise<void> = new Promise((resolve: () => void): void => {
    document.on('end', resolve)
  })
  document.end()
  await finished

  return Buffer.concat(chunks)
}
