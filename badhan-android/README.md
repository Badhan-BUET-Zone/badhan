# Android app (Trusted Web Activity)

The Play Store app is a [Trusted Web Activity](https://developer.chrome.com/docs/android/trusted-web-activity/quick-start/)
wrapper around https://badhan-buet.web.app — it does **not** bundle the frontend.
Deploy the site first; rebuild the app only when the manifest, icons, or version change.

## Android is production-only

There is one Play listing and it wraps **production**. This script never reads the git
branch: it builds the same production shell from `production`, from `development`, from
anywhere. There is no `development` variant of the Android app, and adding one would mean
a second `packageId`, a second signing key, a second store entry and a second review
queue — to wrap a site any browser can already open. Test the development site in a
browser instead; it installs to a home screen as **Badhan (development)**.

The decision is asserted rather than remembered. The preflight checks every production URL
in [twa-manifest.json](twa-manifest.json) — `host`, `iconUrl`, `maskableIconUrl`,
`webManifestUrl`, `fullScopeUrl` — against `ENVIRONMENTS.production.frontendBaseUrl` in
[../environments.js](../environments.js), the same constant the frontend deploy uses. If
production ever moves to a new domain, `--check` fails naming the field, instead of
shipping a store build pointed at a dead host.

[upload-googleplay.js](upload-googleplay.js) automates the whole flow: it fetches the
signing keystore and the Play service-account key from the private secrets repo, builds
with Bubblewrap, uploads the bundle, then deletes the secrets it fetched.

## One-time setup

The whole toolchain — JDK 17, the Android SDK, Bubblewrap, and fastlane — lives in the
`android` container. Nothing to install on the host but Docker:

```
docker compose --profile deploy build android
```

The image bakes `~/.bubblewrap/config.json`, so there is no `bubblewrap doctor` step and
no host JDK/SDK to register. The Play service-account key is fetched per run and deleted
afterwards, so unlike `./deploy.js` there is no login and nothing persisted.

The image pins the Android platform and build-tools it installs (`ANDROID_API`,
`BUILD_TOOLS`, `AGP_VERSION` in [Dockerfile](Dockerfile)).
`--check` compares them against `compileSdkVersion` in `app/build.gradle` and the AGP
classpath in `build.gradle` and fails if they drift — if a bubblewrap regeneration bumps
either, update the Dockerfile and rebuild.

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
