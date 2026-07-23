# Android app (Trusted Web Activity)

The Play Store app is a [Trusted Web Activity](https://developer.chrome.com/docs/android/trusted-web-activity/quick-start/)
wrapper around https://badhan-buet.web.app — it does **not** bundle the frontend.
Deploy the site first; rebuild the app only when the manifest, icons, or version change.

[upload-googleplay.js](upload-googleplay.js) automates the whole flow: it fetches the
signing keystore and the Play service-account key from the private secrets repo, builds
with Bubblewrap, uploads the bundle, then deletes the secrets it fetched.

## One-time setup

Both tools run on the host (Bubblewrap needs a JDK + Android SDK, fastlane is a Ruby gem):

```
npm install -g @bubblewrap/cli
brew install fastlane
```

## Usage

Bump `appVersionCode` / `appVersionName` in `twa-manifest.json` first — Play rejects a
re-upload of an existing version code.

```
node upload-googleplay.js                              # build + upload to internal as a draft
node upload-googleplay.js --track=production --release # build + roll out to 100% of production
node upload-googleplay.js --track=production --rollout=0.1  # staged: 10% of production
node upload-googleplay.js --build-only                 # build the APK/AAB only, no upload
node upload-googleplay.js --check                      # preflight only
```

Bubblewrap prompts for the keystore passwords during the build. Artifacts land here as
`app-release-signed.apk` (sideloading) and `app-release-bundle.aab` (what Play accepts for
updates).

Uploads default to a **draft** release, which you finish in the Play Console — that way a
stray run can't ship to users. `--release` publishes at 100% straight from the CLI, and
`--rollout=<fraction>` does a staged release; neither needs the console.
