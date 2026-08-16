import { fetchDatabaseLpData } from '../lib/platformData'

export function createCentralDataSource(platformConfig = {}) {
  return {
    id: 'central',
    async loadPortalData() {
      return fetchDatabaseLpData(platformConfig)
    },
    async loadIcons() {
      const data = await fetchDatabaseLpData(platformConfig)
      return data.icons || {}
    },
  }
}
