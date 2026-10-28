<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { advertCropRect, type ImageDimensions } from '../utils/advertImages'

const props = defineProps<{ file: File; size: ImageDimensions }>()
const emit = defineEmits<{ confirm: [file: File]; cancel: [] }>()
const canvas = ref<HTMLCanvasElement | null>(null)
const dialog = ref<HTMLElement | null>(null)
const image = shallowRef<HTMLImageElement | null>(null)
const zoom = ref(1)
const x = ref(50)
const y = ref(50)
const error = ref('')
const exporting = ref(false)
const previewSize = computed(() => {
  const scale = Math.min(1, 640 / props.size.width, 360 / props.size.height)
  return { width: Math.max(1, Math.round(props.size.width * scale)), height: Math.max(1, Math.round(props.size.height * scale)) }
})
const sourceUrl = URL.createObjectURL(props.file)
let disposed = false

function draw(target: HTMLCanvasElement) {
  const source = image.value
  if (!source) throw new Error('Image is still loading.')
  const context = target.getContext('2d')
  if (!context) throw new Error('Your browser could not prepare the crop preview.')
  const crop = advertCropRect({ width: source.naturalWidth, height: source.naturalHeight }, props.size, zoom.value, x.value, y.value)
  context.clearRect(0, 0, target.width, target.height)
  context.imageSmoothingQuality = 'high'
  context.drawImage(source, crop.x, crop.y, crop.width, crop.height, 0, 0, target.width, target.height)
}

watch([image, zoom, x, y], () => {
  if (!canvas.value || !image.value) return
  try { draw(canvas.value) } catch (err) { error.value = (err as Error).message }
}, { flush: 'post' })

onMounted(() => {
  dialog.value?.focus()
  const source = new window.Image()
  source.onload = () => {
    if (disposed) return
    if (!source.naturalWidth || !source.naturalHeight) {
      error.value = 'Unable to read this image. Choose another image.'
      return
    }
    image.value = source
  }
  source.onerror = () => { if (!disposed) error.value = 'Unable to read this image. Choose another image.' }
  source.src = sourceUrl
})

onUnmounted(() => { disposed = true; URL.revokeObjectURL(sourceUrl) })

async function confirmCrop() {
  if (!image.value || exporting.value || error.value) return
  exporting.value = true
  try {
    const output = document.createElement('canvas')
    output.width = props.size.width
    output.height = props.size.height
    if (output.width !== props.size.width || output.height !== props.size.height) throw new Error('These dimensions are too large for this browser.')
    draw(output)
    const blob = await new Promise<Blob>((resolve, reject) => output.toBlob(
      value => value ? resolve(value) : reject(new Error('Unable to crop this image. Try a smaller image.')), 'image/png',
    ))
    if (!disposed) emit('confirm', new File([blob], `${props.file.name.replace(/\.[^.]+$/, '')}-cropped.png`, { type: 'image/png' }))
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unable to crop this image.'
  } finally { exporting.value = false }
}
</script>

<template>
  <div ref="dialog" class="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-[var(--overlay-bg)] p-4" role="dialog" aria-modal="true" aria-labelledby="advert-crop-title" @keydown.esc.stop="emit('cancel')" tabindex="-1">
    <section class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-[var(--surface-primary)] p-5 shadow-xl">
      <h2 id="advert-crop-title" class="text-lg font-semibold text-[var(--text-primary)]">Crop and preview advert image</h2>
      <p class="mt-2 text-sm text-[var(--text-secondary)]">Adjust the zoom and position. This preview shows what will be uploaded at {{ size.width }} × {{ size.height }} pixels.</p>
      <p class="mt-1 text-xs text-[var(--text-secondary)]">Cropping produces a still image. Smaller images are enlarged to fit and may look less sharp.</p>
      <div class="mt-4 flex min-h-32 items-center justify-center rounded-xl border border-[color:var(--border-soft)] bg-[var(--surface-muted)] p-3">
        <canvas ref="canvas" :width="previewSize.width" :height="previewSize.height" class="h-auto max-w-full object-contain" :style="{ aspectRatio: `${size.width} / ${size.height}` }" aria-label="Cropped advert preview" />
      </div>
      <p v-if="!image && !error" role="status" class="mt-2 text-sm text-[var(--text-secondary)]">Loading image...</p>
      <p v-if="error" role="alert" class="mt-2 text-sm text-red-600">{{ error }}</p>
      <fieldset :disabled="!image || exporting || !!error" class="mt-4 grid gap-3 text-sm text-[var(--text-primary)]">
        <label class="grid gap-1">Zoom ({{ Number(zoom).toFixed(1) }}×)<input v-model.number="zoom" type="range" min="1" max="4" step="0.05" /></label>
        <label class="grid gap-1">Horizontal position<input v-model.number="x" type="range" min="0" max="100" step="1" /></label>
        <label class="grid gap-1">Vertical position<input v-model.number="y" type="range" min="0" max="100" step="1" /></label>
        <button type="button" class="justify-self-start text-[var(--accent-strong)]" @click="zoom = 1; x = 50; y = 50">Reset crop</button>
      </fieldset>
      <div class="mt-5 flex justify-end gap-3">
        <button type="button" class="rounded-xl border border-[color:var(--border-soft)] px-4 py-2 text-[var(--text-primary)]" @click="emit('cancel')">Cancel</button>
        <button type="button" :disabled="!image || exporting || !!error" class="rounded-xl bg-[var(--accent)] px-4 py-2 font-semibold text-white disabled:opacity-50" @click="confirmCrop">{{ exporting ? 'Preparing image...' : 'Use crop and upload' }}</button>
      </div>
    </section>
  </div>
</template>
