import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { parse, compileScript } from '@vue/compiler-sfc'
import ts from 'typescript'

const draws = []
let exportedSize
// A small Vue host exercises real component rendering and events without a browser dependency.
class HostNode {
  constructor(tag) { this.tag = tag; this.children = []; this.props = {}; this.listeners = {}; this.text = '' }
  addEventListener(name, callback) { this.listeners[name] = callback }
  getRootNode() { return root }
  focus() {}
  getContext() { return { clearRect() {}, drawImage(...args) { draws.push({ args }) } } }
  toBlob(callback) {
    exportedSize = { width: this.width, height: this.height }
    callback(new Blob(['cropped'], { type: 'image/png' }))
  }
}
const root = new HostNode('root')
globalThis.Document = class {}
globalThis.ShadowRoot = class {}
globalThis.document = { createElement: tag => new HostNode(tag) }
globalThis.window = {}
let failImage = false
window.Image = class {
  naturalWidth = 800
  naturalHeight = 400
  set src(value) { queueMicrotask(() => failImage ? this.onerror() : this.onload()) }
}
const revoked = []
URL.createObjectURL = () => 'blob:crop-test'
URL.revokeObjectURL = value => revoked.push(value)

const toModuleUrl = code => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
const utility = ts.transpileModule(await readFile(new URL('../src/utils/advertImages.ts', import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
const { descriptor } = parse(await readFile(new URL('../src/components/AdvertImageCropper.vue', import.meta.url), 'utf8'))
const compiled = compileScript(descriptor, { id: 'test-advert-crop', inlineTemplate: true }).content
const code = ts.transpileModule(compiled, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
  .replaceAll('"vue"', JSON.stringify(import.meta.resolve('vue')))
  .replaceAll("'vue'", JSON.stringify(import.meta.resolve('vue')))
  .replaceAll("'../utils/advertImages'", JSON.stringify(toModuleUrl(utility)))
const { createRenderer, nextTick } = await import('vue')
const { createApp } = createRenderer({
  createElement: tag => new HostNode(tag),
  createText: text => Object.assign(new HostNode('text'), { text }),
  createComment: () => new HostNode('comment'),
  setText: (node, text) => { node.text = text },
  setElementText: (node, text) => { node.text = text; node.children = [] },
  patchProp: (node, key, previous, value) => { node.props[key] = value; if (['width', 'height', 'type'].includes(key)) node[key] = value },
  parentNode: node => node.parent,
  nextSibling: node => node.parent?.children[node.parent.children.indexOf(node) + 1],
  insert: (node, parent, anchor) => { node.parent = parent; const index = anchor ? parent.children.indexOf(anchor) : -1; parent.children.splice(index < 0 ? parent.children.length : index, 0, node) },
  remove: node => { node.parent?.children.splice(node.parent.children.indexOf(node), 1) },
})
const nodes = (node = root) => [node, ...node.children.flatMap(child => nodes(child))]
const component = (await import(toModuleUrl(code))).default
const confirmed = []
let cancelled = 0
const mount = () => {
  const app = createApp(component, {
    file: new File(['original'], 'banner.jpg', { type: 'image/jpeg' }), size: { width: 299, height: 500 },
    onConfirm: file => confirmed.push(file), onCancel: () => cancelled++,
  })
  app.mount(root)
  return app
}
const flush = async () => { await new Promise(resolve => setTimeout(resolve, 0)); await nextTick() }
let app = mount()
await flush()
assert.equal(confirmed.length, 0, 'Opening a crop preview must not upload')
assert.ok(draws.length > 0, 'Preview draws after image decoding')
const sliders = nodes().filter(node => node.tag === 'input')
sliders[0].value = '2'
sliders[0].listeners.input({ target: sliders[0] })
sliders[1].value = '100'
sliders[1].listeners.input({ target: sliders[1] })
await flush()
const previewCrop = draws.at(-1).args.slice(1, 5)
const buttons = () => nodes().filter(node => node.tag === 'button')
buttons().find(button => button.text.includes('Use crop')).props.onClick()
await flush()
assert.equal(confirmed.length, 1)
assert.equal(confirmed[0].name, 'banner-cropped.png')
assert.equal(confirmed[0].type, 'image/png')
assert.deepEqual(exportedSize, { width: 299, height: 500 }, 'Export uses exact configured pixels')
assert.deepEqual(draws.at(-1).args.slice(1, 5), previewCrop, 'Export uses the crop shown in preview')
app.unmount()
assert.equal(revoked.length, 1)
app = mount()
await flush()
buttons().find(button => button.text === 'Cancel').props.onClick()
assert.equal(cancelled, 1)
assert.equal(confirmed.length, 1, 'Cancel never emits a file')
app.unmount()
failImage = true
app = mount()
await flush()
assert.match(nodes().find(node => node.props.role === 'alert').text, /Unable to read/)
assert.equal(buttons().find(button => button.text.includes('Use crop')).props.disabled, true)
app.unmount()
assert.equal(revoked.length, 3, 'Each dialog releases its source URL')
console.log('Advert crop preview interaction checks passed')
