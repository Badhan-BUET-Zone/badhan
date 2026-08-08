<template>
  <fragment>
    <v-app-bar color="primary" dark app clipped-left collapse-on-scroll class="rounded-b-xl">
      <v-app-bar-nav-icon id="hamburgerButtonId" data-cy="hamburgerButtonId" @click.stop="drawer = !drawer"></v-app-bar-nav-icon>
      <img src="../../assets/images/badhanlogo.png" alt="Badhan" style="height: 40px; width: 40px" class="mr-4">
      <v-toolbar-title>Badhan BUET Zone</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-menu right content-class="rounded-xl overflow-hidden">
        <template v-slot:activator="{ on, attrs }">
          <v-btn icon v-bind="attrs" v-on="on" id="topBarVerticalDotsId" data-cy="topBarVerticalDotsId">
            <v-icon>mdi-dots-vertical</v-icon>
          </v-btn>
        </template>

        <v-list content-class="rounded-xl">
          <v-list-item content-class="rounded-xl" @click="signOutModalPrompted" id="signOutButtonId" data-cy="signOutButtonId">
            <v-list-item-icon>
              <v-icon>
                mdi-logout
              </v-icon>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title>Sign Out</v-list-item-title>
            </v-list-item-content>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-app-bar>

    <v-navigation-drawer v-model="drawer" left app clipped class="rounded-r-xl">
      <v-list-item>
        <v-list-item-content>
          <v-list-item-title class="title">
            {{ $store.getters['getName'] }}
          </v-list-item-title>
          <v-list-item-subtitle>
            <v-chip color="secondary" class="ma-1">
              {{ $store.getters['getDesignation']|getDesignationString }}
            </v-chip>
          </v-list-item-subtitle>
        </v-list-item-content>
      </v-list-item>

      <v-divider></v-divider>
      <v-list nav dense rounded>
        <fragment v-for="(menu) in menusForAll" :key="menu.icon">
          <fragment v-if="!menu.subLinks && $store.getters['getDesignation'] >= menu.designation">
            <v-list-item-group active-class="primary--text text--accent-4">
              <v-list-item link :to="menu.to" :id="menu.id" :data-cy="menu.id" style="text-decoration: none">
                <v-list-item-icon>
                  <v-icon>{{ menu.icon }}</v-icon>
                </v-list-item-icon>
                <v-list-item-content>
                  <v-list-item-title>{{ menu.text }}</v-list-item-title>
                </v-list-item-content>
              </v-list-item>
            </v-list-item-group>
          </fragment>
          <fragment v-else-if="$store.getters['getDesignation'] >= menu.designation">
            <v-list-group prepend-icon="mdi-star" no-action :id="menu.id" :data-cy="menu.id">
              <template v-slot:activator>
                <v-list-item-title>{{ menu.text }}</v-list-item-title>
              </template>
              <fragment v-for="(subLink) in menu.subLinks" :key="subLink.to">
                <span v-if="$store.getters['getDesignation'] >= subLink.designation">
                  <v-list-item link :to="subLink.to" style="text-decoration: none" :id="subLink.id" :data-cy="subLink.id">
                    <v-list-item-icon><v-icon>{{ subLink.icon }}</v-icon></v-list-item-icon>
                    <v-list-item-content><v-list-item-title>{{ subLink.text }}</v-list-item-title></v-list-item-content>
                  </v-list-item>
                </span>
              </fragment>
            </v-list-group>
          </fragment>
        </fragment>
      </v-list>
      <v-list>
        <v-list-item>
          <v-btn rounded depressed small @click="toggleTheme">
            <v-icon left v-if="!darkTheme">
              mdi-brightness-3
            </v-icon>
            <v-icon left v-else>
              mdi-brightness-5
            </v-icon>
            Activate {{ darkTheme ? 'Day' : 'Night' }} Mode
          </v-btn>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>
  </fragment>
</template>

<script>
import { isGuestEnabled } from '@/api'
import ldb from '@/localDatabase'
import { environmentService } from '@/mixins/environment'
import { HTTP_STATUS } from '@/mixins/constants'

export default {

  data: function () {
    return {
      theme: this.$vuetify.theme.dark,
      drawer: !this.$isMobile(),
      signOutModalFlag: false,
      signOutAllModalFlag: false,
      menusForAll: [
        {
          icon: 'mdi-home',
          text: 'Home',
          to: '/home',
          id: 'homeNavigationId',
          designation: 1
        },
        {
          icon: 'mdi-bookmark',
          text: 'Bookmarked Donors',
          to: '/activeDonors',
          id: 'activeDonorNavigationId',
          designation: 1
        },
        {
          // No badge and no count. Nothing here tells a volunteer that work is waiting — the app
          // bar makes no request on mount, and there is no count endpoint for it to call. Opening
          // the page has to be a habit, which is what the manual says.
          icon: 'mdi-message-alert',
          text: 'Feedback',
          to: '/feedback',
          id: 'feedbackNavigationId',
          designation: 1
        },
        {
          icon: 'mdi-plus',
          text: 'Donor Creation',
          to: '/singleDonorCreation',
          id: 'donorCreationNavigationId',
          designation: 1,
          subLinks: [{
            icon: 'mdi-shape-square-plus',
            text: 'Single Donor Creation',
            to: '/singleDonorCreation',
            id: 'singleDonorCreationId',
            designation: 1
          },
          {
            icon: 'mdi-file-delimited',
            text: 'Upload CSV of Donors',
            to: '/csvDonorCreation',
            id: 'csvDonorCreationId',
            designation: 1
          },
          {
            icon: 'mdi-account-search',
            text: 'Newly Created Donors',
            to: '/newDonors',
            id: 'newDonorsNavigationId',
            designation: 2
          }
          ]
        },
        {
          // Directly beneath Donor Creation: generating a code is a thing a volunteer does at a
          // desk or an event, and it is a sibling of creating a donor — which is what it leads to.
          //
          // There is deliberately no "Print Poster" entry. That sheet is a collapsed panel at the
          // top of the Feedback page, because it is downloaded once and then not again for months.
          icon: 'mdi-account-plus-outline',
          text: 'Donor Registration QR',
          to: '/registrationQr',
          id: 'registrationQrNavigationId',
          designation: 1
        },
        {
          icon: 'mdi-account-group',
          text: 'Members',
          to: '/members',
          id: 'membersNavigationId',
          designation: 1
        },
        {
          icon: 'mdi-earth',
          text: 'Public Contacts',
          to: '/contacts',
          id: 'publicContactsNavigationId',
          designation: 1
        },
        {
          icon: 'mdi-account',
          text: 'My Profile',
          to: '/myProfile',
          id: 'myProfileNavigationId',
          designation: 1
        },
        {
          icon: 'mdi-hand-heart',
          text: 'Credits',
          to: '/credits',
          id: 'creditsNavigationId',
          designation: 1
        },
        {
          icon: 'mdi-information',
          text: 'About',
          to: '/about',
          id: 'aboutNavigationId',
          designation: 1
        },
        {
          icon: 'mdi-star',
          text: 'Super Admin',
          id: 'superAdminId',
          designation: 3,
          subLinks: [
            {
              icon: 'mdi-chart-bar',
              text: 'Statistics',
              to: '/statistics/report',
              id: 'statisticsNavigationId',
              designation: 3
            },
            {
              to: '/backupRestore',
              icon: 'mdi-database',
              text: 'Backup & Restore',
              id: 'backupRestoreNavigationId',
              designation: 3
            },
            {
              to: '/schema-inconsistencies',
              icon: 'mdi-file-alert',
              text: 'Schema Inconsistencies',
              id: 'schemaInconsistenciesNavigationId',
              designation: 3
            },
            {
              icon: 'mdi-developer-board',
              text: 'Dev Console',
              to: '/devconsole',
              id: 'devConsoleNavigationId',
              designation: 3
            }]
        }
      ]
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
    isGuestEnabled () {
      return isGuestEnabled()
    }
  },
  methods: {
    toggleTheme () {
      this.theme = !this.theme
      this.$vuetify.theme.dark = this.theme
      ldb.theme.save(this.theme)
    },
    async myProfileclicked () {
      await this.$router.push({
        path: '/home/details',
        query: { id: this.$store.getters['getID'] }
      })
    },
    async signOutModalPrompted () {
      this.$store.commit('confirmationBox/setConfirmationMessage', {
        confirmationMessage: 'Sign out?',
        confirmationAction: this.signOutModalConfirmed
      })
    },
    async signOutModalConfirmed () {
      await this.$store.dispatch('logout')
      await this.$router.push('/')
    },
    async signOutAllModalPrompted () {
      this.signOutAllModalFlag = true
    },
    async signOutAllModalCanceled () {
      this.signOutAllModalFlag = false
    },
    async goToWebClicked () {
      const redirectionTokenResponse = await this.$store.dispatch('requestRedirectionToken')
      if (redirectionTokenResponse.status !== HTTP_STATUS.CREATED) return
      const routeData = this.$router.resolve({
        name: 'RedirectionPage',
        query: {
          token: redirectionTokenResponse.data.token,
          payload: this.$route.fullPath
        }
      })
      window.open(environmentService.getFrontendBaseURL() + routeData.href, '_blank')
    }
  },
  watch: {
    group () {
      this.drawer = false
    }
  }
}
</script>

