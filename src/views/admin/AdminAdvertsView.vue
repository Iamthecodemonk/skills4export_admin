<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Edit2, Eye, Image, Loader2, Megaphone, Plus, RefreshCw, Search, Trash2, X } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import StatusChip from '../../components/StatusChip.vue'
import {
  createAdvert,
  createAdvertLocation,
  createAdvertSite,
  deleteAdvert,
  deleteAdvertLocation,
  deleteAdvertSite,
  getAdvert,
  getMediaJob,
  getMediaSignature,
  listAdvertLocations,
  listAdvertSites,
  listAdverts,
  registerMedia,
  updateAdvert,
  updateAdvertLocation,
  updateAdvertSite,
  updateAdvertStatus,
  uploadImageToCloudinary,
  type Advert,
  type AdvertPlacementOption,
  type AdvertStatus,
  type MediaJobResponse,
} from '../../services'

type AdminAdvertTab = 'adverts' | 'locations' | 'sites'
type AdvertDetailTab = 'preview' | 'owner' | 'meta'
type PlacementKind = 'location' | 'site'

const tabs: Array<{ label: string; value: AdminAdvertTab }> = [
  { label: 'Adverts', value: 'adverts' },
  { label: 'Locations', value: 'locations' },
  { label: 'Sites', value: 'sites' },
]

const advertStatuses: AdvertStatus[] = ['pending_review', 'approved', 'active', 'expired', 'suspended', 'deleted']

const activeTab = ref<AdminAdvertTab>('adverts')
const adverts = ref<Advert[]>([])
const locations = ref<AdvertPlacementOption[]>([])
const sites = ref<AdvertPlacementOption[]>([])
const search = ref('')
const status = ref('')
const locationId = ref('')
const siteId = ref('')
const sort = ref('newest')
const page = ref(1)
const perPage = ref(20)
const total = ref(0)
const lastPage = ref(1)
const from = ref<number | null>(null)
const to = ref<number | null>(null)
const loading = ref(false)
const optionsLoading = ref(false)
const creating = ref(false)
const updatingId = ref<string | null>(null)
const error = ref<string | null>(null)
const formError = ref<string | null>(null)
const showCreateForm = ref(false)
const viewingAdvert = ref<Advert | null>(null)
const advertDetailTab = ref<AdvertDetailTab>('preview')
const viewLoadingId = ref<string | null>(null)
const uploadingAdvertImage = ref(false)
const uploadError = ref<string | null>(null)
const uploadPreviewUrl = ref('')

const optionName = ref('')
const optionDescription = ref('')
const optionStatus = ref<'active' | 'suspended' | 'deleted'>('active')
const optionSaving = ref(false)
const optionError = ref<string | null>(null)
const editingOption = ref<{ kind: PlacementKind; value: AdvertPlacementOption } | null>(null)

const form = ref({
  locationId: '',
  siteId: '',
  duration: '24',
  imageUrl: '',
  imageMediaId: '',
  linkUrl: '',
  ownerName: '',
  ownerPhone: '',
  ownerEmail: '',
  textAbove: 'Sponsored',
  textBelow: '',
  status: 'pending_review' as AdvertStatus,
  startsAt: '',
  expiresAt: '',
})

const advertStats = computed(() => [
  { label: 'Total adverts', value: total.value, detail: 'Across all statuses' },
  { label: 'Pending', value: adverts.value.filter((advert) => advert.status === 'pending_review').length, detail: 'On this page' },
  { label: 'Active', value: adverts.value.filter((advert) => advert.status === 'active').length, detail: 'On this page' },
  { label: 'Expired', value: adverts.value.filter((advert) => advert.isExpired || advert.status === 'expired').length, detail: 'On this page' },
])

const visibleLocations = computed(() => locations.value.filter((item) => item.status !== 'deleted'))
const visibleSites = computed(() => sites.value.filter((item) => item.status !== 'deleted'))

function formatDate(value?: string | null) {
  if (!value) return 'Not available'

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function formatStatus(value: string) {
  return value.replace(/_/g, ' ')
}

function statusTone(value: string, expired = false) {
  if (expired || value === 'expired') return 'danger'
  if (value === 'active' || value === 'approved') return 'success'
  if (value === 'pending_review') return 'warning'
  if (value === 'suspended' || value === 'deleted') return 'danger'
  return 'muted'
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function extractMediaAssetId(response: MediaJobResponse) {
  const data = response.data || response
  const nestedData = data.data && typeof data.data === 'object' ? data.data as Record<string, unknown> : null
  const result = data.result && typeof data.result === 'object' ? data.result as Record<string, unknown> : null
  const asset = data.asset && typeof data.asset === 'object' ? data.asset as Record<string, unknown> : null

  return String(
    data.assetId ||
    data.asset_id ||
    data.mediaAssetId ||
    data.media_asset_id ||
    data.id ||
    nestedData?.assetId ||
    nestedData?.id ||
    result?.assetId ||
    result?.id ||
    asset?.id ||
    '',
  )
}

function isMediaJobComplete(response: MediaJobResponse) {
  const data = response.data || response
  const status = String(data.status || data.state || response.status || '').toLowerCase()
  return ['complete', 'completed', 'success', 'succeeded', 'processed', 'done'].includes(status) || !!extractMediaAssetId(response)
}

function isMediaJobFailed(response: MediaJobResponse) {
  const data = response.data || response
  const status = String(data.status || data.state || response.status || '').toLowerCase()
  return ['failed', 'error', 'cancelled', 'canceled'].includes(status)
}

function placementName(value: unknown, fallbackId: string) {
  if (value && typeof value === 'object' && 'name' in value && typeof value.name === 'string') {
    return value.name
  }

  return fallbackId || 'Not set'
}

function buildAdvertPayload() {
  if (!form.value.locationId || !form.value.siteId || !String(form.value.duration).trim()) {
    throw new Error('Location, site, and duration are required')
  }

  return {
    locationId: form.value.locationId.trim(),
    siteId: form.value.siteId.trim(),
    duration: form.value.duration.trim(),
    imageMediaId: form.value.imageMediaId.trim() || undefined,
    linkUrl: form.value.linkUrl.trim() || undefined,
    ownerName: form.value.ownerName.trim() || undefined,
    ownerPhone: form.value.ownerPhone.trim() || undefined,
    textAbove: form.value.textAbove.trim() || undefined,
    textBelow: form.value.textBelow.trim() || undefined,
    status: form.value.status,
  }
}

function resetAdvertForm() {
  form.value = {
    locationId: '',
    siteId: '',
    duration: '24',
    imageUrl: '',
    imageMediaId: '',
    linkUrl: '',
    ownerName: '',
    ownerPhone: '',
    ownerEmail: '',
    textAbove: 'Sponsored',
    textBelow: '',
    status: 'pending_review',
    startsAt: '',
    expiresAt: '',
  }
  formError.value = null
  uploadError.value = null
  uploadPreviewUrl.value = ''
}

async function fetchOptions() {
  optionsLoading.value = true

  try {
    const [locationResponse, siteResponse] = await Promise.all([
      listAdvertLocations({ per_page: 100 }),
      listAdvertSites({ per_page: 100 }),
    ])

    locations.value = locationResponse.data || []
    sites.value = siteResponse.data || []
  } catch {
    locations.value = []
    sites.value = []
  } finally {
    optionsLoading.value = false
  }
}

async function fetchAdverts() {
  loading.value = true
  error.value = null

  try {
    const response = await listAdverts({
      page: page.value,
      per_page: perPage.value,
      q: search.value.trim(),
      status: status.value,
      sort: sort.value,
      locationId: locationId.value,
      siteId: siteId.value,
    })

    adverts.value = response.data || []
    total.value = response.total || 0
    lastPage.value = response.last_page || 1
    perPage.value = response.per_page || perPage.value
    from.value = response.from
    to.value = response.to
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unable to load adverts'
    adverts.value = []
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  page.value = 1
  fetchAdverts()
}

function goToPage(nextPage: number) {
  page.value = Math.min(Math.max(nextPage, 1), lastPage.value)
  fetchAdverts()
}

async function createNewAdvert() {
  formError.value = null
  creating.value = true

  try {
    await createAdvert(buildAdvertPayload())
    toast.success('Advert created')
    resetAdvertForm()
    showCreateForm.value = false
    page.value = 1
    await fetchAdverts()
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Unable to create advert'
  } finally {
    creating.value = false
  }
}

async function openAdvert(advert: Advert) {
  viewLoadingId.value = advert.id
  advertDetailTab.value = 'preview'

  try {
    const response = await getAdvert(advert.id)
    viewingAdvert.value = response.data
  } catch {
    viewingAdvert.value = advert
  } finally {
    viewLoadingId.value = null
  }
}

async function changeAdvertStatus(advert: Advert, nextStatus: AdvertStatus) {
  updatingId.value = advert.id

  try {
    const response = await updateAdvertStatus(advert.id, nextStatus)
    adverts.value = adverts.value.map((item) => item.id === advert.id ? response.data : item)
    if (viewingAdvert.value?.id === advert.id) viewingAdvert.value = response.data
    toast.success(`Advert moved to ${formatStatus(nextStatus)}`)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Unable to update advert')
  } finally {
    updatingId.value = null
  }
}

function openEditAdvert(advert: Advert) {
  viewingAdvert.value = advert
  advertDetailTab.value = 'meta'
  form.value = {
    locationId: advert.locationId || '',
    siteId: advert.siteId || '',
    duration: String(advert.duration || ''),
    imageUrl: advert.imageUrl || '',
    imageMediaId: advert.imageMediaId || '',
    linkUrl: advert.linkUrl || '',
    ownerName: advert.ownerName || '',
    ownerPhone: advert.ownerPhone || '',
    ownerEmail: advert.ownerEmail || '',
    textAbove: advert.textAbove || '',
    textBelow: advert.textBelow || '',
    status: advert.status,
    startsAt: advert.startsAt ? advert.startsAt.slice(0, 16) : '',
    expiresAt: advert.expiresAt ? advert.expiresAt.slice(0, 16) : '',
  }
  showCreateForm.value = true
  uploadPreviewUrl.value = advert.imageUrl || ''
}

async function pollMediaJobForAsset(jobId: string) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const job = await getMediaJob(jobId)

    if (isMediaJobFailed(job)) {
      throw new Error('Advert image processing failed')
    }

    if (isMediaJobComplete(job)) {
      const assetId = extractMediaAssetId(job)
      if (assetId) return assetId
    }

    await sleep(1500)
  }

  throw new Error('Advert image is still processing. Try again shortly.')
}

async function uploadAdvertImage(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) return

  uploadingAdvertImage.value = true
  uploadError.value = null

  try {
    const signature = await getMediaSignature()
    const uploaded = await uploadImageToCloudinary(file, signature)
    const publicId = uploaded.public_id

    if (!publicId) {
      throw new Error('Cloudinary did not return a public id')
    }

    const registered = await registerMedia(publicId, 'advert_image')
    const assetId = await pollMediaJobForAsset(registered.data.jobId)

    form.value.imageMediaId = assetId
    form.value.imageUrl = uploaded.secure_url || uploaded.url || form.value.imageUrl
    uploadPreviewUrl.value = uploaded.secure_url || uploaded.url || ''
    toast.success('Advert image uploaded')
  } catch (err) {
    uploadError.value = err instanceof Error ? err.message : 'Unable to upload advert image'
    toast.error(uploadError.value)
  } finally {
    uploadingAdvertImage.value = false
    input.value = ''
  }
}

async function saveAdvertEdits() {
  if (!viewingAdvert.value) return

  formError.value = null
  creating.value = true

  try {
    const response = await updateAdvert(viewingAdvert.value.id, buildAdvertPayload())
    adverts.value = adverts.value.map((item) => item.id === response.data.id ? response.data : item)
    viewingAdvert.value = response.data
    showCreateForm.value = false
    resetAdvertForm()
    toast.success('Advert updated')
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Unable to update advert'
  } finally {
    creating.value = false
  }
}

async function removeAdvert(advert: Advert) {
  updatingId.value = advert.id

  try {
    const response = await deleteAdvert(advert.id)
    adverts.value = adverts.value.map((item) => item.id === response.data.id ? response.data : item)
    if (viewingAdvert.value?.id === advert.id) viewingAdvert.value = response.data
    toast.success('Advert deleted')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Unable to delete advert')
  } finally {
    updatingId.value = null
  }
}

function resetOptionForm() {
  optionName.value = ''
  optionDescription.value = ''
  optionStatus.value = 'active'
  optionError.value = null
  editingOption.value = null
}

function editOption(kind: PlacementKind, value: AdvertPlacementOption) {
  editingOption.value = { kind, value }
  optionName.value = value.name
  optionDescription.value = value.description || ''
  optionStatus.value = value.status
  optionError.value = null
}

async function saveOption(kind: PlacementKind) {
  if (!optionName.value.trim()) {
    optionError.value = 'Name is required'
    return
  }

  optionSaving.value = true
  optionError.value = null

  try {
    const payload = {
      name: optionName.value.trim(),
      description: optionDescription.value.trim() || undefined,
      status: optionStatus.value,
    }

    if (editingOption.value) {
      const response = kind === 'location'
        ? await updateAdvertLocation(editingOption.value.value.id, payload)
        : await updateAdvertSite(editingOption.value.value.id, payload)

      const target = kind === 'location' ? locations : sites
      target.value = target.value.map((item) => item.id === response.data.id ? response.data : item)
      toast.success(`${kind === 'location' ? 'Location' : 'Site'} updated`)
    } else {
      const response = kind === 'location'
        ? await createAdvertLocation(payload)
        : await createAdvertSite(payload)

      const target = kind === 'location' ? locations : sites
      target.value = [response.data, ...target.value]
      toast.success(`${kind === 'location' ? 'Location' : 'Site'} created`)
    }

    resetOptionForm()
  } catch (err) {
    optionError.value = err instanceof Error ? err.message : 'Unable to save option'
  } finally {
    optionSaving.value = false
  }
}

async function removeOption(kind: PlacementKind, option: AdvertPlacementOption) {
  updatingId.value = option.id

  try {
    const response = kind === 'location'
      ? await deleteAdvertLocation(option.id)
      : await deleteAdvertSite(option.id)

    const target = kind === 'location' ? locations : sites
    target.value = target.value.map((item) => item.id === response.data.id ? response.data : item)
    toast.success(`${kind === 'location' ? 'Location' : 'Site'} deleted`)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Unable to delete option')
  } finally {
    updatingId.value = null
  }
}

onMounted(async () => {
  await fetchOptions()
  await fetchAdverts()
})
</script>

<template>
  <div class="space-y-4">
    <section class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Adverts</p>
          <h1 class="mt-2 font-display text-xl font-semibold text-[var(--text-primary)]">Manage Adverts</h1>
          <p class="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">Create, review, place, activate, suspend, and inspect sponsored placements.</p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-[0.85rem] border border-[color:var(--border-soft)] px-3 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-strong)] disabled:opacity-60" :disabled="loading || optionsLoading" @click="fetchAdverts">
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
            Refresh
          </button>
          <button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-[0.85rem] bg-[var(--accent)] px-3 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]" @click="showCreateForm = !showCreateForm">
            <X v-if="showCreateForm" class="h-4 w-4" />
            <Plus v-else class="h-4 w-4" />
            {{ showCreateForm ? 'Close form' : 'New advert' }}
          </button>
        </div>
      </div>
    </section>

    <section class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-2">
      <div class="grid gap-2 sm:grid-cols-3">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          type="button"
          class="h-10 rounded-[0.8rem] px-3 text-sm font-semibold capitalize text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)]"
          :class="activeTab === tab.value ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent)] hover:text-white' : ''"
          @click="activeTab = tab.value"
        >
          {{ tab.label }}
        </button>
      </div>
    </section>

    <section v-if="showCreateForm && activeTab === 'adverts'" class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
      <form class="mx-auto max-w-5xl" @submit.prevent="viewingAdvert ? saveAdvertEdits() : createNewAdvert()">
        <div class="flex items-start gap-3">
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-[0.85rem] bg-[var(--accent-soft)] text-[var(--accent-strong)]">
            <Megaphone class="h-5 w-5" />
          </span>
          <div>
            <h2 class="font-display text-base font-semibold text-[var(--text-primary)]">{{ viewingAdvert ? 'Edit advert' : 'Create advert' }}</h2>
            <p class="mt-1 text-sm text-[var(--text-secondary)]">Keep it simple: placement, duration, image, link, owner, contact, and advert text.</p>
          </div>
        </div>

        <div class="mt-5 grid gap-4 md:grid-cols-3">
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Page location</label>
            <input v-model="form.locationId" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="Feed right sidebar or 1" />
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Duration (hours)</label>
            <input v-model="form.duration" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="24" />
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Site / AD size</label>
            <input v-model="form.siteId" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="290x500 or Skills4Export Web" />
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Upload image</label>
            <div class="flex min-h-11 items-center gap-3 rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 py-2">
              <div class="grid h-12 w-16 shrink-0 place-items-center overflow-hidden rounded-[0.65rem] border border-[color:var(--border-soft)] bg-[var(--surface-muted)]">
                <img v-if="uploadPreviewUrl || form.imageUrl" :src="uploadPreviewUrl || form.imageUrl" alt="Advert upload preview" class="h-full w-full object-cover" />
                <Image v-else class="h-5 w-5 text-[var(--text-tertiary)]" />
              </div>
              <label class="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-[0.75rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] px-3 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-strong)]">
                <Loader2 v-if="uploadingAdvertImage" class="h-4 w-4 animate-spin" />
                {{ uploadingAdvertImage ? 'Uploading...' : 'Choose file' }}
                <input class="hidden" type="file" accept="image/*" :disabled="uploadingAdvertImage" @change="uploadAdvertImage" />
              </label>
            </div>
            <p v-if="uploadError" class="mt-1 text-sm font-medium text-red-600">{{ uploadError }}</p>
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Link URL</label>
            <input v-model="form.linkUrl" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="www.xlehub.com" />
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">AD owner</label>
            <input v-model="form.ownerName" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="John Doe, Elixis Ltd" />
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Contact</label>
            <input v-model="form.ownerPhone" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="Phone number" />
          </div>
          <div class="md:row-span-2">
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">AD text</label>
            <textarea v-model="form.textBelow" class="min-h-36 w-full resize-y rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 py-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="Export smarter today"></textarea>
          </div>
        </div>

        <p v-if="formError" class="mt-4 rounded-[0.85rem] border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{{ formError }}</p>

        <div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" class="inline-flex h-11 items-center justify-center rounded-[0.85rem] border border-[color:var(--border-soft)] px-4 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-strong)]" @click="showCreateForm = false; viewingAdvert = null; resetAdvertForm()">Cancel</button>
          <button type="submit" class="inline-flex h-11 items-center justify-center gap-2 rounded-[0.85rem] bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-70" :disabled="creating">
            <Loader2 v-if="creating" class="h-4 w-4 animate-spin" />
            {{ creating ? 'Saving...' : viewingAdvert ? 'Save advert' : 'Create advert' }}
          </button>
        </div>
      </form>
    </section>

    <template v-if="activeTab === 'adverts'">
      <div class="grid gap-3 md:grid-cols-4">
        <article v-for="stat in advertStats" :key="stat.label" class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
          <p class="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">{{ stat.label }}</p>
          <p class="mt-4 font-display text-3xl font-semibold text-[var(--text-primary)]">{{ stat.value }}</p>
          <p class="mt-1 text-sm text-[var(--text-secondary)]">{{ stat.detail }}</p>
        </article>
      </div>

      <section class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)]">
        <div class="flex flex-col gap-3 border-b border-[color:var(--border-soft)] p-4">
          <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 class="font-display text-base font-semibold text-[var(--text-primary)]">Adverts</h2>
              <p class="mt-1 text-sm text-[var(--text-secondary)]">{{ from || 0 }}-{{ to || 0 }} of {{ total }} adverts</p>
            </div>
            <div class="flex flex-col gap-2 lg:flex-row lg:items-center">
              <label class="flex h-10 items-center gap-2 rounded-[0.85rem] bg-[var(--search-bg)] px-3 text-[var(--text-tertiary)] lg:w-72">
                <Search class="h-4 w-4" />
                <input v-model="search" class="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]" placeholder="Search adverts" type="search" @keyup.enter="applyFilters" />
              </label>
              <select v-model="status" class="h-10 rounded-[0.85rem] border border-transparent bg-[var(--search-bg)] px-3 text-sm capitalize outline-none focus:border-[var(--accent)]" @change="applyFilters">
                <option value="">All statuses</option>
                <option v-for="item in advertStatuses" :key="item" :value="item">{{ formatStatus(item) }}</option>
              </select>
              <select v-model="locationId" class="h-10 rounded-[0.85rem] border border-transparent bg-[var(--search-bg)] px-3 text-sm outline-none focus:border-[var(--accent)]" @change="applyFilters">
                <option value="">All locations</option>
                <option v-for="location in visibleLocations" :key="location.id" :value="location.id">{{ location.name }}</option>
              </select>
              <select v-model="siteId" class="h-10 rounded-[0.85rem] border border-transparent bg-[var(--search-bg)] px-3 text-sm outline-none focus:border-[var(--accent)]" @change="applyFilters">
                <option value="">All sites</option>
                <option v-for="site in visibleSites" :key="site.id" :value="site.id">{{ site.name }}</option>
              </select>
              <button type="button" class="h-10 rounded-[0.85rem] border border-[color:var(--border-soft)] px-3 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-strong)]" @click="applyFilters">Apply</button>
            </div>
          </div>
        </div>

        <div v-if="loading" class="flex min-h-64 items-center justify-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
          <Loader2 class="h-4 w-4 animate-spin" />
          Loading adverts
        </div>
        <div v-else-if="error" class="p-4">
          <div class="rounded-[0.9rem] border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{{ error }}</div>
        </div>
        <div v-else-if="adverts.length === 0" class="flex min-h-64 items-center justify-center p-4 text-center">
          <div>
            <p class="font-semibold text-[var(--text-primary)]">No adverts found</p>
            <p class="mt-1 text-sm text-[var(--text-secondary)]">Create an advert or adjust your filters.</p>
          </div>
        </div>
        <div v-else class="app-scroll hidden max-w-full overflow-x-auto md:block">
          <table class="w-full min-w-[76rem] table-fixed text-left text-sm">
            <thead class="border-b border-[color:var(--border-soft)] text-[0.72rem] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
              <tr>
                <th class="w-[28%] px-4 py-3 font-semibold">Advert</th>
                <th class="w-[18%] px-4 py-3 font-semibold">Placement</th>
                <th class="w-[14%] px-4 py-3 font-semibold">Owner</th>
                <th class="w-[12%] px-4 py-3 font-semibold">Dates</th>
                <th class="w-[12%] px-4 py-3 font-semibold">Status</th>
                <th class="w-[16%] px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[color:var(--border-soft)]">
              <tr v-for="advert in adverts" :key="advert.id">
                <td class="px-4 py-3">
                  <div class="flex min-w-0 items-center gap-3">
                    <div class="grid h-14 w-20 shrink-0 place-items-center overflow-hidden rounded-[0.8rem] border border-[color:var(--border-soft)] bg-[var(--surface-muted)]">
                      <img v-if="advert.imageUrl" :src="advert.imageUrl" :alt="advert.textBelow || advert.ownerName || 'Advert image'" class="h-full w-full object-cover" />
                      <Image v-else class="h-5 w-5 text-[var(--text-tertiary)]" />
                    </div>
                    <div class="min-w-0">
                      <p class="truncate font-semibold text-[var(--text-primary)]">{{ advert.textAbove || 'Sponsored advert' }}</p>
                      <p class="mt-1 truncate text-sm text-[var(--text-secondary)]">{{ advert.textBelow || advert.linkUrl || 'No advert copy' }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <p class="truncate font-medium text-[var(--text-primary)]">{{ placementName(advert.location, advert.locationId) }}</p>
                  <p class="mt-1 truncate text-xs text-[var(--text-tertiary)]">{{ placementName(advert.site, advert.siteId) }}</p>
                </td>
                <td class="px-4 py-3">
                  <p class="truncate text-[var(--text-primary)]">{{ advert.ownerName || 'No owner' }}</p>
                  <p class="mt-1 truncate text-xs text-[var(--text-tertiary)]">{{ advert.ownerEmail || advert.ownerPhone || 'No contact' }}</p>
                </td>
                <td class="px-4 py-3 text-[var(--text-secondary)]">
                  <p>{{ formatDate(advert.startsAt) }}</p>
                  <p class="mt-1 text-xs text-[var(--text-tertiary)]">{{ formatDate(advert.expiresAt) }}</p>
                </td>
                <td class="px-4 py-3">
                  <StatusChip :tone="statusTone(advert.status, advert.isExpired)">{{ advert.isExpired ? 'Expired' : formatStatus(advert.status) }}</StatusChip>
                </td>
                <td class="px-4 py-3">
                  <div class="flex justify-end gap-2">
                    <button type="button" class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-[color:var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)] disabled:opacity-60" :disabled="viewLoadingId === advert.id" :aria-label="`View advert ${advert.id}`" @click="openAdvert(advert)">
                      <Loader2 v-if="viewLoadingId === advert.id" class="h-4 w-4 animate-spin" />
                      <Eye v-else class="h-4 w-4" />
                    </button>
                    <button type="button" class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-[color:var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)]" :aria-label="`Edit advert ${advert.id}`" @click="openEditAdvert(advert)">
                      <Edit2 class="h-4 w-4" />
                    </button>
                    <select class="h-9 rounded-[0.75rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-2 text-xs capitalize outline-none focus:border-[var(--accent)] disabled:opacity-60" :disabled="updatingId === advert.id" :value="advert.status" @change="changeAdvertStatus(advert, ($event.target as HTMLSelectElement).value as AdvertStatus)">
                      <option v-for="item in advertStatuses" :key="item" :value="item">{{ formatStatus(item) }}</option>
                    </select>
                    <button type="button" class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60" :disabled="updatingId === advert.id" :aria-label="`Delete advert ${advert.id}`" @click="removeAdvert(advert)">
                      <Loader2 v-if="updatingId === advert.id" class="h-4 w-4 animate-spin" />
                      <Trash2 v-else class="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="!loading && !error && adverts.length > 0" class="space-y-3 p-4 md:hidden">
          <article v-for="advert in adverts" :key="advert.id" class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <div class="flex gap-3">
              <div class="grid h-20 w-24 shrink-0 place-items-center overflow-hidden rounded-[0.8rem] border border-[color:var(--border-soft)] bg-[var(--surface-muted)]">
                <img v-if="advert.imageUrl" :src="advert.imageUrl" :alt="advert.textBelow || 'Advert image'" class="h-full w-full object-cover" />
                <Image v-else class="h-5 w-5 text-[var(--text-tertiary)]" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-start justify-between gap-2">
                  <p class="font-semibold text-[var(--text-primary)]">{{ advert.textAbove || 'Sponsored advert' }}</p>
                  <StatusChip :tone="statusTone(advert.status, advert.isExpired)">{{ advert.isExpired ? 'Expired' : formatStatus(advert.status) }}</StatusChip>
                </div>
                <p class="mt-1 line-clamp-2 text-sm text-[var(--text-secondary)]">{{ advert.textBelow || advert.linkUrl || 'No advert copy' }}</p>
                <div class="mt-3 flex justify-end gap-2">
                  <button type="button" class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-[color:var(--border-soft)] text-[var(--text-secondary)]" @click="openAdvert(advert)"><Eye class="h-4 w-4" /></button>
                  <button type="button" class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-[color:var(--border-soft)] text-[var(--text-secondary)]" @click="openEditAdvert(advert)"><Edit2 class="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          </article>
        </div>

        <div v-if="!loading && !error && total > 0" class="flex flex-col gap-3 border-t border-[color:var(--border-soft)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-sm text-[var(--text-secondary)]">Page {{ page }} of {{ lastPage }}</p>
          <div class="flex gap-2">
            <button type="button" class="h-10 rounded-[0.85rem] border border-[color:var(--border-soft)] px-3 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-strong)] disabled:opacity-50" :disabled="page <= 1" @click="goToPage(page - 1)">Previous</button>
            <button type="button" class="h-10 rounded-[0.85rem] border border-[color:var(--border-soft)] px-3 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-strong)] disabled:opacity-50" :disabled="page >= lastPage" @click="goToPage(page + 1)">Next</button>
          </div>
        </div>
      </section>
    </template>

    <template v-else>
      <section class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
        <form class="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_11rem_auto]" @submit.prevent="saveOption(activeTab === 'locations' ? 'location' : 'site')">
          <input v-model="optionName" class="h-11 rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--accent)]" :placeholder="activeTab === 'locations' ? 'Feed right sidebar' : 'Skills4Export web'" />
          <input v-model="optionDescription" class="h-11 rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="Description" />
          <select v-model="optionStatus" class="h-11 rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm capitalize outline-none focus:border-[var(--accent)]">
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="deleted">Deleted</option>
          </select>
          <div class="flex gap-2">
            <button type="submit" class="inline-flex h-11 items-center justify-center gap-2 rounded-[0.85rem] bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-70" :disabled="optionSaving">
              <Loader2 v-if="optionSaving" class="h-4 w-4 animate-spin" />
              {{ editingOption ? 'Save' : 'Create' }}
            </button>
            <button v-if="editingOption" type="button" class="h-11 rounded-[0.85rem] border border-[color:var(--border-soft)] px-3 text-sm font-semibold text-[var(--text-secondary)]" @click="resetOptionForm">Cancel</button>
          </div>
        </form>
        <p v-if="optionError" class="mt-3 rounded-[0.85rem] border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{{ optionError }}</p>
      </section>

      <section class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)]">
        <div class="border-b border-[color:var(--border-soft)] p-4">
          <h2 class="font-display text-base font-semibold text-[var(--text-primary)]">{{ activeTab === 'locations' ? 'Advert locations' : 'Advert sites' }}</h2>
          <p class="mt-1 text-sm text-[var(--text-secondary)]">{{ activeTab === 'locations' ? locations.length : sites.length }} records</p>
        </div>
        <div class="divide-y divide-[color:var(--border-soft)]">
          <article v-for="option in activeTab === 'locations' ? locations : sites" :key="option.id" class="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <p class="truncate font-semibold text-[var(--text-primary)]">{{ option.name }}</p>
                <StatusChip :tone="statusTone(option.status)">{{ option.status }}</StatusChip>
              </div>
              <p class="mt-1 text-sm text-[var(--text-secondary)]">{{ option.description || 'No description' }}</p>
            </div>
            <div class="flex gap-2">
              <button type="button" class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-[color:var(--border-soft)] text-[var(--text-secondary)] hover:text-[var(--accent-strong)]" @click="editOption(activeTab === 'locations' ? 'location' : 'site', option)">
                <Edit2 class="h-4 w-4" />
              </button>
              <button type="button" class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60" :disabled="updatingId === option.id" @click="removeOption(activeTab === 'locations' ? 'location' : 'site', option)">
                <Loader2 v-if="updatingId === option.id" class="h-4 w-4 animate-spin" />
                <Trash2 v-else class="h-4 w-4" />
              </button>
            </div>
          </article>
        </div>
      </section>
    </template>

    <div v-if="viewingAdvert && !showCreateForm" class="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-bg)] px-4 py-6" role="dialog" aria-modal="true" @click.self="viewingAdvert = null">
      <section class="app-scroll max-h-[calc(100vh-3rem)] w-full max-w-3xl overflow-y-auto rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Advert details</p>
            <h2 class="mt-2 font-display text-xl font-semibold text-[var(--text-primary)]">{{ viewingAdvert.textAbove || viewingAdvert.ownerName || 'Advert' }}</h2>
            <p class="mt-1 text-sm text-[var(--text-secondary)]">{{ placementName(viewingAdvert.location, viewingAdvert.locationId) }} · {{ placementName(viewingAdvert.site, viewingAdvert.siteId) }}</p>
          </div>
          <button type="button" class="grid h-9 w-9 place-items-center rounded-[0.75rem] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]" aria-label="Close advert details" @click="viewingAdvert = null"><X class="h-4 w-4" /></button>
        </div>

        <div class="mt-4 grid gap-2 rounded-[0.85rem] bg-[var(--surface-muted)] p-1 sm:grid-cols-3">
          <button v-for="tab in ['preview', 'owner', 'meta'] as AdvertDetailTab[]" :key="tab" type="button" class="h-9 rounded-[0.7rem] text-sm font-semibold capitalize text-[var(--text-secondary)]" :class="advertDetailTab === tab ? 'bg-[var(--surface-primary)] text-[var(--accent-strong)]' : ''" @click="advertDetailTab = tab">{{ tab }}</button>
        </div>

        <div v-if="advertDetailTab === 'preview'" class="mt-4 space-y-4">
          <div class="overflow-hidden rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)]">
            <div class="flex aspect-[1.91/1] items-center justify-center bg-[var(--surface-muted)]">
              <img v-if="viewingAdvert.imageUrl" :src="viewingAdvert.imageUrl" :alt="viewingAdvert.textBelow || 'Advert image'" class="h-full w-full object-cover" />
              <Image v-else class="h-8 w-8 text-[var(--text-tertiary)]" />
            </div>
            <div class="p-4">
              <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{{ viewingAdvert.textAbove || 'Sponsored' }}</p>
              <p class="mt-2 text-sm text-[var(--text-secondary)]">{{ viewingAdvert.textBelow || 'No advert copy' }}</p>
              <a v-if="viewingAdvert.linkUrl" :href="viewingAdvert.linkUrl" target="_blank" rel="noreferrer" class="mt-3 inline-flex text-sm font-semibold text-[var(--accent-strong)]">{{ viewingAdvert.linkUrl }}</a>
            </div>
          </div>
        </div>

        <dl v-else-if="advertDetailTab === 'owner'" class="mt-4 grid gap-3 sm:grid-cols-2">
          <div class="rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3"><dt class="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Owner</dt><dd class="mt-2 text-sm font-semibold text-[var(--text-primary)]">{{ viewingAdvert.ownerName || 'Not available' }}</dd></div>
          <div class="rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3"><dt class="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Email</dt><dd class="mt-2 break-all text-sm font-semibold text-[var(--text-primary)]">{{ viewingAdvert.ownerEmail || 'Not available' }}</dd></div>
          <div class="rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3"><dt class="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Phone</dt><dd class="mt-2 text-sm font-semibold text-[var(--text-primary)]">{{ viewingAdvert.ownerPhone || 'Not available' }}</dd></div>
          <div class="rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3"><dt class="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Approved by</dt><dd class="mt-2 text-sm font-semibold text-[var(--text-primary)]">{{ viewingAdvert.approvedBy || 'Not available' }}</dd></div>
        </dl>

        <dl v-else class="mt-4 grid gap-3 sm:grid-cols-2">
          <div class="rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3"><dt class="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Status</dt><dd class="mt-2"><StatusChip :tone="statusTone(viewingAdvert.status, viewingAdvert.isExpired)">{{ viewingAdvert.isExpired ? 'Expired' : formatStatus(viewingAdvert.status) }}</StatusChip></dd></div>
          <div class="rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3"><dt class="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Duration</dt><dd class="mt-2 text-sm font-semibold text-[var(--text-primary)]">{{ viewingAdvert.duration || 'Not available' }}</dd></div>
          <div class="rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3"><dt class="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Starts</dt><dd class="mt-2 text-sm font-semibold text-[var(--text-primary)]">{{ formatDate(viewingAdvert.startsAt) }}</dd></div>
          <div class="rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3"><dt class="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Expires</dt><dd class="mt-2 text-sm font-semibold text-[var(--text-primary)]">{{ formatDate(viewingAdvert.expiresAt) }}</dd></div>
          <div class="rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3 sm:col-span-2"><dt class="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Advert ID</dt><dd class="mt-2 break-all font-mono text-xs text-[var(--text-primary)]">{{ viewingAdvert.id }}</dd></div>
        </dl>
      </section>
    </div>
  </div>
</template>
