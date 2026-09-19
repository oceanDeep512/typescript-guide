<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{ type?: 'tip' | 'warn' | 'danger' }>(),
  { type: 'tip' }
)

const icon = computed(() => ({ tip: '◆', warn: '▲', danger: '■' })[props.type])
</script>

<template>
  <div class="callout" :class="type">
    <span class="callout-icon">{{ icon }}</span>
    <div class="callout-body"><slot /></div>
  </div>
</template>
