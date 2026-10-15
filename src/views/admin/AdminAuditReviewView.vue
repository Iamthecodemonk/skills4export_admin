<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ApiError } from '../../composables/useApi'
import { checkpointAudit, listAuditItems, listAuditUnits, reportAuditItem, type AuditAssignment, type AuditPage, type AuditPerson, type AuditUnit } from '../../services/postAudit'

const route = useRoute()
const unitId = computed(() => String(route.params.unitId))
const unit = ref<AuditUnit | null>(null)
const status = ref<'pending' | 'checked'>('pending'), page = ref(1)
const result = ref<AuditPage | null>(null)
const loading = ref(false), busy = ref(false), denied = ref(false), error = ref(''), notice = ref('')
const reporting = ref<string | null>(null), reason = ref(''), details = ref('')
let version = 0
function fail(e: unknown) { error.value = e instanceof Error ? e.message : 'Unable to complete request'; if (e instanceof ApiError && e.status === 403) denied.value = true }
function person(value: AuditPerson | null) { return value?.name || value?.username || value?.email || value?.id || 'Not available' }
function date(value?: string | null) { if (!value) return '—'; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString() }
async function load() {
  const request = ++version
  const id = unitId.value
  loading.value = true; result.value = null; error.value = ''
  try {
    const [items, units] = await Promise.all([listAuditItems(id, status.value, page.value), listAuditUnits()])
    if (request !== version) return
    unit.value = units.data.units.find(value => String(value.id) === id) || null
    if (items.data.current_page > items.data.last_page && items.data.last_page > 0) { page.value = items.data.last_page; return }
    result.value = items.data
  } catch (e) { if (request === version) fail(e) } finally { if (request === version) loading.value = false }
}
function tab(value: 'pending' | 'checked') { status.value = value; page.value = 1; reporting.value = null }
async function checkpoint(row?: AuditAssignment) {
  const message = row
    ? `Checkpoint through assignment ${row.id}? This marks that row and all newer pending assignments above it as checked in this unit, including any on earlier pages.`
    : 'Checkpoint all currently pending assignments in this unit, across all pages?'
  if (busy.value || !window.confirm(message)) return
  busy.value = true; error.value = ''; notice.value = ''
  try { const response = await checkpointAudit(unitId.value, row?.id); notice.value = `${response.data.checkedCount} assignments checked in this unit.`; reporting.value = null; await load() }
  catch (e) { fail(e); if (e instanceof ApiError && e.status === 409) { const message = error.value; await load(); error.value = message } }
  finally { busy.value = false }
}
async function report() {
  if (busy.value || !reporting.value || !reason.value.trim()) return
  busy.value = true; error.value = ''; notice.value = ''
  try { await reportAuditItem(unitId.value, reporting.value, reason.value.trim(), details.value.trim()); reporting.value = null; reason.value = ''; details.value = ''; notice.value = 'Report submitted. The content owner is notified anonymously; the content is not automatically suspended or removed.'; await load() }
  catch (e) { fail(e); if (e instanceof ApiError && e.status === 409) { const message = error.value; reporting.value = null; await load(); error.value = message } }
  finally { busy.value = false }
}
watch(() => route.params.unitId, () => { status.value = 'pending'; page.value = 1; unit.value = null; reporting.value = null; denied.value = false; notice.value = '' })
watch([unitId, status, page], load, { immediate: true })
</script>
<template>
  <div class="audit-page space-y-4">
    <RouterLink to="/admin/post-audit" class="text-sm underline">Back to audit units</RouterLink>
    <div class="audit-panel space-y-3"><h1 class="text-2xl font-semibold">{{ unit?.name || 'Audit unit review' }}</h1><p v-if="unit">{{ unit.isActive ? 'Active' : 'Inactive' }} · Total {{ unit.total }} · Pending {{ unit.pending }} · Checked {{ unit.checked }}</p><div class="flex flex-wrap gap-2"><button class="audit-button" :disabled="loading || busy || denied" @click="load">Refresh</button><button v-if="status === 'pending' && !denied" class="audit-button" :disabled="busy || loading || !result?.total" @click="checkpoint()">Checkpoint all pending</button></div></div>
    <p v-if="error" role="alert" class="audit-error">{{ error }}</p><p v-if="notice" role="status">{{ notice }}</p>
    <template v-if="!denied">
      <div class="flex gap-2" role="tablist" aria-label="Review status"><button v-for="value in (['pending', 'checked'] as const)" :key="value" role="tab" :aria-selected="status === value" :disabled="busy" class="audit-button" :class="status === value ? 'audit-selected' : ''" @click="tab(value)">{{ value === 'pending' ? 'Pending' : 'Checked history' }}</button></div>
      <p v-if="loading" role="status">Loading assignments…</p>
      <template v-else-if="result">
        <p class="text-sm">{{ result.total }} {{ status }} assignments · Page {{ result.current_page }} of {{ Math.max(1, result.last_page) }} · Newest first</p>
        <p v-if="!result.data.length" class="audit-panel">No {{ status }} assignments in this unit.</p>
        <article v-for="row in result.data" :key="row.id" class="audit-panel space-y-3">
          <div class="flex flex-wrap justify-between gap-2 text-sm"><span class="font-semibold capitalize">{{ row.item_type }} · {{ row.item_id }}</span><span>{{ status === 'checked' ? 'Checked' : 'Pending' }}</span></div>
          <h2 class="text-lg font-semibold">{{ row.item?.title || 'Untitled content' }}</h2>
          <p class="whitespace-pre-wrap break-words">{{ row.item?.body || row.item?.content || 'Content unavailable' }}</p>
          <dl class="grid gap-2 text-sm sm:grid-cols-2"><div><dt class="font-semibold">Author</dt><dd>{{ person(row.author) }}</dd></div><div><dt class="font-semibold">Auditor</dt><dd>{{ person(row.auditor) }}</dd></div><div><dt class="font-semibold">Assigned</dt><dd>{{ date(row.assigned_at) }}</dd></div><div><dt class="font-semibold">Checked</dt><dd>{{ date(row.checked_at) }}<span v-if="row.checked_by"> · {{ row.checked_by }}</span></dd></div></dl>
          <p class="break-all text-xs">Assignment ID: {{ row.id }}</p>
          <div v-if="row.report" class="rounded-lg bg-[var(--surface-muted)] p-3 text-sm"><p class="font-semibold">Reported: {{ row.report.reason || 'Reason unavailable' }}</p><p class="whitespace-pre-wrap">{{ row.report.details }}</p><p v-if="row.report.created_at">{{ date(row.report.created_at) }}</p></div><p v-else class="text-sm">No report</p>
          <div v-if="status === 'pending'" class="flex flex-wrap gap-2"><button v-if="!row.report" class="audit-button" :disabled="busy" @click="reporting = row.id; reason = ''; details = ''">Report item</button><button class="audit-button" :disabled="busy" @click="checkpoint(row)">Checkpoint through here</button></div>
          <form v-if="reporting === row.id" class="space-y-3 border-t border-[var(--border-soft)] pt-3" @submit.prevent="report"><label>Reason<input v-model="reason" required placeholder="e.g. Spam" /></label><label>Details (optional)<textarea v-model="details" rows="3" /></label><p class="text-sm">Reporting anonymously notifies the owner. It does not automatically suspend or remove content.</p><div class="flex gap-2"><button class="audit-button" :disabled="busy">Submit report</button><button type="button" class="audit-button" :disabled="busy" @click="reporting = null">Cancel</button></div></form>
        </article>
        <div class="flex items-center gap-3"><button class="audit-button" :disabled="busy || result.current_page <= 1" @click="page--">Previous</button><span class="text-sm">Page {{ result.current_page }}</span><button class="audit-button" :disabled="busy || result.current_page >= result.last_page" @click="page++">Next</button></div>
      </template>
    </template>
  </div>
</template>
