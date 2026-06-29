<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ChevronDown, FolderPlus, Layers3, Loader2, Plus, RefreshCw, Search, X } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import StatusChip from '../../components/StatusChip.vue'
import { apiRequest } from '../../composables/useApi'
import getIconsFromJsonFile from '../../data/line-awesome.json'

type Channel = {
  id: string
  name: string
  slug: string
  description?: string | null
  icon?: string | null
  created_at?: string | null
  createdAt?: string | null
  posts_count?: number | null
  children_count?: number | null
  topics_count?: number | null
  [key: string]: unknown
}

type ChannelResponse = {
  success?: boolean
  data: Channel
}

type ListChannelsResponse = {
  current_page?: number
  data?: Channel[]
  last_page?: number
  per_page?: number
  total?: number
  from?: number | null
  to?: number | null
}

const channels = ref<Channel[]>([])
const topics = ref<Channel[]>([])
const selectedChannel = ref<Channel | null>(null)
const query = ref('')
const loading = ref(false)
const topicsLoading = ref(false)
const creatingChannel = ref(false)
const creatingTopic = ref(false)
const error = ref<string | null>(null)
const topicError = ref<string | null>(null)
const showChannelForm = ref(false)
const showTopicForm = ref(false)

const channelName = ref('')
const channelSlug = ref('')
const channelDescription = ref('')
const channelIcon = ref('las la-newspaper')
const topicName = ref('')
const topicSlug = ref('')
const topicDescription = ref('')
const topicIcon = ref('las la-futbol')
const channelIconPickerOpen = ref(false)
const topicIconPickerOpen = ref(false)
const iconSearch = ref('')
const topicIconSearch = ref('')
const formError = ref<string | null>(null)
const topicFormError = ref<string | null>(null)
const iconOptions = ref<any[]>([])

const filteredChannels = computed(() => {
  const term = query.value.trim().toLowerCase()
  if (!term) return channels.value
  return channels.value.filter((channel) => `${channel.name} ${channel.slug} ${channel.description || ''}`.toLowerCase().includes(term))
})

const filteredChannelIcons = computed(() => filterIcons(iconSearch.value))
const filteredTopicIcons = computed(() => filterIcons(topicIconSearch.value))

function normalizeIcon(value?: string | null) {
  const trimmed = (value || '').trim()
  if (!trimmed) return 'las la-users'
  if (/^la-[a-z0-9-]+$/.test(trimmed)) return `las ${trimmed}`
  if (/^la[rsb]\s+la-[a-z0-9-]+$/.test(trimmed)) return trimmed
  return 'las la-users'
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function filterIcons(value: string) {
  const term = value.trim().toLowerCase()
  const options = iconOptions.value || []
  if (!term) return options
  return options.filter((option) => `${option.label} ${option.value}`.toLowerCase().includes(term))
}

function selectChannelIcon(value: string) {
  channelIcon.value = value
  channelIconPickerOpen.value = false
  iconSearch.value = ''
}

function selectTopicIcon(value: string) {
  topicIcon.value = value
  topicIconPickerOpen.value = false
  topicIconSearch.value = ''
}

function formatDate(value?: string | null) {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

function readList(response: ListChannelsResponse | Channel[] | { data?: Channel[] }) {
  if (Array.isArray(response)) return response
  return response.data || []
}

function resetChannelForm() {
  channelName.value = ''
  channelSlug.value = ''
  channelDescription.value = ''
  channelIcon.value = 'las la-newspaper'
  formError.value = null
}

function resetTopicForm() {
  topicName.value = ''
  topicSlug.value = ''
  topicDescription.value = ''
  topicIcon.value = 'las la-futbol'
  topicFormError.value = null
}

async function fetchChannels() {
  loading.value = true
  error.value = null

  try {
    const response = await apiRequest<ListChannelsResponse>('/api/channels')
    channels.value = readList(response)
    if (!selectedChannel.value && channels.value.length) {
      selectedChannel.value = channels.value[0]
      await fetchTopics(channels.value[0])
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unable to load channels'
    channels.value = []
  } finally {
    loading.value = false
  }
}

async function fetchTopics(channel = selectedChannel.value) {
  if (!channel) {
    topics.value = []
    return
  }

  topicsLoading.value = true
  topicError.value = null

  try {
    const response = await apiRequest<ListChannelsResponse>(`/api/channels/${channel.slug}/channels`)
    topics.value = readList(response)
  } catch (err) {
    try {
      const response = await apiRequest<ListChannelsResponse>(`/api/channels/${channel.slug}/topics`)
      topics.value = readList(response)
    } catch {
      topicError.value = err instanceof Error ? err.message : 'Unable to load topics'
      topics.value = []
    }
  } finally {
    topicsLoading.value = false
  }
}

async function createChannel() {
  formError.value = null
  const slug = channelSlug.value.trim() || slugify(channelName.value)

  if (!channelName.value.trim() || !slug) {
    formError.value = 'Name and slug are required'
    return
  }

  creatingChannel.value = true

  try {
    const response = await apiRequest<ChannelResponse>('/api/channels', {
      method: 'POST',
      body: JSON.stringify({
        name: channelName.value.trim(),
        slug,
        description: channelDescription.value.trim() || undefined,
        icon: normalizeIcon(channelIcon.value),
      }),
    })

    const created = response.data
    channels.value = [created, ...channels.value.filter((channel) => channel.id !== created.id)]
    selectedChannel.value = created
    toast.success('Channel created')
    resetChannelForm()
    showChannelForm.value = false
    await fetchTopics(created)
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Unable to create channel'
  } finally {
    creatingChannel.value = false
  }
}

async function createTopic() {
  topicFormError.value = null

  if (!selectedChannel.value) {
    topicFormError.value = 'Select a channel first'
    return
  }

  const slug = topicSlug.value.trim() || slugify(topicName.value)
  if (!topicName.value.trim() || !slug) {
    topicFormError.value = 'Name and slug are required'
    return
  }

  creatingTopic.value = true

  try {
    const payload = {
      name: topicName.value.trim(),
      slug,
      description: topicDescription.value.trim() || undefined,
      icon: normalizeIcon(topicIcon.value),
    }

    let response: ChannelResponse
    try {
      response = await apiRequest<ChannelResponse>(`/api/channels/${selectedChannel.value.slug}/channels`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    } catch {
      response = await apiRequest<ChannelResponse>(`/api/channels/${selectedChannel.value.slug}/topics`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    }

    topics.value = [response.data, ...topics.value.filter((topic) => topic.id !== response.data.id)]
    toast.success('Topic created')
    resetTopicForm()
    showTopicForm.value = false
  } catch (err) {
    topicFormError.value = err instanceof Error ? err.message : 'Unable to create topic'
  } finally {
    creatingTopic.value = false
  }
}

async function selectChannel(channel: Channel) {
  selectedChannel.value = channel
  await fetchTopics(channel)
}

onMounted(() => {
  iconOptions.value = Array.isArray(getIconsFromJsonFile) ? getIconsFromJsonFile : []
  fetchChannels()
})
</script>

<template>
  <div class="space-y-4">
    <section class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Channels</p>
          <h1 class="mt-2 font-display text-xl font-semibold text-[var(--text-primary)]">Admin Communities</h1>
          <p class="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">Create admin-only channels and topics. Topics are used as communityId when creating posts.</p>
        </div>

        <div class="flex flex-wrap gap-2">
          <button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-[0.85rem] border border-[color:var(--border-soft)] px-3 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-strong)] disabled:opacity-60" :disabled="loading" @click="fetchChannels">
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
            Refresh
          </button>
          <button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-[0.85rem] bg-[var(--accent)] px-3 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]" @click="showChannelForm = !showChannelForm">
            <X v-if="showChannelForm" class="h-4 w-4" />
            <Plus v-else class="h-4 w-4" />
            {{ showChannelForm ? 'Close form' : 'New channel' }}
          </button>
        </div>
      </div>
    </section>

    <section v-if="showChannelForm" class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
      <form class="grid gap-4 lg:grid-cols-2" @submit.prevent="createChannel">
        <div class="lg:col-span-2">
          <h2 class="font-display text-base font-semibold text-[var(--text-primary)]">Create main channel</h2>
          <p class="mt-1 text-sm text-[var(--text-secondary)]">Example: Headlines, Careers, Announcements.</p>
        </div>

        <div>
          <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Name</label>
          <input v-model="channelName" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="Headlines" />
        </div>
        <div>
          <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Slug</label>
          <input v-model="channelSlug" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="headlines" />
        </div>

        <div class="relative">
          <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Icon</label>
          <button type="button" class="flex h-11 w-full items-center justify-between rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-left text-sm" @click="channelIconPickerOpen = !channelIconPickerOpen">
            <span class="flex items-center gap-2"><i :class="normalizeIcon(channelIcon)" class="text-xl"></i>{{ normalizeIcon(channelIcon) }}</span>
            <ChevronDown class="h-4 w-4" :class="channelIconPickerOpen ? 'rotate-180' : ''" />
          </button>
          <div v-if="channelIconPickerOpen" class="absolute left-0 right-0 top-[4.8rem] z-20 rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-3">
            <label class="flex h-10 items-center gap-2 rounded-[0.75rem] bg-[var(--search-bg)] px-3 text-[var(--text-tertiary)]">
              <Search class="h-4 w-4" />
              <input v-model="iconSearch" class="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Search icons" />
            </label>
            <div class="app-scroll mt-3 grid max-h-64 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
              <button v-for="option in filteredChannelIcons" :key="option.value" type="button" class="rounded-[0.75rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-2 py-2 text-xs" @click="selectChannelIcon(option.value)">
                <i :class="option.value" class="text-2xl"></i>
                <span class="mt-1 block truncate">{{ option.label }}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="lg:col-span-2">
          <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Description</label>
          <textarea v-model="channelDescription" class="min-h-24 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 py-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="Official update channel"></textarea>
        </div>

        <p v-if="formError" class="rounded-[0.85rem] border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 lg:col-span-2">{{ formError }}</p>

        <div class="flex justify-end lg:col-span-2">
          <button type="submit" class="inline-flex h-11 items-center justify-center gap-2 rounded-[0.85rem] bg-[var(--accent)] px-4 text-sm font-semibold text-white disabled:opacity-70" :disabled="creatingChannel">
            <Loader2 v-if="creatingChannel" class="h-4 w-4 animate-spin" />
            {{ creatingChannel ? 'Creating...' : 'Create channel' }}
          </button>
        </div>
      </form>
    </section>

    <section class="grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
      <div class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)]">
        <div class="border-b border-[color:var(--border-soft)] p-4">
          <h2 class="font-display text-base font-semibold text-[var(--text-primary)]">Main channels</h2>
          <label class="mt-3 flex h-10 items-center gap-2 rounded-[0.85rem] bg-[var(--search-bg)] px-3 text-[var(--text-tertiary)]">
            <Search class="h-4 w-4" />
            <input v-model="query" class="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Search channels" />
          </label>
        </div>
        <div v-if="loading" class="flex min-h-48 items-center justify-center gap-2 text-sm text-[var(--text-secondary)]"><Loader2 class="h-4 w-4 animate-spin" />Loading channels</div>
        <div v-else-if="error" class="p-4 text-sm font-medium text-red-700">{{ error }}</div>
        <div v-else class="divide-y divide-[color:var(--border-soft)]">
          <button v-for="channel in filteredChannels" :key="channel.id || channel.slug" type="button" class="flex w-full items-center gap-3 p-4 text-left hover:bg-[var(--surface-secondary)]" :class="selectedChannel?.slug === channel.slug ? 'bg-[var(--accent-soft)]' : ''" @click="selectChannel(channel)">
            <span class="grid h-10 w-10 shrink-0 place-items-center rounded-[0.85rem] bg-[var(--surface-muted)] text-xl text-[var(--accent-strong)]"><i :class="normalizeIcon(channel.icon)"></i></span>
            <span class="min-w-0 flex-1">
              <span class="block truncate font-semibold text-[var(--text-primary)]">{{ channel.name }}</span>
              <span class="mt-1 block truncate text-xs text-[var(--text-secondary)]">/{{ channel.slug }}</span>
            </span>
          </button>
          <div v-if="filteredChannels.length === 0" class="p-4 text-sm text-[var(--text-secondary)]">No channels found.</div>
        </div>
      </div>

      <div class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)]">
        <div class="flex flex-col gap-3 border-b border-[color:var(--border-soft)] p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 class="font-display text-base font-semibold text-[var(--text-primary)]">{{ selectedChannel ? `${selectedChannel.name} topics` : 'Topics' }}</h2>
            <p class="mt-1 text-sm text-[var(--text-secondary)]">Use the returned topic id as <span class="font-mono">communityId</span> when creating posts.</p>
          </div>
          <button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-[0.85rem] bg-[var(--accent)] px-3 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-60" :disabled="!selectedChannel" @click="showTopicForm = !showTopicForm">
            <X v-if="showTopicForm" class="h-4 w-4" />
            <Plus v-else class="h-4 w-4" />
            {{ showTopicForm ? 'Close form' : 'New topic' }}
          </button>
        </div>

        <form v-if="showTopicForm" class="grid gap-3 border-b border-[color:var(--border-soft)] p-4 md:grid-cols-2" @submit.prevent="createTopic">
          <input v-model="topicName" class="h-11 rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="Football" />
          <input v-model="topicSlug" class="h-11 rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="football" />
          <div class="relative">
            <button type="button" class="flex h-11 w-full items-center justify-between rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-left text-sm" @click="topicIconPickerOpen = !topicIconPickerOpen">
              <span class="flex items-center gap-2"><i :class="normalizeIcon(topicIcon)" class="text-xl"></i>{{ normalizeIcon(topicIcon) }}</span>
              <ChevronDown class="h-4 w-4" :class="topicIconPickerOpen ? 'rotate-180' : ''" />
            </button>
            <div v-if="topicIconPickerOpen" class="absolute left-0 right-0 top-[3.2rem] z-20 rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-3">
              <label class="flex h-10 items-center gap-2 rounded-[0.75rem] bg-[var(--search-bg)] px-3 text-[var(--text-tertiary)]">
                <Search class="h-4 w-4" />
                <input v-model="topicIconSearch" class="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Search icons" />
              </label>
              <div class="app-scroll mt-3 grid max-h-64 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
                <button v-for="option in filteredTopicIcons" :key="option.value" type="button" class="rounded-[0.75rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-2 py-2 text-xs" @click="selectTopicIcon(option.value)">
                  <i :class="option.value" class="text-2xl"></i>
                  <span class="mt-1 block truncate">{{ option.label }}</span>
                </button>
              </div>
            </div>
          </div>
          <textarea v-model="topicDescription" class="min-h-11 rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 py-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="Football updates"></textarea>
          <p v-if="topicFormError" class="rounded-[0.85rem] border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 md:col-span-2">{{ topicFormError }}</p>
          <div class="flex justify-end md:col-span-2">
            <button type="submit" class="inline-flex h-10 items-center justify-center gap-2 rounded-[0.8rem] bg-[var(--accent)] px-3 text-sm font-semibold text-white disabled:opacity-70" :disabled="creatingTopic">
              <Loader2 v-if="creatingTopic" class="h-4 w-4 animate-spin" />
              {{ creatingTopic ? 'Creating...' : 'Create topic' }}
            </button>
          </div>
        </form>

        <div v-if="topicsLoading" class="flex min-h-48 items-center justify-center gap-2 text-sm text-[var(--text-secondary)]"><Loader2 class="h-4 w-4 animate-spin" />Loading topics</div>
        <div v-else-if="topicError" class="p-4 text-sm font-medium text-red-700">{{ topicError }}</div>
        <div v-else class="grid gap-3 p-4 md:grid-cols-2">
          <article v-for="topic in topics" :key="topic.id || topic.slug" class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <div class="flex items-start gap-3">
              <span class="grid h-10 w-10 shrink-0 place-items-center rounded-[0.85rem] bg-[var(--surface-muted)] text-xl text-[var(--accent-strong)]"><i :class="normalizeIcon(topic.icon)"></i></span>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="truncate font-semibold text-[var(--text-primary)]">{{ topic.name }}</h3>
                  <StatusChip tone="accent">Topic</StatusChip>
                </div>
                <p class="mt-1 truncate text-xs text-[var(--text-secondary)]">/{{ topic.slug }}</p>
                <p class="mt-2 line-clamp-2 text-sm text-[var(--text-secondary)]">{{ topic.description || 'No description' }}</p>
                <p class="mt-3 break-all font-mono text-xs text-[var(--text-tertiary)]">communityId: {{ topic.id }}</p>
              </div>
            </div>
          </article>
          <div v-if="topics.length === 0" class="p-4 text-sm text-[var(--text-secondary)]">No topics loaded for this channel.</div>
        </div>
      </div>
    </section>
  </div>
</template>
