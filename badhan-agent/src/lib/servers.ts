// The three Badhan environments the agent can talk to.
//
// The URLs mirror the backend's tsoa.json `servers` list and the repo's environments.js. They are
// written out here rather than imported: environments.js is host-side deploy tooling that no app
// may bundle (see its header), and the agent is an app.

export type ServerId = 'development' | 'production' | 'local'

export interface Server {
  id: ServerId
  label: string
  baseUrl: string
  // Production holds real donor records. The UI marks it and every write there needs approval,
  // whatever the approval setting says.
  live: boolean
}

export const SERVERS: Record<ServerId, Server> = {
  development: {
    id: 'development',
    label: 'Development',
    baseUrl: 'https://badhan-buet-test.uc.r.appspot.com',
    live: false
  },
  production: {
    id: 'production',
    label: 'Production',
    baseUrl: 'https://badhan-buet.uc.r.appspot.com',
    live: true
  },
  local: {
    id: 'local',
    label: 'Local',
    // The backend container publishes port 3000 on the host, and the browser runs on the host.
    baseUrl: 'http://localhost:3000',
    live: false
  }
}

export const SERVER_IDS: ServerId[] = ['development', 'production', 'local']

export const isServerId = (value: unknown): value is ServerId =>
  typeof value === 'string' && (SERVER_IDS as string[]).includes(value)
