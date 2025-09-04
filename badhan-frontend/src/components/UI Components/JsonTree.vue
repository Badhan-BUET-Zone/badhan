<template>
  <div class="json-tree-node" :style="{ marginLeft: level ? '12px' : '0' }">
    <div class="json-tree-header" @click="toggle">
      <v-icon v-if="isObject" small class="mr-1">{{ open ? 'mdi-chevron-down' : 'mdi-chevron-right' }}</v-icon>
      <span v-if="isObject" class="font-weight-medium">{{ summary }}</span>
      <span v-else class="primitive">{{ primitiveValue }}</span>
    </div>
    <div v-if="open" class="json-tree-children">
      <div v-for="(val, key) in objectEntries" :key="key" class="json-tree-child">
        <span class="json-key mr-1 indigo--text text--darken-2">{{ key }}:</span>
        <JsonTree :data="val" :level="level + 1" />
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'JsonTree',
  props: {
    // Accept any JSON value (object, array, primitive). Skip strict type to avoid warnings on numbers/strings.
    data: { required: true },
    level: { type: Number, default: 0 }
  },
  data: () => ({ open: false }),
  computed: {
    isObject () { return this.data && typeof this.data === 'object' && !Array.isArray(this.data) },
    isArray () { return Array.isArray(this.data) },
    objectEntries () { return (this.isObject || this.isArray) ? this.data : {} },
    summary () {
      if (this.isArray) return `Array(${this.data.length})`
      if (this.isObject) return `Object(${Object.keys(this.data).length})`
      return ''
    },
    primitiveValue () { return typeof this.data === 'string' ? this.data : JSON.stringify(this.data) }
  },
  methods: {
    toggle () { if (this.isObject || this.isArray) this.open = !this.open }
  }
}
</script>

<style scoped>
.json-tree-node { font-family: monospace; font-size: 13px; }
.json-tree-header { cursor: pointer; user-select: none; display: flex; align-items: center; }
.json-tree-children { border-left: 1px dashed #ccc; margin-left: 6px; padding-left: 6px; }
.json-tree-child { margin: 2px 0; }
.primitive { color: #1a237e; }
</style>


