<template>
  <div>
    <PageTitle :title="$route.meta.title"></PageTitle>

      <Container>
        <v-card-title>
          Feedback
        </v-card-title>
        <v-card-text>
          <div>If you love using this app, give a review in Google play store :D It would really inspire us to keep this
            app alive.
          </div>
          <div>Note: contact mirmahathir1@gmail.com for any further assistance</div>
        </v-card-text>
      </Container>

      <Container>
        <v-card-title>
          Active Developers
        </v-card-title>

        <v-card-text>
          <v-row>
            <v-col cols="12" sm="6" v-for="(person, index) in activeDevelopers" :key="index">
              <PersonCredit :person="person">
              </PersonCredit>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-title>
          Contributors from Badhan
        </v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" sm="6" v-for="(person, index) in contributorsFromBadhan" :key="index">
              <PersonCredit :person="person"></PersonCredit>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-title>
          Legacy Developers
        </v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" sm="6" v-for="(person, index) in legacyDevelopers" :key="index">
              <PersonCredit :person="person"></PersonCredit>
            </v-col>
          </v-row>
        </v-card-text>
      </Container>
  </div>
</template>

<script>
import PageTitle from '@/components/PageTitle'
import Container from '@/components/Container/Container'
import PersonCredit from '@/views/Credits/components/PersonCredit'

// The contributor list used to be fetched from a Firebase Realtime Database, and each
// avatar from a Firebase Storage bucket, on every visit to this page. It is a
// hand-maintained list that changes a few times a year, so it now lives in the
// repository and ships in the bundle: this page makes no network calls at all.
// Edits go through a pull request — see badhan-frontend/tools/vendor-contributors.js.
import contributors from '@/data/contributors.json'

// The list is a constant, so the grouping is computed once at module load rather
// than per instance. The order inside each group is the order of the file.
const byType = contributors.reduce((groups, person) => {
  if (!Object.prototype.hasOwnProperty.call(groups, person.type)) {
    groups[person.type] = []
  }
  groups[person.type].push(person)
  return groups
}, {})

export default {
  name: 'CreditsPage',
  components: { PersonCredit, Container, PageTitle },
  data () {
    return {
      activeDevelopers: byType['Active Developers'] || [],
      contributorsFromBadhan: byType['Contributors of Badhan'] || [],
      legacyDevelopers: byType['Legacy Developers'] || []
    }
  },
  methods: {
    goTo (url) {
      window.open(url, '_blank')
    }
  },
  mounted () {
    this.$vuetify.goTo(0)
  }
}
</script>

<style scoped>
</style>
