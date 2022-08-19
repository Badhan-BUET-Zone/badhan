import axios from 'axios'
const githubAxios = axios.create({
  baseURL: 'https://api.github.com/repos/Badhan-BUET-Zone/badhan-web/releases/latest'
})

export const handleGETGitReleaseInfo = async () => {
  try {
    return await githubAxios.get('')
  } catch (e: any) {
    return e.response
  }
}
