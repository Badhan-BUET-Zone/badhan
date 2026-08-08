<template>
  <div :data-cy="'registrationStep-' + field">
    <v-card-text class="overline" data-cy="registrationProgress">
      Question {{ position }} of {{ total }}
    </v-card-text>
    <v-progress-linear :value="(position / total) * 100" height="4"></v-progress-linear>

    <v-card-title data-cy="registrationQuestion">{{ question }}</v-card-title>
    <v-card-text v-if="hint" class="subtitle-2" data-cy="registrationHint">{{ hint }}</v-card-text>

    <v-card-text>
      <slot></slot>
    </v-card-text>

    <v-card-actions>
      <Button
        v-if="canGoBack"
        data-cy="registrationBackButton"
        :icon="'mdi-arrow-left'"
        :text="'Back'"
        :color="'secondary'"
        :disabled="false"
        :click="() => $emit('back')"
      ></Button>
      <!--
        Skip is a control of its own rather than an empty Next. A student who has no room number
        should be able to say so, not guess that leaving a box blank is allowed.
      -->
      <Button
        v-if="optional"
        data-cy="registrationSkipButton"
        :icon="'mdi-debug-step-over'"
        :text="'Skip'"
        :color="'secondary'"
        :disabled="false"
        :click="() => $emit('skip')"
      ></Button>
      <Button
        data-cy="registrationNextButton"
        :icon="'mdi-arrow-right'"
        :text="isLast ? 'Review' : 'Next'"
        :color="'primary'"
        :disabled="!valid"
        :click="() => $emit('next')"
      ></Button>
    </v-card-actions>
  </div>
</template>

<script>
import Button from '@/components/UI Components/Button'

// The frame every question shares: the progress counter, the question itself, and the
// Back / Skip / Next controls. The input goes in the slot, which is what differs between steps.
export default {
  name: 'QuestionShell',
  components: { Button },
  props: {
    field: { type: String, required: true },
    question: { type: String, required: true },
    hint: { type: String, default: '' },
    position: { type: Number, required: true },
    total: { type: Number, required: true },
    valid: { type: Boolean, required: true },
    optional: { type: Boolean, default: false },
    canGoBack: { type: Boolean, required: true },
    isLast: { type: Boolean, default: false }
  }
}
</script>
