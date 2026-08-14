<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Edit2, FileText, Loader2, Plus, RefreshCw, Save, Trash2, X } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import StatusChip from '../../components/StatusChip.vue'
import {
  createLegalDocument,
  deleteLegalDocument,
  listLegalDocuments,
  updateLegalDocument,
  type LegalDocument,
  type LegalDocumentContentType,
  type LegalDocumentStatus,
} from '../../services'

type LegalSlug = 'privacy-policy' | 'cookie-policy' | 'community-regulations' | 'terms-of-service'

const allowedDocuments: Array<{ slug: LegalSlug; title: string; publicPath: string }> = [
  { slug: 'privacy-policy', title: 'Privacy Policy', publicPath: '/api/privacy-policy' },
  { slug: 'cookie-policy', title: 'Cookie Policy', publicPath: '/api/cookie-policy' },
  { slug: 'community-regulations', title: 'Community Rules', publicPath: '/api/community-rules' },
  { slug: 'terms-of-service', title: 'Terms', publicPath: '/api/terms' },
]

const statuses: LegalDocumentStatus[] = ['draft', 'published', 'archived']
const contentTypes: LegalDocumentContentType[] = ['html']

const documents = ref<LegalDocument[]>([])
const loading = ref(false)
const saving = ref(false)
const deletingId = ref<string | null>(null)
const error = ref<string | null>(null)
const formError = ref<string | null>(null)
const editingDocument = ref<LegalDocument | null>(null)
const showDocumentModal = ref(false)

const form = ref({
  slug: 'privacy-policy' as LegalSlug,
  title: 'Privacy Policy',
  content: '<p>Policy content here</p>',
  contentType: 'html' as LegalDocumentContentType,
  version: '1.0',
  status: 'published' as LegalDocumentStatus,
  effectiveDate: new Date().toISOString().slice(0, 10),
})

const documentBySlug = computed(() => {
  return new Map(documents.value.map((document) => [document.slug, document]))
})

const publishedCount = computed(() => documents.value.filter((document) => document.status === 'published').length)

function displayName(slug: string) {
  return allowedDocuments.find((document) => document.slug === slug)?.title || slug
}

function publicPath(slug: string) {
  return allowedDocuments.find((document) => document.slug === slug)?.publicPath || `/api/legal-documents/${slug}`
}

function contentType(document: LegalDocument) {
  return document.contentType || document.content_type || 'html'
}

function effectiveDate(document: LegalDocument) {
  return document.effectiveDate || document.effective_date || ''
}

function updatedAt(document: LegalDocument) {
  return document.updatedAt || document.updated_at || document.createdAt || document.created_at || ''
}

function statusTone(status: LegalDocumentStatus) {
  if (status === 'published') return 'success'
  if (status === 'draft') return 'warning'
  return 'muted'
}

function formatDate(value?: string | null) {
  if (!value) return 'Not set'

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function resetForm(slug: LegalSlug = 'privacy-policy') {
  const document = allowedDocuments.find((item) => item.slug === slug) || allowedDocuments[0]
  editingDocument.value = null
  form.value = {
    slug: document.slug,
    title: document.title,
    content: '<p>Policy content here</p>',
    contentType: 'html',
    version: '1.0',
    status: 'published',
    effectiveDate: new Date().toISOString().slice(0, 10),
  }
  formError.value = null
}

function editDocument(document: LegalDocument) {
  editingDocument.value = document
  showDocumentModal.value = true
  form.value = {
    slug: document.slug as LegalSlug,
    title: document.title,
    content: document.content || '',
    contentType: contentType(document),
    version: document.version || '1.0',
    status: document.status,
    effectiveDate: effectiveDate(document) ? effectiveDate(document).slice(0, 10) : new Date().toISOString().slice(0, 10),
  }
  formError.value = null
}

function openDocumentModal(slug: LegalSlug = 'privacy-policy') {
  const existingDocument = documentBySlug.value.get(slug)
  if (existingDocument) {
    editDocument(existingDocument)
    return
  }

  resetForm(slug)
  showDocumentModal.value = true
}

function selectDocumentTab(slug: LegalSlug) {
  const existingDocument = documentBySlug.value.get(slug)
  if (existingDocument) {
    editDocument(existingDocument)
    return
  }

  resetForm(slug)
}

function closeDocumentModal() {
  showDocumentModal.value = false
  resetForm(form.value.slug)
}

function buildPayload() {
  if (!form.value.slug || !form.value.title.trim() || !form.value.content.trim()) {
    throw new Error('Slug, title, and content are required')
  }

  return {
    slug: form.value.slug,
    title: form.value.title.trim(),
    content: form.value.content.trim(),
    contentType: form.value.contentType,
    version: form.value.version.trim() || '1.0',
    status: form.value.status,
    effectiveDate: form.value.effectiveDate,
  }
}

async function fetchDocuments() {
  loading.value = true
  error.value = null

  try {
    documents.value = await listLegalDocuments()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unable to load legal documents'
    documents.value = []
  } finally {
    loading.value = false
  }
}

async function saveDocument() {
  saving.value = true
  formError.value = null

  try {
    const payload = buildPayload()
    const response = editingDocument.value
      ? await updateLegalDocument(editingDocument.value.id, payload)
      : await createLegalDocument(payload)

    const savedDocument = response.data
    documents.value = editingDocument.value
      ? documents.value.map((document) => document.id === savedDocument.id ? savedDocument : document)
      : [savedDocument, ...documents.value.filter((document) => document.slug !== savedDocument.slug)]

    toast.success(editingDocument.value ? 'Legal document updated' : 'Legal document created')
    editDocument(savedDocument)
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Unable to save legal document'
  } finally {
    saving.value = false
  }
}

async function removeDocument(document: LegalDocument) {
  if (!window.confirm(`Delete ${document.title}?`)) return

  deletingId.value = document.id

  try {
    await deleteLegalDocument(document.id)
    documents.value = documents.value.filter((item) => item.id !== document.id)
    if (editingDocument.value?.id === document.id) closeDocumentModal()
    toast.success('Legal document deleted')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Unable to delete legal document')
  } finally {
    deletingId.value = null
  }
}

watch(() => form.value.slug, (slug) => {
  if (editingDocument.value) return
  form.value.title = displayName(slug)
})

onMounted(() => {
  fetchDocuments()
})
</script>

<template>
  <div class="space-y-4">
    <section class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Management</p>
          <h1 class="mt-2 font-display text-xl font-semibold text-[var(--text-primary)]">Legal Documents</h1>
          <p class="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">Create drafts, publish user-facing policies, and archive older legal copy.</p>
        </div>

        <div class="flex flex-wrap gap-2">
          <button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-[0.85rem] border border-[color:var(--border-soft)] px-3 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-strong)] disabled:opacity-60" :disabled="loading" @click="fetchDocuments">
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
            Refresh
          </button>
          <button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-[0.85rem] bg-[var(--accent)] px-3 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]" @click="openDocumentModal()">
            <Plus class="h-4 w-4" />
            Create document
          </button>
        </div>
      </div>
    </section>

    <section class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)]">
      <div class="border-b border-[color:var(--border-soft)] p-4">
        <h2 class="font-display text-base font-semibold text-[var(--text-primary)]">Documents</h2>
        <p class="mt-1 text-sm text-[var(--text-secondary)]">{{ documents.length }} total / {{ publishedCount }} published</p>
      </div>

      <div v-if="loading" class="flex min-h-64 items-center justify-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
        <Loader2 class="h-4 w-4 animate-spin" />
        Loading legal documents
      </div>

      <div v-else-if="error" class="p-4">
        <div class="rounded-[0.9rem] border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200">{{ error }}</div>
      </div>

      <div v-else class="divide-y divide-[color:var(--border-soft)]">
        <article v-for="document in allowedDocuments" :key="document.slug" class="p-4">
          <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="font-semibold text-[var(--text-primary)]">{{ documentBySlug.get(document.slug)?.title || document.title }}</h3>
                <StatusChip v-if="documentBySlug.get(document.slug)" :tone="statusTone(documentBySlug.get(document.slug)!.status)">{{ documentBySlug.get(document.slug)!.status }}</StatusChip>
                <StatusChip v-else tone="muted">missing</StatusChip>
              </div>
              <p class="mt-1 break-all text-xs text-[var(--text-tertiary)]">{{ document.slug }} / {{ publicPath(document.slug) }}</p>
              <p v-if="documentBySlug.get(document.slug)" class="mt-2 text-sm text-[var(--text-secondary)]">
                Version {{ documentBySlug.get(document.slug)!.version || '1.0' }} / Effective {{ formatDate(effectiveDate(documentBySlug.get(document.slug)!)) }} / Updated {{ formatDate(updatedAt(documentBySlug.get(document.slug)!)) }}
              </p>
            </div>

            <div class="flex shrink-0 gap-2">
              <button
                type="button"
                class="inline-flex h-9 items-center justify-center gap-2 rounded-[0.75rem] border border-[color:var(--border-soft)] px-3 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)]"
                @click="openDocumentModal(document.slug)"
              >
                <Edit2 v-if="documentBySlug.get(document.slug)" class="h-4 w-4" />
                <Plus v-else class="h-4 w-4" />
                {{ documentBySlug.get(document.slug) ? 'Edit' : 'Create' }}
              </button>
              <button
                v-if="documentBySlug.get(document.slug)"
                type="button"
                class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60"
                :disabled="deletingId === documentBySlug.get(document.slug)!.id"
                :aria-label="`Delete ${document.title}`"
                @click="removeDocument(documentBySlug.get(document.slug)!)"
              >
                <Loader2 v-if="deletingId === documentBySlug.get(document.slug)!.id" class="h-4 w-4 animate-spin" />
                <Trash2 v-else class="h-4 w-4" />
              </button>
            </div>
          </div>
        </article>
      </div>
    </section>

    <div v-if="showDocumentModal" class="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-bg)] px-4 py-6" role="dialog" aria-modal="true" @click.self="closeDocumentModal">
      <section class="app-scroll max-h-[calc(100vh-3rem)] w-full max-w-5xl overflow-y-auto rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)]">
        <div class="flex items-start justify-between gap-3 border-b border-[color:var(--border-soft)] p-4">
          <div>
            <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Legal document</p>
            <h2 class="mt-2 font-display text-xl font-semibold text-[var(--text-primary)]">{{ editingDocument ? 'Edit document' : 'Create document' }}</h2>
          </div>
          <button type="button" class="grid h-9 w-9 place-items-center rounded-[0.75rem] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]" aria-label="Close document modal" @click="closeDocumentModal">
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="p-4">
          <div class="app-scroll flex gap-2 overflow-x-auto rounded-[0.85rem] bg-[var(--surface-muted)] p-1">
            <button
              v-for="document in allowedDocuments"
              :key="document.slug"
              type="button"
              class="h-10 shrink-0 rounded-[0.75rem] px-3 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-primary)] hover:text-[var(--accent-strong)]"
              :class="form.slug === document.slug ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent)] hover:text-white' : ''"
              @click="selectDocumentTab(document.slug)"
            >
              {{ document.title }}
            </button>
          </div>

          <form class="mt-5" @submit.prevent="saveDocument">
            <div class="grid gap-4 md:grid-cols-2">
              <label>
                <span class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Slug</span>
                <input v-model="form.slug" disabled class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-secondary)] outline-none" />
              </label>

              <label>
                <span class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Title</span>
                <input v-model="form.title" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="Privacy Policy" />
              </label>

              <label>
                <span class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Version</span>
                <input v-model="form.version" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="1.0" />
              </label>

              <label>
                <span class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Status</span>
                <select v-model="form.status" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm capitalize outline-none focus:border-[var(--accent)]">
                  <option v-for="status in statuses" :key="status" :value="status">{{ status }}</option>
                </select>
              </label>

              <label>
                <span class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Effective date</span>
                <input v-model="form.effectiveDate" type="date" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--accent)]" />
              </label>

              <label>
                <span class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Content type</span>
                <select v-model="form.contentType" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm uppercase outline-none focus:border-[var(--accent)]">
                  <option v-for="type in contentTypes" :key="type" :value="type">{{ type }}</option>
                </select>
              </label>

              <label class="md:col-span-2">
                <span class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Content</span>
                <textarea v-model="form.content" class="min-h-80 w-full resize-y rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 py-3 font-mono text-sm outline-none focus:border-[var(--accent)]" placeholder="<p>Policy content here</p>"></textarea>
              </label>
            </div>

            <p v-if="formError" class="mt-4 rounded-[0.85rem] border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200">{{ formError }}</p>

            <div class="mt-5 flex justify-end gap-2">
              <button type="button" class="inline-flex h-11 items-center justify-center rounded-[0.85rem] border border-[color:var(--border-soft)] px-4 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-strong)]" @click="resetForm(form.slug)">Clear</button>
              <button type="submit" class="inline-flex h-11 items-center justify-center gap-2 rounded-[0.85rem] bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:cursor-wait disabled:opacity-70" :disabled="saving">
                <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
                <Save v-else class="h-4 w-4" />
                {{ editingDocument ? 'Save document' : 'Create document' }}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  </div>
</template>
