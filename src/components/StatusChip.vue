<script lang="ts">
import { computed, defineComponent, type PropType } from 'vue'

type StatusChipTone = 'success' | 'warning' | 'danger' | 'muted' | 'accent'

const toneClasses: Record<StatusChipTone, string> = {
  success: 'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-400/20 dark:bg-teal-400/10 dark:text-teal-200',
  warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200',
  danger: 'border-red-200 bg-red-50 text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200',
  muted: 'border-[color:var(--border-soft)] bg-[var(--surface-muted)] text-[var(--text-tertiary)]',
  accent: 'border-[color:var(--accent-soft)] bg-[var(--accent-soft)] text-[var(--accent-strong)]',
}

export default defineComponent({
  name: 'StatusChip',
  props: {
    tone: {
      type: String as PropType<StatusChipTone>,
      default: 'muted',
    },
  },
  setup(props) {
    const toneClass = computed(() => toneClasses[props.tone])

    return {
      toneClass,
    }
  },
})
</script>

<template>
  <span :class="toneClass" class="inline-flex items-center rounded-full border px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.12em]">
    <slot />
  </span>
</template>
