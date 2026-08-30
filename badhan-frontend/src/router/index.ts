import Vue from 'vue'
import VueRouter, {RouteConfig, Route, NavigationGuardNext} from 'vue-router'
import Home from '@/views/Home.vue'

import SignInCover from '@/views/SignInCover.vue'
import Details from '@/views/Home/Details.vue'
import { store } from '@/store/store'

Vue.use(VueRouter)

interface RouteMeta{
  requiresAuth: boolean,
  title: string,
  designation: number,
  reRouteIfAuthorized: boolean
}

type CustomRouteConfig = RouteConfig & {
  meta: RouteMeta
}

interface CustomRoute extends Route{
  meta: RouteMeta
}

const routes: CustomRouteConfig[] = [
  {
    name: 'Feedback',
    path: '/feedback',
    component: () => import('../views/Feedback.vue'),
    meta: {
      requiresAuth: true,
      title: 'Feedback',
      designation: 1,
      reRouteIfAuthorized: false
    },
    children: [
      {
        // The shared Details view, exactly as ActiveDonors uses it: "See profile" opens the
        // donor's full profile over the list so a volunteer can do the actual work without
        // losing their place in the queue.
        name: 'FeedbackDetails',
        path: 'details',
        component: Details,
        meta: {
          title: 'Donor Details',
          requiresAuth: true,
          designation: 1,
          reRouteIfAuthorized: false
        }
      }
    ]
  },
  {
    name: 'ActiveDonors',
    path: '/activeDonors',
    component: () => import('../views/ActiveDonors.vue'),
    meta: {
      requiresAuth: true,
      title: 'Bookmarked Donors',
      designation: 1,
      reRouteIfAuthorized: false
    },
    children: [
      {
        name: 'ActiveDonorDetails',
        path: 'details',
        component: Details,
        meta: {
          title: 'Donor Details',
          requiresAuth: true,
          designation: 1,
          reRouteIfAuthorized: false
        }
      }
    ]
  },
  {
    name: 'MembersPage',
    path: '/members',
    component: () => import('../views/Members.vue'),
    meta: {
      requiresAuth: true,
      title: 'Members of Badhan BUET',
      designation: 1,
      reRouteIfAuthorized: false
    }
  },
  {
    name: 'PublicDonor',
    path: '/donor',
    component: () => import('../views/PublicDonor.vue'),
    meta: {
      // Both signed-out and signed-in visitors go through: requiresAuth false lets an
      // anonymous donor in, and reRouteIfAuthorized false stops a signed-in volunteer
      // being bounced to /home — which is what makes the page testable without signing
      // out. The same pair PublicContacts and Certificate use.
      requiresAuth: false,
      title: 'Badhan Donor',
      designation: 0,
      reRouteIfAuthorized: false
    }
  },
  {
    name: 'PublicRegistration',
    path: '/register',
    component: () => import('../views/PublicRegistration.vue'),
    meta: {
      // The token travels as ?t=<jwt>. It is a capability rather than a secret about a
      // person — it names a hall and an expiry and nothing else — which is why it is safe
      // in a URL, in a QR code and in a browser history.
      requiresAuth: false,
      title: 'Register with Badhan',
      designation: 0,
      reRouteIfAuthorized: false
    }
  },
  {
    name: 'PublicContacts',
    path: '/contacts',
    component: () => import('../views/PublicContacts.vue'),
    meta: {
      requiresAuth: false,
      title: 'Contact Badhan BUET Zone',
      designation: 0,
      reRouteIfAuthorized: false
    }
  },
  {
    name: 'Home',
    path: '/home',
    component: Home,
    meta: {
      requiresAuth: true,
      title: 'Home',
      designation: 1,
      reRouteIfAuthorized: false
    },
    children: [
      {
        name: 'DetailsPage',
        path: 'details',
        component: Details,
        meta: {
          title: 'Donor Details',
          requiresAuth: true,
          designation: 1,
          reRouteIfAuthorized: false
        }
      }
    ]
  },
  {
    name: 'MyProfile',
    path: '/myProfile',
    component: () => import('../views/MyProfile.vue'),
    meta: {
      requiresAuth: true,
      title: 'My Profile',
      designation: 1,
      reRouteIfAuthorized: false
    }
  },
  {
    name: 'SignIn',
    path: '/',
    component: SignInCover,
    meta: {
      requiresAuth: false,
      title: 'Sign In Page',
      designation: 0,
      reRouteIfAuthorized: true
    }
  },
  // The four pages that used to be tabs of a Statistics page. Each is now a top-level route with
  // its own entry under Super Admin in the menu: a tab strip that is only ever reachable by super
  // admins, whose four tabs share nothing but a title bar, is a menu that has been drawn twice.
  {
    name: 'DonationsReport',
    path: '/donationReport',
    component: () => import('../views/Statistics/DonationReport.vue'),
    meta: {
      requiresAuth: true,
      title: 'Donation Report',
      designation: 3,
      reRouteIfAuthorized: false
    }
  },
  {
    name: 'DonorsAll',
    path: '/allDonors',
    component: () => import('../views/Statistics/DonorsAll.vue'),
    meta: {
      requiresAuth: true,
      title: 'All Donors',
      designation: 3,
      reRouteIfAuthorized: false,
      archiveFlag: false
    }
  },
  {
    // same component as the route above: the two tables differ by one boolean, so
    // duplicating headers, fetch and row template would only guarantee drift
    name: 'ArchivedDonorsAll',
    path: '/archivedDonors',
    component: () => import('../views/Statistics/DonorsAll.vue'),
    meta: {
      requiresAuth: true,
      title: 'Archived Donors',
      designation: 3,
      reRouteIfAuthorized: false,
      archiveFlag: true
    }
  },
  {
    name: 'LogsByDate',
    path: '/appActivity',
    component: () => import('../views/Statistics/LogsByDate.vue'),
    meta: {
      requiresAuth: true,
      title: 'App Activity',
      designation: 3,
      reRouteIfAuthorized: false
    }
  },
  // Old bookmarks only. /statistics was a real page with four tabbed children until they were
  // split above, and a super admin who bookmarked one should land on it rather than on a 404.
  // The meta here is never read — a redirect is resolved while matching, so the guard sees the
  // destination's meta — but the route type asks for it, so it mirrors the destination's.
  {
    name: 'StatisticsLegacy',
    path: '/statistics',
    redirect: '/donationReport',
    meta: {
      requiresAuth: true,
      title: 'Donation Report',
      designation: 3,
      reRouteIfAuthorized: false
    },
    children: [
      { path: 'report', redirect: '/donationReport' },
      { path: 'donorsAll', redirect: '/allDonors' },
      { path: 'archivedDonorsAll', redirect: '/archivedDonors' },
      { path: 'logsByDate', redirect: '/appActivity' }
    ]
  },
  {
    // Reached by scanning a QR code on printed paper, so the visitor is almost never signed in and
    // has no reason to have an account. The donor id travels as a query parameter — `?id=...` — and
    // that shape is frozen: it is printed inside every certificate's QR code and cannot be changed
    // once a single certificate has been handed to a donor.
    name: 'Certificate',
    path: '/certificate',
    component: () => import('../views/Certificate.vue'),
    meta: {
      requiresAuth: false,
      title: 'Certificate',
      designation: 0,
      reRouteIfAuthorized: false
    }
  },
  {
    name: 'CreditsPage',
    path: '/credits',
    component: () => import('../views/Credits.vue'),
    meta: {
      requiresAuth: false,
      title: 'Developers of Badhan',
      designation: 0,
      reRouteIfAuthorized: false
    }
  },
  {
    name: 'AboutPage',
    path: '/about',
    component: () => import('../views/About.vue'),
    meta: {
      requiresAuth: false,
      title: 'About Badhan',
      designation: 0,
      reRouteIfAuthorized: false
    }
  },
  {
    name: 'CsvDonorCreation',
    path: '/csvDonorCreation',
    component: () => import('../views/CsvDonorCreation.vue'),
    meta: {
      requiresAuth: true,
      title: 'Upload CSV of Donors',
      designation: 1,
      reRouteIfAuthorized: false
    }
  },
  {
    name: 'SingleDonorCreation',
    path: '/singleDonorCreation',
    component: () => import('../views/SingleDonorCreation.vue'),
    meta: {
      requiresAuth: true,
      title: 'Create Donor',
      designation: 1,
      reRouteIfAuthorized: false
    },
    children: [
      {
        name: 'DuplicateDetails',
        path: 'duplicateDetails',
        component: () => import('../views/SingleDonorCreation/DuplicateDetails.vue'),
        meta: {
          title: 'Duplicate Details',
          requiresAuth: true,
          designation: 1,
          reRouteIfAuthorized: false
        }
      }
    ]
  },
  {
    name: 'PasswordReset',
    path: '/passwordReset',
    component: () => import('../views/PasswordReset.vue'),
    meta: {
      requiresAuth: false,
      title: 'Set Your Password',
      designation: 0,
      reRouteIfAuthorized: true
    }
  },
  {
    name: 'RedirectionPage',
    path: '/redirection',
    component: () => import('../views/Redirection.vue'),
    meta: {
      requiresAuth: false,
      title: 'Redirection',
      designation: 0,
      reRouteIfAuthorized: false
    }
  },
  {
    name: 'DevConsole',
    path: '/devconsole',
    component: () => import('../views/DevConsole.vue'),
    meta: {
      requiresAuth: true,
      title: 'Developer Console',
      designation: 3,
      reRouteIfAuthorized: false
    }
  },
  {
    name: 'BackupRestore',
    path: '/backupRestore',
    component: () => import('../views/BackupRestore.vue'),
    meta: {
      requiresAuth: false,
      title: 'Backup and Restore',
      designation: 0,
      reRouteIfAuthorized: false
    }
  },
  {
    name: 'SchemaInconsistencies',
    path: '/schema-inconsistencies',
    component: () => import('../views/SchemaInconsistencies.vue'),
    meta: {
      requiresAuth: false,
      title: 'Schema Inconsistencies',
      designation: 3,
      reRouteIfAuthorized: false
    }
  },
  {
    // No `children`, unlike NewDonors below: a row opens the donor's profile in a separate window
    // rather than a nested route, so the list survives the visit — which is what a sweep through it
    // wants. Same reason Statistics/DonorsAll has no details child.
    name: 'CertificateEnabledDonors',
    path: '/certificateEnabledDonors',
    component: () => import('../views/CertificateEnabledDonors.vue'),
    meta: {
      requiresAuth: true,
      title: 'Certificate Enabled Donors',
      designation: 3,
      reRouteIfAuthorized: false
    }
  },
  {
    name: 'NewDonors',
    path: '/newDonors',
    component: () => import('../views/NewDonors.vue'),
    meta: {
      requiresAuth: true,
      title: 'Newly Created Donors',
      designation: 3,
      reRouteIfAuthorized: false
    },
    children: [
      {
        name: 'NewDonorDetails',
        path: 'details',
        component: Details,
        meta: {
          title: 'Donor Details',
          requiresAuth: true,
          designation: 2,
          reRouteIfAuthorized: false
        }
      }
    ]
  },
  {
    name: 'NotFound',
    path: '/*',
    component: () => import('../views/NotFound.vue'),
    meta: {
      requiresAuth: false,
      title: '404 Not Found',
      designation: 0,
      reRouteIfAuthorized: false
    }
  }

]

const router = new VueRouter({
  routes
})

router.beforeEach(async (to: Route, from: Route, next: NavigationGuardNext<Vue>) => {
  const customRouteTo = to as CustomRoute
  if (!customRouteTo.meta.requiresAuth && customRouteTo.name !== 'SignIn') {
    next()
  }

  if (!store.getters.getToken && customRouteTo.meta.requiresAuth) {
    store.commit('setAutoRedirectionPath', to.fullPath)
    next('/')
  } else if (store.getters.getToken &&
      (customRouteTo.meta.reRouteIfAuthorized || customRouteTo.meta.designation > store.getters.getDesignation)) {
    next('/home')
  } else {
    next()
  }
})

export default router
