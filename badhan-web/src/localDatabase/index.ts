import token from './token'
import theme from './theme'
import publicContacts from './publicContacts'
import myProfile from "./myProfile";
import donationCountYearMonth from './donationCountYearMonth'
const reset = () => {
  localStorage.clear()
}

export default {
  token,
  theme,
  publicContacts,
  myProfile,
  donationCountYearMonth,
  reset
}
