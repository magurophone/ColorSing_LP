export const PROVISIONING_STEPS = Object.freeze([
  'tenant_record',
  'repository',
  'template',
  'customer_config',
  'hosting',
  'verification',
])

export function createProvisioningState({ tenantId, operationId }) {
  if (!tenantId || !operationId) throw new Error('tenantId and operationId are required')
  return {
    version: 1,
    tenantId,
    operationId,
    status: 'pending',
    currentStep: null,
    steps: Object.fromEntries(PROVISIONING_STEPS.map(id => [id, {
      status: 'pending',
      attempts: 0,
      resource: null,
      errorCode: null,
    }])),
    audit: [],
  }
}
function event(type, stepId, detail = {}) {
  return { type, stepId, at: new Date().toISOString(), ...detail }
}

export async function resumeProvisioning({ tenant, state, adapter, dryRun = false, onEvent = () => {} }) {
  if (!tenant?.id) throw new Error('tenant.id is required')
  if (!state || state.tenantId !== tenant.id) throw new Error('Provisioning state does not match the tenant')
  if (!adapter || typeof adapter.executeStep !== 'function') throw new Error('A provisioning adapter is required')

  let next = structuredClone(state)
  next.status = 'in_progress'

  for (const stepId of PROVISIONING_STEPS) {
    if (next.steps[stepId].status === 'complete') continue

    next.currentStep = stepId
    next.steps[stepId].status = 'in_progress'
    next.steps[stepId].attempts += 1
    const started = event('step_started', stepId, { dryRun })
    next.audit.push(started)
    onEvent(started)

    try {
      const result = await adapter.executeStep(stepId, {
        tenant,
        operationId: next.operationId,
        completedSteps: Object.entries(next.steps)
          .filter(([, value]) => value.status === 'complete')
          .map(([id]) => id),
        dryRun,
      })
      next.steps[stepId] = {
        ...next.steps[stepId],
        status: 'complete',
        resource: result?.resource || next.steps[stepId].resource,
        errorCode: null,
      }
      const completed = event('step_completed', stepId, { dryRun })
      next.audit.push(completed)
      onEvent(completed)
    } catch (error) {
      const errorCode = String(error?.code || 'STEP_FAILED')
      next.steps[stepId] = {
        ...next.steps[stepId],
        status: 'failed',
        errorCode,
      }
      next.status = 'failed'
      const failed = event('step_failed', stepId, { dryRun, errorCode })
      next.audit.push(failed)
      onEvent(failed)
      return next
    }
  }

  next.status = 'complete'
  next.currentStep = null
  return next
}
