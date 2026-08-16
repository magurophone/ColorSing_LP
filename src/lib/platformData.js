function buildApiUrl(baseUrl, path, tenantSlug) {
  const normalizedBase = String(baseUrl || '').trim().replace(/\/+$/, '')
  const normalizedTenant = String(tenantSlug || '').trim()
  if (!normalizedBase || !normalizedTenant) return ''
  const url = new URL(`${normalizedBase}${path}`)
  url.searchParams.set('tenant', normalizedTenant)
  return url.toString()
}

export async function resolveLpRuntime(platformConfig = {}) {
  const fallback = {
    lpReadSource: platformConfig.readSource === 'db' ? 'db' : 'sheets',
    shadowCompareEnabled: platformConfig.shadowCompareEnabled === true,
    resolvedFromServer: false,
  }
  const baseUrl = String(platformConfig.publicApiBaseUrl || '').trim()
  const tenantSlug = String(platformConfig.tenantSlug || '').trim()
  if (!baseUrl || !tenantSlug || platformConfig.useRuntimeConfig === false) return fallback

  try {
    const response = await fetch(buildApiUrl(
      baseUrl,
      '/api/public/v1/runtime-config',
      platformConfig.tenantSlug,
    ), { headers: { Accept: 'application/json' }, cache: 'no-store' })
    if (!response.ok) return fallback
    const data = await response.json()
    return {
      lpReadSource: data.lpReadSource === 'db' ? 'db' : 'sheets',
      shadowCompareEnabled: data.shadowCompareEnabled === true,
      resolvedFromServer: true,
    }
  } catch {
    return fallback
  }
}

export async function fetchDatabaseLpData(platformConfig = {}) {
  const url = buildApiUrl(
    platformConfig.publicApiBaseUrl,
    '/api/public/v1/lp-data',
    platformConfig.tenantSlug,
  )
  if (!url) throw new Error('Public LP API is not configured')
  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Public LP API error: ${response.status}`)
  const payload = await response.json()
  if (!payload?.data || typeof payload.data !== 'object') {
    throw new Error('Public LP API returned an invalid payload')
  }
  return payload.data
}

export function countSemanticDifferences(left, right, limit = 500) {
  let count = 0
  function visit(a, b) {
    if (count >= limit || Object.is(a, b)) return
    const aArray = Array.isArray(a)
    const bArray = Array.isArray(b)
    if (aArray || bArray) {
      if (!aArray || !bArray) {
        count += 1
        return
      }
      if (a.length !== b.length) count += 1
      for (let index = 0; index < Math.max(a.length, b.length); index += 1) visit(a[index], b[index])
      return
    }
    const aObject = a !== null && typeof a === 'object'
    const bObject = b !== null && typeof b === 'object'
    if (aObject || bObject) {
      if (!aObject || !bObject) {
        count += 1
        return
      }
      for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) visit(a[key], b[key])
      return
    }
    count += 1
  }
  visit(left, right)
  return count
}
