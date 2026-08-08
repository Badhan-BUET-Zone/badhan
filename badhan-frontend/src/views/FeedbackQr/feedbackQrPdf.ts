import { PAGE } from './feedbackQrLayout'

// Turns the QR artwork into an A4 portrait PDF and hands it to the browser.
//
// Built from the same SVG on screen, converted as **vector** geometry rather than rasterised. That
// is the whole reason for svg2pdf.js: a QR code flattened to pixels is the classic way a printed
// code stops scanning, and this particular code goes onto a wall where it has to keep working for
// months.
//
// The page is always 210x297 mm regardless of the screen it was downloaded from — the artwork's
// viewBox is that size in millimetres, so this is a 1:1 placement, not a fit.
//
// No font is embedded and no image is placed. The caption is English, which means Helvetica — one
// of jsPDF's standard 14 — resolves without addFileToVFS. Adding a Bangla line to this sheet would
// mean embedding a font; do not do it without also re-running the physical scan gate.

export const FEEDBACK_QR_FILE_NAME = 'Badhan-Feedback-QR.pdf'
export const REGISTRATION_QR_FILE_NAME = 'Badhan-Registration-QR.pdf'

export const downloadQrPdf = async (svgElement: SVGSVGElement, fileName: string): Promise<void> => {
  // Imported on click rather than on page load. The panel this belongs to sits on the Feedback
  // page, which a volunteer opens every day; nobody should pay ~500 KiB for a PDF library on a
  // visit where they only read the queue.
  const [{ jsPDF }, { svg2pdf }] = await Promise.all([
    import(/* webpackChunkName: "feedback-qr-pdf" */ 'jspdf'),
    import(/* webpackChunkName: "feedback-qr-pdf" */ 'svg2pdf.js')
  ])

  const document = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  await svg2pdf(svgElement, document, {
    x: 0,
    y: 0,
    width: PAGE.width,
    height: PAGE.height
  })

  document.save(fileName)
}
