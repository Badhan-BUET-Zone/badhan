<template>
  <div>
    <PageTitle :title="$route.meta.title"></PageTitle>
    <Container>
      <v-card-text>Redirecting...</v-card-text>
    </Container>
  </div>
</template>

<script>
import PageTitle from '@/components/PageTitle'
import Container from '@/components/Container/Container'

export default {
  name: 'RedirectionPage',
  computed: {
  },
  components: {
    Container,
    PageTitle
  },
  methods: {
  },
  async mounted () {
    if (!this.$store.getters['getIsLoggedIn'] && !await this.$store.dispatch('redirectionLogin', this.$route.query.token)) {
      await this.$router.replace('/')
    } else {
      await this.$router.replace(this.$route.query.payload)
    }
  }
}
</script>

<style scoped>

</style>
