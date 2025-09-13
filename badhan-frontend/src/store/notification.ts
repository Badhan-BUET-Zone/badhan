import {Commit} from "vuex";

interface NotificationStateInterface {
  notificationFlag: boolean
  notification: string | null
  notificationColor: string
  dismissTimerId: ReturnType<typeof setTimeout> | null
}

const state: NotificationStateInterface = {
  notificationFlag: false,
  notification: null,
  notificationColor: 'success',
  dismissTimerId: null
}

const getters = {
  getNotification (state: NotificationStateInterface) {
    return state.notification
  },
  getNotificationFlag (state: NotificationStateInterface) {
    return state.notificationFlag
  },
  getNotificationColor (state: NotificationStateInterface) {
    return state.notificationColor
  }
}
const mutations = {
  setNotification (state: NotificationStateInterface, payload: string) {
    state.notification = payload
  },
  setNotificationFlag (state: NotificationStateInterface, payload: boolean) {
    state.notificationFlag = payload
  },
  setNotifiationColor (state: NotificationStateInterface, payload: string) {
    state.notificationColor = payload
  },
  dismissNotification (state: NotificationStateInterface) {
    if (state.dismissTimerId) {
      clearTimeout(state.dismissTimerId)
      state.dismissTimerId = null
    }
    state.dismissTimerId = setTimeout(() => {
      state.notificationFlag = false
      state.dismissTimerId = null
    }, 5000)
  },
  clearNotification (state: NotificationStateInterface) {
    state.notificationFlag = false
    if (state.dismissTimerId) {
      clearTimeout(state.dismissTimerId)
      state.dismissTimerId = null
    }
  }
}
const actions = {
  notifySuccess ({ commit }: { commit: Commit}, payload: string) {
    commit('setNotificationFlag', true)
    commit('setNotification', payload)
    commit('setNotifiationColor', 'success')
    commit('dismissNotification')
  },
  notifyInfo ({ commit }: { commit: Commit}, payload: string) {
    commit('setNotificationFlag', true)
    commit('setNotification', payload)
    commit('setNotifiationColor', 'primary')
    commit('dismissNotification')
  },
  notifyError ({ commit }: { commit: Commit}, payload: string) {
    commit('setNotificationFlag', true)
    commit('setNotification', payload)
    commit('setNotifiationColor', 'error')
  },
  setNotificationFlag ({ commit }: {commit: Commit}, payload: boolean) {
    commit('setNotificationFlag', payload)
  },
  clearNotification ({ commit }: {commit: Commit}) {
    commit('clearNotification')
  }
}

export default {
  state,
  actions,
  getters,
  mutations,
  namespaced: true

}
