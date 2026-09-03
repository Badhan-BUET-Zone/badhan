<template>
  <div :key="'aiIntegration'">
    <PageTitle :title="$route.meta.title"></PageTitle>
    <Container>
      <v-card-title>Use Badhan with AI</v-card-title>
      <v-card-text>
        <p>
          Let an AI assistant help with Badhan using everyday instructions. Connect Claude in your
          web browser and then simply ask:
          <i>"find O+ donors in Titumir who have not donated since March"</i> or in bangla
          <i lang="bn">"তিতুমীর হলে O+ রক্তদাতা খুঁজে দাও, যাঁরা মার্চের পর আর রক্ত দেননি"</i>.
        </p>

        <v-card-title class="pl-0">Hand Claude a setup file</v-card-title>

        <p>
          <b>If you want to connect to Claude temporarily:</b> download a setup file and upload it
          to a conversation.
        </p>

        <v-card outlined class="pa-4 mb-4" data-cy="setupAiAppInstructionsId">
          <div class="d-flex align-center flex-wrap mb-4">
            <span class="mr-3">Claude has to be allowed to reach this Badhan domain:</span>
            <code data-cy="aiSetupDomainId">{{ badhanDomain }}</code>
            <Button
              :click="handleCopyDomain"
              color="secondary"
              icon="mdi-content-copy"
              text="Copy Domain"
              data-cy="copyAiSetupDomainId"
            />
          </div>

          <h3 class="text-subtitle-1 mb-3">Claude Web UI</h3>

          <h4 class="text-subtitle-2 mb-2">One time setup</h4>
          <ol class="pl-5 mb-4" data-cy="setupFileOnceStepsId">
            <li>
              Press <b>Download Setup File</b> below. It saves as
              <code>badhan-api-prompt.md</code> — keep it, you upload the same file every time.
            </li>
            <li>Open <b>claude.ai</b> in your web browser and sign in.</li>
            <li>Select your name at the bottom left of Claude, then <b>Settings</b>, then <b>Capabilities</b>.</li>
            <li>Turn on <b>Code execution and file creation</b>, and turn on <b>Allow network egress</b>.</li>
            <li>
              Choose the network option that allows <b>specific domains</b> — not package managers
              only — then paste the Badhan domain above into <b>Additional allowed domains</b> and
              save. Without this step Claude cannot reach Badhan at all.
            </li>
          </ol>

          <h4 class="text-subtitle-2 mb-2">For your everyday use</h4>
          <ol class="pl-5 mb-4" data-cy="setupFileEverydayStepsId">
            <li>Start a new chat in Claude.</li>
            <li>Press <b>+</b> beside the message box and upload <code>badhan-api-prompt.md</code>.</li>
            <li>Ask your question in plain language.</li>
          </ol>

          <p class="text-caption mb-4">
            On a Team or Enterprise Claude plan these settings live under <b>Organization
            settings</b>, then <b>Capabilities</b>, and only an owner can change them.
          </p>

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

        <v-card-title class="pl-0">Connect Claude once</v-card-title>

        <p v-if="isGuest" data-cy="mcpGuestNoticeId">
          Sign in to Badhan to connect Claude.
        </p>

        <template v-else>
          <p>
            <b>If you want to connect to AI for long-term use:</b> connect Claude once to let it
            help with Badhan whenever you need it, without uploading a file each time.
          </p>

          <v-card outlined class="pa-4 mb-4" data-cy="aiAppInstructionsId">
            <h3 class="text-subtitle-1 mb-3">Claude</h3>

            <h4 class="text-subtitle-2 mb-2">One time setup</h4>
            <ol class="pl-5 mb-4" data-cy="connectorOnceStepsId">
              <li>Press <b>Copy Claude Link</b> below. The link is a sign-in — keep it to yourself.</li>
              <li>Open <b>claude.ai</b> in your web browser and sign in.</li>
              <li>Select your name at the bottom left of Claude, then <b>Customize</b>, then <b>Connectors</b>.</li>
              <li>Press <b>+</b>, then <b>Add custom connector</b>.</li>
              <li>Paste the link into the URL box, name it <b>Badhan</b>, and select <b>Add</b>.</li>
              <li>
                On the <b>Badhan</b> connector that now appears, press <b>Connect</b>. Adding it is
                not enough — until you connect it once, Claude cannot use it. After that it stays
                connected for every chat.
              </li>
            </ol>

            <h4 class="text-subtitle-2 mb-2">For your everyday use</h4>
            <ol class="pl-5 mb-4" data-cy="connectorEverydayStepsId">
              <li>Start a new chat in Claude.</li>
              <li>Ask your question in plain language. Claude will ask before anything it changes.</li>
            </ol>

            <p class="text-caption mb-4">
              On a Team or Enterprise Claude plan an owner adds the connector under <b>Organization
              settings</b>, then <b>Connectors</b>; everyone else then connects to it from
              <b>Customize</b>, then <b>Connectors</b>.
            </p>
            <Button
              :click="handleCopyMCPConnectorURL"
              :disabled="busy"
              color="primary"
              icon="mdi-link-variant"
              text="Copy Claude Link"
              data-cy="copyMcpConnectorUrlId"
            />
          </v-card>
        </template>

        <p class="mb-0">
          You can remove Claude's access at any time from <b>My Profile</b>.
        </p>

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
  buildMCPConnectorURL,
  getAIPromptBaseURL,
  getMCPEndpointURL
} from '@/mixins/aiPrompt'
import { isGuestEnabled } from '@/api'

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
    async handleCopyMCPConnectorURL () {
      this.busy = true
      const response = await this.$store.dispatch('requestRedirectionToken')
      this.busy = false
      if (!response || response.status !== HTTP_STATUS.CREATED) {
        const message = (response && response.data && response.data.message) ? response.data.message : 'Could not create the connection'
        await this.$store.dispatch('notification/notifyError', message)
        return
      }
      try {
        await this.$copyText(buildMCPConnectorURL(response.data.token, this.mcpEndpointURL))
        await this.$store.dispatch('notification/notifySuccess', 'Connection link copied. You can remove access later from My Profile')
      } catch (e) {
        await this.$store.dispatch('notification/notifyError', 'Could not copy to clipboard')
      }
    }
  }
}
</script>
