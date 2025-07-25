import token from './token'
import theme from './theme'
import myProfile from "./myProfile";
import donationCountYearMonth from './donationCountYearMonth'
const reset = () => {
  localStorage.clear()
}

export default {
  token,
  theme,
  myProfile,
  donationCountYearMonth,
  reset
}
