import {
  enableGuestAPI,
  handleDELETESignOut,
  handleDELETESignOutAll,
  handleGETDonorsMe,
  handlePATCHRedirectedAuthentication,
  handlePOSTRedirection,
  handlePOSTSignIn,
  resetBaseURL
} from '@/api'

import ldb from '@/localDatabase'
import {Commit, Dispatch} from "vuex";
import { DESIGNATIONS_INDEX, HTTP_STATUS } from '@/mixins/constants'

interface AuthStoreStateInterface {
  token: null | string
  signInLoaderFlag: boolean
  error: string
  redirectionRequestMade: boolean
  isLoggedIn: boolean
  isGuest: boolean
  autoRedirectionPath: string | null
}

const state: AuthStoreStateInterface = {
  token: null,
  signInLoaderFlag: false,
  error: '',

  redirectionRequestMade: false,
  isLoggedIn: false,
  isGuest: false,

  autoRedirectionPath: null,
}

const getters = {
  getToken: (state: AuthStoreStateInterface) => {
    return state.token
  },
  getSignInLoaderFlag: (state: AuthStoreStateInterface) => {
    return state.signInLoaderFlag
  },
  getIsLoggedIn: (state: AuthStoreStateInterface) => {
    return state.isLoggedIn
  },
  getAutoRedirectionPath: (state: AuthStoreStateInterface) => {
    return state.autoRedirectionPath
  },
  getIsGuest: (state: AuthStoreStateInterface) => {
    return state.isGuest
  },
}
const mutations = {
  setAutoRedirectionPath (state: AuthStoreStateInterface, path: string) {
    state.autoRedirectionPath = path
  },
  unsetAutoRedirectionPath (state: AuthStoreStateInterface) {
    state.autoRedirectionPath = null
  },

  loadTokenFromLocalStorage (state: AuthStoreStateInterface) {
    state.token = ldb.token.load()
  },

  saveTokenToLocalStorage (state: AuthStoreStateInterface) {
    ldb.token.save(state.token)
  },

  setToken (state: AuthStoreStateInterface, token: string) {
    state.token = token
  },

  removeToken (state: AuthStoreStateInterface) {
    state.token = null
    ldb.token.clear()
  },

  signInLoaderFlagOn (state: AuthStoreStateInterface) {
    state.signInLoaderFlag = true
  },

  signInLoaderFlagOff (state: AuthStoreStateInterface) {
    state.signInLoaderFlag = false
  },
  clearSignInError (state: AuthStoreStateInterface) {
    state.error = ''
  },

  setLoginFlag (state: AuthStoreStateInterface) {
    state.isLoggedIn = true
  },
  unsetLoginFlag (state: AuthStoreStateInterface) {
    state.isLoggedIn = false
  },
  setGuestFlag (state: AuthStoreStateInterface) {
    state.isGuest = true
  },
  unsetGuestFlag (state: AuthStoreStateInterface) {
    state.isGuest = false
  },
}
const actions = {
  async logout ({ commit, dispatch }: {commit: Commit, dispatch: Dispatch}) {
    commit('setLoadingTrue')
    const response = await handleDELETESignOut()
    if (response.status === HTTP_STATUS.OK) {
      dispatch('notification/notifySuccess', response.data.message)
    }
    commit('setLoadingFalse')
    commit('unsetLoginFlag')
    commit('unsetGuestFlag')
    commit('removeToken')
    ldb.token.clear()
    ldb.reset()
    resetBaseURL()
  },
  async logoutAll ({ commit, dispatch }: {commit: Commit, dispatch: Dispatch}) {
    const response = await handleDELETESignOutAll()
    if (response.status === HTTP_STATUS.OK) {
      dispatch('notification/notifySuccess', response.data.message)
    }
    commit('unsetLoginFlag')
    commit('unsetGuestFlag')
    commit('removeToken')
    ldb.token.clear()
    ldb.reset()
    resetBaseURL()
  },
  async requestRedirectionToken ({ commit }: {commit: Commit}) {
    commit('setLoadingTrue')
    const postRedirectionTokenResponse = await handlePOSTRedirection()
    commit('setLoadingFalse')
    return postRedirectionTokenResponse
  },
  async redirectionLogin ({ commit }: {commit: Commit}, payload: string) {
    ldb.reset()
    commit('signInLoaderFlagOn')
    const patchRedirectionResponse = await handlePATCHRedirectedAuthentication({ token: payload })
    commit('signInLoaderFlagOff')
    if (patchRedirectionResponse.status !== HTTP_STATUS.CREATED) {
      return false
    }
    commit('setToken', patchRedirectionResponse.data.token)
    commit('setMyProfile', patchRedirectionResponse.data.donor)
    commit('setLoginFlag')
    commit('saveTokenToLocalStorage')
    return true
  },
  async autoLogin ({ commit, state }: {commit: Commit, state: AuthStoreStateInterface} ) {
    if (state.token === null) return true
    const response = await handleGETDonorsMe()

    if (response.status !== HTTP_STATUS.OK) {
      if (response.status !== HTTP_STATUS.UNAUTHORIZED) return false
      commit('removeToken')
      ldb.token.clear()
      ldb.reset()
      return false
    }

    const donor = response.data.donor
    commit('setMyProfile', donor)
    commit('saveMyProfileToLocalStorage', donor)
    ldb.myProfile.save(donor)
    commit('setLoginFlag')
    return true
  },
  async checkToken ({ commit }: {commit: Commit}) {
    commit('signInLoaderFlagOn')
    const response = await handleGETDonorsMe()
    commit('signInLoaderFlagOff')

    if (response.status !== HTTP_STATUS.OK) {
      if (response.status !== HTTP_STATUS.UNAUTHORIZED) return false
      commit('removeToken')
      ldb.reset()
      return false
    }
    return response.data.donor
  },
  async guestLogin ({ commit, dispatch }: {commit: Commit, dispatch: Dispatch}) {
    enableGuestAPI()
    commit('setGuestFlag')
    await dispatch('login', { phone: '123465', password: 'oseihgfweoisng', rememberFlag: false })
  },

  async login ({ commit, dispatch }: { commit: Commit, dispatch: Dispatch}, payload:{phone: string, password: string, rememberFlag: boolean}) {
    ldb.reset()
    commit('signInLoaderFlagOn')
    const sendData = {
      phone: parseInt('88' + payload.phone),
      password: payload.password
    }

    const signInResponse = await handlePOSTSignIn(sendData)

    if (signInResponse.status !== HTTP_STATUS.CREATED) {
      commit('signInLoaderFlagOff')
      return false
    }
    commit('setToken', signInResponse.data.token)

    const response = await handleGETDonorsMe()
    commit('signInLoaderFlagOff')

    if (response.status !== HTTP_STATUS.OK) {
      return false
    }

    const donor = response.data.donor
    commit('setMyProfile', donor)
    commit('saveMyProfileToLocalStorage', donor)

    if (payload.rememberFlag) {
      commit('saveTokenToLocalStorage')
    } else {
      ldb.token.clear()
    }
    commit('setLoginFlag')

    /*
      TRIGGER 2 OF 4: a fresh sign-in.

      App.vue's mounted hook has long since run, so without this someone who signs in
      mid-session sees an empty room until they touch something. Not awaited, for the same
      reason as trigger 1: signing in must not be held up by chat history.

      DESIGNATION IS NOT CHECKED BY THE SERVER ALONE HERE. A plain donor's fetch is refused with
      a 403, and the chat store treats a 403 as a logout — which would sign somebody out of the
      app the instant they signed into it. So the dispatch is gated on being a member.

      IT MUST COME BEFORE THE SUCCESS NOTIFICATION, AND THAT IS NOT COSMETIC. The API request
      interceptor clears the current notification on every outgoing request, so a fetch started
      after the toast wipes "Signed in successfully" off the screen before anybody can read it.
      Ordering it first means the toast is the last thing to happen and survives.
    */
    if (donor.designation >= DESIGNATIONS_INDEX.VOLUNTEER) {
      dispatch('chat/fetchInitialMessages', null, { root: true })
    }

    dispatch('notification/notifySuccess',signInResponse.data.message)
    return true
  }
}

export default {
  state,
  actions,
  getters,
  mutations
}
