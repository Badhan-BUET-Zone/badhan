<template>
  <div :key="'aiIntegration'">
    <PageTitle :title="$route.meta.title"></PageTitle>
    <Container>
      <v-card-title>AI Integration</v-card-title>
      <v-card-text>
        <p>
          This page prepares a single file for an AI assistant. The file explains how the Badhan
          API works — where it lives, how it is authenticated, what its numbers mean, and what it
          refuses to do — and carries a sign-in token inside it. Hand the file to an AI assistant
          and it can then act on Badhan from plain instructions, such as
          <i>"find O+ donors in Titumir who have not donated since March"</i>.
        </p>

        <!-- Not a hint in small grey text: the file is a live credential, and someone who has
             not read this before sending it somewhere cannot un-send it. -->
        <v-alert type="warning" outlined class="rounded-xl">
          <p class="font-weight-medium mb-2">The file expires {{ durationLabel }} after you make it</p>
          <p class="mb-2">
            The token inside it is <b>not</b> your own sign-in. Each button below asks the server
            for a fresh temporary token that stops working {{ durationLabel }} later, so an old
            file is a dead file. Your own session is untouched either way.
          </p>
          <p class="mb-2">
            For those {{ durationLabel }}, though, the token is you: whoever holds the file can do
            everything your role allows, without your password. Do not post it in a group chat or
            email it, and delete it once the assistant is done.
          </p>
          <p class="mb-0">
            If it goes somewhere it should not have, <b>sign out</b> — that ends the session every
            token from this page hangs off, including ones still inside their {{ durationLabel }}.
          </p>
        </v-alert>

        <v-simple-table class="mb-4">
          <template v-slot:default>
            <tbody>
            <tr>
              <td><b>Server the file points at:</b></td>
              <td><code>{{ baseURL }}</code></td>
            </tr>
            <tr>
              <td><b>Build:</b></td>
              <td>{{ environmentName }}</td>
            </tr>
            <tr>
              <td><b>Token lifetime:</b></td>
              <td>{{ durationLabel }}</td>
            </tr>
            </tbody>
          </template>
        </v-simple-table>

        <div class="d-flex align-center flex-wrap mb-4">
          <Button
            :click="handleDownload"
            :disabled="busy"
            color="primary"
            icon="mdi-download"
            text="Download Prompt File"
            data-cy="downloadAiPromptId"
          />
          <Button
            :click="handleCopy"
            :disabled="busy"
            color="secondary"
            icon="mdi-content-copy"
            text="Copy to Clipboard"
            data-cy="copyAiPromptId"
          />
          <transition name="fade">
            <v-progress-circular v-if="busy" indeterminate color="primary" size="20" class="ml-3"/>
          </transition>
        </div>

        <!-- The preview shows the file as it will be written, with the token blanked. There is no
             real one to show in any case: nothing is minted until a button is pressed, so a page
             left open on this panel is holding no credential at all. -->
        <v-expansion-panels flat class="rounded-xl">
          <v-expansion-panel>
            <v-expansion-panel-header data-cy="aiPromptPreviewId">
              Preview the file (token hidden)
            </v-expansion-panel-header>
            <v-expansion-panel-content>
              <pre class="ai-prompt-preview">{{ maskedPrompt }}</pre>
            </v-expansion-panel-content>
          </v-expansion-panel>
        </v-expansion-panels>

        <v-divider class="my-6"/>

        <v-card-title class="pl-0">Connect an MCP client</v-card-title>

        <!-- The demo has no MCP endpoint. Saying so is the whole content of guest mode here:
             offering a /guest/mcp URL that will 404 is worse than offering nothing. -->
        <p v-if="isGuest" data-cy="mcpGuestNoticeId">
          The demo has no MCP endpoint. Sign in to the real Badhan to connect an assistant.
        </p>

        <template v-else>
          <p>
            Instead of handing over a file each time, you can connect an assistant to Badhan
            <b>once</b>. It then gets a named list of things it can do here — search donors, log a
            donation, read the member room — and asks you before the ones that change something.
            It can do exactly what your role allows and nothing more, and the App Activity page
            records those actions as yours.
          </p>

          <v-simple-table class="mb-4">
            <template v-slot:default>
              <tbody>
              <tr>
                <td><b>MCP endpoint:</b></td>
                <td><code data-cy="mcpEndpointId">{{ mcpEndpointURL }}</code></td>
              </tr>
              </tbody>
            </template>
          </v-simple-table>

          <!-- The selector sits above the buttons rather than beside them: it changes what every
               one of them mints, and a control that reads as belonging to one button would be a
               lie about the other two. -->
          <v-select
            :items="durationOptions"
            v-model="mcpDurationSeconds"
            item-text="label"
            item-value="seconds"
            label="How long the connection lasts"
            outlined
            dense
            class="mcp-duration-select"
            data-cy="mcpDurationId"
          />

          <v-alert
            v-if="mcpDurationSeconds !== defaultDurationSeconds"
            type="warning"
            outlined
            class="rounded-xl"
            data-cy="mcpLongLifetimeWarningId"
          >
            <b>{{ mcpDurationLabel }} is {{ lifetimeMultiplier }} times the window in which a
              leaked config file is a live credential.</b> For all of it, whoever holds that file
            can do everything your role allows. Signing out remains the only way to end it early.
          </v-alert>

          <p class="mb-2">Press the one that matches your assistant:</p>

          <div class="d-flex align-center flex-wrap mb-2">
            <Button
              :click="handleCopyMCPConfig"
              :disabled="busy"
              color="primary"
              icon="mdi-content-copy"
              text="Copy MCP Config"
              data-cy="copyMcpConfigId"
            />
            <Button
              :click="handleCopyMCPCommand"
              :disabled="busy"
              color="secondary"
              icon="mdi-content-copy"
              text="Copy CLI Command"
              data-cy="copyMcpCommandId"
            />
            <Button
              :click="handleCopyMCPConnectorURL"
              :disabled="busy"
              color="secondary"
              icon="mdi-link-variant"
              text="Copy Connector URL"
              data-cy="copyMcpConnectorUrlId"
            />
          </div>

          <v-simple-table class="mb-4">
            <template v-slot:default>
              <tbody>
              <tr>
                <td><b>Copy MCP Config</b></td>
                <td>Cursor, VS Code, Zed, and any assistant with a config file — paste the block
                  into its MCP settings.</td>
              </tr>
              <tr>
                <td><b>Copy CLI Command</b></td>
                <td>Claude Code — paste the line into a terminal.</td>
              </tr>
              <tr>
                <td><b>Copy Connector URL</b></td>
                <td>ChatGPT, and Claude on the web or your phone — add it as a connector and
                  choose <i>no authentication</i>.</td>
              </tr>
              </tbody>
            </template>
          </v-simple-table>

          <!-- Its own warning, not the shared one above, because the shape of the secret changes:
               this one looks like a link, and a link is the one kind of text everybody has been
               taught is safe to share. -->
          <v-alert type="error" outlined class="rounded-xl" data-cy="mcpConnectorWarningId">
            <b>The connector URL is the password.</b> The token sits inside the address itself, so
            anyone you send that link to is signed in as you until it lapses. Treat it exactly as
            you would the file above: never in a group chat, never in a screenshot.
          </v-alert>

          <p class="mb-0">
            A config file is written once and then forgotten about, which is the one way this
            differs from the file above: <b>the connection stops working when its token lapses,
            and the dead token stays in that file until you replace it.</b> When an assistant
            starts saying it is not authorised, press the button again and paste the new one in.
          </p>
        </template>
      </v-card-text>
    </Container>
  </div>
</template>

<script>
import PageTitle from '@/components/PageTitle'
import Container from '@/components/Container/Container'
import Button from '@/components/UI Components/Button'
import { textFileDownloadInWeb } from '@/mixins/helpers'
import { environmentService } from '@/mixins/environment'
import { HTTP_STATUS } from '@/mixins/constants'
import {
  AI_PROMPT_FILE_NAME,
  AI_TOKEN_DURATION_LABEL,
  AI_TOKEN_DURATION_SECONDS,
  buildAIIntegrationPrompt,
  buildMCPCLICommand,
  buildMCPConfigJSON,
  buildMCPConnectorURL,
  getAIPromptBaseURL,
  getMCPEndpointURL,
  MCP_DEFAULT_DURATION_SECONDS,
  MCP_TOKEN_DURATION_OPTIONS
} from '@/mixins/aiPrompt'
import { isGuestEnabled } from '@/api'

const HIDDEN_TOKEN = '<a temporary token goes here — hidden in this preview>'
const HIDDEN_EXPIRY = `<${AI_TOKEN_DURATION_LABEL} after you press the button>`

export default {
  name: 'AIIntegrationPage',
  components: { PageTitle, Container, Button },
  data: () => ({
    busy: false,
    // 30 minutes on load, always. A member who wants longer has to choose it, and choosing is
    // what puts the warning in front of them.
    mcpDurationSeconds: MCP_DEFAULT_DURATION_SECONDS
  }),
  computed: {
    baseURL () {
      return getAIPromptBaseURL(isGuestEnabled())
    },
    isGuest () {
      return isGuestEnabled()
    },
    mcpEndpointURL () {
      return getMCPEndpointURL()
    },
    durationOptions () {
      return MCP_TOKEN_DURATION_OPTIONS
    },
    defaultDurationSeconds () {
      return MCP_DEFAULT_DURATION_SECONDS
    },
    mcpDurationLabel () {
      const option = MCP_TOKEN_DURATION_OPTIONS.find(item => item.seconds === this.mcpDurationSeconds)
      return option ? option.label : ''
    },
    lifetimeMultiplier () {
      return Math.round(this.mcpDurationSeconds / MCP_DEFAULT_DURATION_SECONDS)
    },
    environmentName () {
      return environmentService.getEnvironmentName()
    },
    durationLabel () {
      return AI_TOKEN_DURATION_LABEL
    },
    maskedPrompt () {
      return buildAIIntegrationPrompt(HIDDEN_TOKEN, this.baseURL, this.environmentName, HIDDEN_EXPIRY)
    }
  },
  methods: {
    // One fresh token per press, rather than one per page visit: the clock starts when the file
    // is made, so a page left open all afternoon must not hand out a token that expired at lunch.
    // Returns null when the server refuses, having already said why.
    async buildPrompt () {
      const response = await this.$store.dispatch('requestRedirectionToken', AI_TOKEN_DURATION_SECONDS)
      if (!response || response.status !== HTTP_STATUS.CREATED) {
        const message = (response && response.data && response.data.message) ? response.data.message : 'Could not create a token for the file'
        await this.$store.dispatch('notification/notifyError', message)
        return null
      }
      // The server clamps and reports back what it actually granted, so the expiry printed in the
      // file is the server's answer rather than this page's request.
      const grantedSeconds = response.data.durationSeconds || AI_TOKEN_DURATION_SECONDS
      const expiresAt = new Date(Date.now() + grantedSeconds * 1000).toLocaleString()
      return buildAIIntegrationPrompt(response.data.token, this.baseURL, this.environmentName, expiresAt)
    },
    async handleDownload () {
      this.busy = true
      const prompt = await this.buildPrompt()
      this.busy = false
      if (!prompt) return
      textFileDownloadInWeb(prompt, AI_PROMPT_FILE_NAME, 'text/markdown;charset=utf-8')
      await this.$store.dispatch('notification/notifySuccess', `Prompt file downloaded. Its token works for ${AI_TOKEN_DURATION_LABEL}`)
    },
    // The MCP half mints its own token, at the chosen lifetime, one per press — same rule as the
    // file: the clock starts when the config is made, not when the page was opened.
    // Returns null when the server refuses, having already said why.
    async mintMCPToken () {
      const response = await this.$store.dispatch('requestRedirectionToken', this.mcpDurationSeconds)
      if (!response || response.status !== HTTP_STATUS.CREATED) {
        const message = (response && response.data && response.data.message) ? response.data.message : 'Could not create a token for the connection'
        await this.$store.dispatch('notification/notifyError', message)
        return null
      }
      // What the server granted, never what this page asked for. The server clamps, and a page
      // that echoed its own request would tell members a lifetime they do not have.
      const grantedSeconds = response.data.durationSeconds || this.mcpDurationSeconds
      const granted = MCP_TOKEN_DURATION_OPTIONS.find(item => item.seconds === grantedSeconds)
      return { token: response.data.token, label: granted ? granted.label : `${grantedSeconds} seconds` }
    },
    async copyMCP (build, what) {
      this.busy = true
      const minted = await this.mintMCPToken()
      this.busy = false
      if (!minted) return
      try {
        await this.$copyText(build(minted.token, this.mcpEndpointURL))
        await this.$store.dispatch('notification/notifySuccess', `${what} copied. The connection works for ${minted.label}`)
      } catch (e) {
        await this.$store.dispatch('notification/notifyError', 'Could not copy to clipboard')
      }
    },
    async handleCopyMCPConfig () {
      await this.copyMCP(buildMCPConfigJSON, 'MCP config')
    },
    async handleCopyMCPCommand () {
      await this.copyMCP(buildMCPCLICommand, 'CLI command')
    },
    async handleCopyMCPConnectorURL () {
      await this.copyMCP(buildMCPConnectorURL, 'Connector URL')
    },
    async handleCopy () {
      this.busy = true
      const prompt = await this.buildPrompt()
      this.busy = false
      if (!prompt) return
      try {
        await this.$copyText(prompt)
        await this.$store.dispatch('notification/notifySuccess', `Prompt copied. Its token works for ${AI_TOKEN_DURATION_LABEL}`)
      } catch (e) {
        await this.$store.dispatch('notification/notifyError', 'Could not copy to clipboard. Use the download button instead')
      }
    }
  }
}
</script>

<style scoped>
.mcp-duration-select {
  max-width: 320px;
}

.ai-prompt-preview {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 12px;
  max-height: 400px;
  overflow-y: auto;
}
</style>
