import token from './token'
import theme from './theme'
import archiveSearch from './archiveSearch'
import myProfile from "./myProfile";
import donationCountYearMonth from './donationCountYearMonth'
import chat from './chat'
const reset = () => {
  localStorage.clear()
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
