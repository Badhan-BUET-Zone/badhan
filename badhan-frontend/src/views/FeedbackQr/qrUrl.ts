import { environmentService } from '@/mixins/environment'

// The address a code encodes comes from the CONFIGURED frontend base URL, never from
// window.location.href.
//
// The certificate can get away with encoding its own address because the page generating the code
// and the page the code points at are the same one. Here they are different routes — the generator
// is inside the app, the target is a public page — so "encode where I am" would encode the wrong
// thing.
//
// The consequence is worth knowing: a code produced on the development or local environment encodes
// THAT host. For the printed sheet that means permanently dead paper. Print only from production.
const base = (): string => environmentService.getFrontendBaseURL().replace(/\/+$/, '')

export const donorPageUrl = (): string => `${base()}/#/donor`

export const registrationPageUrl = (token: string): string =>
  `${base()}/#/register?t=${encodeURIComponent(token)}`
