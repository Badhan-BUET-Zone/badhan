<template>
  <div>
    Name: {{ dateLog.name }} <br>
    Hall: {{ dateLog.hall | getHallName }} <br>
    Count: {{ dateLog.group.length }}
    <br>
    <transition name="fade" mode="out-in">
      <v-btn :id="`personLogExpandButtonId_${dateLog.name}`" @click="getPersonActivities" v-if="!personLogLoaded" x-small
        rounded color="primary" key="expand-btn">Expand
      </v-btn>
      <div v-else key="activities">
        <transition-group name="slide-fade-down" tag="div">
          <div v-for="(log, i) in dateLog.group" :key="log.date">
            {{ i + 1 }}) Time:
            {{ new Date(log.date).toDateString({ timeZone: 'Asia/Dhaka'}) + ' ' + new Date(log.date).toLocaleTimeString({ timeZone: 'Asia/Dhaka'}) }} <br>
            Operation: {{ log.operation }} <br>
          </div>
        </transition-group>
      </div>
    </transition>
    <hr>
  </div>
</template>

<script>
export default {
  name: 'PersonLog',
  props: ['dateLog'],
  data: function () {
    return {
      personLogLoaded: false
    }
  },
  methods: {
    async getPersonActivities() {
      this.personLogLoaded = true
    }
  }
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter, .fade-leave-to {
  opacity: 0;
}

.slide-fade-down-enter-active {
  transition: all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.slide-fade-down-leave-active {
  transition: all 0.4s cubic-bezier(0.55, 0.06, 0.68, 0.19);
}

.slide-fade-down-enter {
  transform: translateY(-30px) scale(0.95);
  opacity: 0;
}

.slide-fade-down-leave-to {
  transform: translateY(20px) scale(1.05);
  opacity: 0;
}

.slide-fade-down-move {
  transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
</style>
