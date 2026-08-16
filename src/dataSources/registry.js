import { resolveLpRuntime } from '../lib/platformData'
import { createCentralDataSource } from './centralDataSource'
import { createGoogleSheetsDataSource } from './googleSheetsDataSource'

export async function resolvePortalDataSources({ sheetsConfig, platformConfig }) {
  const runtime = await resolveLpRuntime(platformConfig)
  const sheets = createGoogleSheetsDataSource(sheetsConfig)
  const central = createCentralDataSource(platformConfig)

  return {
    active: runtime.lpReadSource === 'db' ? central : sheets,
    fallback: runtime.lpReadSource === 'db' ? sheets : null,
    shadow: runtime.lpReadSource === 'sheets' && runtime.shadowCompareEnabled ? central : null,
    runtime,
  }
}
