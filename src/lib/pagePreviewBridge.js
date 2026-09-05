export const PAGE_PREVIEW_PROTOCOL_VERSION = 1
export const PAGE_PREVIEW_SCHEMA = 'slt.page-settings-preview.v1'

export const PAGE_PREVIEW_MESSAGE = Object.freeze({
  hello: 'slt.page-preview.hello',
  ready: 'slt.page-preview.ready',
  state: 'slt.page-preview.state',
  selection: 'slt.page-preview.selection',
})

const MODES = new Set(['readonly', 'edit', 'operate'])

/* Control Planeが確かめたい表示状態。普段は出ない画面の文字を、実物を見ながら
 * 直せるようにするためのもの。preview のときだけ効く。 */
const PREVIEW_STATES = new Set(['normal', 'loading', 'error', 'icons-empty'])

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function normalizeExactUrl(value) {
  if (typeof value !== 'string' || value.length === 0) return null
  try {
    const url = new URL(value)
    if ((url.protocol !== 'https:' && url.protocol !== 'http:') || url.username || url.password) return null
    return url.href
  } catch {
    return null
  }
}

function resolvePreviewIdentity(config) {
  const platform = config?.platform
  if (!isPlainObject(platform) || platform.configAuthority !== 'control_plane') return null
  if (typeof platform.tenantId !== 'string' || platform.tenantId.length === 0) return null
  if (typeof platform.tenantSlug !== 'string' || platform.tenantSlug.length === 0) return null

  const publicUrl = normalizeExactUrl(platform.publicUrl)
  const currentUrl = typeof window === 'undefined' ? null : normalizeExactUrl(window.location.href)
  if (!publicUrl || publicUrl !== currentUrl) return null

  if (typeof platform.controlPlaneOrigin !== 'string') return null
  let controlPlaneOrigin
  try {
    controlPlaneOrigin = new URL(platform.controlPlaneOrigin).origin
  } catch {
    return null
  }
  if (controlPlaneOrigin !== platform.controlPlaneOrigin) return null

  return {
    tenantId: platform.tenantId,
    tenantSlug: platform.tenantSlug,
    publicUrl,
    controlPlaneOrigin,
  }
}

function matchesEnvelope(data, identity, type, nonce) {
  return isPlainObject(data)
    && data.schema === PAGE_PREVIEW_SCHEMA
    && data.protocolVersion === PAGE_PREVIEW_PROTOCOL_VERSION
    && data.type === type
    && data.nonce === nonce
    && data.tenantId === identity.tenantId
    && data.tenantSlug === identity.tenantSlug
    && normalizeExactUrl(data.publicUrl) === identity.publicUrl
}

function matchesHello(data, identity) {
  return isPlainObject(data)
    && data.schema === PAGE_PREVIEW_SCHEMA
    && data.protocolVersion === PAGE_PREVIEW_PROTOCOL_VERSION
    && data.type === PAGE_PREVIEW_MESSAGE.hello
    && typeof data.nonce === 'string'
    && data.nonce.length >= 16
    && data.tenantId === identity.tenantId
    && data.tenantSlug === identity.tenantSlug
    && normalizeExactUrl(data.publicUrl) === identity.publicUrl
}

function matchesState(data, identity, nonce) {
  if (!matchesEnvelope(data, identity, PAGE_PREVIEW_MESSAGE.state, nonce)) return false
  if (!isPlainObject(data.payload) || !MODES.has(data.payload.mode)) return false
  if (!isPlainObject(data.payload.draft)) return false
  if (data.payload.selectedTarget !== null && typeof data.payload.selectedTarget !== 'string') return false
  if (data.payload.previewState !== undefined && !PREVIEW_STATES.has(data.payload.previewState)) return false
  try {
    return JSON.stringify(data.payload.draft).length <= 512_000
  } catch {
    return false
  }
}

function commonEnvelope(identity, nonce, type) {
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

/**
 * Installs the preview-only bridge. It returns null for every normal public-page
 * configuration, so no public listener or click interception exists before cutover.
 */
export function installPagePreviewBridge({ initialConfig, onState }) {
  if (typeof window === 'undefined' || window.parent === window) return null
  const identity = resolvePreviewIdentity(initialConfig)
  if (!identity) return null

  let session = null
  let mode = 'readonly'

  const onMessage = (event) => {
    if (event.origin !== identity.controlPlaneOrigin || event.source !== window.parent) return

    if (matchesHello(event.data, identity)) {
      session = { nonce: event.data.nonce, source: event.source, origin: event.origin }
      mode = 'readonly'
      onState({ draft: null, mode, selectedTarget: null, previewState: 'normal' })
      event.source.postMessage({
        ...commonEnvelope(identity, session.nonce, PAGE_PREVIEW_MESSAGE.ready),
        configAuthority: 'control_plane',
      }, event.origin)
      return
    }

    if (!session || event.source !== session.source || event.origin !== session.origin) return
    if (!matchesState(event.data, identity, session.nonce)) return

    mode = event.data.payload.mode
    const { draft, selectedTarget, previewState } = event.data.payload
    onState({ draft, mode, selectedTarget, previewState: previewState ?? 'normal' })

    /* 選ばれたからといって公開ページを勝手に動かさない。利用者が見ている場所を
     * 奪うと、確認したい所を見失う。押した要素はもともと画面に見えている。 */
  }

  const onClick = (event) => {
    if (!session || mode !== 'edit') return
    const target = event.target instanceof Element
      ? event.target.closest('[data-page-setting-target]')
      : null
    if (!target) return

    event.preventDefault()
    event.stopImmediatePropagation()
    /* 押した要素がページの縦のどのあたりにあるかを添える。Control Plane が
     * 設定を上下どちらへ出すかの判断にだけ使う。 */
    const rect = target.getBoundingClientRect()
    const ratio = window.innerHeight > 0
      ? Math.max(0, Math.min(1, (rect.top + rect.height / 2) / window.innerHeight))
      : 0
    session.source.postMessage({
      ...commonEnvelope(identity, session.nonce, PAGE_PREVIEW_MESSAGE.selection),
      target: target.dataset.pageSettingTarget,
      ratio,
    }, session.origin)
  }

  window.addEventListener('message', onMessage)
  document.addEventListener('click', onClick, true)
  return () => {
    window.removeEventListener('message', onMessage)
    document.removeEventListener('click', onClick, true)
  }
}

export const pagePreviewProtocolTest = Object.freeze({
  matchesEnvelope,
  matchesHello,
  matchesState,
  normalizeExactUrl,
})
