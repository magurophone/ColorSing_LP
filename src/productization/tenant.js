function pathTenant(pathname = '') {
  const segment = String(pathname).split('/').filter(Boolean)[0] || ''
  return segment && !/\.html$/i.test(segment) ? segment : ''
}
export function resolveTenantSlug(config = {}, pathname = '') {
  return String(
    config.platform?.tenantSlug
    || config.deploy?.repo
    || pathTenant(pathname)
    || '',
  ).trim()
}

export function createTenantSnapshot({ config = {}, pathname = '', meta = {} } = {}) {
  const slug = resolveTenantSlug(config, pathname)
  return {
    id: slug,
    slug,
    displayName: String(config.brand?.name || '').trim(),
    dataSource: config.platform?.readSource === 'db' ? 'central' : 'google-sheets',
    publishedUrl: slug ? `https://colorsing-dashboard.github.io/${slug}/` : '',
    lastModified: meta.lastModified || null,
    lastPublished: meta.lastDeployed || null,
  }
}
