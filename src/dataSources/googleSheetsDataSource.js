import { DEMO_BENEFITS, DEMO_EVENTS, DEMO_GOALS, DEMO_HISTORY, DEMO_ICONS, DEMO_RANKING, DEMO_RIGHTS } from '../lib/demoData'
import { normalizePrimaryLpData } from '../lib/lpCompatibility'
import { fetchEventData, fetchHistoryData, fetchIconData, fetchSheetData } from '../lib/sheets'

function demoViewModel() {
  return {
    ranking: DEMO_RANKING,
    goals: DEMO_GOALS,
    benefits: DEMO_BENEFITS,
    rights: DEMO_RIGHTS,
    specialIndex: 8,
    history: DEMO_HISTORY,
    events: DEMO_EVENTS,
    icons: DEMO_ICONS,
  }
}
// 未設定は障害ではない。まだシートを作っていない、まだ登録していない、という
// 正常な途中の状態である。設定済みなのに取れなかったときだけが本当の障害なので、
// 呼ぶ側が二つを区別できるようにする。
export const NOT_CONFIGURED = 'not_configured'

function notConfiguredError(message) {
  const error = new Error(message)
  error.code = NOT_CONFIGURED
  return error
}

export function createGoogleSheetsDataSource(sheetsConfig = {}) {
  const ranges = sheetsConfig.ranges || {}

  return {
    id: 'google-sheets',
    async loadPortalData() {
      if (sheetsConfig.spreadsheetId === 'demo') return demoViewModel()
      if (!sheetsConfig.spreadsheetId) {
        throw notConfiguredError('スプレッドシートIDが設定されていません。管理画面（admin.html）から設定してください。')
      }

      const [rankingData, goalsData, benefitsData, rawRightsData, historyData, eventData] = await Promise.all([
        fetchSheetData(sheetsConfig.spreadsheetId, sheetsConfig.rankingSheetName, ranges.ranking),
        fetchSheetData(sheetsConfig.spreadsheetId, sheetsConfig.rankingSheetName, ranges.goals),
        fetchSheetData(sheetsConfig.spreadsheetId, sheetsConfig.benefitsContentSheetName, ranges.benefits),
        fetchSheetData(sheetsConfig.spreadsheetId, sheetsConfig.benefitsSheetName, null, 3, { allRows: true }),
        sheetsConfig.historySheetName
          ? fetchHistoryData(sheetsConfig.spreadsheetId, sheetsConfig.historySheetName, 'A3:D').catch(() => [])
          : Promise.resolve([]),
        sheetsConfig.eventSheetName
          ? fetchEventData(sheetsConfig.spreadsheetId, sheetsConfig.eventSheetName).catch(() => null)
          : Promise.resolve(null),
      ])

      return {
        ...normalizePrimaryLpData({ rankingData, goalsData, benefitsData, rawRightsData }),
        history: historyData || [],
        events: eventData ?? null,
      }
    },
    async loadIcons() {
      if (sheetsConfig.spreadsheetId === 'demo') return DEMO_ICONS
      if (!sheetsConfig.spreadsheetId) return {}
      return fetchIconData(sheetsConfig.spreadsheetId, sheetsConfig.iconSheetName)
    },
  }
}
