// @ts-nocheck
const axios = require('axios')
const githubAxios = axios.create({
  baseURL: 'https://api.github.com/repos/Badhan-BUET-Zone/badhan-web/releases/latest'
})

const handleGETGitReleaseInfo = async () => {
  try {
    return await githubAxios.get('')
  } catch (e) {
    return e.response
  }
}
module.exports = {
  handleGETGitReleaseInfo
}
