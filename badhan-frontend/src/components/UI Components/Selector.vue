<template>
  <v-select
    v-bind="$attrs"
    v-on="$listeners"
    :value="value"
    :items="items"
    :label="label"
    :id="id"
    :data-cy="dataCy"
    :data-selected-text="value"
    outlined
    dense
    rounded
    :disabled="disabled"
    :clearable="clearable"
    @input="val => $emit('input', val == null ? '' : String(val))"
  >
    <template v-slot:item="{ item, on, attrs }">
      <v-list-item
        v-bind="attrs"
        v-on="on"
        :data-cy="baseDataCy ? (baseDataCy + String(item)) : undefined"
      >
        <v-list-item-title>{{ item }}</v-list-item-title>
      </v-list-item>
    </template>
  </v-select>
  
</template>

<script>
export default {
  name: 'BadhanSelector',
  inheritAttrs: false,
  model: { prop: 'value', event: 'input' },
  props: {
    id: { type: String, required: true },
    dataCy: { type: String, required: true },
    value: { type: String, required: true },
    items: { type: Array, required: true },
    label: { type: String, required: true },
    disabled: { type: Boolean, default: false },
    clearable: { type: Boolean, default: false }
  },
  computed: {
    baseDataCy () {
      return this.dataCy || ''
    }
  }
}
</script>

<style scoped>

</style>



