<template>
  <v-menu
    ref="menu"
    v-model="menu"
    :close-on-content-click="false"
    transition="scale-transition"
    offset-y
    min-width="auto"
  >
    <template v-slot:activator="{ on, attrs }">
      <TextField
        :id="textFieldId"
        :data-cy="textFieldId"
        :label="label"
        :prepend-icon="prependIcon"
        readonly
        v-model="proxyValue"
        v-bind="attrs"
        v-on="on"
        :disabled="disabled"
        :hint="''"
      />
    </template>
    <v-date-picker
      :id="pickerId"
      v-model="proxyValue"
      no-title
      scrollable
      :max="tomorrow"
    >
      <v-spacer></v-spacer>
      <v-btn text color="primary" @click="menu = false">Cancel</v-btn>
      <v-btn v-if="showOk" :id="okButtonId" :data-cy="okButtonId" text color="primary" @click="$refs.menu.save(proxyValue)">OK</v-btn>
    </v-date-picker>
  </v-menu>
</template>

<script>
import TextField from '@/components/UI Components/TextField.vue'
export default {
  name: 'DatePicker',
  components: { TextField },
  props: {
    value: {
      type: String,
      default: ''
    },
    label: {
      type: String,
      default: ''
    },
    pickerId: {
      type: String,
      default: null
    },
    textFieldId: {
      type: String,
      default: null
    },
    okButtonId: {
      type: String,
      default: null
    },
    prependIcon: {
      type: String,
      default: 'mdi-calendar'
    },
    disabled: {
      type: Boolean,
      default: false
    },
    showOk: {
      type: Boolean,
      default: true
    }
  },
  data () {
    return {
      menu: false
    }
  },
  computed: {
    proxyValue: {
      get () {
        return this.value
      },
      set (val) {
        this.$emit('input', val)
      }
    },
    tomorrow () {
      const now = new Date()
      const tomorrowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      return tomorrowDate.toISOString().substr(0, 10)
    }
  }
}
</script>

<style scoped>

</style>



