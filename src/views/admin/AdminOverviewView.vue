<script setup lang="ts">
import { Check, Download, Filter, Flag, Search, Users } from 'lucide-vue-next'
import StatusChip from '../../components/StatusChip.vue'

const stats = [
  { label: 'Active users', value: '18,420', detail: '+4.8% this month', tone: 'success' },
  { label: 'Pending reports', value: '124', detail: '36 high priority', tone: 'warning' },
  { label: 'Posts reviewed', value: '2,918', detail: '94% approval rate', tone: 'accent' },
]

const queue = [
  { title: 'Profile verification request', actor: 'Amina Yusuf', type: 'User', status: 'Pending', tone: 'warning' },
  { title: 'Reported job listing', actor: 'Trade Bridge Ltd', type: 'Jobs', status: 'Review', tone: 'danger' },
  { title: 'Community post approval', actor: 'Export Readiness Hub', type: 'Post', status: 'Approved', tone: 'success' },
]
</script>

<template>
  <div class="space-y-4">
    <section class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
            Admin
          </p>
          <h1 class="mt-2 font-display text-xl font-semibold text-[var(--text-primary)]">
            Overview
          </h1>
          <p class="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
            Monitor platform activity, moderation queues, and operational health.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button class="inline-flex h-10 items-center gap-2 rounded-[0.85rem] border border-[color:var(--border-soft)] px-3 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-strong)]">
            <Filter class="h-4 w-4" />
            Filters
          </button>
          <button class="inline-flex h-10 items-center gap-2 rounded-[0.85rem] bg-[var(--accent)] px-3 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]">
            <Download class="h-4 w-4" />
            Export
          </button>
        </div>
      </div>
    </section>

    <section class="grid gap-3 md:grid-cols-3">
      <article
        v-for="stat in stats"
        :key="stat.label"
        class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-medium text-[var(--text-secondary)]">{{ stat.label }}</p>
            <p class="mt-2 font-display text-2xl font-semibold text-[var(--text-primary)]">{{ stat.value }}</p>
          </div>
          <StatusChip :tone="stat.tone as 'success' | 'warning' | 'accent'">{{ stat.detail }}</StatusChip>
        </div>
      </article>
    </section>

    <section class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)]">
      <div class="flex flex-col gap-3 border-b border-[color:var(--border-soft)] p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 class="font-display text-base font-semibold text-[var(--text-primary)]">Moderation Queue</h2>
          <p class="mt-1 text-sm text-[var(--text-secondary)]">A compact operational list ready for real page data.</p>
        </div>
        <label class="flex h-10 items-center gap-2 rounded-[0.85rem] bg-[var(--search-bg)] px-3 text-[var(--text-tertiary)] md:w-72">
          <Search class="h-4 w-4" />
          <input class="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]" placeholder="Search queue" type="search" />
        </label>
      </div>

      <div class="hidden overflow-x-auto md:block">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-[color:var(--border-soft)] text-[0.72rem] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
            <tr>
              <th class="px-4 py-3 font-semibold">Item</th>
              <th class="px-4 py-3 font-semibold">Actor</th>
              <th class="px-4 py-3 font-semibold">Type</th>
              <th class="px-4 py-3 font-semibold">Status</th>
              <th class="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[color:var(--border-soft)]">
            <tr v-for="item in queue" :key="item.title">
              <td class="px-4 py-3 font-medium text-[var(--text-primary)]">{{ item.title }}</td>
              <td class="px-4 py-3 text-[var(--text-secondary)]">{{ item.actor }}</td>
              <td class="px-4 py-3 text-[var(--text-secondary)]">{{ item.type }}</td>
              <td class="px-4 py-3">
                <StatusChip :tone="item.tone as 'success' | 'warning' | 'danger'">{{ item.status }}</StatusChip>
              </td>
              <td class="px-4 py-3">
                <div class="flex justify-end gap-2">
                  <button class="inline-flex h-9 items-center gap-2 rounded-full border border-[color:var(--border-soft)] px-3 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-strong)]">
                    <Users class="h-4 w-4" />
                    Assign
                  </button>
                  <button class="inline-flex h-9 items-center gap-2 rounded-full bg-[var(--accent)] px-3 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]">
                    <Check class="h-4 w-4" />
                    Review
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="space-y-3 p-4 md:hidden">
        <article v-for="item in queue" :key="item.title" class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="font-semibold text-[var(--text-primary)]">{{ item.title }}</p>
              <p class="mt-1 text-sm text-[var(--text-secondary)]">{{ item.actor }} · {{ item.type }}</p>
            </div>
            <StatusChip :tone="item.tone as 'success' | 'warning' | 'danger'">{{ item.status }}</StatusChip>
          </div>
          <button class="mt-3 inline-flex h-9 items-center gap-2 rounded-full bg-[var(--accent)] px-3 text-sm font-semibold text-white">
            <Flag class="h-4 w-4" />
            Review
          </button>
        </article>
      </div>
    </section>
  </div>
</template>
