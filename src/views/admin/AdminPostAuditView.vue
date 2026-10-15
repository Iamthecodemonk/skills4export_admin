<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { adminAccess } from '../../composables/useAdminAccess'
import { ApiError } from '../../composables/useApi'
import { assignAuditItem, createAuditUnit, dispatchAudit, listAuditUnits, saveAuditSettings, updateAuditUnit, type AuditUnit } from '../../services/postAudit'

const units = ref<AuditUnit[]>([]), copies = ref(1)
const loading = ref(false), busy = ref(false), denied = ref(false)
const error = ref(''), notice = ref('')
const newName = ref(''), newOrder = ref(0)
const editing = ref<string | null>(null), editName = ref(''), editOrder = ref(0), editActive = ref(true)
const limit = ref(500), dispatchResult = ref<unknown>(null)
const itemType = ref<'post' | 'question'>('post'), itemId = ref(''), unitIds = ref<string[]>([]), replace = ref(false)
const activeCount = computed(() => units.value.filter(unit => unit.isActive).length)
const maxCopies = computed(() => Math.min(20, activeCount.value))
function fail(e: unknown) { error.value = e instanceof Error ? e.message : 'Unable to complete request'; if (e instanceof ApiError && e.status === 403) denied.value = true }
async function load() {
  loading.value = true
  try { const result = await listAuditUnits(); units.value = result.data.units; copies.value = result.data.settings.copiesPerItem }
  catch (e) { fail(e) } finally { loading.value = false }
}
async function mutate(action: () => Promise<unknown>, message: string) {
  if (busy.value) return
  busy.value = true; error.value = ''; notice.value = ''
  try { await action(); notice.value = message; await load() } catch (e) { fail(e) } finally { busy.value = false }
}
function edit(unit: AuditUnit) { editing.value = unit.id; editName.value = unit.name; editOrder.value = unit.sortOrder; editActive.value = unit.isActive }
async function create() {
  if (!newName.value.trim() || !Number.isInteger(newOrder.value)) return
  await mutate(async () => { await createAuditUnit(newName.value.trim(), newOrder.value); newName.value = '' }, 'Audit unit created.')
}
async function saveUnit() {
  if (!editing.value || !editName.value.trim() || !Number.isInteger(editOrder.value)) return
  await mutate(async () => { await updateAuditUnit(editing.value!, { name: editName.value.trim(), sortOrder: editOrder.value, isActive: editActive.value }); editing.value = null }, 'Audit unit updated.')
}
function saveCopies() {
  if (!Number.isInteger(copies.value) || copies.value < 1 || copies.value > maxCopies.value) { error.value = `Choose a copy count from 1 to ${maxCopies.value}.`; return }
  return mutate(() => saveAuditSettings(copies.value), 'Copy count saved.')
}
function dispatch() {
  if (!Number.isInteger(limit.value) || limit.value < 1) return
  return mutate(async () => { dispatchResult.value = (await dispatchAudit(limit.value)).data }, 'Historical content batch dispatched. Check the results before running another batch.')
}
function assign() {
  if (!itemId.value.trim()) return
  if (replace.value && !window.confirm('Replace the assignments for this item with the selected units? Reviewed or reported assignments cannot be removed.')) return
  return mutate(async () => { const result = await assignAuditItem(itemType.value, itemId.value.trim(), unitIds.value, replace.value); notice.value = `Assignments saved (${result.data.assignments.length}).` }, 'Item assignments saved.')
}
onMounted(load)
</script>
<template>
  <div class="audit-page space-y-4">
    <div class="flex items-center justify-between gap-3"><div><h1 class="text-2xl font-semibold">Post audit</h1><p class="mt-1 text-sm">Review posts and questions in each audit unit.</p></div><button class="audit-button" :disabled="loading || busy" @click="error = ''; load()">Refresh</button></div>
    <p v-if="error" class="audit-error" role="alert">{{ error }}</p><p v-if="notice" role="status">{{ notice }}</p>
    <template v-if="!denied">
      <p v-if="loading" role="status">Loading audit units…</p>
      <section class="grid gap-3 sm:grid-cols-2" aria-label="Audit units">
        <article v-for="unit in units" :key="unit.id" class="audit-panel space-y-3">
          <h2 class="text-lg font-semibold">{{ unit.name }}</h2>
          <p class="text-sm">{{ unit.isActive ? 'Active' : 'Inactive — history remains available' }} · Order {{ unit.sortOrder }}</p>
          <dl class="flex flex-wrap gap-5 text-sm"><div><dt>Total</dt><dd class="text-xl font-semibold">{{ unit.total }}</dd></div><div><dt>Pending</dt><dd class="text-xl font-semibold">{{ unit.pending }}</dd></div><div><dt>Checked</dt><dd class="text-xl font-semibold">{{ unit.checked }}</dd></div></dl>
          <div class="flex flex-wrap gap-2"><RouterLink class="audit-button" :to="`/admin/post-audit/units/${encodeURIComponent(unit.id)}`">Open review</RouterLink><button v-if="adminAccess.isSuperAdmin" class="audit-button" :disabled="busy" @click="edit(unit)">Edit unit</button></div>
        </article>
      </section>
      <p v-if="!loading && !units.length" class="audit-panel">No audit units have been configured.</p>
      <template v-if="adminAccess.isSuperAdmin">
        <form v-if="editing !== null" class="audit-panel space-y-3" @submit.prevent="saveUnit">
          <h2 class="text-lg font-semibold">Edit unit</h2><label>Name<input v-model="editName" required /></label><label>Sort order<input v-model.number="editOrder" type="number" step="1" required /></label><label class="audit-check"><input v-model="editActive" type="checkbox" />Active</label>
          <p class="text-sm">Deactivation stops new automatic assignments and preserves existing work and history.</p>
          <div class="flex gap-2"><button class="audit-button" :disabled="busy">Save unit</button><button type="button" class="audit-button" :disabled="busy" @click="editing = null">Cancel</button></div>
        </form>
        <div class="grid gap-4 sm:grid-cols-2">
          <form class="audit-panel space-y-3" @submit.prevent="create"><h2 class="text-lg font-semibold">Create unit</h2><label>Name<input v-model="newName" required /></label><label>Sort order<input v-model.number="newOrder" type="number" step="1" required /></label><button class="audit-button" :disabled="busy">Create unit</button></form>
          <form class="audit-panel space-y-3" @submit.prevent="saveCopies"><h2 class="text-lg font-semibold">Automatic assignment</h2><label>Copies per item<input v-model.number="copies" type="number" min="1" :max="maxCopies || 1" step="1" required /></label><p class="text-sm">{{ activeCount }} active units. Choose 1–20 copies, up to the active unit count.</p><p v-if="!activeCount" class="text-sm">Activate a unit before saving the copy count.</p><button class="audit-button" :disabled="busy || !activeCount">Save copy count</button></form>
        </div>
        <form class="audit-panel space-y-3" @submit.prevent="dispatch"><h2 class="text-lg font-semibold">Dispatch historical content</h2><p class="text-sm">Run batches until the results report zero processed posts and questions.</p><label>Batch limit<input v-model.number="limit" type="number" min="1" step="1" required /></label><button class="audit-button" :disabled="busy">Dispatch batch</button><pre v-if="dispatchResult" class="overflow-auto whitespace-pre-wrap text-sm" aria-label="Dispatch results">{{ JSON.stringify(dispatchResult, null, 2) }}</pre></form>
        <form class="audit-panel space-y-3" @submit.prevent="assign"><h2 class="text-lg font-semibold">Assign a specific item</h2><label>Content type<select v-model="itemType"><option value="post">Post</option><option value="question">Question</option></select></label><label>Item ID<input v-model="itemId" required /></label><fieldset class="space-y-2"><legend class="mb-2 font-semibold">Units</legend><label v-for="unit in units" :key="unit.id" class="audit-check"><input v-model="unitIds" type="checkbox" :value="unit.id" />{{ unit.name }}{{ unit.isActive ? '' : ' (inactive)' }}</label></fieldset><label class="audit-check"><input v-model="replace" type="checkbox" />Replace existing assignments</label><p class="text-sm">Replacing makes this selection authoritative. Reviewed or reported assignments cannot be removed.</p><button class="audit-button" :disabled="busy || !units.length || (!replace && !unitIds.length)">Save assignments</button></form>
      </template>
    </template>
  </div>
</template>
