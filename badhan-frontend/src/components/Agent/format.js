// Display helpers shared by Badhan Agent's pages and its transcript component.
import { environmentService } from '@/mixins/environment'

// A value as a card shows it: a string as it stands, anything else as indented JSON.
export const pretty = (value) => (typeof value === 'string' ? value : JSON.stringify(value, null, 2))

// A chat's time as a list shows it: the time today, "Yesterday", a weekday this week, otherwise a
// date (with the year only when it is not this one).
export function when (time) {
  const date = new Date(time)
  const today = new Date()
  const days = Math.round((new Date(today.toDateString()).getTime() - new Date(date.toDateString()).getTime()) / 86400000)
  if (days === 0) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  if (days === 1) return 'Yesterday'
  if (days < 7) return date.toLocaleDateString([], { weekday: 'long' })
  return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric' })
}

// A plain date, always with the year: "12 Nov 2026".
export const day = (time) => new Date(time).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })

// A token count, short: 950, 1.2k, 34.5k.
export const tokens = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n || 0))

// The backend the rest of the app talks to, which is also where the model's requests go:
// { label, baseUrl, live }. Production holds real donor records, and the pages say so.
export function agentServer () {
  const name = environmentService.getEnvironmentName() || 'unknown'
  return {
    label: name.charAt(0).toUpperCase() + name.slice(1),
    baseUrl: (environmentService.getAPIBaseURL() || '').replace(/\/+$/, ''),
    live: environmentService.isEnvironmentProduction()
  }
}
