import assert from 'node:assert/strict'
import test from 'node:test'
import { createGitHubTenantProvisioner } from '../src/productization/adapters/githubTenantProvisioner.js'
import { createProvisioningState, PROVISIONING_STEPS, resumeProvisioning } from '../src/productization/provisioning.js'
import { deriveOnboardingSteps } from '../src/onboarding/state.js'
import { createLegacyClientPublishAdapter } from '../src/productization/publish.js'

const CONFIG = {
  brand: { name: 'Trial Singer', pageTitle: 'Trial Singer Portal' },
  colors: {
    deepBlue: '#0a1628', oceanTeal: '#1b4965', lightBlue: '#8ab4f8', amber: '#d4a574', accent: '#c1121f',
  },
  sheets: { spreadsheetId: 'demo' },
  platform: { readSource: 'sheets' },
  views: [{ id: 'menu', enabled: true }],
  benefitTiers: [{ key: '5k' }],
  deploy: { repo: 'trial-singer' },
}

test('onboarding completion is derived from config, validation, preview, and verified publish state', () => {
  const model = deriveOnboardingSteps({
    config: CONFIG,
    pathname: '/trial-singer/onboarding.html',
    connection: { status: 'success', checks: [] },
    previewConfirmed: true,
    publishAvailable: true,
    meta: { lastModified: 100, lastPublishedVerified: 101 },
    // 顧客が触る前の状態。特典は変更済み、色は既定のまま。
    baseConfig: { benefitTiers: [{ key: '1k' }], colors: CONFIG.colors },
  })

  assert.equal(model.currentStep, null)
  assert.equal(model.progress, 100)
  // 顧客がやることの無い説明ステップは出さない。
  assert.equal(model.steps.some(step => step.id === 'account_created'), false)
  // 既定の配色のままは「決めた」ではないので、必須にせず任意にする。
  const theme = model.steps.find(step => step.id === 'theme_complete')
  assert.equal(theme.required, false)
  assert.equal(theme.status, 'optional')
  assert.equal(model.steps.find(step => step.id === 'published').status, 'complete')
})

// 既定値のせいで「完了」に見える不具合を4回繰り返した（色・特典・ページ名）。
// 顧客が触る前の状態を渡したら、必須項目がどれも完了にならないことを固定する。
test('defaults shipped with the template are never the customer decision', () => {
  const base = {
    brand: { name: '', pageTitle: 'ColorSing LP - 特典管理' },
    colors: CONFIG.colors,
    benefitTiers: [{ key: '1k' }, { key: '3k' }, { key: '5k' }],
  }
  const untouched = { ...CONFIG, ...base, views: [{ id: 'menu', enabled: true }] }

  const model = deriveOnboardingSteps({
    config: untouched,
    pathname: '/trial-singer/onboarding.html',
    baseConfig: base,
  })
  const status = id => model.steps.find(step => step.id === id).status

  assert.notEqual(status('theme_complete'), 'complete')
  assert.notEqual(status('benefit_structure_complete'), 'complete')
  assert.notEqual(status('basic_profile_complete'), 'complete')

  // 表示名だけでは足りない。ページ名は既定のままなので未完了。
  const namedOnly = deriveOnboardingSteps({
    config: { ...untouched, brand: { ...base.brand, name: '歌う人' } },
    pathname: '/trial-singer/onboarding.html',
    baseConfig: base,
  })
  assert.notEqual(namedOnly.steps.find(step => step.id === 'basic_profile_complete').status, 'complete')

  // 両方を自分で決めたときだけ完了。
  const decided = deriveOnboardingSteps({
    config: { ...untouched, brand: { name: '歌う人', pageTitle: '歌う人の特典ページ' } },
    pathname: '/trial-singer/onboarding.html',
    baseConfig: base,
  })
  assert.equal(decided.steps.find(step => step.id === 'basic_profile_complete').status, 'complete')
})

test('a failed connection cannot be completed by a user-only confirmation', () => {
  const model = deriveOnboardingSteps({
    config: CONFIG,
    pathname: '/trial-singer/onboarding.html',
    connection: { status: 'error', checks: [{ status: 'error' }] },
    previewConfirmed: true,
    publishAvailable: true,
  })

  assert.equal(model.steps.find(step => step.id === 'data_source_connected').status, 'warning')
  assert.equal(model.steps.find(step => step.id === 'publish_ready').status, 'pending')
  assert.equal(model.currentStep.id, 'data_source_connected')
})

test('provisioning resumes after partial failure without repeating completed steps', async () => {
  const counts = Object.fromEntries(PROVISIONING_STEPS.map(step => [step, 0]))
  let failHosting = true
  const adapter = {
    async executeStep(stepId) {
      counts[stepId] += 1
      if (stepId === 'hosting' && failHosting) {
        failHosting = false
        const error = new Error('temporary failure')
        error.code = 'HOSTING_TEMPORARY'
        throw error
      }
      return { resource: `${stepId}:ok` }
    },
  }
  const tenant = { id: 'trial-singer' }
  const initial = createProvisioningState({ tenantId: tenant.id, operationId: 'operation-1' })
  const failed = await resumeProvisioning({ tenant, state: initial, adapter })

  assert.equal(failed.status, 'failed')
  assert.equal(failed.currentStep, 'hosting')
  assert.equal(failed.steps.repository.status, 'complete')
  assert.equal(failed.steps.hosting.attempts, 1)

  const completed = await resumeProvisioning({ tenant, state: failed, adapter })
  assert.equal(completed.status, 'complete')
  assert.equal(completed.steps.hosting.attempts, 2)
  assert.equal(counts.repository, 1)
  assert.equal(counts.template, 1)
  assert.equal(counts.hosting, 2)
  assert.equal(counts.verification, 1)
})

test('GitHub-specific provisioning vocabulary stays behind an injected gateway', async () => {
  const called = []
  const gateway = {
    ensureTenantRecord: async () => called.push('tenant'),
    ensureRepository: async () => called.push('repository'),
    ensureTemplate: async () => called.push('template'),
    ensureCustomerConfig: async () => called.push('config'),
    ensureHosting: async context => { called.push(context.dryRun ? 'hosting:dry-run' : 'hosting') },
    verifyPublishedPortal: async () => called.push('verify'),
  }
  const adapter = createGitHubTenantProvisioner(gateway)
  const tenant = { id: 'trial-singer' }
  const state = createProvisioningState({ tenantId: tenant.id, operationId: 'operation-2' })
  const result = await resumeProvisioning({ tenant, state, adapter, dryRun: true })

  assert.equal(result.status, 'complete')
  assert.deepEqual(called, ['tenant', 'repository', 'template', 'config', 'hosting:dry-run', 'verify'])
})

test('customer-facing publish adapter hides infrastructure errors and requires the legacy capability', async () => {
  const unavailable = createLegacyClientPublishAdapter(async () => {})
  assert.equal(unavailable.canPublish(CONFIG), false)
  assert.equal((await unavailable.publish(CONFIG)).status, 'blocked')

  const configured = {
    ...CONFIG,
    deploy: { owner: 'internal-owner', repo: 'trial-singer', branch: 'main', token: 'secret-not-logged' },
  }
  const failed = createLegacyClientPublishAdapter(async () => {
    throw new Error('GitHub API 403 forbidden')
  })
  const result = await failed.publish(configured)
  assert.equal(result.status, 'failed')
  assert.doesNotMatch(result.message, /GitHub|token|branch|repository/i)
})
