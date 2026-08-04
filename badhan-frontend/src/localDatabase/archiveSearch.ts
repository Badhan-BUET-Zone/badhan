import { setWithExpiry, getWithExpiry, remove } from '@/localDatabase/helpers'

const storeKey = 'archiveSearch'
const TTL = 24 * 3600 * 1000

const save = () => setWithExpiry(storeKey, true, TTL)
const load = () => getWithExpiry(storeKey).status === 'OK'
const clear = () => remove(storeKey)

// reads localStorage directly instead of getWithExpiry, which deletes the key
// on a lapse: rendering the hint must never clear the setting
const expiry = (): number | null => {
  const itemStr = localStorage.getItem(storeKey)
  if (!itemStr) return null
  return JSON.parse(itemStr).expiry
}

export default {
  save, load, expiry, clear
}
