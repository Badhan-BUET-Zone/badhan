import { set, get, remove } from '@/localDatabase/helpers'

/**
 * TWO TIMESTAMPS, TWO JOBS. MERGING THEM BREAKS THE BADGE.
 *
 * This is the single most likely thing to be got wrong in the chat feature, so it is stated
 * here rather than left to be inferred from the call sites:
 *
 *   chatLastFetchedAt — WHAT THIS SESSION HAS BEEN TOLD ABOUT.
 *     Written after every successful fetch, from the response's `serverTime`. Note that
 *     `serverTime` is NOT always the server's clock: when a catch-up page comes back
 *     truncated the backend deliberately reports the newest returned message's `date`
 *     instead, so that the messages which did not fit are still owed to this client. Read
 *     back as the `after` cursor by the Fetch messages button and by the refresh after a send.
 *
 *   chatLastReadAt — WHAT THE HUMAN HAS ACTUALLY LOOKED AT.
 *     Written only when the panel or the page is opened, from the newest held message's
 *     `date`. Read only by the unread badge.
 *
 * A single timestamp would advance on every fetch, so the fetch at app open would mark its own
 * results read and the badge would sit at zero forever. That is the exact failure this shape
 * exists to avoid — do not "simplify" the two into one.
 *
 * THERE IS NO MESSAGE CACHE HERE, and that is a decision rather than an omission. Message
 * bodies are never written to local storage; the list lives in Vuex and dies with the tab.
 *
 * Only chatLastReadAt genuinely has to survive a restart — it is what puts a badge over the
 * messages that arrived while the app was closed. chatLastFetchedAt is overwritten by the boot
 * fetch before anything reads it, so its cross-session value is never used. It is persisted
 * anyway because it costs nothing and because a watermark that only sometimes exists is harder
 * to reason about than one that always does. DO NOT build logic that depends on its value at
 * boot; there isn't one worth trusting.
 *
 * Both keys are wiped by ldb.reset() on logout and on a 401, so the next person to sign in on
 * a shared device does not inherit a stranger's read watermark.
 */

const lastFetchedAtKey = 'chatLastFetchedAt'
const lastReadAtKey = 'chatLastReadAt'

// These accessors return a bare `number | null` rather than the { status, data } envelope the
// other localDatabase modules use. The envelope earns its keep when a caller has to tell
// "absent" from "present but falsy" about a structured value; here the callers pass the result
// straight through as a cursor, and an envelope handed to the API by mistake would be a silent
// bug that looks like a working request.
const readTimestamp = (key: string): number | null => {
  // Guarded rather than trusted. The shared `get` helper calls JSON.parse on whatever is in
  // localStorage and throws if it is not JSON — a half-written value, another tab, an
  // extension. Everywhere else that throw surfaces inside a user action; here it would land on
  // the app-open fetch and stop the whole app loading over a watermark that is only an
  // optimisation. A missing cursor just means "fetch the newest page", which is exactly the
  // right fallback, so anything unreadable is treated as absent.
  let result
  try {
    result = get(key)
  } catch (e) {
    remove(key)
    return null
  }
  if (result.status !== 'OK' || typeof result.data !== 'number') {
    return null
  }
  return result.data
}

const saveLastFetchedAt = (serverTime: number) => {
  set(lastFetchedAtKey, serverTime)
}

// null means "this session has been told about nothing yet", which is the app-open state. The
// caller answers that by fetching the newest page rather than by catching up from zero.
const loadLastFetchedAt = (): number | null => {
  return readTimestamp(lastFetchedAtKey)
}

const saveLastReadAt = (date: number) => {
  set(lastReadAtKey, date)
}

// null — a first ever open, or the first open after signing in again — means everything fetched
// counts as unread, so the first boot shows a badge over the whole first page. That is the
// right answer: it is all new to this person.
const loadLastReadAt = (): number | null => {
  return readTimestamp(lastReadAtKey)
}

const clear = () => {
  remove(lastFetchedAtKey)
  remove(lastReadAtKey)
}

export default {
  saveLastFetchedAt,
  loadLastFetchedAt,
  saveLastReadAt,
  loadLastReadAt,
  clear
}
