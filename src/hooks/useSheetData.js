import { useState, useEffect, useCallback, useRef } from 'react'
import { createGoogleSheetsDataSource } from '../dataSources/googleSheetsDataSource'
import { resolvePortalDataSources } from '../dataSources/registry'
import { countSemanticDifferences } from '../lib/platformData'

export function usePortalData(sheetsConfig, platformConfig = {}) {
  const [ranking, setRanking] = useState([])
  const [goals, setGoals] = useState([])
  const [rights, setRights] = useState([])
  const [specialIndex, setSpecialIndex] = useState(8)
  const [benefits, setBenefits] = useState([])
  const [history, setHistory] = useState([])
  const [events, setEvents] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)

  // アイコン関連
  const [icons, setIcons] = useState({})
  const [loadingIcons, setLoadingIcons] = useState(false)
  const loadingIconsRef = useRef(false)
  const [iconError, setIconError] = useState(null)
  const iconsLoadedRef = useRef(false)
  const activeSourceRef = useRef('google-sheets')
  const shadowDatabaseDataRef = useRef(null)

  const { spreadsheetId, rankingSheetName, benefitsSheetName, benefitsContentSheetName, historySheetName, iconSheetName, eventSheetName, ranges, refreshIntervalMs } = sheetsConfig
  // rangesオブジェクトを個別の文字列に分解して安定した依存関係にする
  const rankingRange = ranges.ranking
  const goalsRange = ranges.goals
  const benefitsRange = ranges.benefits
  const publicApiBaseUrl = platformConfig.publicApiBaseUrl || ''
  const tenantSlug = platformConfig.tenantSlug || ''
  const configuredReadSource = platformConfig.readSource === 'db' ? 'db' : 'sheets'
  const configuredShadow = platformConfig.shadowCompareEnabled === true
  const useRuntimeConfig = platformConfig.useRuntimeConfig !== false

  const applyViewModel = useCallback((data, includeIcons = false) => {
    setRanking(data.ranking || [])
    setGoals(data.goals || [])
    setBenefits(data.benefits || [])
    setRights(data.rights || [])
    setSpecialIndex(Number.isInteger(data.specialIndex) ? data.specialIndex : 8)
    setHistory(data.history || [])
    setEvents(data.events ?? null)
    if (includeIcons) {
      setIcons(data.icons || {})
      iconsLoadedRef.current = true
      setIconError(null)
    }
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const sources = await resolvePortalDataSources({
        sheetsConfig: {
          spreadsheetId,
          rankingSheetName,
          benefitsSheetName,
          benefitsContentSheetName,
          historySheetName,
          iconSheetName,
          eventSheetName,
          ranges: { ranking: rankingRange, goals: goalsRange, benefits: benefitsRange },
        },
        platformConfig: {
          publicApiBaseUrl,
          tenantSlug,
          readSource: configuredReadSource,
          shadowCompareEnabled: configuredShadow,
          useRuntimeConfig,
        },
      })

      if (sources.active.id === 'central') {
        try {
          const databaseData = await sources.active.loadPortalData()
          applyViewModel(databaseData, true)
          activeSourceRef.current = 'central'
          shadowDatabaseDataRef.current = databaseData
        } catch (databaseError) {
          console.warn('DB read failed; continuing with the protected Sheets source.', databaseError)
          const sheetData = await sources.fallback.loadPortalData()
          applyViewModel(sheetData, spreadsheetId === 'demo')
          activeSourceRef.current = 'google-sheets'
        }
      } else {
        const sheetData = await sources.active.loadPortalData()
        applyViewModel(sheetData, spreadsheetId === 'demo')
        activeSourceRef.current = 'google-sheets'
        if (sources.shadow) {
          sources.shadow.loadPortalData()
            .then(databaseData => {
              shadowDatabaseDataRef.current = databaseData
              const { icons: _sheetIcons, ...sheetPrimary } = sheetData
              const { icons: _databaseIcons, ...databasePrimary } = databaseData
              const differenceCount = countSemanticDifferences(sheetPrimary, databasePrimary)
              if (differenceCount > 0) console.warn(`LP shadow comparison found ${differenceCount} semantic differences.`)
            })
            .catch(() => {})
        }
      }
      setLastUpdate(new Date())
      setError(null)
    } catch (err) {
      console.error('Failed to load data:', err)
      setError('データの読み込みに失敗しました。しばらくしてから再度お試しください。')
    } finally {
      setLoading(false)
    }
  }, [applyViewModel, benefitsContentSheetName, benefitsRange, benefitsSheetName, configuredReadSource, configuredShadow, eventSheetName, goalsRange, historySheetName, iconSheetName, publicApiBaseUrl, rankingRange, rankingSheetName, spreadsheetId, tenantSlug, useRuntimeConfig])

  // 初回読み込み + 自動更新
  useEffect(() => {
    loadData()

    const intervalId = setInterval(loadData, refreshIntervalMs)
    return () => clearInterval(intervalId)
  }, [loadData, refreshIntervalMs])

  // スプレッドシート設定変更時にアイコンキャッシュをリセット
  useEffect(() => {
    iconsLoadedRef.current = false
    setIcons({})
    setIconError(null)
  }, [spreadsheetId, iconSheetName, publicApiBaseUrl, tenantSlug])

  // アイコンデータ読み込み
  const loadIcons = useCallback(async () => {
    if (iconsLoadedRef.current || loadingIconsRef.current || activeSourceRef.current === 'central' || !spreadsheetId) return

    loadingIconsRef.current = true
    setLoadingIcons(true)
    setIconError(null)
    try {
      const iconData = await createGoogleSheetsDataSource({ spreadsheetId, iconSheetName }).loadIcons()
      setIcons(iconData)
      iconsLoadedRef.current = true
      const shadowIcons = shadowDatabaseDataRef.current?.icons
      if (shadowIcons) {
        const differenceCount = countSemanticDifferences(iconData, shadowIcons)
        if (differenceCount > 0) console.warn(`LP icon shadow comparison found ${differenceCount} semantic differences.`)
      }
    } catch (err) {
      console.error('Failed to load icon data:', err)
      setIconError('アイコンデータの読み込みに失敗しました')
    } finally {
      loadingIconsRef.current = false
      setLoadingIcons(false)
    }
  }, [spreadsheetId, iconSheetName])

  return {
    ranking,
    goals,
    rights,
    specialIndex,
    benefits,
    history,
    events,
    icons,
    loading,
    loadingIcons,
    iconError,
    error,
    lastUpdate,
    loadData,
    loadIcons,
  }
}

// Legacy import compatibility for customer repositories that still reference the old hook name.
export const useSheetData = usePortalData
