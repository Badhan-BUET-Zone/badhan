import { Commit, Dispatch } from 'vuex'
import ldb from '@/localDatabase'
import {
  handleGETMessages,
  handlePOSTMessage,
  handleDELETEMessage,
  BadhanAxiosResponseDataInterface,
  BadhanAxiosResponseInterface
} from '@/api'
import { HTTP_STATUS } from '@/mixins/constants'

export interface ChatSenderInterface {
  _id: string
  name: string
  studentId: string
  hall: number
  designation: number
}

export interface ChatMessageInterface {
  _id: string
  text: string
  date: number
  // null when the sender's donor record is gone. A real, expected state, not an error.
  sender: ChatSenderInterface | null
}

export interface ChatStateInterface {
  messages: ChatMessageInterface[]
  lastReadAt: number | null
  hasMore: boolean
  moreToCatchUp: boolean
  fetchingFlag: boolean
  sendingFlag: boolean
  loadingOlderFlag: boolean
  panelOpenFlag: boolean
}

const state: ChatStateInterface = {
  // Oldest-first, and the single source of truth for BOTH the panel and the page. Every read
  // from the server already arrives oldest-first in all three modes, so nothing here reverses.
  messages: [],
  // Seeded once at boot. Absent means everything counts as unread, which is right for a first
  // ever open or the first open after signing in again.
  lastReadAt: ldb.chat.loadLastReadAt(),
  hasMore: false,
  moreToCatchUp: false,
  fetchingFlag: false,
  sendingFlag: false,
  loadingOlderFlag: false,
  panelOpenFlag: false
}

const getters = {
  getMessages: (state: ChatStateInterface) => {
    return state.messages
  },

  /**
   * THE BADGE COUNTS UNREAD MESSAGES AMONG THOSE THIS DEVICE HAS FETCHED.
   *
   * It is not a server-side unread count and it cannot be one: a true count needs either a
   * server that speaks first or a client that polls, and this feature does neither by design.
   * So the badge answers "is there something new since you last looked?" — the useful question
   * — and not "how many messages exist that you have never seen".
   *
   * Own messages never count. You do not have unread mail from yourself.
   *
   * `lastReadAt` moves ONLY on markAllRead, which is dispatched ONLY by opening the panel and
   * by mounting /chat. A fetch landing while the panel is already open therefore raises the
   * badge behind it, and it stays raised until the panel is closed and reopened. That is
   * deliberate: the badge means "something arrived since you last OPENED this", and opened
   * stays one unambiguous event. Do not add a second trigger to smooth it over.
   */
  getUnreadCount: (state: ChatStateInterface, _getters: unknown, _rootState: unknown, rootGetters: { getID: string | null }) => {
    const lastReadAt = state.lastReadAt
    const myId = rootGetters.getID
    return state.messages.filter((message: ChatMessageInterface) => {
      if (lastReadAt !== null && message.date <= lastReadAt) {
        return false
      }
      return message.sender === null || message.sender._id !== myId
    }).length
  },

  // Older history exists behind the top of the list.
  hasMoreMessages: (state: ChatStateInterface) => {
    return state.hasMore
  },
  // The last catch-up came back truncated: there is still newer traffic owed to this client.
  hasMoreToCatchUp: (state: ChatStateInterface) => {
    return state.moreToCatchUp
  },
  isFetching: (state: ChatStateInterface) => {
    return state.fetchingFlag
  },
  isSending: (state: ChatStateInterface) => {
    return state.sendingFlag
  },
  isLoadingOlder: (state: ChatStateInterface) => {
    return state.loadingOlderFlag
  },
  isPanelOpen: (state: ChatStateInterface) => {
    return state.panelOpenFlag
  }
}

/**
 * Merge without duplicating, ALWAYS BY `_id`.
 *
 * Never by text + date: two people sending "ok" in the same second would lose one, and during
 * a blood-drive push that is exactly what people type. The just-sent message reliably comes
 * back in the refresh that follows a send — its date is newer than the previous watermark — so
 * this runs on the hot path rather than as a defensive afterthought.
 */
const mergeById = (existing: ChatMessageInterface[], incoming: ChatMessageInterface[]) => {
  const seen = new Set(existing.map((message: ChatMessageInterface) => message._id))
  return incoming.filter((message: ChatMessageInterface) => !seen.has(message._id))
}

const mutations = {
  // REPLACES. Used by the app-open fetch only.
  setMessages (state: ChatStateInterface, messages: ChatMessageInterface[]) {
    state.messages = messages
  },
  // APPENDS, newest end. Used by catch-up and by the echo of a send.
  appendMessages (state: ChatStateInterface, messages: ChatMessageInterface[]) {
    state.messages = [...state.messages, ...mergeById(state.messages, messages)]
  },
  // PREPENDS, oldest end. Used by scrolling up.
  prependMessages (state: ChatStateInterface, messages: ChatMessageInterface[]) {
    state.messages = [...mergeById(state.messages, messages), ...state.messages]
  },
  removeMessage (state: ChatStateInterface, messageId: string) {
    state.messages = state.messages.filter((message: ChatMessageInterface) => message._id !== messageId)
  },
  setHasMore (state: ChatStateInterface, hasMore: boolean) {
    state.hasMore = hasMore
  },
  setMoreToCatchUp (state: ChatStateInterface, moreToCatchUp: boolean) {
    state.moreToCatchUp = moreToCatchUp
  },
  setFetchingFlag (state: ChatStateInterface, fetchingFlag: boolean) {
    state.fetchingFlag = fetchingFlag
  },
  setSendingFlag (state: ChatStateInterface, sendingFlag: boolean) {
    state.sendingFlag = sendingFlag
  },
  setLoadingOlderFlag (state: ChatStateInterface, loadingOlderFlag: boolean) {
    state.loadingOlderFlag = loadingOlderFlag
  },
  setPanelOpenFlag (state: ChatStateInterface, panelOpenFlag: boolean) {
    state.panelOpenFlag = panelOpenFlag
  },
  setLastReadAt (state: ChatStateInterface, lastReadAt: number) {
    ldb.chat.saveLastReadAt(lastReadAt)
    state.lastReadAt = lastReadAt
  }
}

/**
 * Send them to the sign-in screen after the session has been cleared.
 *
 * CLEARING THE SESSION IS NOT ENOUGH ON ITS OWN. `logout` empties the token and local storage,
 * but it navigates nowhere — every other caller in the app is a component, which pushes the
 * route itself right afterwards. Without this, a demoted member is logged out and left sitting
 * on whatever page they were on, with an app bar that has vanished and a form that will fail on
 * every action. That is the "visible, reachable and permanently broken" state the whole 403
 * handler exists to avoid, wearing a different hat.
 *
 * A component cannot do it here: the 403 can arrive from the floating button, the panel's
 * composer, a bubble's delete or the page, and spreading the navigation across four call sites
 * is how three of them come to be missing it.
 *
 * THE IMPORT IS LAZY ON PURPOSE. router/index.ts imports the store, so a top-level import back
 * would be a cycle; deferring it to call time breaks that without leaving anyone to reason
 * about half-initialised modules. The duplicate-navigation rejection is swallowed because
 * already being on the sign-in screen is a success, not an error.
 */
const goToSignIn = async () => {
  const router = (await import('@/router')).default
  if (router.currentRoute.path === '/') return
  router.push('/').catch(() => undefined)
}

/**
 * THE 403 HANDLER, AND WHY IT IS A LOGOUT.
 *
 * A demoted member keeps a working token until it expires, and their local store still says
 * they are a Volunteer — so the floating button, the drawer entry and the /chat route guard all
 * still pass while every request 403s. That is a member-only room that is visible, reachable
 * and permanently broken.
 *
 * Refreshing just the designation would fix the chat and leave every other cached permission in
 * the app equally stale. So the honest response is the one already used for a 401: clear the
 * session and send them to sign in again, where the server hands back what they actually are
 * now. `logout` already does removeToken, ldb.token.clear(), ldb.reset() and resetBaseURL(),
 * and ldb.reset() takes both chat watermarks with it, which is correct.
 *
 * A blunt response to a rare event, chosen knowingly: a demotion is not supposed to be silent,
 * and someone who was a member five minutes ago being asked to sign in again is a smaller harm
 * than a UI that lies about who they are.
 *
 * Returns true when it handled the response and the caller must stop.
 */
const handledAsForbidden = async (response: BadhanAxiosResponseInterface<BadhanAxiosResponseDataInterface> | undefined, dispatch: Dispatch) => {
  if (response !== undefined && response.status === HTTP_STATUS.FORBIDDEN) {
    // AWAITED, AND THAT IS NOT A TIDINESS POINT. `logout` is asynchronous — it calls the
    // sign-out route before clearing the token — and the router's guard sends any navigation to
    // '/' straight back to '/home' while a token is still present. Navigating before the logout
    // settles therefore lands the user exactly where they started, logged out and stranded on a
    // page they can no longer use.
    await dispatch('logout', null, { root: true })
    await goToSignIn()
    return true
  }
  return false
}

const actions = {
  /**
   * The app-open read: no cursor, newest page, REPLACES the array.
   *
   * This and fetchNewMessages are two actions rather than one with a mode flag, because they
   * differ in the thing most easily got wrong — this one replaces and that one appends. A
   * single action branching on whether a watermark existed is how a cold-start hole gets in.
   *
   * It deliberately IGNORES the stored fetch watermark. Nothing about the chat is cached on the
   * device, so a boot has no messages to catch up onto; asking for everything since a
   * week-old watermark would return a gap with no head, and the newest page is what the reader
   * actually wants to see.
   */
  async fetchInitialMessages ({ commit, dispatch }: { commit: Commit, dispatch: Dispatch }) {
    commit('setFetchingFlag', true)
    const response = await handleGETMessages({})
    commit('setFetchingFlag', false)

    if (await handledAsForbidden(response, dispatch)) return
    if (response === undefined || response.status !== HTTP_STATUS.OK) return

    commit('setMessages', response.data.messages)
    commit('setHasMore', response.data.hasMore)
    // The newest page is by definition current: there is nothing behind it to catch up on, only
    // history to scroll back through, which is hasMore's job and the other direction.
    commit('setMoreToCatchUp', false)
    ldb.chat.saveLastFetchedAt(response.data.serverTime)
  },

  /**
   * Catch-up: everything newer than what this session has been told about. APPENDS.
   *
   * IT DOES NOT LOOP. A member back from a week away has a genuinely large gap, and an action
   * that re-dispatched itself until drained would turn one button press into an unbounded burst
   * against a rate limiter, on the slow connection that member is most likely on. Instead
   * `moreToCatchUp` stays true and the button says so — one more press fetches the next page.
   * Each press is a bounded, cancellable, visible step.
   */
  async fetchNewMessages ({ commit, dispatch }: { commit: Commit, dispatch: Dispatch }) {
    const after = ldb.chat.loadLastFetchedAt()
    if (after === null) {
      // Nothing to catch up onto. Whoever asked wanted the newest page.
      await dispatch('fetchInitialMessages')
      return
    }

    commit('setFetchingFlag', true)
    const response = await handleGETMessages({ after })
    commit('setFetchingFlag', false)

    if (await handledAsForbidden(response, dispatch)) return
    if (response === undefined || response.status !== HTTP_STATUS.OK) return

    commit('appendMessages', response.data.messages)
    commit('setMoreToCatchUp', response.data.hasMore)
    // serverTime, NOT the browser's clock, and not the newest message's date picked out here:
    // a truncated page reports its own last row as serverTime precisely so the rows that did
    // not fit are still owed to this client. Store what the server said, verbatim.
    ldb.chat.saveLastFetchedAt(response.data.serverTime)
  },

  /**
   * Scrolling up. PREPENDS.
   *
   * Guarded by both hasMore and loadingOlderFlag so a fast scroll cannot issue three
   * overlapping page requests for the same boundary. Scroll anchoring is the caller's job.
   */
  async fetchOlderMessages ({ commit, dispatch, state }: { commit: Commit, dispatch: Dispatch, state: ChatStateInterface }) {
    if (!state.hasMore || state.loadingOlderFlag || state.messages.length === 0) return

    const oldest = state.messages[0]
    commit('setLoadingOlderFlag', true)
    // Both halves of the cursor travel together. `before` alone names a millisecond rather than
    // a message, and the server refuses it — for the good reason that a boundary inside a
    // shared millisecond would otherwise skip a message forever.
    const response = await handleGETMessages({ before: oldest.date, beforeId: oldest._id })
    commit('setLoadingOlderFlag', false)

    if (await handledAsForbidden(response, dispatch)) return
    if (response === undefined || response.status !== HTTP_STATUS.OK) return

    commit('prependMessages', response.data.messages)
    commit('setHasMore', response.data.hasMore)
    // No watermark write. This page is HISTORY: it says nothing about what is new, and storing
    // its serverTime would push the catch-up cursor forward over messages never fetched.
  },

  /**
   * Send, then refresh — and both halves are needed.
   *
   * 1. The 201 carries the created message already joined, so splicing it in clears the
   *    composer with no perceived latency.
   * 2. Then catch up, which pulls in whatever anyone else sent since the last watermark and
   *    advances the cursor. The just-sent message normally comes back in that response, which
   *    is why the merge is by `_id`.
   *
   * A failed send leaves the composer's text intact — this action reports failure and clears
   * nothing, so the user retypes nothing.
   */
  async sendMessage ({ commit, dispatch }: { commit: Commit, dispatch: Dispatch }, text: string) {
    commit('setSendingFlag', true)
    const response = await handlePOSTMessage({ text })
    commit('setSendingFlag', false)

    if (await handledAsForbidden(response, dispatch)) return false
    if (response === undefined || response.status !== HTTP_STATUS.CREATED) {
      if (response !== undefined && response.data !== undefined) {
        dispatch('notification/notifyError', response.data.message, { root: true })
      }
      return false
    }

    commit('appendMessages', [response.data.sentMessage])
    await dispatch('fetchNewMessages')
    return true
  },

  /**
   * Delete one message. Optimism is not warranted here, so there is none: the bubble goes only
   * after the server has agreed.
   *
   * A 404 removes it too. Somebody else deleting it first is the expected race rather than an
   * error, and the row is gone either way.
   */
  async deleteMessage ({ commit, dispatch }: { commit: Commit, dispatch: Dispatch }, messageId: string) {
    const response = await handleDELETEMessage(messageId)

    if (await handledAsForbidden(response, dispatch)) return false
    if (response === undefined) return false

    if (response.status === HTTP_STATUS.OK || response.status === HTTP_STATUS.NOT_FOUND) {
      commit('removeMessage', messageId)
      return true
    }

    if (response.data !== undefined) {
      dispatch('notification/notifyError', response.data.message, { root: true })
    }
    return false
  },

  /**
   * Mark everything currently held as read, from the newest held message's date.
   *
   * Dispatched by opening the panel and by mounting /chat, and by nothing else. An empty room
   * writes no watermark: there is nothing to have read, and stamping `now` would silence the
   * badge for messages that arrive a second later.
   */
  markAllRead ({ commit, state }: { commit: Commit, state: ChatStateInterface }) {
    if (state.messages.length === 0) return
    commit('setLastReadAt', state.messages[state.messages.length - 1].date)
  },

  openPanel ({ commit, dispatch }: { commit: Commit, dispatch: Dispatch }) {
    commit('setPanelOpenFlag', true)
    dispatch('markAllRead')
  },

  closePanel ({ commit }: { commit: Commit }) {
    commit('setPanelOpenFlag', false)
  }
}

export default {
  state,
  actions,
  getters,
  mutations,
  namespaced: true
}
