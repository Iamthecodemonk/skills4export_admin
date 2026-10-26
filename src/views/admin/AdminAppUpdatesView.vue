<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { Loader2, RefreshCw, Save, Smartphone } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import StatusChip from '../../components/StatusChip.vue'
import {
  compareAppVersions, listAppUpdatePolicies, saveAppUpdatePolicy, validateAppUpdatePolicy,
  type AppPlatform, type AppUpdatePayload, type AppUpdatePolicy,
} from '../../services/adminAppUpdates'

const platforms: AppPlatform[] = ['android', 'ios']
const selected = ref<AppPlatform>('android')
const policies = ref<AppUpdatePolicy[]>([])
const loading = ref(true)
const saving = ref(false)
const loadError = ref('')
const formError = ref('')
const savedNotice = ref('')
const confirmed = ref(false)
const releaseDate = ref('')
const form = ref<AppUpdatePayload>(emptyForm())
const baseline = ref(JSON.stringify([form.value, releaseDate.value]))
const current = computed(() => policies.value.find(policy => policy.platform === selected.value))
const dirty = computed(() => baseline.value !== JSON.stringify([form.value, releaseDate.value]))
const raisesMinimum = computed(() => {
  const previous = current.value?.minSupportedVersion
  return !!previous && /^\d+\.\d+\.\d+$/.test(previous)
    && /^\d+\.\d+\.\d+$/.test(form.value.minSupportedVersion)
    && compareAppVersions(form.value.minSupportedVersion, previous) > 0
})

function emptyForm(): AppUpdatePayload {
  return { latestVersion: '', minSupportedVersion: '', storeUrl: '', releaseNotes: '', releasedAt: null, isPublished: false }
}

function policyFor(platform: AppPlatform) {
  return policies.value.find(policy => policy.platform === platform)
}

function resetForm() {
  const policy = current.value
  form.value = policy ? {
    latestVersion: policy.latestVersion, minSupportedVersion: policy.minSupportedVersion,
    storeUrl: policy.storeUrl, releaseNotes: policy.releaseNotes,
    releasedAt: policy.releasedAt, isPublished: policy.isPublished,
  } : emptyForm()
  const date = policy?.releasedAt ? new Date(policy.releasedAt) : null
  releaseDate.value = date && Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 19) : ''
  confirmed.value = false
  formError.value = ''
  baseline.value = JSON.stringify([form.value, releaseDate.value])
}

function selectPlatform(platform: AppPlatform) {
  if (selected.value === platform) return
  if (dirty.value && !window.confirm('Discard your unsaved policy changes?')) return
  selected.value = platform
  savedNotice.value = ''
  resetForm()
}

async function fetchPolicies() {
  loading.value = true
  loadError.value = ''
  try {
    policies.value = await listAppUpdatePolicies()
    resetForm()
    return true
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : 'Unable to load app update policies.'
    return false
  } finally {
    loading.value = false
  }
}

async function refresh() {
  if (dirty.value && !window.confirm('Discard your unsaved changes and refresh policies?')) return
  savedNotice.value = ''
  await fetchPolicies()
}

async function savePolicy() {
  if (saving.value || loading.value || loadError.value) return
  formError.value = ''
  savedNotice.value = ''
  const parsedDate = releaseDate.value ? new Date(`${releaseDate.value}Z`) : null
  if (parsedDate && !Number.isFinite(parsedDate.getTime())) {
    formError.value = 'Enter a valid release date and time in UTC.'
    return
  }
  const payload: AppUpdatePayload = {
    ...form.value,
    latestVersion: form.value.latestVersion.trim(),
    minSupportedVersion: form.value.minSupportedVersion.trim(),
    storeUrl: form.value.storeUrl.trim(),
    releaseNotes: form.value.releaseNotes.trim(),
    releasedAt: parsedDate?.toISOString() ?? null,
  }
  const validation = validateAppUpdatePolicy(selected.value, payload)
  if (validation) { formError.value = validation; return }
  if (payload.isPublished && !confirmed.value) {
    formError.value = 'Confirm the store listing and release availability before publishing.'
    return
  }
  if (!payload.isPublished && current.value?.isPublished
    && !window.confirm('Save as draft? This replaces the published policy and stops public update checks for this platform until you publish again.')) return

  saving.value = true
  try {
    await saveAppUpdatePolicy(selected.value, payload)
    const message = `${selected.value === 'android' ? 'Android' : 'iOS'} policy saved as ${payload.isPublished ? 'published' : 'draft'}.`
    toast.success(message)
    const refreshed = await fetchPolicies()
    savedNotice.value = refreshed ? message : `${message} Refresh failed; reload policies before making further changes.`
  } catch (error) {
    formError.value = error instanceof Error ? error.message : 'Unable to save the app update policy.'
  } finally {
    saving.value = false
  }
}

// Any edit invalidates the previous release confirmation.
watch([form, releaseDate], () => { confirmed.value = false }, { deep: true, flush: 'sync' })
onBeforeRouteLeave(() => !saving.value && (!dirty.value || window.confirm('Discard your unsaved policy changes?')))
onMounted(fetchPolicies)
</script>

<template>
  <div class="space-y-4">
    <section class="panel flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">Management · Superadmin</p>
        <h1 class="mt-2 font-display text-xl font-semibold">App Updates</h1>
        <p class="mt-1 text-sm text-[var(--text-secondary)]">Manage mobile releases, minimum supported versions, and store links.</p>
      </div>
      <button type="button" class="secondary-button" :disabled="loading || saving" @click="refresh">
        <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" /> Refresh
      </button>
    </section>

    <section class="panel text-sm text-[var(--text-secondary)]">
      <p class="font-semibold text-[var(--text-primary)]">Roll out safely</p>
      <p class="mt-1">Publish the latest release with the prior minimum first to offer an optional update. Raise the minimum only when the replacement is available to everyone affected. A staged release may not yet be installable by all users.</p>
      <p class="mt-2">Drafts are excluded from public checks. Leave iOS unconfigured until this app has a real App Store listing.</p>
    </section>

    <p v-if="savedNotice" role="status" class="panel text-sm text-[var(--accent-strong)]">{{ savedNotice }}</p>
    <div v-if="loading" role="status" class="panel flex items-center justify-center gap-2 py-12 text-sm">
      <Loader2 class="h-4 w-4 animate-spin" /> Loading app update policies…
    </div>
    <div v-else-if="loadError" role="alert" class="panel text-sm text-red-600 dark:text-red-300">
      {{ loadError }} Use Refresh to retry.
    </div>
    <template v-else>
      <div class="grid gap-3 sm:grid-cols-2">
        <button v-for="platform in platforms" :key="platform" type="button" class="panel text-left transition-colors hover:border-[var(--accent)] disabled:opacity-60"
          :class="selected === platform ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]' : ''"
          :aria-pressed="selected === platform" :disabled="saving" @click="selectPlatform(platform)">
          <div class="flex flex-wrap items-center gap-2">
            <Smartphone class="h-4 w-4" />
            <span class="font-semibold">{{ platform === 'android' ? 'Android' : 'iOS' }}</span>
            <StatusChip :tone="!policyFor(platform) ? 'muted' : policyFor(platform)!.isPublished ? 'success' : 'warning'">
              {{ !policyFor(platform) ? 'Unconfigured' : policyFor(platform)!.isPublished ? 'Published' : 'Draft' }}
            </StatusChip>
          </div>
          <p class="mt-3 text-sm text-[var(--text-secondary)]">
            {{ policyFor(platform) ? `Latest ${policyFor(platform)!.latestVersion} · Minimum ${policyFor(platform)!.minSupportedVersion}` : 'No policy configured' }}
          </p>
        </button>
      </div>

      <form class="panel" @submit.prevent="savePolicy">
        <h2 class="font-display text-lg font-semibold">{{ selected === 'android' ? 'Android' : 'iOS' }} policy</h2>
        <p class="mt-1 text-sm text-[var(--text-secondary)]">Changes replace this platform’s entire policy. Nothing is saved until you select Save.</p>
        <fieldset :disabled="saving" class="mt-5 space-y-4 disabled:opacity-70">
          <div class="grid gap-4 sm:grid-cols-2">
            <label>
              <span class="field-label">Latest version</span>
              <input v-model="form.latestVersion" class="field" required pattern="[0-9]+\.[0-9]+\.[0-9]+" placeholder="major.minor.patch" autocomplete="off" />
            </label>
            <label>
              <span class="field-label">Minimum supported version</span>
              <input v-model="form.minSupportedVersion" class="field" required pattern="[0-9]+\.[0-9]+\.[0-9]+" placeholder="major.minor.patch" autocomplete="off" />
            </label>
          </div>
          <p class="text-xs text-[var(--text-tertiary)]">Versions below the minimum require an update. Supported versions below the latest receive an optional update.</p>
          <label class="block">
            <span class="field-label">Real {{ selected === 'android' ? 'Google Play' : 'App Store' }} listing URL</span>
            <input v-model="form.storeUrl" class="field" type="url" required placeholder="Paste this app’s actual store listing URL" />
          </label>
          <label class="block">
            <span class="field-label">Release notes</span>
            <textarea v-model="form.releaseNotes" class="field min-h-28 py-3" rows="4" placeholder="Describe what changed for users" />
          </label>
          <div class="grid gap-4 sm:grid-cols-2">
            <label>
              <span class="field-label">Released at (UTC){{ form.isPublished ? ' — required' : '' }}</span>
              <input v-model="releaseDate" class="field" type="datetime-local" step="1" :required="form.isPublished" />
            </label>
            <label>
              <span class="field-label">Policy status</span>
              <select v-model="form.isPublished" class="field">
                <option :value="false">Draft — excluded from public checks</option>
                <option :value="true">Published — used by mobile clients</option>
              </select>
            </label>
          </div>
          <p v-if="!form.isPublished && current?.isPublished" class="notice">Saving as draft withdraws the current published policy. Public checks will return policy unavailable until you publish again.</p>
          <p v-if="raisesMinimum" class="notice">You are raising minimum support from {{ current?.minSupportedVersion }} to {{ form.minSupportedVersion }}. Publishing this change will require older clients to update.</p>
          <label v-if="form.isPublished" class="flex items-start gap-3 rounded-xl border border-[color:var(--border-soft)] p-4 text-sm">
            <input v-model="confirmed" type="checkbox" required class="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]" />
            <span>I independently confirmed that this is our app’s real store listing, the latest release is live, and a supported replacement is installable by everyone affected by the minimum version, including users outside any staged rollout.</span>
          </label>
          <p v-if="formError" role="alert" class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200">{{ formError }}</p>
          <div class="flex flex-wrap items-center justify-end gap-3">
            <span v-if="dirty" class="mr-auto text-xs text-[var(--text-tertiary)]">Unsaved changes</span>
            <button type="button" class="secondary-button" :disabled="saving || !dirty" @click="resetForm">Reset changes</button>
            <button type="submit" class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-60" :disabled="saving || (form.isPublished && !confirmed)">
              <Loader2 v-if="saving" class="h-4 w-4 animate-spin" /><Save v-else class="h-4 w-4" />
              {{ saving ? 'Saving…' : form.isPublished ? 'Save published policy' : 'Save draft' }}
            </button>
          </div>
        </fieldset>
      </form>
    </template>
  </div>
</template>

<style scoped>
@reference "../../style.css";
.panel { @apply rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4 text-[var(--text-primary)]; }
.field-label { @apply mb-2 block text-sm font-semibold; }
.field { @apply h-11 w-full rounded-xl border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]; }
.secondary-button { @apply inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[color:var(--border-soft)] px-3 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-strong)] disabled:opacity-60; }
.notice { @apply rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200; }
</style>
