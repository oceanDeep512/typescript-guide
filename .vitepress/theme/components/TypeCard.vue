<script setup lang="ts">
defineProps<{ name: string; badge?: string }>()
</script>

<template>
  <div class="tcard">
    <div class="tc-head">
      <code class="tc-name">{{ name }}</code>
      <span v-if="badge" class="tc-badge">{{ badge }}</span>
    </div>
    <div class="tc-body"><slot /></div>
  </div>
</template>
