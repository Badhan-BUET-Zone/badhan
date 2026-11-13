// Call buttons in Badhan Agent's answers.
//
// The model marks where a button belongs with [[call:<donor _id>]] — the system prompt tells it how,
// in badhan-backend/src/services/agent/prompt.ts. Only the id comes from the model. The name and the
// number come from the API responses already in the chat, so a button can only dial a number the
// API itself returned to this member, never one the model wrote.

// Lenient about spaces and letter case, since a model may write either; strict about the id.
const CALL_MARKER = /\[\[\s*call\s*:\s*([0-9a-fA-F]{24})\s*\]\]/gi

// How deep into a response to look for donor records. Search results sit two levels down.
const MAX_DEPTH = 8

/**
 * An answer as pieces to draw in order: { type: 'text', text } and { type: 'call', donorId }.
 * An answer with no marker is one text piece.
 */
export function splitAnswer (text) {
  const parts = []
  let last = 0
  CALL_MARKER.lastIndex = 0
  let match
  while ((match = CALL_MARKER.exec(text)) !== null) {
    if (match.index > last) parts.push({ type: 'text', text: text.slice(last, match.index) })
    parts.push({ type: 'call', donorId: match[1].toLowerCase() })
    last = CALL_MARKER.lastIndex
  }
  if (last < text.length) parts.push({ type: 'text', text: text.slice(last) })
  return parts
}

// The number as a dialler wants it: digits only, with Bangladesh's 88 in front. The API stores
// 8801XXXXXXXXX; an 01XXXXXXXXX is given its 88.
export function dialNumber (phone) {
  const digits = String(phone).replace(/\D/g, '')
  return /^01\d{9}$/.test(digits) ? `88${digits}` : digits
}

const hasPhone = (value) =>
  (typeof value === 'number' || typeof value === 'string') && /^\+?\d{6,15}$/.test(String(value).trim())

// Every object in a response with both an _id and a phone number is taken for a donor record.
function collect (value, donors, depth) {
  if (depth > MAX_DEPTH || !value || typeof value !== 'object') return
  if (Array.isArray(value)) {
    for (const item of value) collect(item, donors, depth + 1)
    return
  }
  if (typeof value._id === 'string' && hasPhone(value.phone)) {
    const id = value._id.toLowerCase()
    const known = donors.get(id)
    // A later response is the fresher one, but keeps the name an earlier one had if it has none.
    donors.set(id, {
      name: typeof value.name === 'string' && value.name.trim() ? value.name.trim() : (known ? known.name : ''),
      phone: dialNumber(value.phone)
    })
  }
  for (const key of Object.keys(value)) collect(value[key], donors, depth + 1)
}

/**
 * Donor id → { name, phone }, from every successful API response in a chat. A response the page
 * had to cut short is no longer JSON and gives nothing.
 */
export function donorsIn (messages) {
  const donors = new Map()
  for (const message of messages) {
    const run = message.role === 'tool' ? message.run : null
    if (!run || run.status !== 'done' || typeof run.response !== 'string') continue
    let body
    try {
      body = JSON.parse(run.response)
    } catch {
      continue
    }
    collect(body, donors, 0)
  }
  return donors
}
