<template>
  <div>
    <PageTitle></PageTitle>
    <Container>
      <!-- Same components as the panel, more room. The ONLY difference between the two mounts
           is the height handed to the list — see MessageList for why that matters. -->
      <FetchMessagesButton></FetchMessagesButton>
      <v-divider></v-divider>
      <MessageList height="calc(100vh - 260px)"></MessageList>
      <v-divider></v-divider>
      <MessageComposer></MessageComposer>
    </Container>
  </div>
</template>

<script>
import PageTitle from '@/components/PageTitle'
import Container from '@/components/Container/Container'
import MessageList from '@/views/Chat/MessageList'
import MessageComposer from '@/views/Chat/MessageComposer'
import FetchMessagesButton from '@/views/Chat/FetchMessagesButton'

export default {
  name: 'ChatView',
  components: { PageTitle, Container, MessageList, MessageComposer, FetchMessagesButton },
  mounted () {
    // Opening the page counts as looking at the room, exactly as opening the panel does. This
    // and openPanel are the only two things that ever move the read watermark.
    this.$store.dispatch('chat/markAllRead')
  }
}
</script>
