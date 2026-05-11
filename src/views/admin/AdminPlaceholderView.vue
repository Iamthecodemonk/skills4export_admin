<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<template>
  <section class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
    <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
      Admin
    </p>
    <h1 class="mt-2 font-display text-xl font-semibold text-[var(--text-primary)]">
      {{ title }}
    </h1>
    <p class="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
      This page is ready for the layout and content you want to provide next.
    </p>
  </section>
</template>
