<template>
  <div class="agent-page" data-cy="agentPage">
    <PageTitle></PageTitle>

    <v-card class="agent-card rounded-xl mx-auto mt-2" :class="{ 'agent-card--list-open': listOpen }">
      <!-- The chat list. A column beside the chat on a wide screen; on a narrow one the same element
           slides in over the chat from the left (see the media query in the styles). -->
      <v-sheet tag="aside" class="agent-sidebar" data-cy="agentChatList">
        <!-- flex-grow-0: `block` makes a v-btn flex: 1, which in this column stretches it to fill
             the sidebar's height. -->
        <v-btn block depressed rounded color="primary" class="text-none flex-grow-0 mb-2" data-cy="agentNewChatButton" @click="createChat">
          <v-icon left>mdi-plus</v-icon>New chat
        </v-btn>
        <nav class="agent-chat-list" aria-label="Chats">
          <p v-if="loaded && !chats.length" class="caption text--secondary pa-2 mb-0">No chats yet.</p>
          <div
            v-for="item in chats"
            :key="item.id"
            class="agent-chat-item"
            :class="{ 'agent-chat-item--active': item.id === activeId }"
            role="button"
            tabindex="0"
            data-cy="agentChatListItem"
            @click="pickChat(item.id)"
            @keydown.enter="pickChat(item.id)"
          >
            <div class="agent-chat-item-text">
              <div class="agent-chat-item-title">
                <span v-if="running[item.id]" class="agent-dot" title="Running"></span>{{ item.title }}
              </div>
              <div class="caption text--secondary">{{ when(item.updatedAt) }}</div>
            </div>
            <v-btn icon x-small class="agent-chat-item-delete" title="Delete chat" data-cy="agentDeleteChatButton" @click.stop="confirmDelete(item)">
              <v-icon small>mdi-delete-outline</v-icon>
            </v-btn>
          </div>
        </nav>
        <!-- Settings open out in place, under the button, and push the chat list up. -->
        <v-btn
          text
          class="text-none justify-start mt-2 flex-shrink-0"
          :aria-expanded="String(settingsOpen)"
          data-cy="agentSettingsButton"
          @click="settingsOpen = !settingsOpen"
        >
          <v-icon left>mdi-cog-outline</v-icon>Settings
          <v-spacer></v-spacer>
          <v-icon small class="agent-chevron" :class="{ 'agent-chevron--open': settingsOpen }">mdi-chevron-up</v-icon>
        </v-btn>
        <v-expand-transition>
          <div v-show="settingsOpen" class="agent-settings" data-cy="agentSettings">
            <div class="subtitle-2 mb-3">OpenAI</div>
            <!-- A key is kept only once checkApiKey passes; until then it lives in keyDraft alone. -->
            <template v-if="settings.verifiedApiKey">
              <p class="body-2 mb-2" data-cy="agentKeySaved">
                <v-icon small color="green" class="mr-1">mdi-check-circle</v-icon>API key saved
                <span class="text--secondary">(…{{ settings.verifiedApiKey.slice(-4) }})</span>
              </p>
              <v-btn small depressed rounded class="text-none" data-cy="agentClearKeyButton" @click="clearKey">Clear key</v-btn>
            </template>
            <template v-else>
              <v-text-field
                v-model="keyDraft"
                label="API key"
                placeholder="sk-…"
                outlined
                rounded
                dense
                autocomplete="off"
                spellcheck="false"
                :error-messages="keyError"
                :disabled="checkingKey"
                :type="showKey ? 'text' : 'password'"
                :append-icon="showKey ? 'mdi-eye-off' : 'mdi-eye'"
                data-cy="agentApiKeyInput"
                @click:append="showKey = !showKey"
                @keydown.enter.prevent="saveKey"
              ></v-text-field>
              <v-btn
                small
                depressed
                rounded
                color="primary"
                class="text-none mt-3"
                :loading="checkingKey"
                :disabled="!keyDraft.trim()"
                data-cy="agentSaveKeyButton"
                @click="saveKey"
              >Save API key</v-btn>
            </template>
            <v-divider class="my-4"></v-divider>

            <div class="subtitle-2 mb-1">Tool calls</div>
            <v-radio-group v-model="settings.approval" hide-details class="mt-0">
              <v-radio value="writes">
                <template v-slot:label>
                  <div class="body-2">
                    <div>Ask before changes</div>
                    <div class="caption text--secondary">Reads run on their own; POST, PATCH, PUT and DELETE wait for you.</div>
                  </div>
                </template>
              </v-radio>
              <v-radio value="all">
                <template v-slot:label><div class="body-2">Ask before every request</div></template>
              </v-radio>
              <v-radio value="none">
                <template v-slot:label>
                  <div class="body-2">
                    <div>Never ask</div>
                    <div class="caption text--secondary">Production still asks before changes: its records are real.</div>
                  </div>
                </template>
              </v-radio>
            </v-radio-group>
            <v-text-field
              v-model.number="settings.maxSteps"
              type="number"
              min="1"
              max="100"
              label="Model calls per message, at most"
              outlined
              rounded
              dense
              hide-details
              class="mt-5"
            ></v-text-field>
          </div>
        </v-expand-transition>
      </v-sheet>
      <div class="agent-scrim" @click="listOpen = false"></div>

      <section v-if="chat" class="agent-pane">
        <header class="agent-bar">
          <v-btn icon small class="d-md-none" title="Chats" data-cy="agentChatsButton" @click="listOpen = true">
            <v-icon>mdi-menu</v-icon>
          </v-btn>
          <v-text-field
            v-model="chat.title"
            class="agent-title"
            aria-label="Chat title"
            dense
            flat
            solo
            rounded
            hide-details
            background-color="transparent"
            data-cy="agentChatTitle"
            @input="saveChat(chat)"
          ></v-text-field>
          <span class="agent-tools caption text--secondary" :title="spec.error || `${spec.tools.length} API routes available as tools`">
            <template v-if="spec.status === 'loading'">Loading tools…</template>
            <template v-else-if="spec.status === 'ready'"><v-icon x-small>mdi-tools</v-icon> {{ spec.tools.length }}</template>
            <v-btn v-else-if="spec.status === 'error'" x-small text color="red" class="text-none" @click="loadSpec(true)">
              <v-icon x-small left>mdi-refresh</v-icon>Retry
            </v-btn>
          </span>
        </header>

        <div v-if="server.live" class="agent-live body-2">
          <strong>Production</strong> — real donor records. Every request is live, and every change asks you first.
        </div>

        <div ref="scroller" class="agent-scroll" @scroll="onScroll">
          <div class="agent-thread">
            <v-expansion-panels v-model="promptPanel" flat class="agent-prompt mb-4">
              <v-expansion-panel>
                <v-expansion-panel-header class="py-2" data-cy="agentSystemPromptHeader">
                  <div class="d-flex align-center agent-min-0">
                    <strong class="mr-2 flex-shrink-0">System prompt</strong>
                    <span v-if="promptPanel !== 0" class="body-2 text--secondary agent-ellipsis">{{ promptFirstLine }}</span>
                  </div>
                </v-expansion-panel-header>
                <!-- Read-only: the prompt is fixed (SYSTEM_PROMPT). This is exactly what the model is sent. -->
                <v-expansion-panel-content>
                  <p class="caption text--secondary mb-2">
                    Fixed, and the same for every chat. The session note at the end — the server, who is signed in and the
                    current time — is filled in on each request.
                  </p>
                  <pre class="agent-pre agent-pre--tall" data-cy="agentSystemPrompt">{{ systemMessage() }}</pre>
                </v-expansion-panel-content>
              </v-expansion-panel>
            </v-expansion-panels>

            <div v-if="!visibleMessages.length" class="text-center py-4">
              <p class="text--secondary mb-3">
                Ask about donors, donations, call records or reports. Each API call the model makes shows up here as a card.
              </p>
              <div class="d-flex flex-wrap justify-center">
                <v-chip v-for="text in examples" :key="text" class="ma-1" outlined @click="useExample(text)">{{ text }}</v-chip>
              </div>
            </div>

            <template v-for="message in visibleMessages">
              <div v-if="message.role === 'user'" :key="message.id" class="agent-msg agent-msg--user">
                <div class="agent-bubble" data-cy="agentUserMessage">{{ message.content }}</div>
              </div>

              <div v-else-if="message.role === 'assistant'" :key="message.id" class="agent-msg" data-cy="agentAssistantMessage">
                <!-- Plain text through {{ }}, never v-html: an answer can quote donor records, which are
                     free text that anyone filling in a public form controls. -->
                <div v-if="message.content" class="agent-answer">{{ message.content }}</div>
                <div v-else-if="message.streaming" class="agent-thinking"><span></span><span></span><span></span></div>

                <div
                  v-for="call in message.tool_calls || []"
                  :key="call.id"
                  class="agent-tool"
                  :class="`agent-tool--${toolTone(call)}`"
                  data-cy="agentToolCard"
                >
                  <div
                    class="agent-tool-head"
                    role="button"
                    tabindex="0"
                    :aria-expanded="String(!!openCards[call.id])"
                    @click="toggleCard(call)"
                    @keydown.enter.prevent="toggleCard(call)"
                  >
                    <v-icon small class="agent-chevron" :class="{ 'agent-chevron--open': openCards[call.id] }">mdi-chevron-right</v-icon>
                    <v-chip v-if="runOf(call).method" x-small label dark :color="methodColor(runOf(call).method)" class="flex-shrink-0 px-1">
                      {{ runOf(call).method }}
                    </v-chip>
                    <span class="agent-tool-path">{{ runOf(call).path || call.function.name }}</span>
                    <span class="agent-tool-name text--secondary">{{ call.function.name }}</span>
                    <v-chip x-small outlined :color="toneColor(call)" class="flex-shrink-0" data-cy="agentToolStatus">
                      <v-progress-circular v-if="runOf(call).status === 'running'" indeterminate size="9" width="2" class="mr-1"></v-progress-circular>
                      {{ toolLabel(call) }}
                    </v-chip>
                  </div>

                  <div v-if="runOf(call).status === 'awaiting-approval'" class="agent-approval">
                    <p class="body-2 mb-2">
                      This {{ runOf(call).method }} request {{ runOf(call).method === 'GET' ? 'reads from' : 'changes data on' }}
                      <strong>{{ server.label }}</strong>{{ server.live ? ' — real donor records' : '' }}.
                      Send it?
                    </p>
                    <v-btn small depressed color="primary" class="text-none mr-2" data-cy="agentApproveButton" @click="resolveApproval(call.id, true)">Send request</v-btn>
                    <v-btn small outlined class="text-none" data-cy="agentDeclineButton" @click="resolveApproval(call.id, false)">Decline</v-btn>
                  </div>

                  <div v-if="openCards[call.id]" class="agent-tool-body">
                    <div v-if="runOf(call).url" class="agent-field">
                      <div class="d-flex align-center justify-space-between">
                        <span class="agent-label">Request</span>
                        <v-btn x-small text class="text-none" @click="copyCurl(call)">{{ copiedCall === call.id ? 'Copied' : 'Copy as curl' }}</v-btn>
                      </div>
                      <pre class="agent-pre">{{ runOf(call).method }} {{ runOf(call).url }}</pre>
                    </div>
                    <div class="agent-field">
                      <span class="agent-label">Arguments</span>
                      <pre class="agent-pre">{{ argsText(call) }}</pre>
                    </div>
                    <div v-if="runOf(call).body !== null" class="agent-field">
                      <span class="agent-label">Request body</span>
                      <pre class="agent-pre">{{ pretty(runOf(call).body) }}</pre>
                    </div>
                    <div v-if="runOf(call).note" class="agent-field">
                      <span class="agent-label">Note</span>
                      <pre class="agent-pre">{{ runOf(call).note }}</pre>
                    </div>
                    <div v-if="runOf(call).response !== null" class="agent-field">
                      <span class="agent-label">Response</span>
                      <pre class="agent-pre agent-pre--tall">{{ runOf(call).response }}</pre>
                    </div>
                  </div>
                </div>

                <div v-if="!message.streaming && message.model" class="caption text--secondary mt-1">{{ usageLabel(message) }}</div>
              </div>

              <v-alert
                v-else-if="message.role === 'notice'"
                :key="message.id"
                dense
                text
                :type="message.level === 'error' ? 'error' : 'info'"
                class="body-2 mb-4"
                data-cy="agentNotice"
              >
                <div class="d-flex align-center flex-wrap">
                  <span class="flex-grow-1">{{ message.content }}</span>
                  <v-btn v-if="lastIsError && message === lastMessage" small text class="text-none" @click="retry(chat)">Retry</v-btn>
                  <v-btn v-if="!settings.verifiedApiKey" small text class="text-none" @click="openSettings">Settings</v-btn>
                </div>
              </v-alert>
            </template>
          </div>
        </div>

        <footer class="agent-composer">
          <div class="d-flex align-end">
            <v-textarea
              ref="input"
              v-model="draft"
              class="agent-input"
              outlined
              rounded
              dense
              auto-grow
              rows="1"
              hide-details
              :placeholder="blocker || `Message the agent on ${server.label}…`"
              data-cy="agentInput"
              @keydown="onKey"
            ></v-textarea>
            <v-btn v-if="chatRunning" fab small depressed class="ml-2 mb-1" title="Stop" data-cy="agentStopButton" @click="stop(chat.id)">
              <v-icon>mdi-stop</v-icon>
            </v-btn>
            <v-btn
              v-else
              fab
              small
              depressed
              color="primary"
              class="ml-2 mb-1"
              title="Send (Enter)"
              :disabled="!!blocker || !draft.trim()"
              data-cy="agentSendButton"
              @click="submit"
            >
              <v-icon>mdi-send</v-icon>
            </v-btn>
          </div>
          <div class="caption text--secondary mt-1 px-1">
            <template v-if="blocker">
              {{ blocker }} <a v-if="!settings.verifiedApiKey" href="#" @click.prevent="openSettings">Open Settings</a>
            </template>
            <template v-else>{{ model }} · Enter to send, Shift+Enter for a new line</template>
          </div>
        </footer>
      </section>

      <div v-else-if="loaded" class="agent-nothing">
        <v-btn rounded depressed color="primary" class="text-none" @click="createChat">Start a chat</v-btn>
      </div>
    </v-card>
  </div>
</template>

<script>
/*
  Badhan Agent: a chat in which an OpenAI model works the Badhan API. Super admins only.

  The whole page lives in this one file — the OpenAPI → tool conversion, the OpenAI client and the
  chat helpers above the component, the page, its storage and the agent loop in it.

  How it works:
  - The agent works on the same backend as the rest of the app. Every route in its /openapi.json
    becomes one OpenAI function tool, built at runtime, so a route added to the backend shows up
    here on the next load with no change to this file — except the few in SESSION_ROUTES below.
  - The system prompt is fixed (SYSTEM_PROMPT) and carries the value codes, copied from the
    backend's apiVocabulary.ts. Only a short session note — server, member, current time — is
    filled in per request. The page shows it read-only.
  - When the model calls a tool, the page sends that request itself, straight from the browser,
    with the member's own session token: the one the rest of the app uses. Nothing new is signed
    in, and nothing appears in the My Profile device list.
  - The OpenAI key is the member's own, kept in localStorage and sent only to api.openai.com.
  - Chats are kept in IndexedDB: a tool result can run to tens of kilobytes, and localStorage's
    ~5 MB would fill within a few conversations.
  - Both go when the member signs in or out of Badhan: ldb.reset() clears localStorage and deletes
    the chat database (src/localDatabase/index.ts), because the chats hold donor records.
  - Calls go through fetch, not badhanAxios: its interceptors toast every error and drive the top
    progress bar, and a 404 the model asked for is an answer to hand back, not an app error.
*/
import PageTitle from '@/components/PageTitle'
import { environmentService } from '@/mixins/environment'
import { designations, halls } from '@/mixins/constants'
import { myConsole } from '@/mixins/myConsole'

const ignore = () => undefined

const lastOf = (list) => list[list.length - 1]

const clip = (text, max, note) =>
  text.length <= max ? text : `${text.slice(0, max)}\n… [${note}: ${text.length - max} more characters]`

const throwIfAborted = (signal) => {
  if (signal.aborted) throw new DOMException('The run was stopped.', 'AbortError')
}

const designationName = (index) =>
  typeof index === 'number' && designations[index] ? designations[index] : 'Unknown role'

const hallName = (index) =>
  typeof index === 'number' && halls[index] ? halls[index] : 'Unknown hall'

// ---------------------------------------------------------------------------------------------
// OpenAPI → OpenAI function tools, and a tool call → an HTTP request
// ---------------------------------------------------------------------------------------------

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
const REF_PREFIX = '#/components/schemas/'

// OpenAI caps a function name at 64 characters of [a-zA-Z0-9_-]. Descriptions are capped too;
// the per-tool text is kept under that, and the value codes go in the system prompt instead.
const MAX_NAME = 64
const MAX_DESCRIPTION = 1024

// `format: double` is how tsoa says "a TypeScript number". It means nothing to JSON Schema, and
// every other format tsoa emits is the same kind of noise.
const KEPT_FORMATS = new Set(['date-time', 'date', 'time', 'email', 'uri', 'uuid'])

// Keywords that are OpenAPI-only, or documentation the model gets elsewhere.
const DROPPED_KEYWORDS = new Set([
  'example', 'examples', 'xml', 'externalDocs', 'discriminator', 'readOnly', 'writeOnly',
  'deprecated', 'title', 'nullable', 'format'
])

// Routes that act on the session this page borrows rather than on records, left out of the tool
// list so the model cannot call them at all. A sign-out would end the member's own app session; a
// sign-in or a password change would put a password through the chat, and so through OpenAI; and
// a redirection token is a second, long-lived session nobody asked for.
const SESSION_ROUTES = new Set([
  'POST /users/signin',
  'DELETE /users/signout',
  'DELETE /users/signout/all',
  'POST /users/redirection',
  'PATCH /users/password'
])

const oneLine = (text) => text.replace(/\s*\n\s*/g, ' ').trim()

const clipDescription = (text, max) =>
  text.length <= max ? text : text.slice(0, max - 1).trimEnd() + '…'

// OpenAPI 3.0 schema → plain JSON Schema that OpenAI accepts. References are inlined (the
// function's parameters must stand alone), `nullable` becomes a `null` type, and an `example`
// moves into the description, where the model can see it.
function toJsonSchema (schema, components, seen = []) {
  if (schema === undefined || schema === true) return {}
  if (schema === false) return { not: {} }

  if (typeof schema.$ref === 'string') {
    const name = schema.$ref.startsWith(REF_PREFIX) ? schema.$ref.slice(REF_PREFIX.length) : schema.$ref
    const siblings = { ...schema }
    delete siblings.$ref
    if (seen.includes(name) || !components[name]) {
      // A cycle cannot be inlined, and a dangling reference has nothing to inline. Either way the
      // value is left open rather than failing the whole tool list.
      return { description: `A ${name} object.` }
    }
    return { ...toJsonSchema(components[name], components, [...seen, name]), ...toJsonSchema(siblings, components, seen) }
  }

  const out = {}
  for (const [key, value] of Object.entries(schema)) {
    if (DROPPED_KEYWORDS.has(key)) continue
    if (key === 'properties' && value && typeof value === 'object') {
      out.properties = Object.fromEntries(
        Object.entries(value).map(([name, property]) => [name, toJsonSchema(property, components, seen)])
      )
    } else if (key === 'items' || (key === 'additionalProperties' && typeof value === 'object')) {
      out[key] = toJsonSchema(value, components, seen)
    } else if ((key === 'allOf' || key === 'anyOf' || key === 'oneOf') && Array.isArray(value)) {
      out[key] = value.map((part) => toJsonSchema(part, components, seen))
    } else {
      out[key] = value
    }
  }

  if (typeof schema.format === 'string' && KEPT_FORMATS.has(schema.format)) out.format = schema.format
  if (schema.nullable && typeof out.type === 'string') out.type = [out.type, 'null']
  if (schema.example !== undefined) {
    const example = JSON.stringify(schema.example)
    const description = typeof out.description === 'string' ? oneLine(out.description) : ''
    if (!description.includes(example)) {
      out.description = description ? `${description} (e.g. ${example})` : `e.g. ${example}`
    }
  } else if (typeof out.description === 'string') {
    out.description = oneLine(out.description)
  }
  return out
}

const sanitizeName = (text) => text.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '')

const slugOfPath = (path) => sanitizeName(path.replace(/[{}]/g, ''))

function describe (method, path, operation) {
  const lines = [`${method} ${path}`]
  const text = [operation.summary, operation.description].filter(Boolean).map((part) => part.trim()).join('\n\n')
  if (text) lines.push(text)

  // The status codes and their messages: the model needs to know what a 403 or 409 from this route
  // means before it decides whether to retry or report.
  const responses = Object.entries(operation.responses || {})
    .map(([code, response]) => `${code} ${oneLine((response && response.description) || '')}`.trim())
  if (responses.length) lines.push(`Responses: ${responses.join('; ')}.`)

  return clipDescription(lines.join('\n'), MAX_DESCRIPTION)
}

function buildTools (spec) {
  const components = (spec.components && spec.components.schemas) || {}
  const operations = []
  for (const [path, item] of Object.entries(spec.paths || {})) {
    for (const [verb, operation] of Object.entries(item || {})) {
      const method = verb.toUpperCase()
      if (METHODS.includes(method) && !SESSION_ROUTES.has(`${method} ${path}`)) operations.push({ method, path, operation })
    }
  }

  // operationIds are not unique in this API (GetMe is both /users/me and /donors/me), and a tool
  // name must be. A unique id is used as it is; a repeated one gets its path appended.
  const idCounts = new Map()
  for (const { operation } of operations) {
    const id = sanitizeName(operation.operationId || '')
    if (id) idCounts.set(id, (idCounts.get(id) || 0) + 1)
  }

  const used = new Set()
  const tools = []
  for (const { method, path, operation } of operations) {
    const id = sanitizeName(operation.operationId || '')
    let name = id && idCounts.get(id) === 1 ? id : sanitizeName(`${id || method}_${slugOfPath(path)}`)
    name = name.slice(0, MAX_NAME)
    for (let n = 2; used.has(name); n++) name = `${name.slice(0, MAX_NAME - String(n).length - 1)}_${n}`
    used.add(name)

    const properties = {}
    const required = []
    const pathParams = []
    const queryParams = []

    for (const parameter of operation.parameters || []) {
      if (!parameter || (parameter.in !== 'path' && parameter.in !== 'query')) continue
      const schema = toJsonSchema(parameter.schema, components)
      const notes = [parameter.description && oneLine(parameter.description), schema.description].filter(Boolean)
      properties[parameter.name] = {
        ...schema,
        ...(notes.length ? { description: [...new Set(notes)].join(' ') } : {})
      }
      if (parameter.required) required.push(parameter.name)
      if (parameter.in === 'path') pathParams.push(parameter.name)
      else queryParams.push({ name: parameter.name, isArray: schema.type === 'array' })
    }

    const requestBody = operation.requestBody
    const bodySchema = requestBody && requestBody.content && requestBody.content['application/json'] &&
      requestBody.content['application/json'].schema
    const hasBody = !!bodySchema
    const bodyRequired = hasBody && !!requestBody.required
    if (hasBody) {
      const schema = toJsonSchema(bodySchema, components)
      properties.body = {
        ...schema,
        description: [requestBody.description && oneLine(requestBody.description), schema.description, 'The JSON request body.']
          .filter(Boolean).join(' ')
      }
      if (bodyRequired) required.push('body')
    }

    tools.push({
      name,
      method,
      path,
      description: describe(method, path, operation),
      parameters: JSON.parse(JSON.stringify({ type: 'object', properties, required })),
      pathParams,
      queryParams,
      hasBody,
      bodyRequired,
      // Anything but GET changes data, and is what the approval setting guards.
      isWrite: method !== 'GET'
    })
  }
  return tools
}

const toOpenAiTool = (tool) => ({
  type: 'function',
  function: { name: tool.name, description: tool.description, parameters: tool.parameters }
})

// Builds the request a tool call stands for. Throws, with a message meant for the model, when the
// arguments cannot make one.
function buildRequest (baseUrl, tool, args) {
  let path = tool.path
  for (const name of tool.pathParams) {
    const value = args[name]
    if (value === undefined || value === null || value === '') {
      throw new Error(`Missing required path parameter "${name}".`)
    }
    path = path.replace(`{${name}}`, encodeURIComponent(String(value)))
  }

  // Query parameters go out in the same shape badhanAxios sends them: arrays as
  // `name[]=a&name[]=b`, which Express parses into an array even when there is only one item.
  const query = new URLSearchParams()
  for (const { name, isArray } of tool.queryParams) {
    const value = args[name]
    if (value === undefined || value === null) continue
    if (isArray || Array.isArray(value)) {
      for (const item of Array.isArray(value) ? value : [value]) query.append(`${name}[]`, String(item))
    } else if (typeof value === 'object') {
      query.append(name, JSON.stringify(value))
    } else {
      // An empty string is sent, not skipped: /search/v3 requires every parameter and takes ""
      // to mean "any".
      query.append(name, String(value))
    }
  }

  let body
  if (tool.hasBody) {
    if (args.body !== undefined) {
      body = args.body
    } else {
      // Models sometimes flatten the body into the top-level arguments. Whatever is left once the
      // path and query parameters are taken out is that body.
      const known = new Set([...tool.pathParams, ...tool.queryParams.map((q) => q.name), 'body'])
      const rest = Object.fromEntries(Object.entries(args).filter(([key]) => !known.has(key)))
      if (Object.keys(rest).length || tool.bodyRequired) body = rest
    }
  }

  const search = query.toString()
  return { method: tool.method, url: `${baseUrl.replace(/\/+$/, '')}${path}${search ? `?${search}` : ''}`, body }
}

async function sendRequest (request, token, signal) {
  const headers = { Accept: 'application/json' }
  // The Badhan API reads its session token from x-auth, not from an Authorization header.
  if (token) headers['x-auth'] = token
  if (request.body !== undefined) headers['Content-Type'] = 'application/json'

  const started = performance.now()
  const response = await fetch(request.url, {
    method: request.method,
    headers,
    body: request.body === undefined ? undefined : JSON.stringify(request.body),
    signal
  })

  // Parsed JSON where the response was JSON, its text where it was text, and a one-line note where
  // it was binary (the certificate PDF): the model can do nothing with the bytes.
  const contentType = response.headers.get('content-type') || ''
  let body
  if (/json/i.test(contentType)) {
    const text = await response.text()
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
  } else if (/^text\//i.test(contentType) || contentType === '') {
    body = await response.text()
  } else {
    const blob = await response.blob()
    body = `[binary response: ${contentType}, ${blob.size} bytes — not shown]`
  }

  return { ok: response.ok, httpStatus: response.status, durationMs: Math.round(performance.now() - started), body }
}

// ---------------------------------------------------------------------------------------------
// OpenAI: a minimal streaming Chat Completions client. No SDK — fetch and a server-sent-events
// reader are all it takes.
// ---------------------------------------------------------------------------------------------

const OPENAI_BASE = 'https://api.openai.com/v1'

// Fixed: the page offers no choice of model.
const MODEL = 'gpt-6-luna'
// gpt-6-luna refuses function tools alongside reasoning on /v1/chat/completions; 'none' is the
// setting it accepts here. Keeping reasoning would mean moving to /v1/responses.
const REASONING_EFFORT = 'none'

class OpenAiError extends Error {
  constructor (message, status) {
    super(message)
    this.status = status
  }
}

async function openAiFailure (response) {
  let message = `OpenAI answered ${response.status} ${response.statusText}`.trim()
  try {
    const data = await response.json()
    if (data && data.error && data.error.message) message = `OpenAI: ${data.error.message}`
  } catch {
    // Not JSON; the status line is all there is.
  }
  return new OpenAiError(message, response.status)
}

// Proves a key before the page keeps it. Throws, with a message for the member, when it fails.
async function checkApiKey (apiKey) {
  const headers = { Authorization: `Bearer ${apiKey}` }
  try {
    // 1. Free — model lookups are not billed: the key is accepted and can use the model.
    const lookup = await fetch(`${OPENAI_BASE}/models/${encodeURIComponent(MODEL)}`, { headers })
    if (lookup.status === 401) throw new OpenAiError('OpenAI did not accept this key.', 401)
    if (lookup.status === 404) throw new OpenAiError(`This key cannot use ${MODEL}.`, 404)
    if (!lookup.ok) throw await openAiFailure(lookup)

    // 2. The smallest real request, shaped like a chat's: one dummy tool and the same reasoning
    //    effort. It proves the key has credit (an empty account answers 429 here, not above) and
    //    that the model takes these settings together. A few tokens: a fraction of a cent.
    const response = await fetch(`${OPENAI_BASE}/chat/completions`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: 'Reply with OK.' }],
        tools: [{ type: 'function', function: { name: 'noop', description: 'Does nothing.', parameters: { type: 'object', properties: {} } } }],
        reasoning_effort: REASONING_EFFORT,
        max_completion_tokens: 16
      })
    })
    if (!response.ok) throw await openAiFailure(response)
  } catch (error) {
    if (error instanceof OpenAiError) throw error
    throw new OpenAiError('Could not reach api.openai.com. Check the connection and try again.')
  }
}

async function streamCompletion ({ apiKey, model, messages, tools, signal, onText }) {
  const response = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      ...(tools.length ? { tools } : {}),
      reasoning_effort: REASONING_EFFORT,
      stream: true,
      stream_options: { include_usage: true }
    }),
    signal
  })
  if (!response.ok || !response.body) throw await openAiFailure(response)

  const completion = { content: '', toolCalls: [], usage: null, finishReason: null }
  // Tool calls arrive in fragments keyed by index: the first carries the id and name, the rest
  // append to the JSON arguments string.
  const calls = []

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const handle = (line) => {
    if (!line.startsWith('data:')) return
    const data = line.slice(5).trim()
    if (!data || data === '[DONE]') return
    const chunk = JSON.parse(data)
    if (chunk.error) throw new OpenAiError(`OpenAI: ${chunk.error.message || 'stream error'}`)
    if (chunk.usage) completion.usage = chunk.usage
    const choice = chunk.choices && chunk.choices[0]
    if (!choice) return
    if (choice.finish_reason) completion.finishReason = choice.finish_reason
    const delta = choice.delta || {}
    const text = (delta.content || '') + (delta.refusal || '')
    if (text) {
      completion.content += text
      onText(text)
    }
    for (const fragment of delta.tool_calls || []) {
      if (!calls[fragment.index]) calls[fragment.index] = { id: '', type: 'function', function: { name: '', arguments: '' } }
      const call = calls[fragment.index]
      if (fragment.id) call.id = fragment.id
      if (fragment.function && fragment.function.name) call.function.name += fragment.function.name
      if (fragment.function && fragment.function.arguments) call.function.arguments += fragment.function.arguments
    }
  }

  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let newline
    while ((newline = buffer.indexOf('\n')) >= 0) {
      handle(buffer.slice(0, newline).trim())
      buffer = buffer.slice(newline + 1)
    }
  }
  handle(buffer.trim())

  completion.toolCalls = calls.filter(Boolean)
  return completion
}

// ---------------------------------------------------------------------------------------------
// Chats: what one is, and how it becomes the message list OpenAI is sent
// ---------------------------------------------------------------------------------------------
//
// A chat is { id, title, createdAt, updatedAt, messages },
// and a message is one of:
//   { role: 'user', content }
//   { role: 'assistant', content, tool_calls, model, usage, streaming }
//   { role: 'tool', tool_call_id, content, run }   — content is the model's copy of the result
//   { role: 'notice', content, level }             — shown in the chat, never sent to the model
// each with an id and a createdAt. Every key a message will ever have is set when it is made, null
// when there is nothing yet: Vue 2 only sees a change to a key that existed when the object
// became reactive.
//
// A tool message's run tracks the request. Its status is one of: pending (queued behind an
// earlier call of the same turn), awaiting-approval, running, done (the server answered, with any
// HTTP status), failed (no answer: bad arguments, unknown tool, network error), denied, cancelled.

const newId = () =>
  (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`)

const newRun = (name) => ({
  status: 'pending',
  name,
  method: null,
  path: null,
  url: null,
  args: null,
  body: null,
  httpStatus: null,
  durationMs: null,
  // Pretty-printed for the card. The model's copy (the message content) is compact and clipped.
  response: null,
  note: null
})

const NO_RUN = Object.freeze(newRun(''))

// The value codes, copied word for word from badhan-backend/src/doc/apiVocabulary.ts, which
// points back here: change both together. The tools carry only each route's inputs, so this is
// also how the model reads `"hall": 5` in a response back as Suhrawardy. Lines in single quotes
// for the same reason as the original: it is Markdown full of `backticks`.
const VALUE_CODES = [
  '## How values are encoded',
  '',
  'The API speaks **indices, not names**. A client that sends `"B+"` where a blood group belongs',
  'gets a validation error; the value is `2`. The mappings below are the whole vocabulary, and the',
  'individual fields below repeat them where they appear.',
  '',
  '**Blood group** — `0` A+, `1` A-, `2` B+, `3` B-, `4` O+, `5` O-, `6` AB+, `7` AB-.',
  '`-1` is a search-only sentinel meaning *any blood group*; no stored record holds it.',
  'Public contacts accept Rh-positive groups only (`0`, `2`, `4`, `6`).',
  '',
  '**Hall** — `0` Ahsan Ullah, `1` Sabekun Nahar Sony, `2` Kazi Nazrul Islam, `3` Dr. M. A. Rashid,',
  '`4` Sher-E-Bangla, `5` Suhrawardy, `6` Titumir, `7` Attached, `8` (Unknown).',
  'A donor record may hold any of these **except `7` Attached**. `8` means the hall was never',
  'recorded. `-1` means *any hall*, and only some endpoints accept it: the report drill-downs, and',
  'donor search (`/search/v3`) **for a Super Admin only**. Below Super Admin, search takes one hall',
  'per call and answers `-1` with a 403.',
  'Halls `0`-`6` are the residence halls a hall admin is scoped to; `7` and `8` belong to nobody,',
  'so no hall admin can act on those records.',
  '',
  '**Designation** (role) — `0` Donor, `1` Volunteer, `2` Hall Admin, `3` Super Admin.',
  '',
  '**Dates** are Unix timestamps in **milliseconds**, sent and returned as numbers. Never ISO',
  'strings. `0` is used for "never" on fields such as `lastDonation`.',
  '',
  '**Student ID** is a 7-digit string, not a number, and it is structured: `1905005` is batch',
  '`19` (admission year 2019), department `05`, roll `005`. The batch must be between `01` and the',
  "current year's last two digits. Department codes are `01` Arch, `02` Ch.E, `04` CE, `05` CSE,",
  '`06` EEE, `08` IPE, `10` ME, `11` MME, `12` NAME, `15` URP, `16` WRE, `17` NCE, `18` BME —',
  'plus `00`, which names no department and is accepted only because older records carry it.',
  'Codes not in that list are rejected.',
  '',
  '## Response envelope',
  '',
  'Every JSON response carries `status` (`"OK"` or `"ERROR"`), `statusCode` and `message`, with',
  'the payload alongside on success. Check `status`, not only the HTTP status code.'
].join('\n')

// Fixed: the page offers no way to change it. systemMessage() adds the session note after it, so
// everything before the current time is identical from one request to the next.
const SYSTEM_PROMPT = `You are Badhan Agent, an assistant for the members of Badhan, BUET Zone — a voluntary blood donation organisation at the Bangladesh University of Engineering and Technology. You work on the Badhan API through the tools you are given: each tool is one API route, and every call is a real request made as the signed-in member.

How to work:
- Fetch rather than guess. Look donors, donations, call records and reports up with the tools and answer from what they return.
- The API speaks indices, not names. Convert blood groups, halls and designations to their indices before a call, and back to names in your answer, using the codes under "How values are encoded" below.
- Dates are Unix timestamps in milliseconds. Use the current time given below to work out ranges such as "the last four months".
- Check each response's \`status\`. When it is "ERROR", report its \`message\` as it stands, and do not repeat the same call unchanged.
- Before a call that changes data (POST, PATCH, PUT or DELETE), say in one line what you are about to do. The app may ask the user to approve it.
- If a call answers 401, the member's session has ended. Ask them to sign in to the Badhan app again, and never ask for their password.
- Donor records are personal data. Show only what was asked for, and keep answers short; a table suits a list of donors.

${VALUE_CODES}`

const CANCELLED_RESULT = JSON.stringify({ error: 'Cancelled before it completed. The request may or may not have reached the server.' })
const NOT_SENT_RESULT = JSON.stringify({ error: 'Cancelled before it was sent.' })
const UNFINISHED = ['pending', 'awaiting-approval', 'running']

// What the model is sent of one tool result. Enough for a few hundred donor records; anything
// longer is cut, and the model is told so, rather than overflowing its context.
const MAX_RESULT_CHARS = 60000
// What the card shows. Larger, since a person can scroll; bounded so storage stays sane.
const MAX_DISPLAY_CHARS = 250000

function titleFrom (text) {
  const line = text.trim().split('\n')[0].replace(/\s+/g, ' ')
  return line.length > 60 ? `${line.slice(0, 59).trimEnd()}…` : line || 'New chat'
}

// A chat read back from storage may have been saved mid-run (the tab closed, the page reloaded).
// Nothing is running any more, so whatever was in flight is marked as cancelled.
function settle (chat) {
  for (const message of chat.messages) {
    if (message.role === 'assistant') message.streaming = false
    if (message.role === 'tool' && UNFINISHED.includes(message.run.status)) {
      const sent = message.run.status === 'running'
      message.run.status = 'cancelled'
      message.content = sent ? CANCELLED_RESULT : NOT_SENT_RESULT
    }
  }
  return chat
}

// The conversation as OpenAI expects it. Every tool call must be followed by its result, or the
// next request is rejected, so a call with no recorded result gets a synthetic one.
function toApiMessages (messages, system) {
  const out = [{ role: 'system', content: system }]
  const results = new Map()
  for (const message of messages) if (message.role === 'tool') results.set(message.tool_call_id, message)

  for (const message of messages) {
    if (message.role === 'user') {
      out.push({ role: 'user', content: message.content })
    } else if (message.role === 'assistant') {
      const calls = message.tool_calls && message.tool_calls.length ? message.tool_calls : null
      if (!message.content && !calls) continue
      out.push({ role: 'assistant', content: message.content || null, ...(calls ? { tool_calls: calls } : {}) })
      for (const call of calls || []) {
        const result = results.get(call.id)
        out.push({ role: 'tool', tool_call_id: call.id, content: (result && result.content) || NOT_SENT_RESULT })
      }
    }
    // Tool messages are placed right after the call they answer, above. Notices stay in the UI.
  }
  return out
}

// ---------------------------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------------------------

const SETTINGS_KEY = 'badhan-agent:settings'
const APPROVAL_MODES = ['none', 'writes', 'all']
const DEFAULT_MAX_STEPS = 20

const defaultSettings = () => ({
  // Only ever a key that passed checkApiKey: Save is the one way in. Named apart from the old
  // `apiKey`, which was stored unchecked; loadSettings wipes that one.
  verifiedApiKey: '',
  // 'writes': GETs run on their own, anything that changes data waits for a click.
  approval: 'writes',
  maxSteps: DEFAULT_MAX_STEPS
})

function loadSettings () {
  const settings = defaultSettings()
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')
    for (const key of Object.keys(settings)) if (saved[key] !== undefined) settings[key] = saved[key]
    // A key saved before keys were checked never passed: forget it, so it has to be saved again.
    if ('apiKey' in saved) localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // Unreadable or blocked storage: start from the defaults.
  }
  if (!APPROVAL_MODES.includes(settings.approval)) settings.approval = 'writes'
  return settings
}

// Named again in ldb.reset() (src/localDatabase/index.ts), which deletes it on sign-in and sign-out.
const DB_NAME = 'badhan-agent'
const DB_STORE = 'chats'

// One connection per operation, closed straight after, so that ldb.reset()'s deleteDatabase is
// never left blocked behind a connection this page is holding open.
function withChatStore (mode, work) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB_NAME, 1)
    open.onupgradeneeded = () => open.result.createObjectStore(DB_STORE)
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const db = open.result
      const transaction = db.transaction(DB_STORE, mode)
      const request = work(transaction.objectStore(DB_STORE))
      transaction.oncomplete = () => {
        db.close()
        resolve(request.result)
      }
      transaction.onerror = transaction.onabort = () => {
        db.close()
        reject(transaction.error)
      }
    }
  })
}

const chatStore = {
  all: () => withChatStore('readonly', (store) => store.getAll()),
  put: (chat) => withChatStore('readwrite', (store) => store.put(chat, chat.id)),
  remove: (id) => withChatStore('readwrite', (store) => store.delete(id))
}

// ---------------------------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------------------------

const pretty = (value) => (typeof value === 'string' ? value : JSON.stringify(value, null, 2))

function when (time) {
  const date = new Date(time)
  const today = new Date()
  const days = Math.round((new Date(today.toDateString()).getTime() - new Date(date.toDateString()).getTime()) / 86400000)
  if (days === 0) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  if (days === 1) return 'Yesterday'
  if (days < 7) return date.toLocaleDateString([], { weekday: 'long' })
  return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric' })
}

const EXAMPLES = [
  'Who am I signed in as?',
  'Find B+ donors in Suhrawardy hall who can donate now',
  'Show this year\'s donation report',
  'List the newest 10 messages in the member room'
]

const METHOD_COLORS = { GET: 'blue', POST: 'green', PUT: 'orange darken-2', PATCH: 'orange darken-2', DELETE: 'red' }
const TONE_COLORS = { ok: 'green', err: 'red', warn: 'orange darken-2' }

export default {
  name: 'AgentPage',
  components: { PageTitle },
  data () {
    return {
      settings: loadSettings(),
      loaded: false,
      chats: [],
      activeId: null,
      // chat id → true while a turn runs on it
      running: {},
      // The tool list, from /openapi.json. `tools` is frozen: a few hundred schema objects that never
      // change do not need Vue watching every key.
      spec: { status: 'idle', tools: [], error: '' },

      listOpen: false,
      settingsOpen: false,
      // A key typed into Settings but not saved yet: it reaches settings only once checked.
      keyDraft: '',
      keyError: '',
      checkingKey: false,
      showKey: false,
      draft: '',
      // The read-only system prompt panel, as a v-expansion-panels index: 0 open, undefined closed
      promptPanel: undefined,
      // tool call id → true when its card is expanded
      openCards: {},
      copiedCall: null
    }
  },
  computed: {
    chat () {
      return this.chats.find((chat) => chat.id === this.activeId) || null
    },
    // The backend the rest of the app talks to.
    server () {
      const name = environmentService.getEnvironmentName() || 'unknown'
      return {
        label: name.charAt(0).toUpperCase() + name.slice(1),
        baseUrl: (environmentService.getAPIBaseURL() || '').replace(/\/+$/, ''),
        // Production holds real donor records. The page marks it, and every write there needs
        // approval, whatever the approval setting says.
        live: environmentService.isEnvironmentProduction()
      }
    },
    // Who the requests are made as: the member signed in to the app.
    profile () {
      const getters = this.$store.getters
      return {
        name: getters.getName || 'Unknown member',
        designation: designationName(getters.getDesignation),
        hall: hallName(getters.getHall)
      }
    },
    chatRunning () {
      return !!(this.chat && this.running[this.chat.id])
    },
    // Tool results are drawn inside the card of the call they answer, not as messages of their own.
    results () {
      const map = new Map()
      if (this.chat) for (const message of this.chat.messages) if (message.role === 'tool') map.set(message.tool_call_id, message)
      return map
    },
    visibleMessages () {
      return this.chat ? this.chat.messages.filter((message) => message.role !== 'tool') : []
    },
    lastMessage () {
      return this.chat ? lastOf(this.chat.messages) : null
    },
    lastIsError () {
      const last = this.lastMessage
      return !!last && last.role === 'notice' && last.level === 'error'
    },
    blocker () {
      if (!this.settings.verifiedApiKey) return 'Add your OpenAI API key in Settings to start.'
      if (this.spec.status === 'error') return `Tools unavailable: ${this.spec.error}`
      return ''
    },
    promptFirstLine () {
      return SYSTEM_PROMPT.split('\n')[0]
    },
    model () {
      return MODEL
    },
    examples () {
      return EXAMPLES
    },
    // What the thread scrolls along with: a new message, a growing answer, a card changing state.
    scrollSignature () {
      const last = this.lastMessage
      if (!last) return ''
      return [
        this.chat.messages.length,
        last.role === 'assistant' ? last.content.length : 0,
        last.role === 'tool' ? last.run.status : ''
      ].join('|')
    }
  },
  watch: {
    settings: {
      deep: true,
      handler (settings) {
        try {
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
        } catch {
          // Storage blocked (private window). Settings then last for this visit only.
        }
      }
    },
    activeId () {
      this.$_pinned = true
      this.toBottom(true)
      this.focusInput()
    },
    scrollSignature () {
      this.toBottom(false)
    }
  },
  created () {
    // Not reactive on purpose: none of these is ever drawn.
    this.$_controllers = new Map() // chat id → AbortController of its running turn
    this.$_approvals = new Map() // tool call id → resolve(approved)
    this.$_pendingWrites = new Map() // chat id → { timer, write }
    this.$_specLoad = null // the tool-list load in flight
    this.$_pinned = true

    this.loadSpec()
    this.loadChats()
  },
  mounted () {
    // First visit: nothing works without a key, so say so up front.
    if (!this.settings.verifiedApiKey) this.openSettings()
  },
  beforeDestroy () {
    // Leaving the page stops whatever is running and writes out anything still waiting to be saved.
    for (const controller of this.$_controllers.values()) controller.abort()
    for (const pending of this.$_pendingWrites.values()) {
      clearTimeout(pending.timer)
      pending.write()
    }
  },
  methods: {
    pretty,
    when,

    // --- The backend: its tools and reference -----------------------------------------------------

    unreachable (error) {
      const message = error instanceof Error ? error.message : String(error)
      return /failed to fetch|networkerror|load failed/i.test(message)
        ? `${this.server.baseUrl} is unreachable${environmentService.isEnvironmentLocal() ? ' — is the backend container up?' : ''}`
        : message
    },
    // Shared by every caller: a send that arrives while the header is still loading the tools waits
    // for that same load rather than failing on it.
    loadSpec (force = false) {
      const spec = this.spec
      if (this.$_specLoad) return this.$_specLoad
      if (!force && spec.status === 'ready') return Promise.resolve()

      const base = this.server.baseUrl
      this.$_specLoad = (async () => {
        spec.status = 'loading'
        spec.error = ''
        try {
          const specResponse = await fetch(`${base}/openapi.json`, { cache: 'no-store' })
          if (!specResponse.ok) throw new Error(`GET /openapi.json answered ${specResponse.status}`)
          // Only the tools come from the spec. The value codes are in SYSTEM_PROMPT, written out.
          spec.tools = Object.freeze(buildTools(await specResponse.json()))
          spec.status = 'ready'
        } catch (error) {
          spec.status = 'error'
          spec.error = this.unreachable(error)
        } finally {
          this.$_specLoad = null
        }
      })()
      return this.$_specLoad
    },

    // --- Chats and persistence ------------------------------------------------------------------

    async loadChats () {
      try {
        const stored = await chatStore.all()
        this.chats = (stored || []).map(settle).sort((a, b) => b.updatedAt - a.updatedAt)
      } catch (error) {
        myConsole.log('Reading saved agent chats failed', error)
      }
      this.loaded = true
      if (this.chats.length) this.activeId = this.chats[0].id
      else this.createChat()
    },
    saveChat (chat, immediately = false) {
      const pending = this.$_pendingWrites.get(chat.id)
      if (pending) clearTimeout(pending.timer)
      const write = () => {
        this.$_pendingWrites.delete(chat.id)
        // A run that finishes after its chat was deleted must not write it back.
        if (!this.chats.includes(chat)) return
        // Nor after a sign-out: ldb.reset() has deleted the database, and a write would recreate it.
        if (!this.$store.getters.getToken) return
        // A plain copy: IndexedDB cannot store Vue's getters and setters.
        chatStore.put(JSON.parse(JSON.stringify(chat))).catch((error) => myConsole.log('Saving the agent chat failed', error))
      }
      if (immediately) write()
      else this.$_pendingWrites.set(chat.id, { timer: setTimeout(write, 400), write })
    },
    createChat () {
      const now = Date.now()
      const chat = {
        id: newId(),
        title: 'New chat',
        createdAt: now,
        updatedAt: now,
        messages: []
      }
      this.chats.unshift(chat)
      this.activeId = chat.id
      this.listOpen = false
      this.saveChat(chat, true)
      return chat
    },
    pickChat (id) {
      this.activeId = id
      this.listOpen = false
    },
    confirmDelete (chat) {
      this.$store.commit('confirmationBox/setConfirmationMessage', {
        confirmationMessage: `Delete "${chat.title}"? This cannot be undone.`,
        confirmationAction: () => this.deleteChat(chat.id)
      })
    },
    deleteChat (id) {
      this.stop(id)
      const index = this.chats.findIndex((chat) => chat.id === id)
      if (index < 0) return
      this.chats.splice(index, 1)
      const pending = this.$_pendingWrites.get(id)
      if (pending) clearTimeout(pending.timer)
      this.$_pendingWrites.delete(id)
      chatStore.remove(id).catch(ignore)
      if (this.activeId === id) {
        const next = this.chats[Math.min(index, this.chats.length - 1)]
        this.activeId = next ? next.id : null
      }
    },
    touch (chat) {
      chat.updatedAt = Date.now()
      const index = this.chats.indexOf(chat)
      if (index > 0) {
        this.chats.splice(index, 1)
        this.chats.unshift(chat)
      }
    },
    append (chat, message) {
      chat.messages.push(message)
      return message
    },

    // --- The agent loop -------------------------------------------------------------------------

    // The fixed prompt, then the session note, filled in afresh on every request.
    systemMessage () {
      const server = this.server
      const profile = this.profile
      const now = new Date()
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
      const note = [
        '## Session',
        `- Server: ${server.label} — ${server.baseUrl}${server.live ? ' (PRODUCTION: real donor data; every request is live)' : ''}`,
        `- Signed in as: ${profile.name} (${profile.designation}, ${profile.hall})`,
        `- Current time: ${now.toString()} — ${now.getTime()} in Unix milliseconds (time zone ${zone})`
      ].join('\n')
      return `${SYSTEM_PROMPT}\n\n${note}`
    },
    // Production always asks before a write, whatever the setting: its records are real donors.
    needsApproval (tool) {
      if (this.settings.approval === 'all') return true
      if (!tool.isWrite) return false
      return this.settings.approval === 'writes' || this.server.live
    },
    resolveApproval (toolCallId, approved) {
      const resolve = this.$_approvals.get(toolCallId)
      this.$_approvals.delete(toolCallId)
      if (resolve) resolve(approved)
    },
    stop (chatId) {
      const controller = this.$_controllers.get(chatId)
      if (controller) controller.abort()
    },
    async send (chat, text) {
      const content = text.trim()
      if (!content || this.running[chat.id]) return
      if (!chat.messages.some((message) => message.role === 'user')) chat.title = titleFrom(content)
      this.append(chat, { id: newId(), role: 'user', content, createdAt: Date.now() })
      this.touch(chat)
      this.saveChat(chat, true)
      await this.run(chat)
    },
    // Re-runs the model on the chat as it stands — after an OpenAI error, say, once the key is fixed.
    async retry (chat) {
      while (chat.messages.length && lastOf(chat.messages).role === 'notice') chat.messages.pop()
      await this.run(chat)
    },
    async run (chat) {
      if (this.running[chat.id]) return
      const controller = new AbortController()
      this.$_controllers.set(chat.id, controller)
      this.$set(this.running, chat.id, true)
      const notice = (content, level) =>
        this.append(chat, { id: newId(), role: 'notice', content, level, createdAt: Date.now() })

      try {
        if (!this.settings.verifiedApiKey) throw new OpenAiError('Add your OpenAI API key in Settings to start.')
        await this.loadSpec()
        if (this.spec.status !== 'ready') throw new Error(`The API tools did not load: ${this.spec.error}`)
        const model = MODEL
        const maxSteps = Math.max(1, Math.floor(Number(this.settings.maxSteps)) || DEFAULT_MAX_STEPS)

        for (let step = 0; ; step++) {
          if (step >= maxSteps) {
            notice(`Stopped after ${maxSteps} model calls in one turn (the limit in Settings). Send a message to carry on.`, 'info')
            break
          }

          // Re-read every step: a retried tool-list load may land while a turn is under way.
          const tools = this.spec.tools
          const assistant = this.append(chat, {
            id: newId(), role: 'assistant', content: '', tool_calls: null, model, usage: null, streaming: true, createdAt: Date.now()
          })
          const completion = await streamCompletion({
            apiKey: this.settings.verifiedApiKey,
            model,
            messages: toApiMessages(chat.messages.slice(0, -1), this.systemMessage()),
            tools: tools.map(toOpenAiTool),
            signal: controller.signal,
            onText: (delta) => { assistant.content += delta }
          })
          assistant.streaming = false
          assistant.usage = completion.usage
          if (completion.toolCalls.length) assistant.tool_calls = completion.toolCalls
          this.touch(chat)
          this.saveChat(chat)

          if (!completion.toolCalls.length) {
            if (completion.finishReason === 'length') notice('The answer was cut off at the model\'s output limit.', 'info')
            break
          }

          // One result message per call, created up front so the cards show the whole plan at once.
          const results = completion.toolCalls.map((call) => this.append(chat, {
            id: newId(),
            role: 'tool',
            tool_call_id: call.id,
            content: '',
            createdAt: Date.now(),
            run: newRun(call.function.name)
          }))
          // In order, one at a time: a turn often reads, then writes on what it read.
          for (let i = 0; i < completion.toolCalls.length; i++) {
            throwIfAborted(controller.signal)
            await this.runTool(chat, completion.toolCalls[i], results[i], tools, controller.signal)
            this.saveChat(chat)
          }
        }
      } catch (error) {
        const last = lastOf(chat.messages)
        if (last && last.role === 'assistant' && last.streaming) {
          last.streaming = false
          // An answer cut off mid-stream is kept, but one that never started is just noise.
          if (!last.content) chat.messages.pop()
        }
        if (controller.signal.aborted) notice('Stopped.', 'info')
        else notice(error instanceof Error ? error.message : String(error), 'error')
      } finally {
        for (const message of chat.messages) {
          if (message.role !== 'tool') continue
          if (message.run.status === 'pending' || message.run.status === 'awaiting-approval') {
            this.resolveApproval(message.tool_call_id, false)
            message.run.status = 'cancelled'
            message.content = NOT_SENT_RESULT
          }
        }
        this.$_controllers.delete(chat.id)
        this.$delete(this.running, chat.id)
        this.touch(chat)
        this.saveChat(chat, true)
      }
    },
    async runTool (chat, call, result, tools, signal) {
      const run = result.run
      const fail = (note) => {
        run.status = 'failed'
        run.note = note
        result.content = JSON.stringify({ error: note })
      }

      const tool = tools.find((candidate) => candidate.name === call.function.name)
      if (!tool) return fail(`There is no tool named "${call.function.name}".`)
      run.method = tool.method
      run.path = tool.path

      let args
      try {
        args = call.function.arguments.trim() ? JSON.parse(call.function.arguments) : {}
        run.args = args
      } catch {
        run.args = call.function.arguments
        return fail('The arguments were not valid JSON.')
      }
      if (!args || typeof args !== 'object' || Array.isArray(args)) return fail('The arguments must be a JSON object.')

      let request
      try {
        request = buildRequest(this.server.baseUrl, tool, args)
      } catch (error) {
        return fail(error instanceof Error ? error.message : String(error))
      }
      run.url = request.url
      run.body = request.body === undefined ? null : request.body

      if (this.needsApproval(tool)) {
        run.status = 'awaiting-approval'
        // A card that needs a decision opens itself: approving a request you cannot see is no approval.
        this.$set(this.openCards, call.id, true)
        this.saveChat(chat)
        const approved = await new Promise((resolve) => {
          this.$_approvals.set(call.id, resolve)
          signal.addEventListener('abort', () => resolve(false), { once: true })
        })
        this.$_approvals.delete(call.id)
        throwIfAborted(signal)
        if (!approved) {
          run.status = 'denied'
          result.content = JSON.stringify({ error: 'The user declined this request, so it was not sent. Ask before trying something else.' })
          return
        }
      }

      run.status = 'running'
      try {
        // The member's own session: the same token the rest of the app sends.
        const response = await sendRequest(request, this.$store.getters.getToken, signal)
        const body = response.body
        run.status = 'done'
        run.httpStatus = response.httpStatus
        run.durationMs = response.durationMs
        run.response = clip(typeof body === 'string' ? body : JSON.stringify(body, null, 2), MAX_DISPLAY_CHARS, 'not shown')
        result.content = clip(JSON.stringify({ httpStatus: response.httpStatus, body }), MAX_RESULT_CHARS, 'truncated by the app')
      } catch (error) {
        if (signal.aborted) {
          run.status = 'cancelled'
          result.content = CANCELLED_RESULT
          throw error
        }
        fail(`The request did not complete: ${this.unreachable(error)}`)
      }
    },

    // --- Composer and scrolling -----------------------------------------------------------------

    submit () {
      if (!this.chat || this.chatRunning || this.blocker || !this.draft.trim()) return
      const text = this.draft
      this.draft = ''
      this.send(this.chat, text)
    },
    onKey (event) {
      if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
        event.preventDefault()
        this.submit()
      }
    },
    useExample (text) {
      this.draft = text
      this.focusInput(true)
    },
    // Not on a phone unless asked: focusing the box there throws the keyboard up over the chat.
    focusInput (always = false) {
      if (!always && !this.$vuetify.breakpoint.mdAndUp) return
      this.$nextTick(() => {
        const input = this.$refs.input
        if (input && input.focus) input.focus()
      })
    },
    onScroll () {
      const el = this.$refs.scroller
      if (el) this.$_pinned = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    },
    // Follow the stream while the reader is at the bottom; leave them be once they scroll up to read.
    toBottom (force) {
      this.$nextTick(() => {
        const el = this.$refs.scroller
        if (el && (this.$_pinned || force)) el.scrollTop = el.scrollHeight
      })
    },

    // --- Messages and tool cards ----------------------------------------------------------------

    usageLabel (message) {
      const usage = message.usage
      if (!usage) return message.model
      const k = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n))
      const cached = usage.prompt_tokens_details && usage.prompt_tokens_details.cached_tokens
      return `${message.model} · ${k(usage.prompt_tokens)} in${cached ? ` (${k(cached)} cached)` : ''} · ${k(usage.completion_tokens)} out`
    },
    runOf (call) {
      const result = this.results.get(call.id)
      return result ? result.run : NO_RUN
    },
    toggleCard (call) {
      this.$set(this.openCards, call.id, !this.openCards[call.id])
    },
    methodColor (method) {
      return METHOD_COLORS[method] || 'grey'
    },
    toolTone (call) {
      const run = this.runOf(call)
      if (run.status === 'done') return run.httpStatus && run.httpStatus < 400 ? 'ok' : 'err'
      if (run.status === 'failed') return 'err'
      if (run.status === 'awaiting-approval') return 'warn'
      return 'neutral'
    },
    toneColor (call) {
      return TONE_COLORS[this.toolTone(call)]
    },
    toolLabel (call) {
      const run = this.runOf(call)
      switch (run.status) {
        case 'pending': return 'queued'
        case 'awaiting-approval': return 'needs approval'
        case 'running': return 'running…'
        case 'denied': return 'declined'
        case 'cancelled': return 'cancelled'
        case 'failed': return 'not sent'
        default: return `${run.httpStatus || ''}${run.durationMs !== null ? ` · ${run.durationMs} ms` : ''}`
      }
    },
    argsText (call) {
      const run = this.runOf(call)
      if (run.args !== null) return pretty(run.args)
      try {
        return pretty(JSON.parse(call.function.arguments || '{}'))
      } catch {
        return call.function.arguments
      }
    },
    async copyCurl (call) {
      const run = this.runOf(call)
      if (!run.url) return
      const parts = [`curl -X ${run.method} '${run.url}'`, '-H \'x-auth: $BADHAN_TOKEN\'']
      if (run.body !== null) parts.push('-H \'Content-Type: application/json\'', `-d '${JSON.stringify(run.body).replace(/'/g, "'\\''")}'`)
      try {
        await this.$copyText(parts.join(' \\\n  '))
        this.copiedCall = call.id
        setTimeout(() => { if (this.copiedCall === call.id) this.copiedCall = null }, 1500)
      } catch {
        await this.$store.dispatch('notification/notifyError', 'Could not copy to clipboard')
      }
    },

    // --- Settings -------------------------------------------------------------------------------

    // Settings live in the sidebar, so on a narrow screen the sidebar's drawer opens with them.
    openSettings () {
      this.settingsOpen = true
      this.listOpen = true
    },
    // Keeps the key only if OpenAI proves it works; otherwise it stays in the field with the reason.
    async saveKey () {
      const key = this.keyDraft.trim()
      if (!key || this.checkingKey) return
      this.checkingKey = true
      this.keyError = ''
      try {
        await checkApiKey(key)
        this.settings.verifiedApiKey = key
        this.keyDraft = ''
        this.showKey = false
      } catch (error) {
        this.keyError = error instanceof Error ? error.message : String(error)
      } finally {
        this.checkingKey = false
      }
    },
    clearKey () {
      this.settings.verifiedApiKey = ''
    }
  }
}
</script>

<style scoped>
/* Colours are translucent greys rather than fixed ones, so the page reads the same in day and
   night mode without a second set. */
.agent-page {
  --agent-line: rgba(128, 128, 128, 0.28);
  --agent-fill: rgba(128, 128, 128, 0.12);
  --agent-mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
}

/* Fills the screen below the title bar, so the thread scrolls and the box to type in stays put. */
.agent-card {
  position: relative;
  display: flex;
  max-width: 1200px;
  height: calc(100vh - 152px);
  min-height: 440px;
  overflow: hidden;
}

.agent-sidebar {
  flex: 0 0 260px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 12px 8px 8px;
  border-right: 1px solid var(--agent-line);
}
.agent-chat-list { flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; }
.agent-chat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 4px 6px 10px;
  border-radius: 10px;
  cursor: pointer;
}
.agent-chat-item:hover, .agent-chat-item--active { background: var(--agent-fill); }
.agent-chat-item-text { flex: 1; min-width: 0; }
.agent-chat-item-title { font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.agent-chat-item-delete { opacity: 0; }
.agent-chat-item:hover .agent-chat-item-delete,
.agent-chat-item--active .agent-chat-item-delete,
.agent-chat-item-delete:focus { opacity: 1; }
@media (hover: none) { .agent-chat-item-delete { opacity: 1; } }
.agent-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin: 0 6px 1px 0;
  vertical-align: middle;
  border-radius: 50%;
  background: #43a047;
  animation: agent-pulse 1.2s infinite;
}
@keyframes agent-pulse { 50% { opacity: 0.3; } }
.agent-scrim { display: none; }

.agent-pane { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.agent-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  border-bottom: 1px solid var(--agent-line);
}
.agent-title { flex: 1; min-width: 80px; }
.agent-title ::v-deep input { font-weight: 600; }
.agent-tools { display: inline-flex; align-items: center; gap: 4px; flex: none; }
.agent-live {
  padding: 6px 16px;
  color: #c62828;
  background: rgba(229, 57, 53, 0.1);
  border-bottom: 1px solid rgba(229, 57, 53, 0.25);
}

.agent-scroll { flex: 1; min-height: 0; overflow-y: auto; }
.agent-thread { max-width: 860px; margin: 0 auto; padding: 16px 16px 24px; }
.agent-prompt { border: 1px solid var(--agent-line); border-radius: 10px; overflow: hidden; }
.agent-min-0 { min-width: 0; }
.agent-ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }

.agent-msg { margin: 0 0 16px; line-height: 1.6; }
.agent-msg--user { display: flex; justify-content: flex-end; }
.agent-bubble {
  background: var(--agent-fill);
  border-radius: 16px 16px 4px 16px;
  padding: 8px 14px;
  max-width: min(640px, 85%);
  white-space: pre-wrap;
  word-break: break-word;
}
.agent-answer { white-space: pre-wrap; word-break: break-word; }

.agent-thinking { display: flex; gap: 4px; padding: 8px 0; }
.agent-thinking span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.25;
  animation: agent-blink 1.2s infinite ease-in-out;
}
.agent-thinking span:nth-child(2) { animation-delay: 0.15s; }
.agent-thinking span:nth-child(3) { animation-delay: 0.3s; }
@keyframes agent-blink { 0%, 80%, 100% { opacity: 0.25; } 40% { opacity: 0.9; } }

.agent-tool {
  border: 1px solid var(--agent-line);
  border-left-width: 3px;
  border-radius: 8px;
  margin: 6px 0;
  overflow: hidden;
}
.agent-tool--ok { border-left-color: #43a047; }
.agent-tool--err { border-left-color: #e53935; }
.agent-tool--warn { border-left-color: #fb8c00; }
.agent-tool-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  font-size: 13.5px;
  cursor: pointer;
}
.agent-tool-head:hover { background: var(--agent-fill); }
.agent-chevron { flex: none; transition: transform 0.15s; }
.agent-chevron--open { transform: rotate(90deg); }
.agent-tool-path { font-family: var(--agent-mono); font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.agent-tool-name { flex: 1; min-width: 0; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.agent-approval {
  padding: 10px 12px;
  background: rgba(251, 140, 0, 0.12);
  border-top: 1px solid var(--agent-line);
}
.agent-tool-body { display: grid; gap: 10px; padding: 10px 12px; border-top: 1px solid var(--agent-line); }
.agent-field { display: grid; gap: 4px; min-width: 0; }
.agent-label { font-size: 11.5px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; opacity: 0.7; }
.agent-pre {
  margin: 0;
  padding: 8px 10px;
  max-height: 240px;
  overflow: auto;
  border-radius: 8px;
  background: var(--agent-fill);
  color: inherit;
  font-family: var(--agent-mono);
  font-size: 12.5px;
  white-space: pre-wrap;
  word-break: break-word;
}
.agent-pre--tall { max-height: 400px; }

.agent-composer { padding: 8px 12px 10px; border-top: 1px solid var(--agent-line); }
.agent-input ::v-deep textarea { max-height: 200px; overflow-y: auto !important; line-height: 1.45; }
/* Sized to its content, but never more than most of the sidebar: past that it scrolls, and the chat
   list above keeps a little room. */
.agent-settings {
  flex: none;
  max-height: 70%;
  overflow-y: auto;
  padding: 12px 4px 4px;
  border-top: 1px solid var(--agent-line);
}
.agent-nothing { flex: 1; display: flex; align-items: center; justify-content: center; }

/* Narrow screens: the chat list becomes a drawer over the chat, opened from the menu button. */
@media (max-width: 959px) {
  .agent-card { height: calc(100vh - 144px); }
  .agent-sidebar {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 3;
    width: min(300px, 85%);
    border-right: 0;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
    transform: translateX(-110%);
    transition: transform 0.2s;
  }
  .agent-card--list-open .agent-sidebar { transform: none; }
  .agent-card--list-open .agent-scrim {
    display: block;
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 2;
    background: rgba(0, 0, 0, 0.3);
  }
  .agent-thread { padding: 12px 12px 20px; }
}
@media (max-width: 600px) {
  .agent-tool-name { display: none; }
}
</style>
