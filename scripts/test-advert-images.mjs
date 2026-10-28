import assert from 'node:assert/strict'
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  const { parseAdvertSize, advertImageError, readImageDimensions, advertCropRect } = await server.ssrLoadModule('/src/utils/advertImages.ts')
  assert.deepEqual(advertCropRect({ width: 400, height: 200 }, { width: 100, height: 100 }, 1, 50, 50), { x: 100, y: 0, width: 200, height: 200 })
  assert.deepEqual(advertCropRect({ width: 200, height: 400 }, { width: 100, height: 100 }, 1, 50, 100), { x: 0, y: 200, width: 200, height: 200 })
  assert.deepEqual(advertCropRect({ width: 400, height: 200 }, { width: 100, height: 100 }, 2, 100, 0), { x: 300, y: 0, width: 100, height: 100 })
  assert.deepEqual(advertCropRect({ width: 20, height: 20 }, { width: 200, height: 100 }, 1, 50, 50), { x: 0, y: 5, width: 20, height: 10 })
  for (const source of [{ width: 800, height: 200 }, { width: 200, height: 800 }]) {
    for (const zoom of [1, 1.5, 4]) {
      for (const position of [0, 50, 100]) {
        const crop = advertCropRect(source, { width: 299, height: 500 }, zoom, position, position)
        assert.ok(Math.abs(crop.width / crop.height - 299 / 500) < 1e-10, 'Crop preserves the placement aspect ratio')
        assert.ok(crop.x >= 0 && crop.y >= 0 && crop.x + crop.width <= source.width + 1e-10 && crop.y + crop.height <= source.height + 1e-10, 'Crop stays inside the image at all positions and zoom levels')
      }
    }
  }
  for (const value of ['299x500', ' 299 × 500 ', '299 X 500 px']) {
    assert.deepEqual(parseAdvertSize(value), { width: 299, height: 500 })
  }
  for (const value of ['', 'square', '299x500, 299x300', '0x500', '-20x20', '20.5x20', '20x', '20x20junk', '9007199254740992x20']) {
    assert.equal(parseAdvertSize(value), null, value)
  }
  const required = { width: 20, height: 20 }
  assert.equal(advertImageError(required, { width: 20, height: 20 }), null)
  assert.match(advertImageError(required, { width: 200, height: 200 }), /20 × 20.*200 × 200/)
  assert.ok(advertImageError({ width: 299, height: 500 }, { width: 500, height: 299 }))

  let imageResult = 'valid'
  globalThis.window = { Image: class {
    naturalWidth = 299
    naturalHeight = 500
    set src(value) {
      if (imageResult === 'zero') this.naturalWidth = 0
      queueMicrotask(() => imageResult === 'error' ? this.onerror() : this.onload())
    }
  } }
  const revoked = []
  const originalCreate = URL.createObjectURL
  const originalRevoke = URL.revokeObjectURL
  URL.createObjectURL = () => 'blob:test-advert'
  URL.revokeObjectURL = value => revoked.push(value)
  try {
    assert.deepEqual(await readImageDimensions('https://example.test/advert.png'), { width: 299, height: 500 })
    assert.equal(revoked.length, 0, 'Remote images do not allocate object URLs')
    assert.deepEqual(await readImageDimensions(new Blob()), { width: 299, height: 500 })
    assert.equal(revoked.length, 1)
    imageResult = 'error'
    await assert.rejects(readImageDimensions(new Blob()), /Unable to read image dimensions/)
    assert.equal(revoked.length, 2, 'Failed image reads release object URLs')
    imageResult = 'zero'
    await assert.rejects(readImageDimensions('https://example.test/empty.png'), /Unable to read image dimensions/)
  } finally {
    URL.createObjectURL = originalCreate
    URL.revokeObjectURL = originalRevoke
  }
  console.log('Advert image validation checks passed')
} finally {
  await server.close()
}
