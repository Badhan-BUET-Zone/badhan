<template>
  <v-card flat>
    <v-card-title>
      {{ groupedLog.dateString }}
    </v-card-title>
    <v-card-subtitle>
      Activity count: {{ groupedLog.group.length }}<br>
      Active user count: {{ logsGroupedPerPerson.length }}
    </v-card-subtitle>
    <v-card-text>
      <transition name="fade" mode="out-in">
        <v-btn v-if="!dateLogsLoaded" :id="`dateLogDetailsButtonId_${groupedLog.dateString}`" data-cy="dateLogDetailsButton" rounded color="primary" x-small @click="detailsClick" key="button">
          Details
        </v-btn>
        <div v-else key="details">
          <transition-group name="slide-fade-left" tag="div">
            <div v-for="log in logsGroupedPerPerson" :key="log.name">
              <PersonLog :date-log="log"></PersonLog>
            </div>
          </transition-group>
        </div>
      </transition>
    </v-card-text>
  </v-card>
</template>

<script>
import PersonLog from './PersonLog'

export default {
  props: ['groupedLog'],
  name: 'DateLog',

  data: function () {
    return {
      logsGroupedPerPerson: [],
      dateLogsLoaded: false
    }
  },
  components: {
    PersonLog
  },
  methods: {
    async detailsClick () {
      this.dateLogsLoaded = true
    }
  },
  mounted(){
    this.logsGroupedPerPerson = this.groupedLog.group.reduce((acc, val) => {
      let o = acc.find((obj) => obj.name === val.name);
      if (o) {
        o.group.push({operation: val.operation, date: val.date});
      } else {
        acc.push({name: val.name, hall: val.hall, group: [{operation: val.operation, date: val.date}]});
      }
      return acc;
    }, []);
  }
}
</script>

<style lang="sass">
.fade-enter-active, .fade-leave-active
  transition: opacity 0.3s ease

.fade-enter, .fade-leave-to
  opacity: 0

.slide-fade-left-enter-active
  transition: all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)

.slide-fade-left-leave-active
  transition: all 0.4s cubic-bezier(0.55, 0.06, 0.68, 0.19)

.slide-fade-left-enter
  transform: translateX(-50px) scale(0.95)
  opacity: 0

.slide-fade-left-leave-to
  transform: translateX(30px) scale(1.05)
  opacity: 0

.slide-fade-left-move
  transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)
</style>
