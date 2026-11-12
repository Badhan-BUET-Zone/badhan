import token from './token'
import theme from './theme'
import archiveSearch from './archiveSearch'
import myProfile from "./myProfile";
import donationCountYearMonth from './donationCountYearMonth'
import chat from './chat'
// Where the Badhan Agent page used to keep its chats, which hold donor records. Chats now live on
// the server and come back at the next sign-in, so signing out no longer removes them; this only
// deletes the old database, for browsers that never open the agent page again (the page deletes
// it itself on load). IndexedDB, so clearing localStorage does not reach it.
const AGENT_CHAT_DATABASE = 'badhan-agent'

const reset = () => {
  localStorage.clear()
  try {
    indexedDB.deleteDatabase(AGENT_CHAT_DATABASE)
  } catch (e) {
    // IndexedDB unavailable (blocked storage): there is nothing to delete.
  }
}

export default {
  token,
  theme,
  archiveSearch,
  myProfile,
  donationCountYearMonth,
  chat,
  reset
}
