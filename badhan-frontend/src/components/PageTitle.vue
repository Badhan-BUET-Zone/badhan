<template>
  <v-app-bar dense floating width="100%" class="rounded-xl">
    <v-btn id="pageTitleBackButtonId" icon @click="$router.go(-1)">
      <v-icon>mdi-arrow-left</v-icon>
    </v-btn>
    <v-toolbar-title>{{ $route.meta.title }}</v-toolbar-title>
    <slot></slot>
  </v-app-bar>
</template>

<script>
export default {
  name: 'PageTitle',
  props: ['title'],
  computed: {
  }
}
</script>

<style scoped>

</style>
