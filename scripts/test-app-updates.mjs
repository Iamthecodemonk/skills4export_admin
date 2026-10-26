import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { createMemoryHistory, createRouter } from 'vue-router'

const storage = new Map([['admin-token', 'test-admin']])
globalThis.localStorage = {
  getItem: key => storage.get(key) ?? null,
  removeItem: key => storage.delete(key),
}
const requests = []
let response = { status: 200, body: { success: true, data: [] } }
globalThis.fetch = async (url, options) => {
  requests.push({ url, options })
  return new Response(JSON.stringify(response.body), { status: response.status })
}
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  const service = await server.ssrLoadModule('/src/services/adminAppUpdates.ts')
  const access = await server.ssrLoadModule('/src/composables/useAdminAccess.ts')
  const sidebar = (await server.ssrLoadModule('/src/components/AppSidebar.vue')).default
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }] })
  await router.push('/admin/app-updates')
  const renderSidebar = () => renderToString(createSSRApp(sidebar, { open: true }).use(router))

  assert.equal(service.compareAppVersions('2.10.0', '2.9.99'), 1)
  assert.equal(service.compareAppVersions('2.3.1', '2.4.0'), -1)
  assert.equal(service.compareAppVersions('02.03.01', '2.3.1'), 0)
  assert.equal(service.compareAppVersions('99999999999999999999.0.0', '99999999999999999998.0.0'), 1)
  const draft = { latestVersion: '2.10.0', minSupportedVersion: '2.9.0', storeUrl: 'https://play.google.com/store/apps/details?id=owned.test', releaseNotes: '', releasedAt: null, isPublished: false }
  assert.equal(service.validateAppUpdatePolicy('android', draft), null)
  for (const version of ['2.3', 'v2.3.0', '2.3.0-beta', 'app name', '2.a.0']) {
    assert.ok(service.validateAppUpdatePolicy('android', { ...draft, latestVersion: version }))
  }
  assert.match(service.validateAppUpdatePolicy('android', { ...draft, minSupportedVersion: '2.11.0' }), /cannot exceed/)
  for (const url of ['http://play.google.com/store/apps/details?id=x', 'https://play.google.com.evil.test/store/apps/details?id=x', 'https://play.google.com/store/apps/details', 'https://user@play.google.com/store/apps/details?id=x', 'https://apps.apple.com/us/app/test/id123']) {
    assert.ok(service.validateAppUpdatePolicy('android', { ...draft, storeUrl: url }))
  }
  assert.equal(service.validateAppUpdatePolicy('ios', { ...draft, storeUrl: 'https://apps.apple.com/us/app/owned-test/id123' }), null)
  assert.ok(service.validateAppUpdatePolicy('ios', { ...draft, storeUrl: 'https://apps.apple.com/' }))
  assert.match(service.validateAppUpdatePolicy('android', { ...draft, isPublished: true }), /release date/)
  assert.match(service.validateAppUpdatePolicy('android', { ...draft, isPublished: true, releasedAt: '2999-01-01T00:00:00Z' }), /future/)
  assert.equal(service.validateAppUpdatePolicy('android', { ...draft, isPublished: true, releasedAt: '2020-01-01T00:00:00Z' }), null)

  assert.deepEqual(await service.listAppUpdatePolicies(), [], 'No fake policy should be created')
  response.body.data = [{ platform: 'android', latest_version: '2.10.0', min_supported_version: '2.9.0', store_url: draft.storeUrl, release_notes: null, released_at: null, is_published: 0 }]
  assert.deepEqual(await service.listAppUpdatePolicies(), [{ ...draft, platform: 'android' }])
  await service.saveAppUpdatePolicy('android', draft)
  assert.equal(requests.at(-1).url, '/api/admin/app-updates/android')
  assert.equal(requests.at(-1).options.method, 'PUT')
  assert.equal(requests.at(-1).options.headers.get('Authorization'), 'Bearer test-admin')
  assert.deepEqual(JSON.parse(requests.at(-1).options.body), draft)

  response = { status: 422, body: { success: false, data: { errors: { storeUrl: ['Use the real store listing'] } } } }
  await assert.rejects(service.saveAppUpdatePolicy('android', draft), /Use the real store listing/)
  response = { status: 403, body: { success: false, error: { code: 'forbidden' } } }
  await assert.rejects(service.listAppUpdatePolicies(), /Access denied/)

  response = { status: 200, body: { data: { isAdmin: true, isSuperAdmin: false } } }
  await access.loadAdminAccess(true)
  assert.ok(!(await renderSidebar()).includes('App Updates'))
  response.body.data.isSuperAdmin = true
  await access.loadAdminAccess(true)
  assert.ok((await renderSidebar()).includes('App Updates'))
  console.log('App update validation, authenticated requests, API errors, and superadmin navigation passed.')
} finally {
  await server.close()
}
