import { apiRequest } from '../composables/useApi'

export type AuditUnit = { id: string; name: string; sortOrder: number; isActive: boolean; total: number; pending: number; checked: number }
export type AuditPerson = { id?: string; email?: string; name?: string; username?: string }
export type AuditAssignment = {
  id: string; item_type: 'post' | 'question'; item_id: string
  item: { title?: string; body?: string; content?: string } | null
  author: AuditPerson | null; auditor: AuditPerson | null
  report: { reason?: string; details?: string; created_at?: string } | null
  assigned_at: string; checked_at: string | null; checked_by: string | null
}
export type AuditPage = { current_page: number; last_page: number; per_page: number; total: number; data: AuditAssignment[] }
type Result<T> = { success: boolean; data: T }
const root = '/api/admin/post-audit'
const idPath = (id: string) => `${root}/units/${encodeURIComponent(id)}`
export const listAuditUnits = () => apiRequest<Result<{ settings: { copiesPerItem: number }; units: AuditUnit[] }>>(`${root}/units`)
export const createAuditUnit = (name: string, sortOrder: number) => apiRequest(`${root}/units`, { method: 'POST', body: JSON.stringify({ name, sortOrder }) })
export const updateAuditUnit = (id: string, values: { name: string; sortOrder: number; isActive: boolean }) => apiRequest(idPath(id), { method: 'PATCH', body: JSON.stringify(values) })
export const saveAuditSettings = (copiesPerItem: number) => apiRequest(`${root}/settings`, { method: 'PUT', body: JSON.stringify({ copiesPerItem }) })
export const dispatchAudit = (limit: number) => apiRequest<Result<Record<string, unknown>>>(`${root}/dispatch`, { method: 'POST', body: JSON.stringify({ limit }) })
export const listAuditItems = (id: string, status: 'pending' | 'checked', page: number) => apiRequest<Result<AuditPage>>(`${idPath(id)}/items?status=${status}&page=${page}&per_page=20`)
export const reportAuditItem = (id: string, assignmentId: string, reason: string, details: string) => apiRequest(`${idPath(id)}/items/${encodeURIComponent(assignmentId)}/report`, { method: 'POST', body: JSON.stringify({ reason, details }) })
export const checkpointAudit = (id: string, throughAssignmentId?: string) => apiRequest<Result<{ checkedCount: number }>>(`${idPath(id)}/checkpoint`, { method: 'POST', body: JSON.stringify(throughAssignmentId ? { throughAssignmentId } : {}) })
export const assignAuditItem = (type: 'post' | 'question', id: string, unitIds: string[], replace: boolean) => apiRequest<Result<{ assignments: unknown[] }>>(`${root}/items/${type}/${encodeURIComponent(id)}/assign`, { method: 'POST', body: JSON.stringify({ unitIds, replace }) })
