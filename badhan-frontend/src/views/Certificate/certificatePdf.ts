import { PAGE } from './certificateLayout'

// Turns the certificate artwork into an A4 landscape PDF and hands it to the browser.
//
// The PDF is built from the same SVG the visitor is looking at, converted as **vector** geometry
// rather than rasterised. That is the whole reason for svg2pdf.js: a QR code flattened to pixels is
// the classic way a printed code stops scanning, and the printed code is the only part of this
// document that has to survive being photographed by a stranger months later.
//
// The page is always 297x210 mm regardless of the screen, window or device it was downloaded from —
// the artwork's viewBox is that size in millimetres, so this is a 1:1 placement, not a fit.

// Anything that is not a letter, digit, dash or underscore is dropped: this string becomes a
// filename on someone else's computer.
const sanitizeForFilename = (value: string): string => value.replace(/[^A-Za-z0-9_-]/g, '')

export const certificateFileName = (studentId: string, donorId: string): string => {
  const cleanStudentId = sanitizeForFilename(studentId || '')
  // Falls back to the donor id so the file is still identifiable if a student ID is ever absent.
  const identifier = cleanStudentId || sanitizeForFilename(donorId) || 'certificate'
  return `Badhan-Certificate-${identifier}.pdf`
}

export const downloadCertificatePdf = async (
  svgElement: SVGSVGElement,
  studentId: string,
  donorId: string
): Promise<void> => {
  // Imported on click rather than on page load. Someone who only scans a QR code to check a name
  // should never pay to download a PDF library.
  const [{ jsPDF }, { svg2pdf }] = await Promise.all([
    import(/* webpackChunkName: "certificate-pdf" */ 'jspdf'),
    import(/* webpackChunkName: "certificate-pdf" */ 'svg2pdf.js')
  ])

  const document = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  })

  await svg2pdf(svgElement, document, {
    x: 0,
    y: 0,
    width: PAGE.width,
    height: PAGE.height
  })

  document.save(certificateFileName(studentId, donorId))
}
