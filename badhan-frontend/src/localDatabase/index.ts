import token from './token'
import theme from './theme'
import archiveSearch from './archiveSearch'
import myProfile from "./myProfile";
import donationCountYearMonth from './donationCountYearMonth'
const reset = () => {
  localStorage.clear()
}

export default {
  token,
  theme,
  archiveSearch,
  myProfile,
  donationCountYearMonth,
  reset
}
