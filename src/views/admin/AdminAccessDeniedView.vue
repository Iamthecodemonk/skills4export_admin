<script setup lang="ts">
import { useRoute } from 'vue-router'
const route = useRoute()
</script>
<template>
  <section class="audit-panel space-y-3" role="alert">
    <h1 class="text-2xl font-semibold">Access unavailable</h1>
    <p>{{ route.query.message || 'Access denied. Your account does not have permission to open this page.' }}</p>
    <button class="audit-button" @click="$router.go(-1)">Go back</button>
  </section>
</template>
