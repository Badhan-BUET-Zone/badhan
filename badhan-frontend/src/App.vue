<template>
  <v-app id="app" app>
    <TopProgressBar/>
    <app-bar v-if="$store.getters['getToken']"></app-bar>
    <!-- Outside <router-view> on purpose: one instance for the whole app, surviving every
         route change. See the component for why that placement is load-bearing. -->
    <ChatFab v-if="$store.getters['getToken']"></ChatFab>
    <v-main>
      <transition name="slide-fade" mode="out-in">
        <router-view app class="container"></router-view>
      </transition>
    </v-main>
    <Notification/>
    <MessageBox/>
    <ConfirmationBox/>
    <EnvironmentWatermark/>
  </v-app>
</template>

<script>
import AppBar from './components/AppShell/AppBar'
import ChatFab from './components/AppShell/ChatFab'

import Notification from './components/AppShell/Notification'
import MessageBox from './components/AppShell/MessageBox'
import ConfirmationBox from './components/AppShell/ConfirmationBox'
import TopProgressBar from '@/components/AppShell/TopProgressBar.vue'
import EnvironmentWatermark from '@/components/AppShell/EnvironmentWatermark.vue'

export default {
  name: 'app',
  data () {
    return {
    }
  },
  components: {
    EnvironmentWatermark,
    TopProgressBar,
    ConfirmationBox,
    MessageBox,
    'app-bar': AppBar,
    ChatFab,
    Notification,
  },
  computed: {
  },
  methods: {
  },

  async mounted () {
    if(this.$store.getters['getToken'] && !await this.$store.dispatch('autoLogin')){
      await this.$router.push('/')
      return
    }

    /*
      TRIGGER 1 OF 4: app open.

      AFTER autoLogin and only on a truthy result. Firing it in parallel races the token check
      and puts a 401 toast on every cold start with an expired session.

      It is deliberately NOT awaited into anything that gates rendering: it rides the existing
      appBarLoadingFlag interceptor like every other call, and a failure is a toast and nothing
      worse. Nobody should be unable to search for a donor because chat history would not load.

      fetchInitialMessages sends NO cursor, and that is the whole point — see the action.
    */
    if (this.$store.getters['getToken']) {
      this.$store.dispatch('chat/fetchInitialMessages')
    }
  }
}
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}

.required label::after {
  content: " *";
}

/* Enter and leave animations can use different */
/* durations and timing functions.              */
.slide-fade-enter-active {
  transition: all .3s ease;
}

.slide-fade-leave-active {
  transition: all .3s cubic-bezier(1.0, 0.5, 0.8, 1.0);
}

.slide-fade-enter, .slide-fade-leave-to
  /* .slide-fade-leave-active below version 2.1.8 */
{
  transform: translateX(-100px);
  opacity: 0;
}

.slide-fade-down-enter-active {
  transition: all .3s ease;
}

.slide-fade-down-leave-active {
  transition: all .3s cubic-bezier(1.0, 0.5, 0.8, 1.0);
}

.slide-fade-down-enter, .slide-fade-down-leave-to {
  transform: translateY(-40px);
  opacity: 0;
}

.fade-enter-active {
  transition: all .3s ease;
}

.fade-leave-active {
  transition: all .3s cubic-bezier(1.0, 0.5, 0.8, 1.0);
}

.fade-enter, .fade-leave-to {
  opacity: 0;
}

.fade-snapout-enter-active {
  transition: all .3s ease;
}

.fade-snapout-enter {
  opacity: 0;
}

.slide-fade-down-snapout-enter-active {
  transition: all .3s ease;
}

.slide-fade-down-snapout-leave-active {
  transition: all .3s cubic-bezier(1.0, 0.5, 0.8, 1.0);
}

.slide-fade-down-snapout-enter, .slide-fade-down-snapout-leave-to {
  transform: translateY(-40px);
  opacity: 0;
}

</style>
