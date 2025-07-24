<template>
  <div>
    <PageTitle :title="$route.meta.title"></PageTitle>
    <Container>
      <v-card-title>
        Logs
      </v-card-title>
      <MyConsoleLog v-for="(log, index) in $store.getters['consoleStore/getConsoleLogs']" :key="index" :log="log"></MyConsoleLog>
    </Container>
  </div>
</template>

<script>
import PageTitle from '../components/PageTitle'
import Container from '../components/Wrappers/Container'
import MyConsoleLog from '../components/DevConsole/MyConsoleLog'
import { DESIGNATIONS_INDEX } from '@/mixins/constants'
export default {
  name: 'DevConsole',
  components: {
    MyConsoleLog,
    Container,
    PageTitle
  },
  async mounted () {
    if (this.$store.getters['getDesignation'] !== DESIGNATIONS_INDEX.SUPER_ADMIN) {
      this.$router.push({ name: 'NotFound' })
    }
  }
}
</script>

<style scoped>

</style>
