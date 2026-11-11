import token from './token'
import theme from './theme'
import archiveSearch from './archiveSearch'
import myProfile from "./myProfile";
import donationCountYearMonth from './donationCountYearMonth'
import chat from './chat'
// The Badhan Agent page's saved chats (src/views/Agent.vue), which hold donor records. Kept in
// IndexedDB, so clearing localStorage does not reach them.
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
