<script setup lang="ts">
import { computed, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    title?: string
    level?: 'easy' | 'medium' | 'hard'
  }>(),
  { title: '练习', level: 'easy' }
)

const open = ref(false)
const label = computed(
  () => ({ easy: 'Easy', medium: 'Medium', hard: 'Hard' })[props.level]
)
</script>

<template>
  <div class="exercise" :class="`level-${level}`">
    <div class="ex-head" @click="open = !open">
      <span class="ex-tag">{{ label }}</span>
      <span class="ex-title">{{ title }}</span>
      <span class="ex-toggle">{{ open ? '收起答案' : '查看答案' }}</span>
    </div>
    <div class="ex-body"><slot /></div>
    <div v-show="open" class="ex-answer"><slot name="answer" /></div>
  </div>
</template>
