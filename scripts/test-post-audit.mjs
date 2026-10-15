import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { createMemoryHistory, createRouter } from 'vue-router'

// Exercise the real API client, access state, and Vue templates without live accounts.
const storage = new Map()
globalThis.localStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: key => storage.delete(key),
}
const redirects = []
globalThis.window = { location: { pathname: '/admin/post-audit', assign: path => redirects.push(path) } }
const requests = []
let response = { status: 200, body: { success: true, data: {} } }
globalThis.fetch = async (url, options) => {
  requests.push({ url, options })
  return new Response(JSON.stringify(response.body), { status: response.status, headers: { 'Content-Type': 'application/json' } })
}
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  const access = await server.ssrLoadModule('/src/composables/useAdminAccess.ts')
  const api = await server.ssrLoadModule('/src/composables/useApi.ts')
  const audit = await server.ssrLoadModule('/src/services/postAudit.ts')
  const accounts = (await server.ssrLoadModule('/src/views/admin/AdminAccountsView.vue')).default
  const configuration = (await server.ssrLoadModule('/src/views/admin/AdminPostAuditView.vue')).default
  const sidebar = (await server.ssrLoadModule('/src/components/AppSidebar.vue')).default
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }] })
  await router.push('/admin/post-audit')
  async function render(component, props) {
    return renderToString(createSSRApp(component, props).use(router))
  }

  localStorage.setItem('admin-token', 'ordinary-admin')
  localStorage.setItem('admin-user', JSON.stringify({ role: 'superadmin', isSuperAdmin: true }))
  response.body = { success: true, data: { isAdmin: true, isSuperAdmin: false } }
  await access.loadAdminAccess()
  assert.equal(requests.at(-1).url, '/api/admin/users/me')
  assert.equal(requests.at(-1).options.headers.get('Authorization'), 'Bearer ordinary-admin')
  assert.equal(access.adminAccess.value.isSuperAdmin, false, 'Stored role must never grant access')
  let html = await render(configuration)
  assert.ok(!html.includes('Create unit'))
  assert.ok(!html.includes('Save assignments'))
  assert.ok(!html.includes('Dispatch batch'))
  html = await render(accounts)
  assert.ok(html.includes('Access denied'))
  assert.ok(!html.includes('Create admin'))
  html = await render(sidebar, { open: true })
  assert.ok(html.includes('Post audit'))
  assert.ok(!html.includes('Manage admin users'))

  localStorage.setItem('admin-token', 'super-admin')
  response.body = { success: true, data: { isAdmin: true, isSuperAdmin: true } }
  await access.loadAdminAccess()
  html = await render(configuration)
  assert.ok(html.includes('Create unit'))
  assert.ok(html.includes('Save assignments'))
  html = await render(accounts)
  assert.ok(html.includes('Create admin'))
  assert.ok(!html.includes('Revoke'))
  assert.ok(!html.includes('Delete admin'))
  html = await render(sidebar, { open: true })
  assert.ok(html.includes('Manage admin users'))

  response.body = { success: true, data: { checkedCount: 3 } }
  await audit.reportAuditItem('unit/a', 'assignment/b', 'Spam', 'Notes')
  assert.equal(requests.at(-1).url, '/api/admin/post-audit/units/unit%2Fa/items/assignment%2Fb/report')
  assert.deepEqual(JSON.parse(requests.at(-1).options.body), { reason: 'Spam', details: 'Notes' })
  await audit.checkpointAudit('unit/a', 'assignment/b')
  assert.deepEqual(JSON.parse(requests.at(-1).options.body), { throughAssignmentId: 'assignment/b' })
  await audit.checkpointAudit('unit/a')
  assert.deepEqual(JSON.parse(requests.at(-1).options.body), {})
  await audit.listAuditItems('unit/a', 'checked', 2)
  assert.equal(requests.at(-1).url, '/api/admin/post-audit/units/unit%2Fa/items?status=checked&page=2&per_page=20')
  await audit.assignAuditItem('question', 'item/a', ['unit/a'], true)
  assert.deepEqual(JSON.parse(requests.at(-1).options.body), { unitIds: ['unit/a'], replace: true })

  for (const [status, code] of [[403, 'forbidden'], [409, 'assignment_already_checked'], [404, 'unit_not_found']]) {
    response = { status, body: { success: false, error: { code } } }
    await assert.rejects(audit.listAuditUnits(), error => error instanceof api.ApiError && error.status === status && error.code === code && (status !== 403 || error.message.includes('Access denied')))
  }
  localStorage.setItem('admin-token', 'forbidden-account')
  response = { status: 403, body: { success: false, error: { code: 'forbidden' } } }
  await assert.rejects(access.loadAdminAccess())
  assert.equal(access.adminAccess.value.isSuperAdmin, false)
  assert.equal(access.adminAccess.value.isAdmin, false)
  response = { status: 401, body: { success: false, error: { code: 'unauthorized' } } }
  await assert.rejects(audit.listAuditUnits())
  assert.equal(localStorage.getItem('admin-token'), null)
  assert.equal(localStorage.getItem('admin-user'), null)
  assert.deepEqual(redirects, ['/auth/login'])
  console.log('Passed: admin/superadmin rendering, server permissions, bearer token, assignment actions, pagination, 403/409/404 errors, and 401 sign-in redirect.')
} finally {
  await server.close()
}
