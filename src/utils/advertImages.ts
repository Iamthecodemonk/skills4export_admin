export type ImageDimensions = { width: number; height: number }

export function parseAdvertSize(value: string): ImageDimensions | null {
  const match = value.trim().match(/^(\d+)\s*[x×]\s*(\d+)\s*(?:px)?$/i)
  if (!match) return null
  const width = Number(match[1])
  const height = Number(match[2])
  return Number.isSafeInteger(width) && width > 0 && Number.isSafeInteger(height) && height > 0
    ? { width, height }
    : null
}

export function advertImageError(required: ImageDimensions, actual: ImageDimensions): string | null {
  return required.width === actual.width && required.height === actual.height
    ? null
    : `This location requires ${required.width} × ${required.height} pixels. Your image is ${actual.width} × ${actual.height} pixels. Choose an image with the exact required dimensions.`
}

export async function readImageDimensions(source: File | string): Promise<ImageDimensions> {
  const objectUrl = typeof source === 'string' ? null : URL.createObjectURL(source)
  try {
    return await new Promise((resolve, reject) => {
      const image = new window.Image()
      image.onload = () => {
        if (!image.naturalWidth || !image.naturalHeight) {
          reject(new Error('Unable to read image dimensions. Choose a valid image.'))
          return
        }
        resolve({ width: image.naturalWidth, height: image.naturalHeight })
      }
      image.onerror = () => reject(new Error('Unable to read image dimensions. Choose a valid image.'))
      image.src = objectUrl || source as string
    })
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl)
  }
}
