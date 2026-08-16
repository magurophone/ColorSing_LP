const STEP_METHODS = Object.freeze({
  tenant_record: 'ensureTenantRecord',
  repository: 'ensureRepository',
  template: 'ensureTemplate',
  customer_config: 'ensureCustomerConfig',
  hosting: 'ensureHosting',
  verification: 'verifyPublishedPortal',
})

export function createGitHubTenantProvisioner(gateway) {
  return {
    id: 'github-tenant-provisioner',
    async executeStep(stepId, context) {
      const method = STEP_METHODS[stepId]
      if (!method || typeof gateway?.[method] !== 'function') {
        const error = new Error(`Provisioning capability is unavailable for ${stepId}`)
        error.code = 'CAPABILITY_UNAVAILABLE'
        throw error
      }
      return gateway[method](context)
    },
  }
}
