<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

type ClassicEditorConstructor = {
  create: (element: HTMLElement, config?: Record<string, unknown>) => Promise<{
    getData: () => string
    setData: (value: string) => void
    destroy: () => Promise<void>
    model: {
      document: {
        on: (event: string, callback: () => void) => void
      }
    }
  }>
}

declare global {
  interface Window {
    ClassicEditor?: ClassicEditorConstructor
  }
}

const props = defineProps<{
  modelValue: string
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const editorHost = ref<HTMLElement | null>(null)
const loading = ref(true)
const failed = ref(false)
let editor: Awaited<ReturnType<ClassicEditorConstructor['create']>> | null = null
let syncingFromEditor = false

function loadCkEditorScript() {
  if (window.ClassicEditor) return Promise.resolve()

  return new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-ckeditor-classic]')

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('CKEditor failed to load')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://cdn.ckeditor.com/ckeditor5/41.4.2/classic/ckeditor.js'
    script.async = true
    script.dataset.ckeditorClassic = 'true'
    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener('error', () => reject(new Error('CKEditor failed to load')), { once: true })
    document.head.appendChild(script)
  })
}

async function mountEditor() {
  if (!editorHost.value) return

  loading.value = true
  failed.value = false

  try {
    await loadCkEditorScript()
    await nextTick()

    if (!window.ClassicEditor || !editorHost.value) {
      throw new Error('CKEditor is unavailable')
    }

    editor = await window.ClassicEditor.create(editorHost.value, {
      placeholder: props.placeholder || 'Write content',
      toolbar: [
        'heading',
        '|',
        'bold',
        'italic',
        'link',
        'bulletedList',
        'numberedList',
        '|',
        'blockQuote',
        'insertTable',
        'undo',
        'redo',
      ],
    })

    editor.setData(props.modelValue || '')
    editor.model.document.on('change:data', () => {
      if (!editor) return
      syncingFromEditor = true
      emit('update:modelValue', editor.getData())
      syncingFromEditor = false
    })
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

watch(() => props.modelValue, (value) => {
  if (!editor || syncingFromEditor || editor.getData() === value) return
  editor.setData(value || '')
})

onMounted(() => {
  mountEditor()
})

onBeforeUnmount(() => {
  editor?.destroy().catch(() => undefined)
})
</script>

<template>
  <div>
    <div v-if="loading" class="flex min-h-64 items-center justify-center rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] text-sm font-medium text-[var(--text-secondary)]">
      Loading editor
    </div>
    <textarea
      v-if="failed"
      :value="modelValue"
      class="min-h-80 w-full resize-y rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 py-3 font-mono text-sm outline-none focus:border-[var(--accent)]"
      :placeholder="placeholder"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    ></textarea>
    <div v-show="!loading && !failed" class="ckeditor-shell">
      <div ref="editorHost"></div>
    </div>
  </div>
</template>

<style scoped>
.ckeditor-shell :deep(.ck-editor__editable_inline) {
  min-height: 20rem;
}

.ckeditor-shell :deep(.ck.ck-editor__main > .ck-editor__editable),
.ckeditor-shell :deep(.ck.ck-toolbar) {
  border-color: var(--border-soft);
}

.ckeditor-shell :deep(.ck.ck-editor__main > .ck-editor__editable) {
  background: var(--surface-secondary);
  color: var(--text-primary);
}
</style>
