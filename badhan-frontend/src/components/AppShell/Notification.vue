<template>
    <div id="notificationSnackbarDivId" data-cy="notificationSnackbarDivId">
        <v-snackbar
            v-model="notification"
            :color="$store.getters['notification/getNotificationColor']"
            left
            bottom
            :timeout="-1"
        >
            <span id="notificationTextId" data-cy="notificationTextId">{{ $store.getters['notification/getNotification'] }}</span>
            <template v-slot:action="{ attrs }">
                <v-btn
                    text
                    v-bind="attrs"
                    @click="$store.dispatch('notification/setNotificationFlag', false)"
                >
                    Close
                </v-btn>
            </template>
        </v-snackbar>
    </div>
</template>

<script>
export default {
  name: 'SnackbarPage',
  computed: {
    notification: {
      get: function () {
        return this.$store.getters['notification/getNotificationFlag']
      },
      set: function (newValue) {
        this.$store.dispatch('notification/setNotificationFlag', newValue)
      }
    }
  },
  methods: {
  }
}
</script>

<style scoped>

</style>

