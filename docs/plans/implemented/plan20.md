# Plan 20 — an Install button at the foot of the side menu

Short answer to the question that prompted this: **yes**, and the browser API for it is
`beforeinstallprompt`. The work is small, but it is entirely made of edge cases — the button
must know whether it is already inside the installed app, whether the browser will even let it
install, and whether the right destination is the browser's install prompt or the Play Store.
This plan writes those cases down before any of them is coded.

## What is being asked for

One entry at the bottom of the navigation drawer, below the last menu item, with three
behaviours:

| Where the app is open | What the entry does |
| --- | --- |
| A wide screen (desktop browser tab) | Installs the PWA in place — the browser's own install prompt |
| A small screen (phone browser) | Opens the Play Store listing for `com.mmmbadhan` |
| Already running as an installed app (PWA or the Play Store TWA) | **Nothing — the entry is not rendered** |

---

## What the codebase already provides

Established by reading, not assumed:

* The drawer is [AppBar.vue](../../badhan-frontend/src/components/AppShell/AppBar.vue) — one
  `v-navigation-drawer` holding a `v-list` built from the `menusForAll` array, followed by a
  second `v-list` containing the single **Activate Night Mode** button. That trailing list is
  exactly the slot this plan needs; the install entry goes beside the theme toggle.
* The drawer only exists when signed in — `App.vue` renders `<app-bar>` behind
  `v-if="$store.getters['getToken']"`. So this button is for people who already have an
  account. The signed-out audience is already served: `SignInCover.vue:123` has a **Download
  App** button pointing at the Play Store. This plan does not touch it, but it does take its
  URL away into a constant (below).
* The app is already a real PWA: [vue.config.js](../../badhan-frontend/vue.config.js)
  configures `pwa`/`manifestOptions` with a name, theme colour and icons, and
  [registerServiceWorker.ts](../../badhan-frontend/src/registerServiceWorker.ts) registers a
  worker **in every environment except `local`**. Manifest + service worker + HTTPS are the
  three preconditions for `beforeinstallprompt`, and two of them are already met everywhere,
  the third everywhere but local.
* Two screen-size helpers already exist in
  [mixins/index.ts](../../badhan-frontend/src/mixins/index.ts): `$isMobile()` (user-agent
  sniff) and `$isLargeScreen()` (`window.innerWidth > 500`). Neither is reactive — they are
  read once. This plan uses **neither**; see the decision below.
* The Play Store id is `com.mmmbadhan`, hardcoded at
  [SignInCover.vue:123](../../badhan-frontend/src/views/SignInCover.vue#L123) and again in
  [docs/manual/02-getting-the-app.md](../manual/02-getting-the-app.md).
* Cypress drives the drawer through a page object,
  [NavigationDrawer.ts](../../badhan-frontend-test/cypress/support/pages/NavigationDrawer.ts),
  and every drawer entry carries both an `id` and a matching `data-cy`. The new entry follows
  that convention.

---

## Decisions taken

**D1. The event must be captured before Vue mounts, so the listener does not live in a
component.** Chrome fires `beforeinstallprompt` as soon as it decides the page is installable
— routinely before `AppBar` exists, and it fires **once**. A listener registered in
`mounted()` would miss it on most loads, and the button would appear only sometimes. The
listener is registered at module load from `main.ts`, and the captured event is held in a
module singleton that the component reads. This is the same shape as `environmentService`:
a module with state and a small interface, not a mixin.

**D2. Screen size is decided by `$vuetify.breakpoint`, not by `$isMobile()` or
`$isLargeScreen()`.** The user-agent sniff answers "is this a phone-shaped device", which is
not the question — a desktop browser window dragged narrow should still offer the in-place
install, and it is the *width* that decides which affordance fits. Vuetify's breakpoint object
is reactive, so the button re-decides when the window is resized; `window.innerWidth` read in
a method does not. The threshold is **`$vuetify.breakpoint.mdAndUp`** (≥ 960px), which is the
"wide desktop screen" of the request. `$isMobile()` and `$isLargeScreen()` stay where they are
and are not modified — other callers depend on them.

**D3. "Already an app" is a set of checks OR-ed together, not one, and it must hold on desktop
as firmly as on Android.** A PWA installed on Windows/macOS/Linux and launched from its icon
runs in its own window and reports `display-mode: standalone` exactly as Android does, so the
first check below is the load-bearing one on every platform. The rest close the gaps around it.

```
matchMedia('(display-mode: standalone), (display-mode: minimal-ui), '
         + '(display-mode: window-controls-overlay), (display-mode: fullscreen)').matches
|| (navigator as any).standalone === true          // iOS home-screen app; iOS has no display-mode
|| document.referrer.startsWith('android-app://')  // TWA launched from the Play Store app
```

**Why four display modes and not just `standalone`.** The mode reported is whatever the
manifest asked for, and the manifest is not currently explicit about it: neither
[vue.config.js](../../badhan-frontend/vue.config.js) nor `manifestOptions` sets `display`, so
the app is riding on the vue-cli PWA plugin's `standalone` default. Matching only `standalone`
means the button silently comes back inside the installed app the day someone adds
`display: 'minimal-ui'` or turns on a title-bar overlay for the desktop window — a regression
with no visible cause. Matching the whole family costs one string. **Alongside this, set
`display: 'standalone'` explicitly in `manifestOptions`** so the intent is written down rather
than inherited.

**The one case the media query cannot see, and what to do about it.** `display-mode` answers
*how this page was launched*, not *whether the app is installed*. A desktop user who has Badhan
installed but opens the site in an ordinary browser tab reads as `browser`, and no media query
will say otherwise. In practice the button still does not appear there, because Chrome does not
fire `beforeinstallprompt` for a site already installed on that profile — but that is a
side effect of the prompt's absence (row 4 of the table), not a check, and it is the sort of
thing that quietly stops being true.

Since the requirement is to be *sure*, add the explicit check as a second, asynchronous signal:

* `navigator.getInstalledRelatedApps()` — Chromium desktop and Android, secure context only.
  It returns the installed apps that this page claims kinship with, which requires the manifest
  to name itself. Add to `manifestOptions` in [vue.config.js](../../badhan-frontend/vue.config.js):

  ```js
  related_applications: [
    { platform: 'webapp', url: `${frontendBase}/manifest.json` },
  ],
  ```

  and leave `prefer_related_applications` unset — it changes install-prompt behaviour and is
  not wanted here.
* The service calls it once at load, and if the result is non-empty it flips the same
  `installedAppMode` flag the synchronous checks set. Because it is a promise, the button may
  appear for a frame and then withdraw on a slow machine; that is acceptable and is the reason
  the flag lives in the `Vue.observable` object from Phase 1 rather than being read once.
* It is absent in Safari and Firefox — `typeof navigator.getInstalledRelatedApps === 'function'`
  guards the call, and its absence changes nothing, because those browsers never reach row 3 of
  the table anyway (D4).

A deliberate note on the Play Store app: the same mechanism could detect the *TWA* being
installed, via `{ platform: 'play', id: 'com.mmmbadhan' }` in `related_applications` — which
would let the phone-sized button hide itself for people who already have the Android app rather
than sending them to a Play Store page that says "Open". That is a genuinely nicer behaviour
and it is **out of scope for this plan**: it changes what a phone user sees, needs the Digital
Asset Links verification between the site and the app to be intact, and deserves its own test
pass on a real device. It is listed at the bottom as a follow-up.

The synchronous checks are evaluated **once at module load** — a page cannot transition from
"tab" to "installed app" without a fresh launch. The one thing that *can* change mid-session is
a successful install, which D5 handles.

**D4. On a wide screen with no captured prompt event, the button is hidden.** Firefox desktop
and Safari never fire `beforeinstallprompt`; there is nothing to call and no API to open their
"Add to Home Screen"/"Install" flow from script. The honest options were a hidden button or a
button that opens a "here is how to install manually" dialog. Hidden wins: the manual already
documents the manual route
([02-getting-the-app.md](../manual/02-getting-the-app.md), "Adding the website to your home
screen"), and a menu entry whose only outcome is a paragraph of instructions is worse than no
entry. Chrome/Edge — where the overwhelming majority of desktop use sits — fire the event and
get the real button.

*Consequence worth stating: the desktop install button will never appear on `local`, because
local registers no service worker. It is testable on `development` and in Cypress via a
synthetic event (Phase 4).*

**D5. Chrome's prompt can only be used once, and the button disappears afterwards.** After
`prompt()` resolves, the captured event is spent — calling it again throws. The singleton
clears its reference on use, and also listens for `window`'s `appinstalled` event, so the entry
vanishes the moment the install succeeds without needing a reload. If the user dismisses the
prompt, the event is still spent: the entry disappears for that page load and returns on the
next one, when Chrome re-fires `beforeinstallprompt`. Re-showing a button that would throw is
worse than a button that comes back after a reload.

**D6. On a small screen the entry goes to the Play Store unconditionally — no
`beforeinstallprompt` involved.** Android Chrome *does* fire the event, so an in-place PWA
install is technically available there, but the request is explicit and it is the right call:
the Play Store copy is the supported artefact, it is what the manual points people at, and
having phone users on the store build keeps one install path to support instead of two. iOS
gets the same Play Store link, which is wrong for that platform but is exactly what
`SignInCover.vue` already does today; fixing the iOS story is out of scope and noted at the
bottom.

**D7. The Play Store URL becomes one constant.** It is about to have a third copy. Add to
[mixins/constants.ts](../../badhan-frontend/src/mixins/constants.ts):

```ts
// The one Badhan in the Play Store. There is no test listing — test copies are websites only
// (docs/manual/02-getting-the-app.md), so this URL is environment-independent on purpose.
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.mmmbadhan'
```

and point both `SignInCover.vue` and the new entry at it.

---

## The full decision table

Evaluated top to bottom; the first matching row wins.

| # | Condition | Rendered |
| --- | --- | --- |
| 1 | Launched as an app — any of the display modes, TWA, or iOS home screen (D3) | nothing |
| 2 | `getInstalledRelatedApps()` reported this PWA as installed (D3) | nothing |
| 3 | `$vuetify.breakpoint.smAndDown` | **Get the App** → `PLAY_STORE_URL`, `mdi-google-play` |
| 4 | `mdAndUp` **and** a prompt event is held | **Install App** → `prompt()`, `mdi-download` |
| 5 | `mdAndUp` and no prompt event (Safari/Firefox/local) | nothing |

Rows 1 and 2 are the two halves of one question. Row 1 is "this window *is* the app", which is
true of a desktop PWA launched from its icon just as much as of the Android TWA. Row 2 is "the
app exists on this machine, but you happen to be looking at it in a tab" — the case row 1
structurally cannot see. Between them there is no configuration in which an install button is
offered to somebody who already has it installed, which is the point.

Row 5 then absorbs the same case a third time as a fallback: Chrome does not re-fire
`beforeinstallprompt` for a site already installed on that profile. Three independent reasons
for the button to stay hidden is not redundancy worth trimming — each one fails in different
conditions (row 1 fails in a tab, row 2 fails in Safari, row 5 fails if Chrome ever changes its
mind), and the cost of all three is a few lines.

---

## Phase 1 — the install-prompt service

New file `badhan-frontend/src/mixins/installPrompt.ts`, modelled on `environment.ts` (a typed
module singleton exporting one service object, no Vue dependency).

```ts
// The BeforeInstallPromptEvent is Chromium-only and absent from lib.dom.d.ts.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
```

State and behaviour:

* `deferredPrompt: BeforeInstallPromptEvent | null` — module-level, starts `null`.
* `installedAppMode: boolean` — set at load from the synchronous checks in D3, and set again
  (never unset) if `getInstalledRelatedApps()` later resolves non-empty. It only ever moves
  false → true, so the two signals cannot fight.
* A `beforeinstallprompt` listener that calls `preventDefault()` (this is what suppresses
  Chrome's own mini-infobar and hands us the event) and stores it.
* An `appinstalled` listener that clears `deferredPrompt` **and** sets `installedAppMode`.
* Exported interface:
  * `isRunningAsInstalledApp(): boolean`
  * `canPromptInstall(): boolean` — is an event held
  * `promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'>` — calls `prompt()`,
    awaits `userChoice`, clears the reference either way, returns the outcome.
* Log through `myConsole` in the same style as `registerServiceWorker.ts` logs, so the install
  path is visible in the Dev Console page when someone reports "the button never shows".

**Reactivity.** The component cannot poll a plain module variable — Vue 2 will not see the
assignment. Two options; take the second:

1. Put the state in Vuex. Overkill: one boolean, no other consumer, and the store is
   session/domain state.
2. Give the service a `Vue.observable({ deferredPrompt, ... })` backing object. One line, keeps
   the state next to the logic, and the component's computed properties update when the event
   lands mid-render. This is the reason the module imports Vue at all.

Wire it in `main.ts` with a bare `import './mixins/installPrompt'` placed **next to
`import './registerServiceWorker'`** — early, before `new Vue(...)`, for the reason in D1.

## Phase 2 — the drawer entry

In [AppBar.vue](../../badhan-frontend/src/components/AppShell/AppBar.vue), inside the trailing
`<v-list>` that currently holds only the theme toggle, add a `v-list-item` above it, guarded by
the table above. Two mutually exclusive buttons rather than one button with a branching
handler — a `v-btn` with `href` and a `v-btn` with `@click` behave differently enough
(middle-click, right-click → copy link) that collapsing them costs the Play Store one its
link-ness.

```vue
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
```

Note the **same id on both branches**: from the outside it is one menu entry with two
destinations, and a test or a screenshot spec should not have to know which machine it is
running on. Styling copies the theme toggle exactly (`rounded depressed small`) so the foot of
the drawer stays one visual group.

Computed properties on the component:

* `showPlayStoreInstall` — `!isRunningAsInstalledApp && $vuetify.breakpoint.smAndDown`
* `showBrowserInstall` — `!isRunningAsInstalledApp && $vuetify.breakpoint.mdAndUp && canPromptInstall()`
* `playStoreUrl` — the constant from D7

Method `installClicked()` awaits `promptInstall()` and, on `'accepted'`, raises the existing
success notification ("Badhan is being installed"); on `'dismissed'` it says nothing — a user
who just cancelled a dialog does not need a toast about it.

**The comment that has to go in this file.** Not "shows an install button" — the code says
that. The non-obvious parts are (a) why the listener is not here, (b) why a phone does not get
the in-place install even though the browser offers it, and (c) why nothing renders in Safari.
Three or four lines, in the register of the comments already in this file.

## Phase 3 — the manual

Both pages that describe this surface change in the same commit, per the project rule.

* **[05-the-screen-and-the-menu.md](../manual/05-the-screen-and-the-menu.md)** — the paragraph
  after the menu table currently describes the night-mode button as the only thing at the
  bottom of the menu. It gains the install entry: what it says on a computer, what it says on a
  phone, and — the part a reader will actually wonder about — **why it is sometimes not there
  at all** ("if you are already using the installed app, there is nothing to install, so the
  button is not shown"). Written for the no-coding-experience reader, like the rest of the
  file. While here, the table in that file is also missing the **Certificate Enabled Donors**
  row under Super Admin; add it, since this plan is already editing the table's neighbourhood.
* **[02-getting-the-app.md](../manual/02-getting-the-app.md)** — the "Adding the website to
  your home screen" section tells people to hunt through the browser's three-dot menu. Add
  that, once signed in on a computer, the menu has an **Install App** button that does the same
  thing in one tap, and that on a phone the same place has a **Get the App** button to the Play
  Store.

## Phase 4 — tests

All Cypress work runs in the container:
`docker compose run --rm frontend-test npx cypress run --spec <path>`.

New spec `badhan-frontend-test/cypress/e2e/app-shell/install-button.cy.ts` (new folder; the
drawer has no e2e home today). `cy.visit` with `onBeforeLoad` is the lever for every row —
every input the feature reads is a window property that can be stubbed before the app boots.

1. **Wide screen, prompt available → button installs.** Visit at 1280×800; in `onBeforeLoad`,
   register a listener-friendly fake by dispatching a synthetic event after load:
   `const e = new Event('beforeinstallprompt'); e.prompt = cy.stub().resolves();
   e.userChoice = Promise.resolve({outcome: 'accepted'}); win.dispatchEvent(e)`. Because the
   listener is registered at module load and the app's own JS runs after `onBeforeLoad`, the
   dispatch has to happen **after** the bundle evaluates — do it via `cy.window().then(...)`
   post-visit, then assert the entry appears and clicking it calls the stub.
2. **Small screen → Play Store link.** `cy.viewport('iphone-x')`, assert the entry's `href`
   equals `PLAY_STORE_URL` and that it does **not** call any prompt. Do not let Cypress follow
   the link.
3. **Launched as an app → nothing (table row 1).** In `onBeforeLoad`, stub `win.matchMedia` so
   any query containing `display-mode` returns `{ matches: true }` and everything else delegates
   to the real one — Vuetify's breakpoint code calls `matchMedia` too, so a blanket stub breaks
   the app. Assert `[data-cy="installAppNavigationId"]` does not exist **at both viewports**,
   desktop and phone: this is the requirement that matters most, and it has to hold on the
   desktop side, not just the Android one. Then dispatch the synthetic `beforeinstallprompt`
   from test 1 on top of it and assert the entry *still* does not appear — the standalone check
   must win over an available prompt, not merely coexist with it.
4. **Installed but viewed in a tab → nothing (table row 2).** Leave `matchMedia` alone and stub
   `win.navigator.getInstalledRelatedApps` to resolve `[{ platform: 'webapp', id: '...' }]`.
   Dispatch the prompt event as in test 1. Assert the entry does not appear — allowing for the
   promise, so assert on absence *after* the app has settled (`cy.get(...).should('not.exist')`
   retries, which is enough, but the first assertion in this test must not be a synchronous
   snapshot taken before the promise resolves).
5. **Wide screen, no event → nothing.** The default state under Cypress; assert absence. This
   is the row that would silently break if someone later moved the listener into a component.

Add `goToInstall()`/`installEntry()` accessors to
[NavigationDrawer.ts](../../badhan-frontend-test/cypress/support/pages/NavigationDrawer.ts) so
the spec reads like its neighbours.

Also run, in their containers: `docker compose exec frontend npm run build` (the new file is
TypeScript in a mostly-JS component tree — the `BeforeInstallPromptEvent` interface is the part
that will complain), and the existing frontend e2e suite, since `AppBar.vue` is on every
signed-in screen.

## Phase 5 — verify by hand

Cypress stubs the signals; only a real browser proves the signals are what we think they are.
After deploying to `development`, in desktop Chrome, signed in:

1. Confirm the entry appears in a normal tab, and install from it.
2. **Open the installed app from its desktop/Start-menu icon and confirm the entry is gone.**
   This is the check the whole of D3 exists for — if `display-mode` were not reported the way
   this plan assumes on desktop, this is where it shows.
3. Go back to a normal browser tab on the same profile and confirm the entry is gone there too
   (rows 2 and 5 doing their job).
4. Uninstall, reload the tab, and confirm the entry comes back — otherwise the hiding logic is
   sticky in a way nobody wants.

Then open the same URL on an Android phone and confirm the Play Store link, and inside the
installed TWA confirm no entry at all. `local` is expected to show nothing (no service worker)
— that is not a bug, and this manual pass is the reason the plan does not treat "no button
locally" as a failure.

---

## Out of scope, deliberately

* **iOS.** Safari fires no event and iOS has no Play Store. An iPhone on a small screen will
  get a Play Store link it cannot use — the same wrong answer `SignInCover.vue` gives today.
  Doing better means an iOS-specific "tap Share, then Add to Home Screen" sheet, which is a
  separate piece of design work.
* **A promoted install banner.** No auto-showing prompt, no bar across the top. One entry, at
  the bottom of a menu the user opened on purpose.
* **Tracking installs.** No analytics event on `appinstalled`; there is nowhere to send it.
* **Hiding the phone button for people who already have the Android app.** Achievable by adding
  `{ platform: 'play', id: 'com.mmmbadhan' }` to `related_applications` and reading the same
  `getInstalledRelatedApps()` result (D3). Left out because it needs the Digital Asset Links
  association between site and app verified, and a test pass on a real device with the app both
  present and absent.
