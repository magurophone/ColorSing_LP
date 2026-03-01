import { useState, useEffect } from 'react'
import { useConfig } from './context/ConfigContext'
import { useSheetData } from './hooks/useSheetData'
import Sidebar from './components/Sidebar'
import BottomNav from './components/BottomNav'
import Header from './components/Header'
import Footer from './components/Footer'
import PersonPopup from './components/PersonPopup'
import BenefitPopup from './components/BenefitPopup'
import ParticleEffect from './components/ParticleEffect'
import VIEW_REGISTRY from './views/registry'

function App() {
  const config = useConfig()
  const enabledViews = config.views.filter(v => v.enabled)

  // 最初の有効なビューをデフォルトに
  const [currentView, setCurrentView] = useState(enabledViews[0]?.id || 'home')

  const {
    ranking, goals, rights, specialIndex, benefits, history, events, icons,
    loading, loadingIcons, iconError, error, lastUpdate,
    loadData, loadIcons,
  } = useSheetData(config.sheets)

  // ポップアップ状態
  const [selectedPerson, setSelectedPerson] = useState(null)
  const [selectedBenefit, setSelectedBenefit] = useState(null)

  // アイコンギャラリー状態（selectedMonthはデフォルト月選択のためApp管理）
  const [selectedMonth, setSelectedMonth] = useState(null)

  // 現在のビューが無効化されていたらフォールバック
  const effectiveView = enabledViews.some(v => v.id === currentView)
    ? currentView
    : (enabledViews[0]?.id || 'home')

  // アイコンビューに切り替えた時にデータ読み込み + デフォルト月選択
  useEffect(() => {
    if (effectiveView === 'icons') {
      loadIcons()
    }
  }, [effectiveView, loadIcons])

  // アイコンデータ読み込み後にデフォルト表示を設定
  useEffect(() => {
    if (!selectedMonth && Object.keys(icons).length > 0) {
      const keys = Object.keys(icons).filter(k => k !== '_orderedKeys' && icons[k].length > 0)
      if (keys.length === 0) return
      // yyyymmキーがあれば最新月をデフォルト、なければ_orderedKeysの先頭カテゴリ
      const monthKeys = keys.filter(k => /^\d{6}$/.test(k))
      if (monthKeys.length > 0) {
        setSelectedMonth(monthKeys.sort().reverse()[0])
      } else {
        const orderedKeys = icons._orderedKeys || keys
        const firstValid = orderedKeys.find(k => icons[k] && icons[k].length > 0)
        if (firstValid) setSelectedMonth(firstValid)
      }
    }
  }, [icons, selectedMonth])

  // Escキーでポップアップを閉じる
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (selectedBenefit) setSelectedBenefit(null)
        else if (selectedPerson) setSelectedPerson(null)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [selectedPerson, selectedBenefit])

  // ポップアップ表示時のスクロール防止
  useEffect(() => {
    document.body.style.overflow = (selectedPerson || selectedBenefit) ? 'hidden' : 'unset'
    return () => { document.body.style.overflow = 'unset' }
  }, [selectedPerson, selectedBenefit])

  // ローディング表示
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">{config.brand.loadingEmoji}</div>
          <div className="text-xl text-primary animate-shimmer">{config.brand.loadingText}</div>
        </div>
      </div>
    )
  }

  // エラー表示
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-effect rounded-2xl p-8 border border-tuna-red/30 max-w-md w-full text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-body mb-4 text-tuna-red">{config.ui.errorTitle}</h2>
          <p className="text-gray-300 mb-6">{config.ui.errorMessage || error}</p>
          <button
            onClick={loadData}
            className="px-6 py-3 bg-amber/20 hover:bg-amber/30 border border-amber/50 rounded-xl transition-all text-amber font-body"
          >
            {config.ui.retryButton}
          </button>
        </div>
      </div>
    )
  }

  // 現在のビューのコンポーネントを取得
  const ActiveView = VIEW_REGISTRY[effectiveView]

  // ビューに渡すprops
  const viewProps = {
    home: { ranking, goals, events },
    menu: { benefits, onSelectBenefit: setSelectedBenefit },
    rights: { rights, history, benefits, onSelectPerson: setSelectedPerson, specialIndex },
    icons: {
      icons, selectedMonth, setSelectedMonth,
      loading: loadingIcons, iconError,
    },
    events: { events },
  }

  return (
    <div className="min-h-screen relative">
      <ParticleEffect />

      <Sidebar currentView={effectiveView} onViewChange={setCurrentView} lastUpdate={lastUpdate} />

      <div className="md:ml-64">
        {effectiveView === 'home' && (
          <Header lastUpdate={lastUpdate} loading={loading} onRefresh={loadData} />
        )}

        <div className="max-w-7xl mx-auto px-4 py-6 md:py-12 pb-24 md:pb-12 space-y-8 md:space-y-16">
          {ActiveView && <ActiveView {...(viewProps[effectiveView] || {})} />}
          <Footer />
        </div>

        <PersonPopup
          person={selectedPerson}
          benefits={benefits}
          history={history}
          specialIndex={specialIndex}
          onClose={() => setSelectedPerson(null)}
          onSelectBenefit={setSelectedBenefit}
        />
        <BenefitPopup
          benefit={selectedBenefit}
          onClose={() => setSelectedBenefit(null)}
        />
      </div>

      <BottomNav currentView={effectiveView} onViewChange={setCurrentView} />
    </div>
  )
}

export default App
