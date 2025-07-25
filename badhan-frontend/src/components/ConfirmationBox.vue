<template>
    <v-dialog
      v-model="confirmationOpened"
      width="500"
      persistent
      content-class="rounded-xl"
    >
      <v-card>
        <v-card-title>
          Confirm
        </v-card-title>
        <v-card-text>
          {{$store.getters['confirmationBox/getConfirmationMessage']}}
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn rounded
                 color="secondary" @click="cancelClicked"
          >
            Cancel
          </v-btn>
          <v-btn rounded color="primary" @click="confirmClicked" id="confirmationBoxButtonId">
            Confirm
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </template>

<script>
export default {
  methods: {
    confirmClicked () {
      this.$store.getters['confirmationBox/getConfirmationAction']()
      this.$store.commit("confirmationBox/resetConfirmationBox")
    },
    cancelClicked () {
      this.$store.commit('confirmationBox/setConfirmationFlag', false)
    }
  },
  computed: {
    confirmationOpened: {
      // getter
      get () {
        return this.$store.getters['confirmationBox/getConfirmationFlag']
      },
      // setter
      set (newValue) {
        this.$store.commit('confirmationBox/setConfirmationFlag', newValue)
      }
    }
  },

  name: 'ConfirmationBox'
}
</script>

<style scoped>
</style>
