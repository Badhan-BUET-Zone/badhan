<template>
  <ContainerOutlined>
    <!-- The avatar stays at 100px deliberately; everything around it is what got
         tightened, so three cards fit across a row without the photos suffering. -->
    <v-avatar
        size="100"
        color="grey"
        class="ma-1"
    >
      <!-- `eager` because the file is already in the bundle: v-img otherwise waits
           for an intersection observer and shows a grey disc on the way past. -->
      <v-img :src="avatar" eager/>
    </v-avatar>
    <v-card-title class="py-1 px-2 text-subtitle-1 font-weight-medium">
      {{ person.name }}
    </v-card-title>
    <v-card-text class="text--primary py-0 px-2 text-body-2">
      <div v-for="(description, index) in person.contribution" :key="index">{{ description }}</div>
    </v-card-text>

    <v-card-actions class="pa-1">
      <v-btn
          v-for="(link,linkIndex) in person.links"
          :key="linkIndex"
          :color="link.color"
          class="white--text"
          rounded
          @click="goTo(link.link)"
          small
      >
        <!-- No `left` on the icon: these buttons carry no label, and `left`'s
             trailing margin left them visibly off-centre. -->
        <v-icon dark>
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
