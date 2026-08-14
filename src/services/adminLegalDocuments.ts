import { apiRequest } from '../composables/useApi'

export type LegalDocumentStatus = 'draft' | 'published' | 'archived'
export type LegalDocumentContentType = 'html' | 'markdown' | 'text'

export type LegalDocument = {
  id: string
  slug: string
  title: string
  content: string
  contentType?: LegalDocumentContentType
  content_type?: LegalDocumentContentType
  version: string
  status: LegalDocumentStatus
  effectiveDate?: string | null
  effective_date?: string | null
  createdAt?: string
  created_at?: string
  updatedAt?: string
  updated_at?: string
}

export type LegalDocumentPayload = {
  slug: string
  title: string
  content: string
  contentType: LegalDocumentContentType
  version: string
  status: LegalDocumentStatus
  effectiveDate: string
}

type DataResponse<T> = {
  success?: boolean
  message?: string
  data: T
}

type ListResponse = {
  data?: LegalDocument[]
}

export async function listLegalDocuments() {
  const response = await apiRequest<ListResponse | LegalDocument[]>('/api/admin/legal-documents')
  return Array.isArray(response) ? response : response.data || []
}

export function createLegalDocument(payload: LegalDocumentPayload) {
  return apiRequest<DataResponse<LegalDocument>>('/api/admin/legal-documents', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateLegalDocument(id: string, payload: LegalDocumentPayload) {
  return apiRequest<DataResponse<LegalDocument>>(`/api/admin/legal-documents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteLegalDocument(id: string) {
  return apiRequest<DataResponse<LegalDocument | { id: string }>>(`/api/admin/legal-documents/${id}`, {
    method: 'DELETE',
  })
}

export default {
  listLegalDocuments,
  createLegalDocument,
  updateLegalDocument,
  deleteLegalDocument,
}
