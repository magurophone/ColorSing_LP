import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchSheetData, fetchIconData, fetchHistoryData, fetchEventData } from '../lib/sheets'

// =====================================================================
// DEMO MODE — spreadsheetId === 'demo' のときにモックデータを返す
// =====================================================================
const DEMO_RANKING = [
  [1, '星空リスナー☆', 70, './customer/demo-icons/user1.png'],
  [2, '音符ちゃん♪', 49, './customer/demo-icons/user2.png'],
  [3, '深海の歌姫', 30, './customer/demo-icons/user3.png'],
]
const DEMO_GOALS = [
  ['300k', '400k'],
  ['歌推し40人', '歌推し50人'],
]
// BENEFIT_FIELDS: TITLE=0, LABEL=1, NAME=2, DESCRIPTION=3, TRACK_HISTORY=4
const DEMO_BENEFITS = [
  ['5k',          'Bronze',   '強制リクエスト権',    '枠内で好きな曲を1曲リクエストできます。',              ''],
  ['10k',         'Silver',   '歌枠チケット',        '2時間分の歌枠チケットとして使用できます。',            ''],
  ['20k',         'Gold',     'オープンチャット招待', '限定オープンチャットに招待されます。',                  ''],
  ['30k',         'Platinum', 'アカペラ音源',        '1曲分のアカペラ音源をプレゼントします。',              ''],
  ['50k',         'Diamond',  'ミックス音源',        '1曲分のミックス音源をプレゼントします。',              ''],
  ['メンバーシップA', 'Member', '月内リクエスト対応', 'メンシプ期間中に好きな曲をリクエストできます。',       ''],
]
// 権利保有者データ: [name, col1=5k, col2=10k, col3=20k, col4=30k, col5=50k, col6=membership]
const DEMO_RIGHTS = [
  ['星空リスナー☆',  '2', '3', 'TRUE', '1', '',  'TRUE'],
  ['音符ちゃん♪',   '1', '1', '',     '',  '',  'TRUE'],
  ['深海の歌姫',    '3', '2', 'TRUE', '2', '1', ''],
  ['サクラ音楽隊',  '1', '',  '',     '',  '',  ''],
  ['月光セレナーデ', '2', '1', 'TRUE', '',  '',  ''],
  ['波音コーラス',  '1', '',  '',     '',  '',  ''],
  ['夜明けの歌声',  '1', '1', '',     '',  '',  'TRUE'],
  ['虹色ハーモニー', '2', '',  '',     '',  '',  ''],
]
const DEMO_HISTORY = [
  { month: '202602', userName: '星空リスナー☆',  tierKey: '5k',          content: '強制リクエスト1曲' },
  { month: '202602', userName: '音符ちゃん♪',   tierKey: 'メンバーシップA', content: '月内リクエスト' },
  { month: '202601', userName: '深海の歌姫',    tierKey: '10k',         content: '歌枠チケット 2時間' },
]
const DEMO_EVENTS = {
  upcoming: {
    date: '20260315',
    title: 'Chill Night Festival 2026',
    setlist: '変態紳士クラブ  - YOKAZE\niri             - Wonderland\nChilldspot      - ネオンを消して',
    imageUrl: '',
    notes: '',
  },
  past: [],
}
const DEMO_ICONS = {
  '202501': [
    { label: '星空リスナー☆', thumbnailUrl: './customer/demo-icons/user1.png', originalUrl: './customer/demo-icons/user1.png' },
    { label: '音符ちゃん♪',   thumbnailUrl: './customer/demo-icons/user2.png', originalUrl: './customer/demo-icons/user2.png' },
    { label: '深海の歌姫',    thumbnailUrl: './customer/demo-icons/user3.png', originalUrl: './customer/demo-icons/user3.png' },
  ],
  _orderedKeys: ['202501'],
}
// =====================================================================

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
      setGoals(goalsData.slice(1))
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
