<template>
  <v-card
      class="mb-2 rounded-xl"
      outlined
      dense
  >
    <v-card-text>
      <v-row>
        <v-col cols="9">
          <p>
            {{ callRecord.callerId.name }}<br>
            <b>Hall: </b>{{ callRecord.callerId.hall | getHallName }}<br>
            <b>Designation: </b>{{ designations[callRecord.callerId.designation] }}<br>
            <b>Time: </b>{{ dateString }} at {{ time }}
          </p>
        </v-col>
        <v-col cols="3">
          <v-btn :id="`callRecordDeleteButtonId_${callRecord._id}`" :data-cy="`callRecordDeleteButtonId_${callRecord._id}`" @click="deletePrompt" :disabled="deleteLoaderFlag" color="warning" x-small
                 fab depressed>
            <v-icon>mdi-delete</v-icon>
          </v-btn>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script>
import { designations } from '@/mixins/constants'
import { handleDELETECallRecord } from '@/api'

export default {
  name: 'CallRecordCard',
  props: ['callRecord', 'deleted'],
  data: () => {
    return {
      deleteLoaderFlag: false,
      designations,
      date: 0,
      month: 0,
      year: 0,
      time: '0',
      dateString: '0',
      deletePromptFlag: false
    }
  },
  components: {
    // Dialog
  },
  methods: {
    async deletePrompt () {
      this.$store.commit('confirmationBox/setConfirmationMessage',{
        confirmationMessage: 'Delete this call record?',
        confirmationAction: this.deletionConfirmed
      })
    },
    async deletionConfirmed () {
      this.deleteLoaderFlag = true
      await handleDELETECallRecord({ donorId: this.callRecord.calleeId, callRecordId: this.callRecord._id })
      this.deleteLoaderFlag = false
      this.$store.dispatch('notification/notifySuccess', 'Successfully deleted call record')
      this.deleted(this.callRecord._id)
    }
  },
  mounted () {
    const dateObject = new Date(this.callRecord.date)
    this.dateString = dateObject.toDateString()
    this.time = dateObject.toLocaleTimeString()
  }
}
</script>

<style scoped>

</style>
