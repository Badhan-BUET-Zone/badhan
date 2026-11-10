<template>
  <div :key="'aiIntegration'">
    <PageTitle :title="$route.meta.title"></PageTitle>
    <Container>
      <v-card-title>Use Badhan with AI</v-card-title>
      <v-card-text>
        <p>
          Let an AI assistant help with Badhan using everyday instructions. Hand it a setup file and
          then simply ask:
          <i>"find O+ donors in Titumir who have not donated since March"</i> or in bangla
          <i lang="bn">"তিতুমীর হলে O+ রক্তদাতা খুঁজে দাও, যাঁরা মার্চের পর আর রক্ত দেননি"</i>.
        </p>

        <v-card-title class="pl-0">Hand your assistant a setup file</v-card-title>

        <v-card outlined class="pa-4 mb-4" data-cy="setupAiAppInstructionsId">
          <div class="d-flex align-center flex-wrap mb-4">
            <span class="mr-3">The assistant has to be able to reach this Badhan domain:</span>
            <code data-cy="aiSetupDomainId">{{ badhanDomain }}</code>
            <Button
              :click="handleCopyDomain"
              color="secondary"
              icon="mdi-content-copy"
              text="Copy Domain"
              data-cy="copyAiSetupDomainId"
            />
          </div>

          <ol class="pl-5 mb-4" data-cy="setupFileStepsId">
            <li>
              Press <b>Download Setup File</b> below. It saves as <code>badhan-api-prompt.md</code>.
            </li>
            <li>Upload it to a conversation with your AI assistant.</li>
            <li>Ask the AI to do anything that you would have done by clicking or typing on the app.</li>
          </ol>

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

        <p class="mb-0">
          You can remove the assistant's access at any time from <b>My Profile</b>.
        </p>

        <v-alert type="warning" outlined class="rounded-xl mt-6">
          <p class="font-weight-medium mb-2">Only connect an assistant you trust</p>
          <p class="mb-2">
            The assistant will have the same access to Badhan as you do. Do not share a setup file
            with anyone else.
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
  getAIPromptBaseURL
} from '@/mixins/aiPrompt'
import { handleGETAPIReference, isGuestEnabled } from '@/api'

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
      // Fetched before the token is minted: a token is a live session the member then has to end
      // by hand, so none is made for a file that could not have been built anyway.
      const referenceResponse = await handleGETAPIReference()
      if (!referenceResponse || referenceResponse.status !== HTTP_STATUS.OK || !referenceResponse.data) {
        await this.$store.dispatch('notification/notifyError', 'Could not load the API reference. Try again')
        return null
      }
      const response = await this.$store.dispatch('requestRedirectionToken')
      if (!response || response.status !== HTTP_STATUS.CREATED) {
        const message = (response && response.data && response.data.message) ? response.data.message : 'Could not create setup'
        await this.$store.dispatch('notification/notifyError', message)
        return null
      }
      return buildAIIntegrationPrompt(response.data.token, this.baseURL, this.environmentName, referenceResponse.data)
    },
    async handleDownload () {
      this.busy = true
      const prompt = await this.buildPrompt()
      this.busy = false
      if (!prompt) return
      textFileDownloadInWeb(prompt, AI_PROMPT_FILE_NAME, 'text/markdown;charset=utf-8')
      await this.$store.dispatch('notification/notifySuccess', 'Setup file downloaded. You can remove access later from My Profile')
    }
  }
}
</script>
