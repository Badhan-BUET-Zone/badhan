<template>
  <div :key="'aiIntegration'">
    <PageTitle :title="$route.meta.title"></PageTitle>
    <Container>
      <v-card-title>Use Badhan with AI</v-card-title>
      <v-card-text>
        <p>
          Let an AI assistant help with Badhan using everyday instructions. Connect with your
          favorite AI and then simply ask:
          <i>"find O+ donors in Titumir who have not donated since March"</i>.
        </p>
        <p lang="bn">
          সাধারণ ভাষায় নির্দেশনা দিয়ে একটি AI সহকারীকে Badhan-এর কাজে আপনাকে সাহায্য করতে দিন।
          আপনার পছন্দের AI-এর সাথে সংযোগ করুন, তারপর সহজভাবে জিজ্ঞেস করুন:
          <i>"তিতুমীর হলে O+ রক্তদাতা খুঁজে দাও, যাঁরা মার্চের পর আর রক্ত দেননি"</i>।
        </p>

        <v-card-title class="pl-0">Connect to AI</v-card-title>
        <p>
          <b>If you want to connect to AI temporarily:</b> choose the AI assistant you use, then
          follow the setup steps.
        </p>

        <v-select
          v-model="selectedSetupAIApp"
          :items="setupAIApps"
          label="Which AI assistant are you using?"
          outlined
          rounded
          dense
          hide-details
          class="mb-4"
          data-cy="setupAiAppSelectorId"
        />

        <v-card v-if="selectedSetupAIApp" outlined class="pa-4 mb-4" data-cy="setupAiAppInstructionsId">
          <div class="d-flex align-center flex-wrap mb-4">
            <span class="mr-3">Allow this Badhan domain when your AI assistant asks:</span>
            <code data-cy="aiSetupDomainId">{{ badhanDomain }}</code>
            <Button
              :click="handleCopyDomain"
              color="secondary"
              icon="mdi-content-copy"
              text="Copy Domain"
              data-cy="copyAiSetupDomainId"
            />
          </div>

          <template v-if="selectedSetupAIApp === 'chatgpt'">
            <h3 class="text-subtitle-1 mb-3">ChatGPT</h3>
            <ol class="pl-5 mb-4">
              <li>Press <b>Download Setup File</b>.</li>
              <li>Upload the file to a new ChatGPT conversation.</li>
              <li>When ChatGPT asks to use a website, allow the Badhan domain written in the setup file.</li>
            </ol>
          </template>

          <template v-else>
            <h3 class="text-subtitle-1 mb-3">Claude Web UI</h3>
            <ol class="pl-5 mb-4">
              <li>Press <b>Download Setup File</b>.</li>
              <li>Upload the file to a new Claude conversation in your web browser.</li>
              <li>When Claude asks to use a website, allow the Badhan domain written in the setup file.</li>
            </ol>
          </template>

          <div class="d-flex align-center flex-wrap">
            <Button
              :click="handleDownload"
              :disabled="busy"
              color="primary"
              icon="mdi-download"
              text="Download Setup File"
              data-cy="downloadAiPromptId"
            />
            <transition name="fade">
              <v-progress-circular v-if="busy" indeterminate color="primary" size="20" class="ml-3"/>
            </transition>
          </div>
        </v-card>

        <v-divider class="mt-6"/>

        <v-card-title class="pl-0">Connect an AI app</v-card-title>

        <p v-if="isGuest" data-cy="mcpGuestNoticeId">
          Sign in to Badhan to connect an AI app.
        </p>

        <template v-else>
          <p>
            <b>If you want to connect to AI for long-term use:</b> connect an app once to let it
            help with Badhan whenever you need it.
          </p>

          <v-select
            v-model="selectedAIApp"
            :items="aiApps"
            label="Which AI app are you using?"
            outlined
            rounded
            dense
            hide-details
            class="mb-4"
            data-cy="aiAppSelectorId"
          />

          <v-card v-if="selectedAIApp" outlined class="pa-4 mb-4" data-cy="aiAppInstructionsId">
            <template v-if="selectedAIApp === 'desktop'">
              <h3 class="text-subtitle-1 mb-3">VS Code, Cursor, or another desktop AI app</h3>
              <ol class="pl-5 mb-4">
                <li>Press <b>Copy Desktop App Setup</b>.</li>
                <li>Open your app's settings and look for <b>MCP</b>, <b>Tools</b>, or <b>Integrations</b>.</li>
                <li>Paste the setup, save it, and allow Badhan when the app asks for permission.</li>
              </ol>
              <Button
                :click="handleCopyMCPConfig"
                :disabled="busy"
                color="primary"
                icon="mdi-content-copy"
                text="Copy Desktop App Setup"
                data-cy="copyMcpConfigId"
              />
            </template>

            <template v-else-if="selectedAIApp === 'claude-code'">
              <h3 class="text-subtitle-1 mb-3">Claude Code</h3>
              <ol class="pl-5 mb-4">
                <li>Press <b>Copy Claude Code Setup</b>.</li>
                <li>Open the terminal where you use Claude Code.</li>
                <li>Paste the setup, press Enter, and allow Badhan when Claude Code asks for permission.</li>
              </ol>
              <Button
                :click="handleCopyMCPCommand"
                :disabled="busy"
                color="primary"
                icon="mdi-content-copy"
                text="Copy Claude Code Setup"
                data-cy="copyMcpCommandId"
              />
            </template>

            <template v-else-if="selectedAIApp === 'chatgpt'">
              <h3 class="text-subtitle-1 mb-3">ChatGPT</h3>
              <ol class="pl-5 mb-4">
                <li>Press <b>Copy ChatGPT Link</b>.</li>
                <li>In ChatGPT, open <b>Settings</b>, then <b>Apps</b>.</li>
                <li>Add a custom app or connector, paste the link, and follow the prompts to save it.</li>
              </ol>
              <Button
                :click="handleCopyMCPConnectorURL"
                :disabled="busy"
                color="primary"
                icon="mdi-link-variant"
                text="Copy ChatGPT Link"
                data-cy="copyMcpConnectorUrlId"
              />
            </template>

            <template v-else>
              <h3 class="text-subtitle-1 mb-3">Claude</h3>
              <ol class="pl-5 mb-4">
                <li>Press <b>Copy Claude Link</b>.</li>
                <li>In Claude, open <b>Customize</b>, then <b>Connectors</b>.</li>
                <li>Select <b>Add custom connector</b>, paste the link, and select <b>Add</b>.</li>
              </ol>
              <Button
                :click="handleCopyMCPConnectorURL"
                :disabled="busy"
                color="primary"
                icon="mdi-link-variant"
                text="Copy Claude Link"
                data-cy="copyMcpConnectorUrlId"
              />
            </template>
          </v-card>

          <p class="mb-0">
            You can remove an app's access at any time from <b>My Profile</b>.
          </p>
        </template>

        <v-alert type="warning" outlined class="rounded-xl mt-6">
          <p class="font-weight-medium mb-2">Only connect an assistant you trust</p>
          <p class="mb-2">
            The assistant will have the same access to Badhan as you do. Do not share a setup file
            or connection link with anyone else.
          </p>
          <p class="mb-0">
            When you no longer want an assistant to use Badhan, open <b>My Profile</b> and remove
            it from your signed-in devices.
          </p>
        </v-alert>
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

export default {
  name: 'AIIntegrationPage',
  components: { PageTitle, Container, Button },
  data: () => ({
    busy: false,
    selectedSetupAIApp: null,
    selectedAIApp: null,
    setupAIApps: [
      { text: 'I am using ChatGPT', value: 'chatgpt' },
      { text: 'I am using Claude Web UI', value: 'claude-web' }
    ],
    aiApps: [
      { text: 'I am using VS Code, Cursor, or another desktop AI app', value: 'desktop' },
      { text: 'I am using Claude Code', value: 'claude-code' },
      { text: 'I am using ChatGPT (only for paid)', value: 'chatgpt' },
      { text: 'I am using Claude', value: 'claude' }
    ]
  }),
  computed: {
    baseURL () {
      return getAIPromptBaseURL(isGuestEnabled())
    },
    badhanDomain () {
      return new URL(this.baseURL).hostname
    },
    isGuest () {
      return isGuestEnabled()
    },
    mcpEndpointURL () {
      return getMCPEndpointURL()
    },
    environmentName () {
      return environmentService.getEnvironmentName()
    }
  },
  methods: {
    async handleCopyDomain () {
      try {
        await this.$copyText(this.badhanDomain)
        await this.$store.dispatch('notification/notifySuccess', 'Badhan domain copied')
      } catch (e) {
        await this.$store.dispatch('notification/notifyError', 'Could not copy to clipboard')
      }
    },
    async buildPrompt () {
      const response = await this.$store.dispatch('requestRedirectionToken')
      if (!response || response.status !== HTTP_STATUS.CREATED) {
        const message = (response && response.data && response.data.message) ? response.data.message : 'Could not create setup'
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
      await this.$store.dispatch('notification/notifySuccess', 'Setup file downloaded. You can remove access later from My Profile')
    },
    async mintMCPToken () {
      const response = await this.$store.dispatch('requestRedirectionToken')
      if (!response || response.status !== HTTP_STATUS.CREATED) {
        const message = (response && response.data && response.data.message) ? response.data.message : 'Could not create the connection'
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
        await this.$store.dispatch('notification/notifySuccess', `${what} copied. You can remove access later from My Profile`)
      } catch (e) {
        await this.$store.dispatch('notification/notifyError', 'Could not copy to clipboard')
      }
    },
    async handleCopyMCPConfig () {
      await this.copyMCP(buildMCPConfigJSON, 'Desktop app setup')
    },
    async handleCopyMCPCommand () {
      await this.copyMCP(buildMCPCLICommand, 'Claude Code setup')
    },
    async handleCopyMCPConnectorURL () {
      await this.copyMCP(buildMCPConnectorURL, 'Connection link')
    }
  }
}
</script>
