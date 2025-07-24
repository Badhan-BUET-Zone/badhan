<template>
  <v-dialog
      v-model="dialogOpened"
      width="500"
      persistent
  >
    <v-card rounded>
      <v-card-title>
        Message
      </v-card-title>
      <v-card-text>
        {{ $store.getters['messageBox/getMessage'] }}
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn rounded color="primary" @click="confirmed">
          Ok
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: 'MessageBox',
  props: {

  },
  data () {
    return {
    }
  },
  computed: {
    dialogOpened: {
      // getter
      get () {
        return this.$store.getters['messageBox/getNotificationFlag']
      },
      // setter
      set (newValue) {
        this.$store.commit('messageBox/setMessageFlag', newValue)
      }
    }
  },
  methods: {
    confirmed () {
      this.$store.commit('messageBox/setMessageFlag', false)
    }
  }
}
</script>

<style scoped>

</style>
