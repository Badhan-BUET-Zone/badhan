<template>
  <div>
    <PageTitle></PageTitle>

    <!-- Both panels share one card and are collapsed by default, so the queue is still the first
         thing on the page. Nothing inside the QR panel is built or imported until it is expanded:
         this is a volunteer's daily page. -->
    <Container>
      <FeedbackQrPanel/>
      <OwnFeedbackPanel @submitted="loadFeedbacks"/>
    </Container>

    <!--
      Reload and the state of the queue share one card. They are one thought — "here is the queue,
      and here is how to refresh it" — and splitting them left an almost-empty strip above a
      one-line message. Each feedback card is its own container below this one, so nothing nests.
    -->
    <Container>
      <v-card-text>
        <Button
          data-cy="feedbackReloadButton"
          :icon="'mdi-refresh'"
          :text="'Reload'"
          :color="'primary'"
          :disabled="loadingFlag"
          :click="loadFeedbacks"
        ></Button>
      </v-card-text>

      <v-card-text v-if="loadingFlag">
        <LoadingMessage/>
      </v-card-text>

      <v-card-text
        v-else-if="feedbacks.length === 0"
        class="title text-center"
        data-cy="feedbackEmptyState"
      >
        No feedback is waiting.
      </v-card-text>
    </Container>

    <!--
      One list, oldest first, both kinds interleaved. No tabs and no filter: the queue is meant to
      be emptied, and a filter would make it comfortable not to.
    -->
    <div style="max-width: 700px" class="mx-auto" v-if="!loadingFlag">
      <FeedbackCard
        v-for="feedback in feedbacks"
        :key="feedback._id"
        :feedback="feedback"
        :discarding-flag="discardingId === feedback._id"
        @discard="discard"
      ></FeedbackCard>
    </div>

    <transition name="slide-fade" mode="out-in">
      <router-view></router-view>
    </transition>
  </div>
</template>

<script>
import PageTitle from '@/components/PageTitle'
import Container from '@/components/Container/Container'
import Button from '@/components/UI Components/Button'
import LoadingMessage from '@/components/LoadingMessage.vue'
import FeedbackCard from '@/views/Feedback/FeedbackCard'
import FeedbackQrPanel from '@/views/Feedback/FeedbackQrPanel'
import OwnFeedbackPanel from '@/views/Feedback/OwnFeedbackPanel'
import { handleGETFeedbacks, handleDELETEFeedback } from '@/api'
import { HTTP_STATUS } from '@/mixins/constants'

// The queue every public submission lands in. A volunteer reads a row, does whatever work it calls
// for on the donor's own profile, and then discards it by hand — the app never acts on a message
// itself.
//
// Nothing announces that this page has anything in it: no badge, no count, no notification. Opening
// it has to be a habit, which is why the manual says how often to check.

export default {
  name: 'FeedbackPage',
  components: {
    PageTitle, Container, Button, LoadingMessage, FeedbackCard, FeedbackQrPanel, OwnFeedbackPanel
  },
  data: () => {
    return {
      loadingFlag: true,
      feedbacks: [],
      discardingId: null
    }
  },
  mounted () {
    this.loadFeedbacks()
  },
  methods: {
    async loadFeedbacks () {
      this.loadingFlag = true
      const response = await handleGETFeedbacks()
      this.loadingFlag = false

      if (!response || response.status !== HTTP_STATUS.OK) {
        this.feedbacks = []
        return
      }
      // Filtering already happened in the aggregate; another hall's row never reaches the browser,
      // so there is nothing to filter here and nothing to grey out.
      this.feedbacks = response.data.feedbacks
    },
    async discard (feedbackId) {
      this.discardingId = feedbackId
      const response = await handleDELETEFeedback(feedbackId)
      this.discardingId = null

      if (!response) return

      // 404 means somebody else discarded it first. That is the expected concurrent case, not an
      // error: the row is gone either way, so the card goes either way.
      if (response.status === HTTP_STATUS.OK || response.status === HTTP_STATUS.NOT_FOUND) {
        this.feedbacks = this.feedbacks.filter((feedback) => feedback._id !== feedbackId)
      }
    }
  }
}
</script>
