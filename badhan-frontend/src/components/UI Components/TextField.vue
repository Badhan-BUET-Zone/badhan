<template>
  <v-text-field
    :id="id"
    :value="value"
    :label="label"
    :hint="hint"
    :type="inputType"
    rounded
    outlined
    dense
    v-bind="forwardedAttrs"
    v-on="$listeners"
    @input="$emit('input', $event)"
  >
    <template v-slot:message>
      <slot name="message" />
    </template>
  </v-text-field>
  
</template>
<script>
export default {
  name: 'TextField',
  inheritAttrs: false,
  model: {
    prop: 'value',
    event: 'input'
  },
  props: {
    id: {
      type: String,
      required: true
    },
    label: {
      type: String,
      required: true
    },
    hint: {
      type: String,
      required: true
    },
    value: {
      type: String,
      required: true
    }
  },
  computed: {
    forwardedAttrs () {
      const attrs = this.$attrs || {}
      const rest = { ...attrs }
      delete rest.rounded
      delete rest.type
      return rest
    },
    inputType () {
      const attrType = (this.$attrs && this.$attrs.type) || null
      return attrType === 'password' ? 'password' : 'text'
    }
  },
  created () {
    if (this.id === undefined) throw new Error('TextField: id prop is required')
    if (this.label === undefined) throw new Error('TextField: label prop is required')
    if (this.hint === undefined) throw new Error('TextField: hint prop is required')
    if (this.value === undefined) throw new Error('TextField: v-model (value) is required')
  }
}
</script>

<style scoped>

</style>


