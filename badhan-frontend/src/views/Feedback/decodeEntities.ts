// Half of a pair. The submit route escapes a registration's name, comment, address and room number
// exactly once, because those values are destined to become a donor through the creation route,
// which escapes them itself — storing them raw would produce a record differing from a typed one.
//
// This is where that escaping is undone, exactly once, at the read boundary. A card that renders the
// stored value shows "O&#x27;Brien"; a prefill that passes it on unchanged saves
// "O&amp;#x27;Brien". Both halves are required and NEITHER IS OPTIONAL.
//
// Decoding is not a licence for v-html. The decoded value is still rendered with {{ }} everywhere,
// which is what makes stored markup inert.
export const decodeEntities = (value: string | null | undefined): string => {
  if (value === null || value === undefined) return ''
  const textarea = document.createElement('textarea')
  textarea.innerHTML = String(value)
  return textarea.value
}
