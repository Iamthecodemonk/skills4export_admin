<template>
  <aside class="app-scroll max-h-[calc(100vh-5.5rem)] overflow-y-auto">
    <section class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
      <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
        Review Queue
      </p>
      <div class="mt-4 space-y-3">
        <div class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
          <p class="text-sm font-semibold text-[var(--text-primary)]">Pending reports</p>
          <p class="mt-1 text-sm text-[var(--text-secondary)]">12 items need moderation review.</p>
        </div>
        <div class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
          <p class="text-sm font-semibold text-[var(--text-primary)]">Media processing</p>
          <p class="mt-1 text-sm text-[var(--text-secondary)]">3 uploads are waiting for verification.</p>
        </div>
      </div>
    </section>
  </aside>
</template>
