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
          <p class="font-weight-medium mb-2">The token inside it never expires</p>
          <p class="mb-2">
            It is <b>not</b> your own sign-in — each button below asks the server for a separate
            token, and your own session is untouched either way. But it has no clock on it: it
            keeps working until somebody deliberately ends it.
          </p>
          <p class="mb-2">
            Until then the token is you: whoever holds the file can do everything your role
            allows, without your password. Do not post it in a group chat or email it, and delete
            it once the assistant is done.
          </p>
          <p class="mb-0">
            <b>To end one, open My Profile and press Logout on its entry in the device list</b> —
            each press of a button below adds one there. Signing out of this browser does
            <b>not</b> end it; <b>Sign out from all devices</b> ends every one of them at once.
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
            A config file is written once and then forgotten about, which is why these tokens do
            not expire: a connection that lapsed every half hour would mean editing that file
            every half hour. <b>The other side of that is that the connection lasts until you end
            it</b>, so when an assistant no longer needs Badhan, open My Profile and press Logout
            on its entry in the device list.
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
  buildAIIntegrationPrompt,
  buildMCPCLICommand,
  buildMCPConfigJSON,
  buildMCPConnectorURL,
  getAIPromptBaseURL,
  getMCPEndpointURL
} from '@/mixins/aiPrompt'
import { isGuestEnabled } from '@/api'

const HIDDEN_TOKEN = '<a token goes here — hidden in this preview>'

export default {
  name: 'AIIntegrationPage',
  components: { PageTitle, Container, Button },
  data: () => ({
    busy: false
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
    environmentName () {
      return environmentService.getEnvironmentName()
    },
    maskedPrompt () {
      return buildAIIntegrationPrompt(HIDDEN_TOKEN, this.baseURL, this.environmentName)
    }
  },
  methods: {
    // One fresh token per press, rather than one per page visit: each press adds a separate
    // entry to the member's device list, and pressing twice must not hand out the same one.
    // Returns null when the server refuses, having already said why.
    async buildPrompt () {
      const response = await this.$store.dispatch('requestRedirectionToken')
      if (!response || response.status !== HTTP_STATUS.CREATED) {
        const message = (response && response.data && response.data.message) ? response.data.message : 'Could not create a token for the file'
        await this.$store.dispatch('notification/notifyError', message)
        return null
      }
      return buildAIIntegrationPrompt(response.data.token, this.baseURL, this.environmentName)
    },
    async handleDownload () {
      this.busy = true
      const prompt = await this.buildPrompt()
      this.busy = false
      if (!prompt) return
      textFileDownloadInWeb(prompt, AI_PROMPT_FILE_NAME, 'text/markdown;charset=utf-8')
      await this.$store.dispatch('notification/notifySuccess', 'Prompt file downloaded. End it later from My Profile')
    },
    // The MCP half mints its own token, one per press — same rule as the file: each press is a
    // separate entry in the device list, so a member can end one connection without ending the
    // rest. Returns null when the server refuses, having already said why.
    async mintMCPToken () {
      const response = await this.$store.dispatch('requestRedirectionToken')
      if (!response || response.status !== HTTP_STATUS.CREATED) {
        const message = (response && response.data && response.data.message) ? response.data.message : 'Could not create a token for the connection'
        await this.$store.dispatch('notification/notifyError', message)
        return null
      }
      return response.data.token
    },
    async copyMCP (build, what) {
      this.busy = true
      const token = await this.mintMCPToken()
      this.busy = false
      if (!token) return
      try {
        await this.$copyText(build(token, this.mcpEndpointURL))
        await this.$store.dispatch('notification/notifySuccess', `${what} copied. End it later from My Profile`)
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
        await this.$store.dispatch('notification/notifySuccess', 'Prompt copied. End it later from My Profile')
      } catch (e) {
        await this.$store.dispatch('notification/notifyError', 'Could not copy to clipboard. Use the download button instead')
      }
    }
  }
}
</script>

<style scoped>
.ai-prompt-preview {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 12px;
  max-height: 400px;
  overflow-y: auto;
}
</style>
