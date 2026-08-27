// Chrome hands a page its install prompt exactly once, as an event fired the moment the browser
// decides the site is installable — routinely before any Vue component has mounted. So the
// listener is registered here, at module load (main.ts imports this file for the side effect
// alone), and the captured event waits in this module until the drawer asks for it. A listener
// registered in a component's mounted() would miss the event on most loads, and the install
// button would appear only sometimes.
import Vue from 'vue'
import { myConsole } from '@/mixins/myConsole'
import { getIsTWA } from '@/plugins/android_support'

// BeforeInstallPromptEvent is Chromium-only and is absent from lib.dom.d.ts, so it is spelled
// out here rather than imported.
interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface RelatedApplication {
    platform?: string
    id?: string
    url?: string
}

type NavigatorWithRelatedApps = Navigator & {
    getInstalledRelatedApps?: () => Promise<RelatedApplication[]>
    // iOS home-screen apps, which have no display-mode of their own.
    standalone?: boolean
}

const InstallPromptConsoleLog = (...args: string[]): void => {
    myConsole.log('INSTALL PROMPT:', ...args)
}

// Every display mode an installed launch can report, not just `standalone`. The mode reported is
// whatever the manifest asked for, so matching only the one the manifest currently names
// (vue.config.js sets `standalone`) would silently bring the install button back inside the
// installed app the day someone switches to minimal-ui or turns on a title-bar overlay — a
// regression with no visible cause. The whole family costs one string.
const INSTALLED_DISPLAY_MODES = '(display-mode: standalone), (display-mode: minimal-ui),'
    + ' (display-mode: window-controls-overlay), (display-mode: fullscreen)'

// "Is this window the installed app?" — answered once, because a page cannot turn from a browser
// tab into an installed app without a fresh launch. The display-mode query is the load-bearing
// check on every platform, desktop included: a PWA opened from its Windows/macOS/Linux icon runs
// in its own window and reports standalone exactly as Android does.
const isLaunchedAsInstalledApp = (): boolean => {
    return window.matchMedia(INSTALLED_DISPLAY_MODES).matches
        || (window.navigator as NavigatorWithRelatedApps).standalone === true
        || getIsTWA()
}

// Vue 2 cannot see an assignment to a plain module variable, and the button has to re-decide when
// the event lands mid-render or an install completes. One observable object here beats a Vuex
// module for two booleans with a single consumer.
const state = Vue.observable({
    deferredPrompt: null as BeforeInstallPromptEvent | null,
    installedAppMode: isLaunchedAsInstalledApp()
})

// display-mode answers *how this page was launched*, never *whether the app is installed*: a
// desktop user who has Badhan installed but opens the site in an ordinary tab reads as `browser`,
// and no media query will say otherwise. This is the second, asynchronous signal for that case.
// It needs the manifest to name itself in related_applications (vue.config.js). Absent in Safari
// and Firefox, where it changes nothing — those browsers never offer an install button anyway.
const askWhetherAlreadyInstalled = (): void => {
    const navigatorWithRelatedApps = window.navigator as NavigatorWithRelatedApps
    if (typeof navigatorWithRelatedApps.getInstalledRelatedApps !== 'function') return

    navigatorWithRelatedApps.getInstalledRelatedApps().then((relatedApps: RelatedApplication[]): void => {
        if (relatedApps.length === 0) return
        // Only ever false → true, so this and the synchronous checks cannot fight. The button may
        // therefore appear for a frame on a slow machine and then withdraw; that is acceptable.
        state.installedAppMode = true
        InstallPromptConsoleLog(`Already installed as a related app (${relatedApps.length}); install entry hidden`)
    }).catch((error: Error): void => {
        InstallPromptConsoleLog(`getInstalledRelatedApps failed: ${error.message}`)
    })
}
askWhetherAlreadyInstalled()

window.addEventListener('beforeinstallprompt', (event: Event): void => {
    // preventDefault is what suppresses Chrome's own mini-infobar and leaves the event ours to
    // fire from the menu entry instead.
    event.preventDefault()
    state.deferredPrompt = event as BeforeInstallPromptEvent
    InstallPromptConsoleLog('Install prompt captured; the menu entry can now install in place')
})

window.addEventListener('appinstalled', (): void => {
    // The one thing that can change mid-session. Clearing the event and raising the flag makes the
    // menu entry vanish the moment the install succeeds, without a reload.
    state.deferredPrompt = null
    state.installedAppMode = true
    InstallPromptConsoleLog('App installed')
})

interface InstallPromptServiceInterface {
    isRunningAsInstalledApp: () => boolean
    canPromptInstall: () => boolean
    promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>
}

export const installPromptService: InstallPromptServiceInterface = {
    isRunningAsInstalledApp: (): boolean => {
        return state.installedAppMode
    },
    canPromptInstall: (): boolean => {
        return state.deferredPrompt !== null
    },
    promptInstall: async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
        const deferredPrompt = state.deferredPrompt
        if (deferredPrompt === null) return 'unavailable'
        // Spent either way — calling prompt() twice on the same event throws — so the reference
        // goes before it is used, which also stops a double click firing two prompts. Chrome
        // re-fires beforeinstallprompt on the next page load, so a dismissed prompt is offered
        // again then; a button that would throw is worse than one that comes back after a reload.
        state.deferredPrompt = null
        await deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        InstallPromptConsoleLog(`Install prompt ${outcome}`)
        return outcome
    }
}
