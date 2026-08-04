import ldb from '@/localDatabase'

export interface ArchiveSearchStateInterface {
  enabled: boolean
}

// seeded once at boot; Filters.vue's computed re-checks ldb and writes back
// when the 24 h key has lapsed under a window left open
const state: ArchiveSearchStateInterface = {
  enabled: ldb.archiveSearch.load()
}

const getters = {
  getArchiveSearchEnabled: (state: ArchiveSearchStateInterface) => {
    return state.enabled
  }
}

const mutations = {
  setArchiveSearchEnabled (state: ArchiveSearchStateInterface, enabled: boolean) {
    if (enabled) {
      ldb.archiveSearch.save()
    } else {
      ldb.archiveSearch.clear()
    }
    state.enabled = enabled
  }
}

const actions = {}

export default {
  state,
  actions,
  getters,
  mutations,
  namespaced: true
}
