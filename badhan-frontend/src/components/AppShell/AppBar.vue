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
        <!-- One menu entry with two destinations, and so one id across both branches: a test or a
             screenshot should not have to know which machine it is running on. A narrow screen is
             sent to the Play Store even though Android Chrome would happily install the PWA in
             place — the store copy is the supported artefact and keeps one install path to
             support. The event the wide-screen branch needs is captured in mixins/installPrompt.ts
             at module load, not here: the browser fires it once, usually before this component
             exists. Nothing renders in Safari or Firefox, which never fire it and expose no way to
             open their own install flow from script — the manual documents that route by hand. -->
        <v-list-item v-if="showPlayStoreInstall">
          <v-btn rounded depressed small
                 id="installAppNavigationId" data-cy="installAppNavigationId"
                 :href="playStoreUrl" target="_blank" rel="noopener"
                 style="text-decoration: none">
            <v-icon left>mdi-google-play</v-icon>
            Get the App
          </v-btn>
        </v-list-item>
        <v-list-item v-else-if="showBrowserInstall">
          <v-btn rounded depressed small
                 id="installAppNavigationId" data-cy="installAppNavigationId"
                 @click="installClicked">
            <v-icon left>mdi-download</v-icon>
            Install App
          </v-btn>
        </v-list-item>
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
import { PLAY_STORE_URL } from '@/mixins/constants'
import { installPromptService } from '@/mixins/installPrompt'

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
          // No badge here either, and for a sharper reason than Feedback's: the floating button
          // IS the badge, it is on every signed-in screen already, and two counters that can
          // disagree is worse than one that cannot.
          icon: 'mdi-forum',
          text: 'Messages',
          to: '/chat',
          id: 'chatNavigationId',
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
          icon: 'mdi-account-group',
          text: 'Members',
          to: '/members',
          id: 'membersNavigationId',
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
              // The four entries that used to be tabs of a Statistics page. They were only ever
              // reachable by a super admin, from this menu, and shared nothing but a title bar —
              // so the tab strip was this menu drawn a second time.
              icon: 'mdi-chart-bar',
              text: 'Donation Report',
              to: '/donationReport',
              id: 'donationReportNavigationId',
              designation: 3
            },
            {
              icon: 'mdi-account-multiple',
              text: 'All Donors',
              to: '/allDonors',
              id: 'allDonorsNavigationId',
              designation: 3
            },
            {
              icon: 'mdi-archive',
              text: 'Archived Donors',
              to: '/archivedDonors',
              id: 'archivedDonorsNavigationId',
              designation: 3
            },
            {
              icon: 'mdi-chart-timeline-variant',
              text: 'App Activity',
              to: '/appActivity',
              id: 'appActivityNavigationId',
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
              // Under Super Admin rather than beside the certificate itself: enabling a certificate
              // is an ordinary hall-level edit on a donor's profile, but seeing every donor it was
              // done for, across all halls, is not.
              to: '/certificateEnabledDonors',
              icon: 'mdi-certificate',
              text: 'Certificate Enabled Donors',
              id: 'certificateEnabledDonorsNavigationId',
              designation: 3
            },
            {
              // Sits with the other developer-facing entries rather than beside My Profile: the
              // file it hands out is a live session token, and that is a super admin's decision
              // to make deliberately, not something to stumble into from a profile page.
              icon: 'mdi-robot',
              text: 'Use Badhan with AI',
              to: '/aiIntegration',
              id: 'aiIntegrationNavigationId',
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
    },
    playStoreUrl () {
      return PLAY_STORE_URL
    },
    // $vuetify.breakpoint, not $isMobile() or $isLargeScreen(): the question is how wide the
    // window is, not what shape of device it is, and only the breakpoint object is reactive — a
    // desktop window dragged narrow should re-decide.
    showPlayStoreInstall () {
      return !installPromptService.isRunningAsInstalledApp() && this.$vuetify.breakpoint.smAndDown
    },
    showBrowserInstall () {
      return !installPromptService.isRunningAsInstalledApp() &&
        this.$vuetify.breakpoint.mdAndUp &&
        installPromptService.canPromptInstall()
    }
  },
  methods: {
    toggleTheme () {
      this.theme = !this.theme
      this.$vuetify.theme.dark = this.theme
      ldb.theme.save(this.theme)
    },
    async installClicked () {
      const outcome = await installPromptService.promptInstall()
      // Nothing is said on 'dismissed': someone who just cancelled a dialog does not need a toast
      // telling them so.
      if (outcome === 'accepted') {
        await this.$store.dispatch('notification/notifySuccess', 'Badhan is being installed')
      }
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
    }
  },
  watch: {
    group () {
      this.drawer = false
    }
  }
}
</script>

