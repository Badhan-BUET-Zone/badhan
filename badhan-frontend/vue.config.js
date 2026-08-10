const { defineConfig } = require('@vue/cli-service')

// This file is plain CommonJS evaluated at build time, after Vue CLI has loaded the
// .env file for the mode, so it can read the environment the build is for.
//
// The branch is `isProduction`, not a three-way switch. A `local` build therefore also
// emits `Badhan (development)`, which nobody can ever see: local never registers a
// service worker (src/registerServiceWorker.ts), so its manifest is never the identity
// of anything installed. A third label would be a string with no viewer.
const isProduction = process.env.VUE_APP_ENVIRONMENT === 'production'

// Spelled in full — no sanctioned abbreviation, not even for a display string. Android
// truncates the launcher caption to roughly 12 characters, so an installed test copy
// reads something like "Badhan (deve…" under its icon; that is still unmistakably not
// production, and the full string shows in the install prompt and the app switcher. Do
// not "fix" it by shortening short_name alone: that reintroduces `dev` as a spelling.
const appName = isProduction ? 'Badhan' : 'Badhan (development)'

module.exports = defineConfig({
  pwa: {
    name: appName,
    // The TWA's red (badhan-android/twa-manifest.json), adopted here rather than the
    // reverse so the browser chrome, the PWA splash and the Android splash finally
    // agree — and so the alignment ships with an ordinary frontend deploy instead of a
    // bubblewrap rebuild and a Play review. This re-colours the installed production
    // PWA, which is the one deliberate user-visible change in this file.
    themeColor: "#B71C1C",
    msTileColor: '#000000',
    manifestOptions: {
      name: appName,
      short_name: appName,
    },
  },
  devServer: {
    host: '0.0.0.0',
    allowedHosts: 'all',
    client: {
      progress: false,
    },
  },
  transpileDependencies: [
    'vuetify'
  ],
  configureWebpack: {
    watchOptions: {
      poll: 1000,
      ignored: /node_modules/,
    },
    module: {
      rules: [{
        test: /\.md$/,
        loader: 'raw-loader' // npm install -D raw-loader
      }]
    }
  }
})
