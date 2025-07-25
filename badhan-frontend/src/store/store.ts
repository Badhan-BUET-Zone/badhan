import Vue from 'vue'
import Vuex from 'vuex'

import auth from './auth'
import notification from './notification'
import consoleStore from './consoleStore'
import messageBox from './messageBox'
import confirmationBox from './confirmationBox'
import myprofile from './myprofile'

Vue.use(Vuex)

export const store = new Vuex.Store({

  state: {
    loadingFlag: false,
    appBarLoadingFlag: false,
    apiPendingCount: 0
  },

  getters: {
    getLoadingFlag: state => {
      return state.loadingFlag
    },
    getAppBarLoadingFlag: state => {
      return state.appBarLoadingFlag
    }
  },
  mutations: {
    setLoadingTrue (state) {
      state.loadingFlag = true
    },
    setLoadingFalse (state) {
      state.loadingFlag = false
    },
    setAppBarLoadingFlag (state) {
      state.apiPendingCount++;
      state.appBarLoadingFlag = true
    },
    unsetAppBarLoadingFlag (state) {
      if (state.apiPendingCount > 0) {
        state.apiPendingCount--;
        state.appBarLoadingFlag = (state.apiPendingCount > 0);
      }
    }
  },
  modules: {
    auth,
    notification,
    consoleStore,
    messageBox,
    confirmationBox,
    myprofile
  }
})

store.commit('loadTokenFromLocalStorage')
store.commit('loadMyProfileFromLocalStorage')
