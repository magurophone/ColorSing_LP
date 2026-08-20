import { createHash } from 'node:crypto'
import { chromium } from 'playwright'
import { deployConfigToGitHub } from '../../src/lib/github.js'
import { parseDashboardConfig, stableSerialize } from './platform-source.mjs'

export const PHASES = ['plan', 'inspect', 'stage', 'shadow', 'cutover']

export function validateCliArguments(args) {
  const valueOptions = new Set(['--customer', '--through', '--api-base', '--confirm'])
  const booleanOptions = new Set(['--execute', '--resume'])
  for (let index = 0; index < args.length; index += 1) {
    const option = args[index]
    if (booleanOptions.has(option)) continue
    if (!valueOptions.has(option)) {
      throw new Error(`Unknown argument: ${option}. The rollout has no batch/all mode.`)
    }
    const value = args[index + 1]
    if (!value || value.startsWith('--')) throw new Error(`${option} requires a value.`)
    index += 1
  }
}

export function selectCustomer(customers, key) {
  const customer = customers.find(item => item.key === key)
  if (!customer) throw new Error(`Unknown customer: ${key}. The rollout has no batch/all mode.`)
  return customer
}

export function enabledViewIds(config) {
  return (config.views || []).filter(view => view.enabled).map(view => view.id)
}

export function validateCustomerConfig(customer, config, { allowPlatform = false, publicApiBaseUrl = '' } = {}) {
  const actualViews = enabledViewIds(config)
  if (stableSerialize(actualViews) !== stableSerialize(customer.expectedEnabledViews)) {
    throw new Error(`Enabled views changed: expected=${customer.expectedEnabledViews.join(',')} actual=${actualViews.join(',')}`)
  }
  if (!config.sheets?.spreadsheetId || config.sheets.spreadsheetId === 'demo') {
    throw new Error('Source fetch stopped: Sheets is not connected.')
  }
  if (config.brand?.name !== customer.displayName) {
    throw new Error(`Display name changed for ${customer.key}; review the manifest before creating a tenant.`)
  }
  const deploy = config.deploy || {}
  if (deploy.owner !== 'colorsing-dashboard' || deploy.repo !== customer.repo || deploy.branch !== customer.branch) {
    throw new Error('Published config target no longer matches the rollout manifest.')
  }
  const platform = config.platform || {}
  const isConfigured = Boolean(platform.tenantSlug || platform.publicApiBaseUrl)
  if (!allowPlatform && isConfigured) throw new Error('Platform config already exists; automatic first-stage rollout stopped.')
  if (allowPlatform && isConfigured && (
    platform.tenantSlug !== customer.tenantSlug
    || (publicApiBaseUrl && platform.publicApiBaseUrl?.replace(/\/+$/, '') !== publicApiBaseUrl.replace(/\/+$/, ''))
    || platform.readSource !== 'sheets'
    || platform.shadowCompareEnabled !== true
    || platform.useRuntimeConfig !== true
  )) {
    throw new Error('Published platform config does not match the protected rollout settings.')
  }
  return { actualViews, isConfigured }
}

export function buildPlatformConfig(config, customer, publicApiBaseUrl) {
  return {
    ...config,
    platform: {
      ...(config.platform || {}),
      tenantSlug: customer.tenantSlug,
      publicApiBaseUrl: publicApiBaseUrl.replace(/\/+$/, ''),
      readSource: 'sheets',
      shadowCompareEnabled: true,
      useRuntimeConfig: true,
    },
  }
}

export function requireImportSuccess(result, label) {
  const countKeys = ['inserted', 'updated', 'deleted', 'skipped', 'errors']
  for (const key of countKeys) {
    if (!Number.isInteger(result?.[key]) || result[key] < 0) {
      throw new Error(`${label} stopped: invalid ${key}=${String(result?.[key])}`)
    }
  }
  if (!/^[a-f0-9]{64}$/i.test(result?.sourceHash || '')) {
    throw new Error(`${label} stopped: invalid sourceHash`)
  }
  if (result.errors !== 0) throw new Error(`${label} stopped: errors=${result.errors}`)
}

export function requireSecondApplyZero(result) {
  requireImportSuccess(result, 'second apply')
  const counts = ['inserted', 'updated', 'deleted'].map(key => Number(result?.[key] ?? -1))
  if (counts.some(value => value !== 0)) {
    throw new Error(`second apply stopped: inserted=${result.inserted} updated=${result.updated} deleted=${result.deleted}`)
  }
}

export function requireSemanticDiffZero(result) {
  const differenceCount = Array.isArray(result?.differences)
    ? result.differences.length
    : Number(result?.differenceCount ?? -1)
  if (result?.equal !== true || differenceCount !== 0) {
    throw new Error(`semantic diff stopped: equal=${String(result?.equal)} differences=${differenceCount}`)
  }
}

export function requireTenantCreationResult(result, customer) {
  if (![200, 201].includes(result?.status)) {
    throw new Error(`tenant creation stopped: unexpected HTTP ${String(result?.status)}`)
  }
  const payload = result?.payload
  if (typeof payload?.created !== 'boolean') throw new Error('tenant creation stopped: created is invalid.')
  if (!payload.tenant?.id || payload.tenant.slug !== customer.tenantSlug) {
    throw new Error(`tenant creation stopped: tenant slug must be ${customer.tenantSlug}.`)
  }
  if (payload.tenant.displayName !== customer.displayName) {
    throw new Error(`tenant creation stopped: display name must be ${customer.displayName}.`)
  }
  const settings = payload.settings
  if (!['sheets', 'db'].includes(settings?.lpReadSource) || typeof settings?.shadowCompareEnabled !== 'boolean') {
    throw new Error('tenant creation stopped: runtime settings are invalid.')
  }
  if (payload.created && (result.status !== 201 || settings.lpReadSource !== 'sheets' || settings.shadowCompareEnabled !== false)) {
    throw new Error('tenant creation stopped: a new tenant must start with sheets / shadow=false.')
  }
  if (!payload.created && result.status !== 200) {
    throw new Error('tenant creation stopped: an existing tenant must return HTTP 200.')
  }
  return payload
}

export function validatePublicLpPayload(payload, expectedTenant) {
  const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value)
  if (payload?.version !== 1) throw new Error('lp-data DTO version is invalid.')
  if (payload?.tenant !== expectedTenant) throw new Error(`lp-data DTO tenant must be ${expectedTenant}.`)
  if (payload?.source !== 'db') throw new Error('lp-data DTO source must be db.')
  if (!isObject(payload.data)) throw new Error('lp-data DTO data is invalid.')
  for (const key of ['ranking', 'goals', 'benefits', 'rights', 'history']) {
    if (!Array.isArray(payload.data[key])) throw new Error(`lp-data DTO ${key} is invalid.`)
  }
  if (!Number.isInteger(payload.data.specialIndex)) throw new Error('lp-data DTO specialIndex is invalid.')
  if (!isObject(payload.data.events)) throw new Error('lp-data DTO events is invalid.')
  if (!isObject(payload.data.icons)) throw new Error('lp-data DTO icons is invalid.')
  return payload
}

export async function runDbCutoverProof({ setSource, verifyDb, verifySheets, onAutomaticRollback = async () => {} }) {
  let dbSwitchAttempted = false
  try {
    dbSwitchAttempted = true
    await setSource('db')
    const firstDb = await verifyDb('first')

    await setSource('sheets')
    const rollback = await verifySheets()

    dbSwitchAttempted = true
    await setSource('db')
    const secondDb = await verifyDb('final')
    return { firstDb, rollback, secondDb }
  } catch (error) {
    if (dbSwitchAttempted) {
      try {
        await setSource('sheets')
        await onAutomaticRollback(error)
      } catch (rollbackError) {
        throw new Error(
          `DB read verification failed (${error.message}); automatic Sheets rollback also failed (${rollbackError.message}).`,
          { cause: error },
        )
      }
    }
    throw error
  }
}

export function createAdminClient(baseUrl, environment = process.env) {
  const endpoint = baseUrl.replace(/\/+$/, '')
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' }
  if (environment.SLT_ADMIN_COOKIE) headers.Cookie = environment.SLT_ADMIN_COOKIE
  if (environment.CF_ACCESS_CLIENT_ID && environment.CF_ACCESS_CLIENT_SECRET) {
    headers['CF-Access-Client-Id'] = environment.CF_ACCESS_CLIENT_ID
    headers['CF-Access-Client-Secret'] = environment.CF_ACCESS_CLIENT_SECRET
  }
  if (!headers.Cookie && !headers['CF-Access-Client-Id']) {
    throw new Error('Admin authentication is required (SLT_ADMIN_COOKIE or Cloudflare Access service token).')
  }

  async function request(path, { method = 'GET', body, allowStatus = [] } = {}) {
    const response = await fetch(`${endpoint}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const payload = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
    if (!response.ok && !allowStatus.includes(response.status)) {
      throw new Error(payload.error || `Admin API failed: HTTP ${response.status}`)
    }
    return { status: response.status, payload }
  }

  return {
    inspect: tenant => request(`/api/admin/lp-status?tenant=${encodeURIComponent(tenant)}`, { allowStatus: [404] }),
    createLegacyTenant: (displayName, publicAddress) => request('/api/admin/legacy-tenants', {
      method: 'POST', body: { displayName, publicAddress },
    }),
    importSource: (tenant, mode, source) => request('/api/admin/lp-import', {
      method: 'POST', body: { tenant, mode, source },
    }).then(result => result.payload),
    diff: (tenant, source) => request('/api/admin/lp-diff', {
      method: 'POST', body: { tenant, source, record: true },
    }).then(result => result.payload),
    settings: (tenant, lpReadSource, shadowCompareEnabled = true) => request('/api/admin/lp-status', {
      method: 'PUT', body: { tenant, lpReadSource, shadowCompareEnabled },
    }).then(result => result.payload),
  }
}

function hashText(text) {
  return createHash('sha256').update(text).digest('hex')
}

function normalizeVisibleText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim()
}

function isPlatformRequest(url, publicApiBaseUrl) {
  return url.startsWith(publicApiBaseUrl.replace(/\/+$/, ''))
    && (/\/api\/public\/v1\/(runtime-config|lp-data)/).test(url)
}

function isSheetsRequest(url) {
  return url.startsWith('https://docs.google.com/spreadsheets/')
}

export async function clickConfiguredView(page, view) {
  const buttons = page.getByRole('button', { name: view.label, exact: true })
  for (let index = 0; index < await buttons.count(); index += 1) {
    const button = buttons.nth(index)
    if (await button.isVisible()) {
      await button.click()
      return
    }
  }
  throw new Error(`Enabled view button was not found: ${view.id} (${view.label}).`)
}

async function waitUntil(predicate, timeoutMs, message) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    if (await predicate()) return
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error(message)
}

export async function verifyLivePage({
  customer,
  config,
  publicApiBaseUrl,
  expectedRuntime = null,
  expectedHashes = null,
}) {
  const browser = await chromium.launch({ headless: true })
  const results = { runtime: {}, viewHashes: {}, centralRequests: 0, centralResponses: 0, sheetsRequests: 0, errors: [] }
  try {
    for (const viewport of [
      { name: 'desktop', width: 1440, height: 1000, isMobile: false },
      { name: 'mobile', width: 390, height: 844, isMobile: true },
    ]) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        isMobile: viewport.isMobile,
      })
      const page = await context.newPage()
      const localErrors = []
      let runtime = null
      let centralRequests = 0
      let centralResponses = 0
      let sheetsRequests = 0

      page.on('console', message => {
        const text = message.text()
        // Sheets fetchは3回retryする。途中のtimeoutは最終失敗ではないため、3回目か
        // アプリ側の最終errorだけをstop条件にする。
        if (/Error fetching .+\(attempt [12]\/3\)/.test(text)) return
        if (message.type() === 'error' || /semantic differences|DB read failed/i.test(text)) {
          localErrors.push(`console:${message.type()}:${text}`)
        }
      })
      page.on('pageerror', error => localErrors.push(`pageerror:${error.message}`))
      page.on('request', request => {
        const url = request.url()
        if (/\/api\/public\/v1\/lp-data/.test(url) && isPlatformRequest(url, publicApiBaseUrl)) centralRequests += 1
        if (isSheetsRequest(url)) sheetsRequests += 1
      })
      page.on('requestfailed', request => {
        const url = request.url()
        // Sheetsは内部retry後のconsole attempt 3/3で最終失敗を判定する。
        if (isPlatformRequest(url, publicApiBaseUrl)) {
          localErrors.push(`requestfailed:${url}:${request.failure()?.errorText || 'unknown'}`)
        }
      })
      page.on('response', async response => {
        const url = response.url()
        if ((isPlatformRequest(url, publicApiBaseUrl) || isSheetsRequest(url)) && !response.ok()) {
          localErrors.push(`http:${response.status()}:${url}`)
        }
        if (/\/api\/public\/v1\/lp-data/.test(url) && isPlatformRequest(url, publicApiBaseUrl) && response.ok()) {
          try {
            validatePublicLpPayload(await response.json(), customer.tenantSlug)
          } catch (error) {
            localErrors.push(`dto:${error.message}`)
          } finally {
            centralResponses += 1
          }
        }
        if (/\/api\/public\/v1\/runtime-config/.test(url) && isPlatformRequest(url, publicApiBaseUrl)) {
          runtime = await response.json().catch(() => null)
        }
      })

      await page.goto(customer.publicUrl, { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('.md\\:ml-64 .max-w-7xl', { timeout: 30_000 })

      if (expectedRuntime) {
        await waitUntil(() => runtime !== null, 15_000, 'runtime-config did not fire.')
        if (
          runtime.tenant !== customer.tenantSlug
          || runtime.lpReadSource !== expectedRuntime.lpReadSource
          || runtime.shadowCompareEnabled !== expectedRuntime.shadowCompareEnabled
        ) {
          localErrors.push(`runtime:mismatch:${JSON.stringify(runtime)}`)
        }
        await waitUntil(() => centralRequests > 0, 15_000, 'lp-data did not fire.')
        await waitUntil(() => centralResponses > 0, 15_000, 'lp-data did not complete successfully.')
        await page.waitForTimeout(100)
      }

      for (const view of (config.views || []).filter(item => item.enabled)) {
        const sheetsBefore = sheetsRequests
        await clickConfiguredView(page, view)
        if (view.id === 'icons' && expectedRuntime?.lpReadSource === 'sheets') {
          await waitUntil(
            () => sheetsRequests > sheetsBefore,
            15_000,
            'icons delayed Sheets load did not fire.',
          ).catch(error => localErrors.push(`icons:${error.message}`))
        }
        await page.waitForTimeout(view.id === 'icons' ? 500 : 250)
        const text = await page.locator('.md\\:ml-64 .max-w-7xl').innerText()
        const key = `${viewport.name}:${view.id}`
        const digest = hashText(normalizeVisibleText(text))
        results.viewHashes[key] = digest
        if (expectedHashes?.[key] && expectedHashes[key] !== digest) {
          localErrors.push(`rendered-content-changed:${key}`)
        }
      }

      if (expectedRuntime?.lpReadSource === 'db' && sheetsRequests > 0) {
        localErrors.push(`active-source-not-db:sheets-requests=${sheetsRequests}`)
      }
      if (expectedRuntime?.lpReadSource === 'sheets' && sheetsRequests === 0) {
        localErrors.push('active-source-not-sheets:no-sheets-request')
      }
      results.runtime[viewport.name] = runtime
      results.centralRequests += centralRequests
      results.centralResponses += centralResponses
      results.sheetsRequests += sheetsRequests
      results.errors.push(...localErrors.map(error => `${viewport.name}:${error}`))
      await context.close()
    }
  } finally {
    await browser.close()
  }
  if (results.errors.length > 0) throw new Error(`browser verification stopped: ${results.errors.join(' | ')}`)
  return results
}

export async function waitForPublishedConfig(customer, expectedConfig, timeoutMs = 300_000) {
  const expectedPlatform = stableSerialize(expectedConfig.platform)
  let lastError = ''
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      const url = new URL(customer.configUrl)
      url.searchParams.set('rollout_verify', Date.now())
      const response = await fetch(url, { cache: 'no-store' })
      if (response.ok) {
        const config = parseDashboardConfig(await response.text())
        if (stableSerialize(config.platform) === expectedPlatform) return config
        lastError = 'platform config has not propagated yet'
      } else {
        lastError = `HTTP ${response.status}`
      }
    } catch (error) {
      lastError = error.message
    }
    await new Promise(resolve => setTimeout(resolve, 5000))
  }
  throw new Error(`Published config verification timed out: ${lastError}`)
}

export async function publishPlatformConfig(config, customer, token) {
  if (!token) throw new Error('ROLLOUT_GITHUB_TOKEN is required to publish platform config.')
  await deployConfigToGitHub(config, {
    owner: 'colorsing-dashboard',
    repo: customer.repo,
    branch: customer.branch,
    token,
  })
}
