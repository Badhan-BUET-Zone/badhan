<template>
  <TextField
    :id="'registrationInput-' + field"
    :data-cy="'registrationInput-' + field"
    :label="label"
    :hint="hint"
    :type="inputType"
    :maxlength="maxlength"
    :value="String(value === null || value === undefined ? '' : value)"
    @input="$emit('input', $event)"
    @keyup.enter="$emit('enter')"
  />
</template>

<script>
import TextField from '@/components/UI Components/TextField'

// Every text-shaped answer, whether it ends up as a string or a number. One Enter keypress advances
// the step, because most of these are typed one-handed on a phone.
export default {
  name: 'AnswerInput',
  components: { TextField },
  props: {
    field: { type: String, required: true },
    label: { type: String, required: true },
    hint: { type: String, default: '' },
    value: { type: [String, Number], default: '' },
    inputType: { type: String, default: 'text' },
    maxlength: { type: [String, Number], default: 500 }
  }
}
</script>
