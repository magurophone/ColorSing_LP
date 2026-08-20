import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  PHASES,
  buildPlatformConfig,
  createAdminClient,
  publishPlatformConfig,
  requireImportSuccess,
  requireSecondApplyZero,
  requireSemanticDiffZero,
  requireTenantCreationResult,
  runDbCutoverProof,
  selectCustomer,
  validateCliArguments,
  validateCustomerConfig,
  verifyLivePage,
  waitForPublishedConfig,
} from './lib/existing-customer-rollout.mjs'
import {
  capturePlatformSource,
  readDashboardConfig,
  writeSourceArtifact,
} from './lib/platform-source.mjs'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const repositoryRoot = path.resolve(scriptDirectory, '..')
const customers = JSON.parse(await readFile(
  path.join(scriptDirectory, 'existing-customer-rollout.customers.json'),
  'utf8',
))

validateCliArguments(process.argv.slice(2))

function argument(name, fallback = '') {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] || fallback : fallback
}

function has(name) {
  return process.argv.includes(name)
}

const customerKey = argument('--customer')
const through = argument('--through', 'plan')
const apiBaseUrl = argument('--api-base', 'https://song-list-tool.pages.dev').replace(/\/+$/, '')
const confirmSlug = argument('--confirm')
const execute = has('--execute')
const resume = has('--resume')

if (!customerKey) throw new Error('--customer is required. There is intentionally no --all mode.')
if (![...PHASES, 'rollback'].includes(through)) throw new Error(`--through must be ${[...PHASES, 'rollback'].join(', ')}.`)
const customer = selectCustomer(customers, customerKey)
const mutating = ['stage', 'shadow', 'cutover', 'rollback'].includes(through)
if (mutating && (!execute || confirmSlug !== customer.tenantSlug)) {
  throw new Error(`Mutation requires both --execute and --confirm ${customer.tenantSlug}.`)
}

const outputDirectory = path.join(repositoryRoot, '.local', 'platform-rollout', customer.key)
const runId = new Date().toISOString().replace(/[:.]/g, '-')
const sourcePath = path.join(outputDirectory, `${runId}-source.json`)
const evidencePath = path.join(outputDirectory, `${runId}-result.json`)
const evidence = {
  schemaVersion: 1,
  customer: {
    key: customer.key,
    tenantSlug: customer.tenantSlug,
    publicUrl: customer.publicUrl,
    configUrl: customer.configUrl,
    enabledViews: customer.expectedEnabledViews,
  },
  apiBaseUrl,
  requestedThrough: through,
  resume,
  startedAt: new Date().toISOString(),
  status: 'running',
  steps: [],
}

async function saveEvidence() {
  await mkdir(outputDirectory, { recursive: true })
  await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8')
}

async function record(name, result = {}) {
  evidence.steps.push({ name, completedAt: new Date().toISOString(), ...result })
  await saveEvidence()
}

function counts(result) {
  return {
    sourceHash: result.sourceHash,
    inserted: result.inserted,
    updated: result.updated,
    deleted: result.deleted,
    skipped: result.skipped,
    errors: result.errors,
  }
}

function publicBrowserEvidence(result) {
  return {
    runtime: result.runtime,
    viewHashes: result.viewHashes,
    centralRequests: result.centralRequests,
    centralResponses: result.centralResponses,
    sheetsRequests: result.sheetsRequests,
    errors: result.errors,
  }
}

console.log(JSON.stringify({
  customer: evidence.customer,
  through,
  mutating,
  sequence: through === 'rollback'
    ? ['lp_read_source=sheets', 'browser verify']
    : ['inspect', 'source capture', 'tenant create', 'dry-run', 'apply', 'reapply=0', 'semantic diff=0', 'platform config', 'shadow', 'DB read', 'rollback', 'DB re-switch'].slice(
      0,
      through === 'plan' ? 0 : through === 'inspect' ? 1 : through === 'stage' ? 7 : through === 'shadow' ? 9 : 12,
    ),
}, null, 2))

if (through === 'plan') {
  evidence.status = 'planned-no-network-no-writes'
  evidence.completedAt = new Date().toISOString()
  await saveEvidence()
  console.log(`ROLLOUT_PLAN=OK evidence=${evidencePath}`)
  process.exit(0)
}

let admin
try {
  admin = createAdminClient(apiBaseUrl)
  let config = await readDashboardConfig({ configUrl: customer.configUrl })
  const configState = validateCustomerConfig(customer, config, { allowPlatform: true, publicApiBaseUrl: apiBaseUrl })
  const inspected = await admin.inspect(customer.tenantSlug)
  await record('inspect', {
    tenantExists: inspected.status === 200,
    platformConfigured: configState.isConfigured,
    sheetConnected: true,
  })

  if (through === 'inspect') {
    if (inspected.status !== 404) throw new Error('Tenant is already present; absence check failed.')
    if (configState.isConfigured) throw new Error('Platform config is already present; initial-state check failed.')
    evidence.status = 'completed-read-only'
    evidence.completedAt = new Date().toISOString()
    await saveEvidence()
    console.log(`ROLLOUT_INSPECT=OK tenant=absent evidence=${evidencePath}`)
    process.exit(0)
  }

  if (through === 'rollback') {
    if (!configState.isConfigured) throw new Error('Rollback stopped: platform config is not installed.')
    await admin.settings(customer.tenantSlug, 'sheets', true)
    const rolledBack = await verifyLivePage({
      customer,
      config,
      publicApiBaseUrl: apiBaseUrl,
      expectedRuntime: { lpReadSource: 'sheets', shadowCompareEnabled: true },
    })
    await record('rollback', publicBrowserEvidence(rolledBack))
    evidence.status = 'completed-on-sheets'
    evidence.completedAt = new Date().toISOString()
    await saveEvidence()
    console.log(`ROLLOUT_ROLLBACK=OK evidence=${evidencePath}`)
    process.exit(0)
  }

  if (configState.isConfigured) {
    if (!resume) throw new Error('Platform config already exists. Review prior evidence and rerun with --resume only if it belongs to this rollout.')
  }
  if (inspected.status === 200 && !resume) {
    throw new Error('Tenant already exists. Review prior evidence and rerun with --resume only if it belongs to this rollout.')
  }
  if (inspected.status === 404 && configState.isConfigured) {
    throw new Error('Tenant/config state is inconsistent; automatic rollout stopped.')
  }
  if (inspected.status === 200 && inspected.payload?.settings?.lp_read_source === 'db') {
    throw new Error('Automatic stage stopped: tenant is already reading DB. Roll back explicitly before retrying.')
  }

  const baseline = await verifyLivePage({
    customer,
    config,
    publicApiBaseUrl: apiBaseUrl,
    expectedRuntime: configState.isConfigured
      ? { lpReadSource: 'sheets', shadowCompareEnabled: true }
      : null,
  })
  await record('browser-baseline', publicBrowserEvidence(baseline))

  const artifact = await capturePlatformSource(config)
  await writeSourceArtifact(sourcePath, artifact)
  await record('source-capture', {
    sourceHash: artifact.sourceHash,
    rows: Object.values(artifact.source).reduce((sum, rows) => sum + rows.length, 0),
    localArtifact: path.relative(repositoryRoot, sourcePath),
  })

  const created = await admin.createLegacyTenant(customer.displayName, customer.tenantSlug)
  const createdPayload = requireTenantCreationResult(created, customer)
  await record('tenant-create', {
    created: createdPayload.created,
    tenantId: createdPayload.tenant.id,
    tenantSlug: createdPayload.tenant.slug,
    settings: createdPayload.settings,
  })

  const dryRun = await admin.importSource(customer.tenantSlug, 'dry_run', artifact.source)
  requireImportSuccess(dryRun, 'dry-run')
  await record('dry-run', counts(dryRun))

  const apply = await admin.importSource(customer.tenantSlug, 'apply', artifact.source)
  requireImportSuccess(apply, 'apply')
  await record('apply', counts(apply))

  const reapply = await admin.importSource(customer.tenantSlug, 'apply', artifact.source)
  requireSecondApplyZero(reapply)
  await record('reapply', counts(reapply))

  const diff = await admin.diff(customer.tenantSlug, artifact.source)
  requireSemanticDiffZero(diff)
  await record('semantic-diff', {
    equal: diff.equal,
    differenceCount: diff.differences.length,
    sheetSourceHash: diff.sheetSourceHash,
    dbSourceHash: diff.dbSourceHash,
    sheetHash: diff.sheetHash,
    dbHash: diff.dbHash,
    runId: diff.runId,
  })

  if (through === 'stage') {
    evidence.status = 'completed-staged-sheets-shadow-off'
    evidence.completedAt = new Date().toISOString()
    await saveEvidence()
    console.log(`ROLLOUT_STAGE=OK evidence=${evidencePath}`)
    process.exit(0)
  }

  const nextConfig = configState.isConfigured ? config : buildPlatformConfig(config, customer, apiBaseUrl)
  await admin.settings(customer.tenantSlug, 'sheets', true)
  if (!configState.isConfigured) {
    await publishPlatformConfig(nextConfig, customer, process.env.ROLLOUT_GITHUB_TOKEN)
    config = await waitForPublishedConfig(customer, nextConfig)
  }
  validateCustomerConfig(customer, config, { allowPlatform: true, publicApiBaseUrl: apiBaseUrl })
  await record('platform-config', {
    tenantSlug: config.platform.tenantSlug,
    publicApiBaseUrl: config.platform.publicApiBaseUrl,
    readSource: config.platform.readSource,
    shadowCompareEnabled: config.platform.shadowCompareEnabled,
    useRuntimeConfig: config.platform.useRuntimeConfig,
  })

  const shadow = await verifyLivePage({
    customer,
    config,
    publicApiBaseUrl: apiBaseUrl,
    expectedRuntime: { lpReadSource: 'sheets', shadowCompareEnabled: true },
    expectedHashes: baseline.viewHashes,
  })
  await record('shadow-browser', publicBrowserEvidence(shadow))

  if (through === 'shadow') {
    evidence.status = 'completed-on-sheets-shadow-on'
    evidence.completedAt = new Date().toISOString()
    await saveEvidence()
    console.log(`ROLLOUT_SHADOW=OK evidence=${evidencePath}`)
    process.exit(0)
  }

  await runDbCutoverProof({
    setSource: source => admin.settings(customer.tenantSlug, source, true),
    verifyDb: async stage => {
      const result = await verifyLivePage({
        customer,
        config,
        publicApiBaseUrl: apiBaseUrl,
        expectedRuntime: { lpReadSource: 'db', shadowCompareEnabled: true },
        expectedHashes: shadow.viewHashes,
      })
      await record(stage === 'first' ? 'db-read-first' : 'db-read-final', publicBrowserEvidence(result))
      return result
    },
    verifySheets: async () => {
      const result = await verifyLivePage({
        customer,
        config,
        publicApiBaseUrl: apiBaseUrl,
        expectedRuntime: { lpReadSource: 'sheets', shadowCompareEnabled: true },
        expectedHashes: shadow.viewHashes,
      })
      await record('rollback-proof', publicBrowserEvidence(result))
      return result
    },
    onAutomaticRollback: error => record('automatic-rollback-after-failure', { reason: error.message }),
  })

  evidence.status = 'completed-on-db-after-rollback-proof'
  evidence.completedAt = new Date().toISOString()
  await saveEvidence()
  console.log(`ROLLOUT_CUTOVER=OK evidence=${evidencePath}`)
} catch (error) {
  evidence.status = 'stopped'
  evidence.stoppedAt = new Date().toISOString()
  evidence.stopReason = error.message
  await saveEvidence()
  console.error(`ROLLOUT_STOPPED=${error.message}`)
  console.error(`evidence=${evidencePath}`)
  process.exitCode = 1
}
