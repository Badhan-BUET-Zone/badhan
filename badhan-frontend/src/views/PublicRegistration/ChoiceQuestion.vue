<template>
  <div>
    <!--
      Buttons, not a dropdown and not free text. A student answering on a phone at a desk should be
      able to hit one target, and a blood group typed by hand is a blood group somebody has to
      correct later.
    -->
    <v-btn
      v-for="choice in choices"
      :key="String(choice.value)"
      :data-cy="'registrationChoice-' + choice.value"
      class="ma-1"
      :color="value === choice.value ? 'primary' : ''"
      @click="$emit('input', choice.value)"
    >
      {{ choice.label }}
    </v-btn>
  </div>
</template>

<script>
export default {
  name: 'ChoiceQuestion',
  props: {
    value: { type: [Number, Boolean, String], default: null },
    choices: { type: Array, required: true }
  }
}
</script>
