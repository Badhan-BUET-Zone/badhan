import {myConsole} from "@/mixins/myConsole";

// The three environment names, spelled the same way everywhere in the ecosystem.
// Duplicated from environments.js at the repo root on purpose: no build step ships
// that host-side module into this app.
const ENVIRONMENT_NAMES = ['production', 'development', 'local'] as const
type EnvironmentName = typeof ENVIRONMENT_NAMES[number]

interface EnvironmentInterface {
    readonly VUE_APP_BADHAN_API_BASE_URL: string,
    readonly VUE_APP_FRONTEND_BASE: string,
    readonly NODE_ENV: string,
    readonly VUE_APP_ENVIRONMENT: string,
}

// These VUE_APP_* vars are required at runtime; the check below still warns if any is
// missing. process.env values are typed string|undefined, so the assertion is purely
// type-level (erased at build) — it satisfies strict mode without changing runtime behaviour.
export const environmentObject: EnvironmentInterface = {
    VUE_APP_BADHAN_API_BASE_URL: process.env.VUE_APP_BADHAN_API_BASE_URL,
    VUE_APP_FRONTEND_BASE: process.env.VUE_APP_FRONTEND_BASE,
    NODE_ENV: process.env.NODE_ENV,
    VUE_APP_ENVIRONMENT: process.env.VUE_APP_ENVIRONMENT,
} as EnvironmentInterface

Object.entries(environmentObject).forEach(([key, value]:[string,string], _index:number):void => {
    if (value === undefined) {
        myConsole.log(key, 'is not defined in config. App will not behave correctly')
    }
});

// VUE_APP_ENVIRONMENT gets a stronger check than "is it defined": a misspelling makes
// every environment question below answer false, so the app would look healthy while
// behaving as though it were nowhere. A frontend cannot exit the way the backend does,
// but it can refuse to be quiet about it.
if (!ENVIRONMENT_NAMES.includes(environmentObject.VUE_APP_ENVIRONMENT as EnvironmentName)) {
    myConsole.log(
        `🛑  VUE_APP_ENVIRONMENT="${environmentObject.VUE_APP_ENVIRONMENT}" is not one of:`,
        `${ENVIRONMENT_NAMES.join(', ')}. Every environment check in this app will answer false.`
    )
}

interface EnvironmentServiceInterface {
    isEnvironmentProduction: () => boolean
    isEnvironmentDevelopment: () => boolean
    isEnvironmentLocal: () => boolean
    getEnvironmentName: () => string
    getAPIBaseURL: () => string
    getFrontendBaseURL: () => string
}
export const environmentService: EnvironmentServiceInterface = {
    isEnvironmentProduction: ():boolean => {
        return environmentObject.VUE_APP_ENVIRONMENT === 'production'
    },
    isEnvironmentDevelopment: (): boolean => {
        return environmentObject.VUE_APP_ENVIRONMENT === 'development'
    },
    isEnvironmentLocal: (): boolean => {
        return environmentObject.VUE_APP_ENVIRONMENT === 'local'
    },
    getEnvironmentName: (): string => {
        return environmentObject.VUE_APP_ENVIRONMENT
    },
    getAPIBaseURL: (): string => {
        // Under Cypress the app runs inside the test container, where the
        // build-time `localhost:3000` points at the container itself, not the
        // backend. Cypress injects a container-resolvable base (e.g.
        // http://backend:3000) via its env; prefer it when present. Host dev
        // has no window.Cypress, so it keeps the baked-in value unchanged.
        const cypressBaseURL = (window as { Cypress?: { env: (key: string) => string } }).Cypress?.env('apiBaseURL')
        return cypressBaseURL || environmentObject.VUE_APP_BADHAN_API_BASE_URL
    },
    getFrontendBaseURL: (): string => {
        return environmentObject.VUE_APP_FRONTEND_BASE
    }
}
