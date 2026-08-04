<template>
  <div>
    <PageTitle>
      <ShareProfileButton :id="$store.getters['getID']"></ShareProfileButton>
    </PageTitle>
    <PersonDetails :donorId="$store.getters['getID']"></PersonDetails>
    <transition appear name="slide-fade-down">
      <Container>
        <v-card-title>Settings</v-card-title>
        <v-card-text>
          <v-switch
              v-model="darkTheme"
              inset
              label="Switch to dark theme"
          ></v-switch>
          <v-switch
              v-if="$store.getters['getDesignation'] === DESIGNATIONS_INDEX.SUPER_ADMIN"
              id="archiveSearchSwitchId"
              data-cy="archiveSearchSwitchId"
              v-model="archiveSearchEnabled"
              inset
              label="Enable archive search"
              :messages="archiveSearchHint"
          ></v-switch>
        </v-card-text>
        <v-card-title>List of Logins</v-card-title>
        <transition name="slide-fade-down" mode="out-in">
        <div v-if="loginsFetched" :key="'loginsFetched'">
          <v-card-text>Current Device</v-card-text>
          <v-card-text>
            <v-row>
              <v-col cols="12" sm="6">
                <LoginCard
                    v-if="currentLogin"
                    :show-delete="false"
                    :click="deleteLogin"
                    :browser-family="currentLogin.browserFamily"
                    :device="currentLogin.device"
                    :ip-address="currentLogin.ipAddress"
                    :os="currentLogin.os"
                    :_id="currentLogin._id"
                ></LoginCard>
              </v-col>
            </v-row>
          </v-card-text>
          <v-card-text>Other Devices</v-card-text>
          <v-card-text v-if="logins.length===0 && loginsFetched">This is the only logged in device for your account
          </v-card-text>
          <v-card-text>
            <v-row>
              <v-col v-for="(login) in logins" :key="login._id" cols="12" sm="6">
                <LoginCard
                    :show-delete="true"
                    :click="deleteLogin"
                    :browser-family="login.browserFamily"
                    :device="login.device"
                    :ip-address="login.ipAddress"
                    :os="login.os"
                    :_id="login._id"
                ></LoginCard>
              </v-col>
            </v-row>
            <Button
                :data-cy="'logoutFromAllDevices'"
                :color="'primary'"
                :disabled="logoutAllLoader"
                :icon="'mdi-delete'"
                :text="'Signout from all devices'"
                :click="logoutFromAllDevices"
            ></Button>
          </v-card-text>
        </div>
        <v-card-actions v-if="!loginsFetched" :key="'loginFetchAction'">
          <Button
            :data-cy="'getListOfLoginButtonId'"
              :color="'primary'"
              :disabled="getLoginsLoader"
              :icon="'mdi-refresh'"
              :text="'Get recent logins'"
              :click="getLogins">
          </Button>
        </v-card-actions>
        </transition>
        <v-card-actions :key="'deleteAccountButtom'">
          <Button
            id="deleteAccountButtonId"
              :color="'warning'"
              :icon="'mdi-delete'"
              :text="'Delete Account'"
              :click="deleteAccount">
          </Button>
        </v-card-actions>
      </Container>
    </transition>

  </div>
</template>

<script>
import PersonDetails from '@/components/PersonDetails'
import PageTitle from '@/components/PageTitle'
import ShareProfileButton from '@/views/MyProfile/components/ShareProfileButton'
import Container from '@/components/Container/Container'
import ldb from '@/localDatabase'
import Button from '@/components/UI Components/Button'
import LoginCard from '@/views/MyProfile/components/LoginCard'
import { handleGETLogins, handleDELETELogins } from '@/api'
import { environmentService } from '@/mixins/environment'
import { DESIGNATIONS_INDEX, HTTP_STATUS } from '@/mixins/constants'

export default {
  name: 'MyProfile',
  data: () => {
    return {
      // exposed for the template, which cannot see module imports
      DESIGNATIONS_INDEX,
      showTooltip: false,
      getLoginsLoader: false,
      logins: [],
      loginsFetched: false,
      currentLogin: null,

      logoutAllLoader: false
    }
  },
  computed: {
    darkTheme: {
      // getter
      get () {
        return this.$vuetify.theme.dark
      },
      // setter
      set (newValue) {
        this.$vuetify.theme.dark = newValue
        ldb.theme.save(newValue)
      }
    },
    // Like darkTheme, but synchronous: the setting never leaves the browser, so there is
    // no request to await and no failure path to revert
    archiveSearchEnabled: {
      get () {
        return this.$store.getters['archiveSearch/getArchiveSearchEnabled']
      },
      set (newValue) {
        this.$store.commit('archiveSearch/setArchiveSearchEnabled', newValue)
      }
    },
    // Computed on render rather than on a timer, and deliberately coarse so a value a few
    // minutes stale never reads as wrong
    archiveSearchHint () {
      if (!this.archiveSearchEnabled) return 'Turns itself off 24 hours after being enabled'
      const expiry = ldb.archiveSearch.expiry()
      if (!expiry) return 'Turns itself off 24 hours after being enabled'
      const hoursLeft = Math.round((expiry - new Date().getTime()) / (3600 * 1000))
      if (hoursLeft <= 1) return 'Automatically turns off within the hour'
      return `Automatically turns off in about ${hoursLeft} hours`
    }
  },
  methods: {
    async deleteAccount(){
      await this.$store.dispatch('notification/notifyError', 'Account deletion is still under under construction');
    },
    async getLogins () {
      this.getLoginsLoader = true
      const response = await handleGETLogins()
      this.getLoginsLoader = false
      if (response.status !== HTTP_STATUS.OK) return
      this.logins = response.data.logins
      this.currentLogin = response.data.currentLogin
      this.loginsFetched = true
    },
    async deleteLogin (tokenId) {
      const response = await handleDELETELogins({ tokenId })
      if (response.status !== HTTP_STATUS.OK) return
      this.logins = this.logins.filter(login => login._id !== tokenId)
      this.$store.dispatch('notification/notifySuccess', response.data.message);
    },
    shareClicked () {
      const routeData = this.$router.resolve({
        name: 'DetailsPage',
        query: {
          id: this.$store.getters['getID']
        }
      })
      this.$copyText(environmentService.getFrontendBaseURL() + '/' + routeData.href).then((_e) => {
        this.showTooltip = true
        setTimeout(() => {
          this.showTooltip = false
        }, 2000)
      })
    },
    async logoutFromAllDevices(){
      this.logoutAllLoader = true
      await this.$store.dispatch('logoutAll');

      this.logoutAllLoader = false
      await this.$router.push('/')

    }
  },

  components: {
    LoginCard,
    Button,
    Container,
    ShareProfileButton,
    PageTitle,
    PersonDetails
  }
}
</script>

<style scoped>

</style>
