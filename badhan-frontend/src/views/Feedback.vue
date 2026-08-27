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
      No Reload button. The page loads on arrival and again the moment a volunteer sends their own
      message, which is every occasion the queue is known to have changed from here; anything else
      arrived from a donor's phone, and a button cannot tell you about that any sooner than the next
      visit does. Refreshing the browser does the same job on the rare occasion somebody wants it.

      The state of the queue and the queue itself are three branches of ONE transition: loading,
      nothing waiting, or the list. As two transitions side by side the loader was still sliding
      out while the cards were already sliding in, and the list snapped upwards the moment the
      loader left the flow. mode="out-in" makes the second only start once the first is gone — and
      it also means the loading and empty cards exist only when there is something to report, so a
      full queue leaves no empty card behind.

      The list itself is oldest first, both kinds interleaved. No tabs and no filter: the queue is
      meant to be emptied, and a filter would make it comfortable not to.
    -->
    <transition name="slide-fade-down-snapout" mode="out-in">
      <Container v-if="loadingFlag" :key="'feedbacksLoading'">
        <v-card-text>
          <LoadingMessage/>
        </v-card-text>
      </Container>

      <Container v-else-if="feedbacks.length === 0" :key="'feedbacksEmpty'">
        <v-card-text class="title text-center" data-cy="feedbackEmptyState">
          No feedback is waiting.
        </v-card-text>
      </Container>

      <!-- A transition-group inside the branch, so the queue arrives as one block but a discarded
           card still leaves on its own. -->
      <transition-group
        v-else
        :key="'feedbacksList'"
        name="slide-fade-down"
        tag="div"
        style="max-width: 700px"
        class="mx-auto"
      >
        <FeedbackCard
          v-for="feedback in feedbacks"
          :key="feedback._id"
          :feedback="feedback"
          :discarding-flag="discardingId === feedback._id"
          @discard="discard"
        ></FeedbackCard>
      </transition-group>
    </transition>

    <transition name="slide-fade" mode="out-in">
      <router-view></router-view>
    </transition>
  </div>
</template>

<script>
import PageTitle from '@/components/PageTitle'
import Container from '@/components/Container/Container'
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
    PageTitle, Container, LoadingMessage, FeedbackCard, FeedbackQrPanel, OwnFeedbackPanel
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
