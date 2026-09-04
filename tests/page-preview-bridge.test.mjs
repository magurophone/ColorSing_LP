import assert from 'node:assert/strict'
import test from 'node:test'
import {
  PAGE_PREVIEW_MESSAGE,
  PAGE_PREVIEW_PROTOCOL_VERSION,
  PAGE_PREVIEW_SCHEMA,
  pagePreviewProtocolTest,
} from '../src/lib/pagePreviewBridge.js'
import { applyPageSettings } from '../src/lib/pageSettings.js'

const identity = {
  tenantId: 'tenant-magurophone',
  tenantSlug: 'magurophone',
  publicUrl: 'https://public.example/page/',
  controlPlaneOrigin: 'https://control.example',
}

function envelope(type, nonce = '1234567890abcdef') {
  return {
    schema: PAGE_PREVIEW_SCHEMA,
    protocolVersion: PAGE_PREVIEW_PROTOCOL_VERSION,
    type,
    nonce,
    tenantId: identity.tenantId,
    tenantSlug: identity.tenantSlug,
    publicUrl: identity.publicUrl,
  }
}

test('preview protocol rejects wrong nonce, tenant, URL, type, mode, and draft schema', () => {
  const hello = envelope(PAGE_PREVIEW_MESSAGE.hello)
  assert.equal(pagePreviewProtocolTest.matchesHello(hello, identity), true)
  assert.equal(pagePreviewProtocolTest.matchesHello({ ...hello, tenantId: 'other' }, identity), false)
  assert.equal(pagePreviewProtocolTest.matchesHello({ ...hello, publicUrl: 'https://other.example/' }, identity), false)
  assert.equal(pagePreviewProtocolTest.matchesHello({ ...hello, protocolVersion: 2 }, identity), false)

  const state = {
    ...envelope(PAGE_PREVIEW_MESSAGE.state),
    payload: { draft: { brand: { name: '' } }, mode: 'edit', selectedTarget: 'brand.name' },
  }
  assert.equal(pagePreviewProtocolTest.matchesState(state, identity, hello.nonce), true)
  assert.equal(pagePreviewProtocolTest.matchesState({ ...state, nonce: 'wrong-nonce-value' }, identity, hello.nonce), false)
  assert.equal(pagePreviewProtocolTest.matchesState({ ...state, payload: { ...state.payload, mode: 'invalid' } }, identity, hello.nonce), false)
  assert.equal(pagePreviewProtocolTest.matchesState({ ...state, payload: { ...state.payload, draft: [] } }, identity, hello.nonce), false)
})

test('draft removal recomputes from immutable base and raw values keep their meaning', () => {
  const base = {
    brand: { name: 'base', showTitle: true },
    home: { pointsLabel: 'pt', pointsUnit: 'k' },
    views: [{ id: 'home', label: 'base', enabled: true, futureField: { kept: true } }],
  }
  const first = applyPageSettings(base, {
    brand: { name: '', showTitle: false },
    home: { pointsLabel: 0, pointsUnit: '' },
    views: [{ id: 'home', label: 'draft', enabled: false, futureField: { raw: 0 } }],
  })
  assert.equal(first.brand.name, '')
  assert.equal(first.brand.showTitle, false)
  assert.equal(first.home.pointsLabel, 0)
  assert.equal(first.home.pointsUnit, '')
  assert.deepEqual(first.views, [{ id: 'home', label: 'draft', enabled: false, futureField: { raw: 0 } }])

  const second = applyPageSettings(base, { home: { pointsUnit: '' } })
  assert.equal(second.brand.name, 'base', 'removed key comes from immutable base, not prior preview state')
  assert.equal(second.brand.showTitle, true)
})

test('only control_plane authority skips legacy localStorage', async () => {
  const stored = JSON.stringify({ brand: { name: 'browser-local' } })
  const localStorage = { getItem: () => stored }
  globalThis.localStorage = localStorage
  globalThis.window = {
    location: { pathname: '/' },
    localStorage,
    DASHBOARD_CONFIG: { brand: { name: 'generated-config' }, platform: {} },
  }
  const { loadPublicConfig } = await import(`../src/lib/configIO.js?preview-authority=${Date.now()}`)

  assert.equal(loadPublicConfig().brand.name, 'browser-local')
  assert.equal(loadPublicConfig({ configAuthority: 'cutover_pending' }).brand.name, 'browser-local')
  assert.equal(loadPublicConfig({ configAuthority: 'control_plane' }).brand.name, 'generated-config')

  delete globalThis.window
  delete globalThis.localStorage
})
