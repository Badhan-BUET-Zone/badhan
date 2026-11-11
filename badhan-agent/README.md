# Badhan Agent

A one-page chat app that works the Badhan API through an OpenAI model. Every API route is one of
the model's tools. When the model calls one, the app sends that request to the server you picked,
signed in as you, and shows the call in the chat as a card with the request and the response.

## Run it

```
docker compose up -d agent
```

Open http://localhost:8090. The service sits under the `agent` compose profile, so a plain
`docker compose up` does not build or start it, but naming it does. It needs nothing else from the
stack. Run `npm` only inside the container, as with the other apps (see the root
[CLAUDE.md](../CLAUDE.md)). For example:

```
docker compose run --rm --no-deps agent npm run build   # typecheck + production build
```

## Using it

1. **Settings → OpenAI**: paste an API key and choose a model. **List models** loads the chat
   models your key can use. The key is kept in this browser's `localStorage`, and the app sends it
   only to `api.openai.com`.
2. **Pick a server** in the chat header: **Development**, **Production** or **Local**
   (`http://localhost:3000`, the backend container). Each chat keeps its own server.
3. **Sign in** from the header button. You can sign in with a phone number and password, or paste
   a session token, such as the one in an AI Integration setup file. The password goes straight
   to the Badhan server and never passes through the chat or OpenAI. Each server keeps its own
   sign-in. If the model signs in through the `SignIn` tool, the app stores the token itself and
   gives the model only a placeholder.
4. **Chat.** Every chat is saved in this browser (IndexedDB) and listed in the sidebar.

### The system prompt

Each chat has its own system prompt, which you can edit at the top of the chat. **Use for new
chats** makes the current prompt the default for new chats. The app adds two things below the
prompt:

- **A session note**: the server, who is signed in, and the current time, so the model can work
  out date ranges in Unix milliseconds.
- **The API reference** from the server's `/llms.txt`, about 42 KB, if the checkbox is ticked.
  This is the same Markdown reference the AI Integration setup file contains, and it is how the
  model learns the index encodings, such as blood group `2` meaning B+. OpenAI caches this repeated
  prefix, so after the first turn most of it is billed at the cached rate.

**Show the full system message** shows the exact text the model is sent.

### Approvals

The default setting runs reads (`GET`) on their own and stops before any `POST`, `PATCH`, `PUT` or
`DELETE` with **Send request** and **Decline** buttons. Settings can change this to ask before every
request or to never ask. **Production always asks before a change**, whatever the setting, because
its records are real.

**Stop** cancels the turn, including any request that has not been answered yet.

## How the tools are made

Nothing about the API is hard-coded here. When a chat opens on a server, the app fetches
`/openapi.json` from that server and turns each operation into an OpenAI function tool
([src/lib/openapi.ts](src/lib/openapi.ts)):

- The tool's **name** is the route's `operationId`. If two routes share an `operationId`, the path
  is added to the name, for example `GetMe_users_me` and `GetMe_donors_me`.
- The **arguments** are the route's path and query parameters, plus a `body` object when the route
  takes a JSON body. `$ref`s are resolved in place, and the tool schema keeps the descriptions but
  drops OpenAPI-only keywords.
- The **description** is the route's method, path, summary, description and status codes.

When a backend route is added or changed, the agent picks it up the next time it loads the spec,
either on a page reload or with the retry button next to the tool count.

A tool's result goes back to the model as `{ httpStatus, body }`, cut to 60,000 characters. The
card shows the pretty-printed response, up to 250,000 characters. A binary response, such as the
certificate PDF, is described rather than included.

## Layout

| Path | What it holds |
|---|---|
| [src/lib/openapi.ts](src/lib/openapi.ts) | OpenAPI → tools; a tool call → an HTTP request |
| [src/lib/openai.ts](src/lib/openai.ts) | Streaming Chat Completions client, model list |
| [src/lib/chat.ts](src/lib/chat.ts) | Chat and message types, default system prompt, history → API messages |
| [src/lib/servers.ts](src/lib/servers.ts) | The three servers' base URLs |
| [src/store.ts](src/store.ts) | Settings, persistence, sign-in, and the agent loop |
| [src/components/](src/components/) | The page: sidebar, chat pane, tool-call cards, settings |

Apart from `markdown.ts`, the files in `src/lib/` import nothing but types, so they also run
under plain Node (`node file.ts`) inside the container.
