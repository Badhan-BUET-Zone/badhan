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
  getAIPromptBaseURL
} from '@/mixins/aiPrompt'
import { isGuestEnabled } from '@/api'

const HIDDEN_TOKEN = '<a temporary token goes here — hidden in this preview>'
const HIDDEN_EXPIRY = `<${AI_TOKEN_DURATION_LABEL} after you press the button>`

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
.ai-prompt-preview {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 12px;
  max-height: 400px;
  overflow-y: auto;
}
</style>
