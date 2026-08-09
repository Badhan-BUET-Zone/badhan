<template>
  <ContainerOutlined>
    <v-avatar
        size="100"
        color="grey"
        class="ma-2"
    >
      <v-img :src="avatar"/>
    </v-avatar>
    <v-card-title>
      {{ person.name }}
    </v-card-title>
    <v-card-subtitle>
      {{ person.calender }}
    </v-card-subtitle>

    <v-card-text class="text--primary">
      <div v-for="(description, index) in person.contribution" :key="index">{{ description }}</div>
    </v-card-text>

    <v-card-actions>
      <v-btn
          v-for="(link,linkIndex) in person.links"
          :key="linkIndex"
          :color="link.color"
          class="white--text"
          rounded
          @click="goTo(link.link)"
          small
      >
        <v-icon
            left
            dark
        >
          mdi-{{ link.icon }}
        </v-icon>
      </v-btn>
    </v-card-actions>
  </ContainerOutlined>
</template>

<script>
import ContainerOutlined from '@/components/Container/ContainerOutlined'

export default {
  props: ['person'],
  components: {
    ContainerOutlined
  },
  name: 'PersonCredit',
  computed: {
    // `person.image` is a filename in src/assets/contributors/, not a URL — the
    // avatars ship in the bundle. The static prefix is what lets webpack resolve
    // the dynamic part. A record with no photograph of its own falls back to the
    // shared silhouette.
    avatar () {
      return this.person.image
        ? require(`@/assets/contributors/${this.person.image}`)
        : require('@/assets/account.png')
    }
  },
  methods: {
    goTo (url) {
      window.open(url, '_blank')
    }
  }
}
</script>

<style scoped>

</style>
