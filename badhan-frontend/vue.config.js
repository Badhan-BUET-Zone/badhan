const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')
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
    plugins: [
      // pdf.js's glyph outlines for the PDF standard-14 fonts (Helvetica and friends), which it
      // fetches at render time rather than bundling. The certificate's "Click to Verify" caption is
      // Helvetica, and a standard-14 font is by specification NOT embedded in the file — every
      // conforming PDF reader is required to already have it. pdf.js is the exception: it carries
      // the outlines as separate files and has to be told where they are, or the caption silently
      // falls back to a substitute face.
      //
      // The whole directory is copied rather than the one file that is actually used. Nothing here
      // reaches a visitor who does not need it — the fetch happens only when a document names the
      // font — and picking files by hand would break quietly the first time the caption changed.
      new CopyWebpackPlugin({
        patterns: [{
          from: path.dirname(require.resolve('pdfjs-dist/package.json')) + '/standard_fonts',
          to: 'standard_fonts',
        }],
      }),
    ],
    module: {
      rules: [{
        test: /\.md$/,
        loader: 'raw-loader' // npm install -D raw-loader
      }]
    }
  }
})
