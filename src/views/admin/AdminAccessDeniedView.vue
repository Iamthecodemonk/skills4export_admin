<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { loadAdminAccess } from '../../composables/useAdminAccess'
const route = useRoute()
const router = useRouter()
const busy = ref(false), error = ref('')
async function retry() {
  busy.value = true; error.value = ''
  try {
    await loadAdminAccess(true)
    const target = typeof route.query.returnTo === 'string' && /^\/admin(?:\/|$)/.test(route.query.returnTo) ? route.query.returnTo : '/admin'
    await router.replace(target)
  } catch (e) { error.value = e instanceof Error ? e.message : 'Unable to verify access.' }
  finally { busy.value = false }
}
</script>
<template>
  <section class="audit-panel space-y-3" role="alert">
    <h1 class="text-2xl font-semibold">Access unavailable</h1>
    <p>{{ route.query.message || 'Access denied. Your account does not have permission to open this page.' }}</p>
    <p v-if="error" class="audit-error">{{ error }}</p>
    <div class="flex flex-wrap gap-2"><RouterLink class="audit-button" to="/admin">Admin home</RouterLink><button class="audit-button" :disabled="busy" @click="retry">{{ busy ? 'Checking…' : 'Retry permissions' }}</button></div>
  </section>
</template>
