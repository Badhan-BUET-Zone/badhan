const zlib = require('zlib');
const QRCode = require('qrcode');

// Reads the certificate's QR code back out of the rendered PDF, as a grid of dark modules.
//
// This is possible without a rasteriser only because of a deliberate choice in the renderer:
// badhan-backend/src/services/certificate/certificateRenderer.ts never flattens the code to an
// image. It draws every dark module as its own `re` (rectangle) operator so the code stays vector
// all the way to paper. Those operators are still in the page's content stream, so the grid can be
// reconstructed from their coordinates and compared, module for module, against what a given URL
// should have produced.
//
// Nothing here compensates for orientation. The grid is read in the stream's own coordinate order,
// which means a renderer that emitted its rows or columns flipped, transposed or shifted would
// produce a grid that does not match the expected one — which is exactly the failure this is meant
// to catch, alongside a wrong URL.

// PDFKit compresses page content, so the body of a stream is usually flate. Fonts and the
// background image are streams too; they simply contain no rectangle operators and fall through the
// scan harmlessly.
const STREAM_START = /(?<!end)stream\r?\n/g;
const END_STREAM = 'endstream';

const contentStreams = (pdf) => {
  const latin = pdf.toString('latin1');
  const streams = [];
  let match;

  STREAM_START.lastIndex = 0;
  while ((match = STREAM_START.exec(latin)) !== null) {
    const start = match.index + match[0].length;
    const end = latin.indexOf(END_STREAM, start);
    if (end === -1) {
      break;
    }

    const body = pdf.subarray(start, end);
    try {
      streams.push(zlib.inflateSync(body).toString('latin1'));
    } catch {
      // Not compressed, or not inflatable. Either way, scan what is there.
      streams.push(body.toString('latin1'));
    }

    STREAM_START.lastIndex = end + END_STREAM.length;
  }

  return streams;
};

// Width is kept as the raw string it was written as. Every module is drawn at one computed size, so
// they all serialise identically, which makes the string an exact grouping key with no tolerance to
// choose.
const squareRectangles = (pdf) => {
  const squares = [];

  for (const stream of contentStreams(pdf)) {
    const rectangle = /(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) re/g;
    let match;

    while ((match = rectangle.exec(stream)) !== null) {
      const [, x, y, width, height] = match;
      if (width === height) {
        squares.push({ x: parseFloat(x), y: parseFloat(y), width });
      }
    }
  }

  return squares;
};

// Returns { size, grid } where grid is a row-major array of booleans, or null if the page carries
// no recognisable module grid at all.
const extractQrGrid = (pdf) => {
  const byWidth = new Map();

  for (const square of squareRectangles(pdf)) {
    const family = byWidth.get(square.width);
    if (family) {
      family.push(square);
    } else {
      byWidth.set(square.width, [square]);
    }
  }

  // The modules are the one large family of identically sized squares — the renderer draws hundreds
  // of them at a single size. The only other rectangle the certificate draws is the quiet zone, a
  // lone square of a different size, which this discards by taking the biggest family.
  let modules = [];
  for (const family of byWidth.values()) {
    if (family.length > modules.length) {
      modules = family;
    }
  }

  if (modules.length === 0) {
    return null;
  }

  const moduleSize = parseFloat(modules[0].width);
  const xs = modules.map((module) => module.x);
  const ys = modules.map((module) => module.y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);

  // A QR code carries finder patterns in three of its four corners, so its dark modules always
  // reach every edge of the grid. The bounding box of the dark modules is therefore the grid
  // itself, and its span gives the size without needing to know it in advance.
  const size = Math.round((Math.max(...xs) - left) / moduleSize) + 1;
  const rows = Math.round((Math.max(...ys) - top) / moduleSize) + 1;
  if (rows !== size) {
    return null;
  }

  const grid = new Array(size * size).fill(false);
  for (const module of modules) {
    const column = Math.round((module.x - left) / moduleSize);
    const row = Math.round((module.y - top) / moduleSize);
    grid[row * size + column] = true;
  }

  return { size, grid };
};

// What the renderer's own encoder call should produce for a URL. The error correction level is
// pinned here because it changes the grid: it must stay in step with drawQrCode.
const expectedQrGrid = (url) => {
  const code = QRCode.create(url, { errorCorrectionLevel: 'M' });
  const size = code.modules.size;
  const grid = new Array(size * size);

  for (let index = 0; index < size * size; index++) {
    grid[index] = Boolean(code.modules.data[index]);
  }

  return { size, grid };
};

// Grids compare as text rather than as arrays of booleans: a failed comparison of 800-odd booleans
// tells you nothing, whereas jest's diff of these lines shows which part of the code moved.
const renderGrid = ({ size, grid }) => {
  const lines = [];

  for (let row = 0; row < size; row++) {
    let line = '';
    for (let column = 0; column < size; column++) {
      line += grid[row * size + column] ? '#' : '.';
    }
    lines.push(line);
  }

  return lines;
};

module.exports = {
  extractQrGrid,
  expectedQrGrid,
  renderGrid,
};
