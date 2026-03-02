import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchSheetData, fetchIconData, fetchHistoryData, fetchEventData } from '../lib/sheets'
import { DEMO_RANKING, DEMO_GOALS, DEMO_BENEFITS, DEMO_RIGHTS, DEMO_HISTORY, DEMO_EVENTS, DEMO_ICONS } from '../lib/demoData'

export function useSheetData(sheetsConfig) {
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

  const { spreadsheetId, rankingSheetName, benefitsSheetName, benefitsContentSheetName, historySheetName, iconSheetName, eventSheetName, ranges, refreshIntervalMs } = sheetsConfig
  // rangesオブジェクトを個別の文字列に分解して安定した依存関係にする
  const rankingRange = ranges.ranking
  const goalsRange = ranges.goals
  const benefitsRange = ranges.benefits

  const loadData = useCallback(async () => {
    // DEMO MODE
    if (spreadsheetId === 'demo') {
      setRanking(DEMO_RANKING)
      setGoals(DEMO_GOALS)
      setBenefits(DEMO_BENEFITS)
      setRights(DEMO_RIGHTS)
      setSpecialIndex(8)
      setHistory(DEMO_HISTORY)
      setEvents(DEMO_EVENTS)
      setLastUpdate(new Date())
      setLoading(false)
      setError(null)
      return
    }

    if (!spreadsheetId) {
      setError('スプレッドシートIDが設定されていません。管理画面（admin.html）から設定してください。')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const [rankingData, goalsData, benefitsData, rawRightsData, historyData, eventData] = await Promise.all([
        fetchSheetData(spreadsheetId, rankingSheetName, rankingRange),
        fetchSheetData(spreadsheetId, rankingSheetName, goalsRange),
        fetchSheetData(spreadsheetId, benefitsContentSheetName, benefitsRange),
        // rights: ヘッダー行込みで全シートを取得（Special列を動的に検出するため range なし・headers=0）
        fetchSheetData(spreadsheetId, benefitsSheetName, null, 3, { allRows: true }),
        // history: A3:D（行上限なしのオープンレンジ）
        historySheetName
          ? fetchHistoryData(spreadsheetId, historySheetName, 'A3:D').catch(() => [])
          : Promise.resolve([]),
        // events: イベントシート（開催予定・開催済み）
        eventSheetName
          ? fetchEventData(spreadsheetId, eventSheetName).catch(() => null)
          : Promise.resolve(null),
      ])

      // "Special"列を含む行をヘッダー行として動的検出（先頭の空行・タイトル行をスキップ）
      let detectedSpecialIndex = -1
      let headerRowIndex = 0
      for (let i = 0; i < rawRightsData.length; i++) {
        const idx = rawRightsData[i].findIndex(col => String(col).toLowerCase() === 'special')
        if (idx >= 0) {
          detectedSpecialIndex = idx
          headerRowIndex = i
          break
        }
      }
      if (detectedSpecialIndex < 0) {
        const maxLen = Math.max(0, ...rawRightsData.map(r => r.length))
        detectedSpecialIndex = maxLen > 0 ? maxLen - 1 : 8
      }

      setRanking(rankingData)
      setGoals(goalsData.slice(1)) // 先頭行は列ヘッダー行（「目標1」「目標2」）のためスキップ
      setBenefits(benefitsData)
      setRights(rawRightsData.slice(headerRowIndex + 1)) // ヘッダー行の次から
      setSpecialIndex(detectedSpecialIndex)
      setHistory(historyData || [])
      setEvents(eventData ?? null)
      setLastUpdate(new Date())
      setError(null)
    } catch (err) {
      console.error('Failed to load data:', err)
      setError('データの読み込みに失敗しました。しばらくしてから再度お試しください。')
    } finally {
      setLoading(false)
    }
  }, [spreadsheetId, rankingSheetName, benefitsSheetName, benefitsContentSheetName, historySheetName, eventSheetName, rankingRange, goalsRange, benefitsRange])

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
  }, [spreadsheetId, iconSheetName])

  // アイコンデータ読み込み
  const loadIcons = useCallback(async () => {
    if (iconsLoadedRef.current || loadingIconsRef.current || !spreadsheetId) return

    // DEMO MODE
    if (spreadsheetId === 'demo') {
      setIcons(DEMO_ICONS)
      iconsLoadedRef.current = true
      return
    }

    loadingIconsRef.current = true
    setLoadingIcons(true)
    setIconError(null)
    try {
      const iconData = await fetchIconData(spreadsheetId, iconSheetName)
      setIcons(iconData)
      iconsLoadedRef.current = true
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
