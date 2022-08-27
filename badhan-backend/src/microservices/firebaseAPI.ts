import axios, {AxiosResponse} from 'axios'
// https://github.com/axios/axios/issues/3612#issuecomment-770224236
const firebaseAxios = axios.create({
  baseURL: 'https://badhan-buet-default-rtdb.firebaseio.com'
})

export const handleGETFirebaseGooglePlayVersion = async ():Promise<AxiosResponse> => {
  try {
    return await firebaseAxios.get('/frontendSettings.json')
  } catch (e: any) {
    return e.response
  }
}
