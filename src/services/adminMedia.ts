import { apiRequest } from '../composables/useApi'

export type MediaSignaturePayload = {
  apiKey?: string
  api_key?: string
  cloudName?: string
  cloud_name?: string
  folder?: string
  publicId?: string
  public_id?: string
  signature?: string
  timestamp?: string | number
  uploadPreset?: string
  upload_preset?: string
  [key: string]: unknown
}

export type MediaSignatureResponse = {
  success?: boolean
  data?: MediaSignaturePayload
} & MediaSignaturePayload

export type CloudinaryUploadResponse = {
  public_id: string
  secure_url?: string
  url?: string
  resource_type?: string
  [key: string]: unknown
}

export type RegisterMediaResponse = {
  success: boolean
  data: {
    jobId: string
    [key: string]: unknown
  }
}

export type MediaJobResponse = {
  success?: boolean
  data?: Record<string, unknown> | null
  status?: string
  [key: string]: unknown
}

export async function getMediaSignature() {
  return apiRequest<MediaSignatureResponse>('/api/media/signature')
}

export async function uploadImageToCloudinary(file: File, signatureResponse: MediaSignatureResponse) {
  const payload = signatureResponse.data || signatureResponse
  const cloudName = String(payload.cloudName || payload.cloud_name || import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '')
  const apiKey = String(payload.apiKey || payload.api_key || '')
  const timestamp = payload.timestamp ? String(payload.timestamp) : ''
  const signature = payload.signature ? String(payload.signature) : ''

  if (!cloudName || !apiKey || !timestamp || !signature) {
    throw new Error('Upload signature is missing Cloudinary credentials')
  }

  const body = new FormData()
  body.append('file', file)
  body.append('api_key', apiKey)
  body.append('timestamp', timestamp)
  body.append('signature', signature)

  const folder = payload.folder ? String(payload.folder) : ''
  const publicId = payload.publicId || payload.public_id
  const uploadPreset = payload.uploadPreset || payload.upload_preset

  if (folder) body.append('folder', folder)
  if (publicId) body.append('public_id', String(publicId))
  if (uploadPreset) body.append('upload_preset', String(uploadPreset))

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body,
  })

  if (!response.ok) {
    throw new Error('Cloudinary upload failed')
  }

  return response.json() as Promise<CloudinaryUploadResponse>
}

export async function registerMedia(publicId: string, kind: string) {
  return apiRequest<RegisterMediaResponse>('/api/media/register', {
    method: 'POST',
    body: JSON.stringify({ publicId, kind }),
  })
}

export async function getMediaJob(jobId: string) {
  return apiRequest<MediaJobResponse>(`/api/media/jobs/${jobId}`)
}

export default {
  getMediaSignature,
  uploadImageToCloudinary,
  registerMedia,
  getMediaJob,
}
