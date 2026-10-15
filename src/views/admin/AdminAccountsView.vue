<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { apiRequest, ApiError } from '../../composables/useApi'
import { adminAccess } from '../../composables/useAdminAccess'

type Account = { id: string; email: string; role: string; isSuperAdmin: boolean }
const accounts = ref<Account[]>([])
const email = ref(''), password = ref(''), error = ref(''), notice = ref('')
const loading = ref(false), busy = ref(false), denied = ref(false)
function fail(e: unknown) { error.value = e instanceof Error ? e.message : 'Unable to complete request'; if (e instanceof ApiError && e.status === 403) denied.value = true }
async function load() {
  loading.value = true
  try {
    const result = await apiRequest<{ data: Account[] | { data: Account[] } }>('/api/admin/users')
    accounts.value = Array.isArray(result.data) ? result.data : result.data.data
  } catch (e) { fail(e) } finally { loading.value = false }
}
async function create() {
  if (busy.value) return
  error.value = ''; notice.value = ''
  if (password.value.length < 8 || !/\d/.test(password.value)) { error.value = 'Password must have at least eight characters and one digit.'; return }
  busy.value = true
  try {
    await apiRequest('/api/admin/users', { method: 'POST', body: JSON.stringify({ email: email.value.trim(), password: password.value }) })
    email.value = ''; password.value = ''; notice.value = 'Admin account created.'; await load()
  } catch (e) { fail(e) } finally { busy.value = false }
}
async function grant(account: Account) {
  if (busy.value || !window.confirm(`Grant superadmin access to ${account.email}? They will be able to create admins, grant superadmin access, and configure audits.`)) return
  busy.value = true; error.value = ''; notice.value = ''
  try {
    await apiRequest(`/api/admin/users/${encodeURIComponent(account.id)}/super-admin`, { method: 'PUT' })
    notice.value = `Superadmin access granted to ${account.email}.`; await load()
  } catch (e) { fail(e) } finally { busy.value = false }
}
onMounted(load)
</script>
<template>
  <div class="audit-page space-y-4">
    <h1 class="text-2xl font-semibold">Admin users</h1>
    <p v-if="error" class="audit-error" role="alert">{{ error }}</p>
    <p v-if="notice" role="status">{{ notice }}</p>
    <template v-if="adminAccess.isSuperAdmin && !denied">
      <form class="audit-panel space-y-3" @submit.prevent="create">
        <h2 class="text-lg font-semibold">Create admin</h2>
        <label>Email<input v-model="email" type="email" required autocomplete="off" /></label>
        <label>Password<input v-model="password" type="password" required minlength="8" pattern="(?=.*[0-9]).{8,}" autocomplete="new-password" /></label>
        <p class="text-sm">Use at least eight characters and one digit.</p>
        <button class="audit-button" :disabled="busy">{{ busy ? 'Saving…' : 'Create admin' }}</button>
      </form>
      <section class="audit-panel space-y-3">
        <div class="flex justify-between"><h2 class="text-lg font-semibold">Accounts</h2><button class="audit-button" :disabled="loading || busy" @click="error = ''; load()">Refresh</button></div>
        <p v-if="loading" role="status">Loading accounts…</p>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-sm"><thead><tr><th>Email</th><th>Role</th><th>Access</th><th>Action</th></tr></thead>
            <tbody><tr v-for="account in accounts" :key="account.id"><td>{{ account.email }}</td><td>{{ account.role }}</td><td>{{ account.isSuperAdmin ? 'Superadmin' : 'Admin' }}</td><td><button v-if="!account.isSuperAdmin" class="audit-button" :disabled="busy" @click="grant(account)">Grant superadmin</button></td></tr></tbody>
          </table>
          <p v-if="!accounts.length">No admin accounts found.</p>
        </div>
      </section>
    </template>
    <p v-else role="alert">Access denied. Superadmin access is required.</p>
  </div>
</template>
