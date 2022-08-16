// @ts-nocheck
/* tslint:disable */
const axios = require('axios')
const firebaseAxios = axios.create({
  baseURL: 'https://badhan-buet-default-rtdb.firebaseio.com'
})

const handleGETFirebaseGooglePlayVersion = async () => {
  try {
    return await firebaseAxios.get('/frontendSettings.json')
  } catch (e) {
    return e.response
  }
}
module.exports = {
  handleGETFirebaseGooglePlayVersion
}
