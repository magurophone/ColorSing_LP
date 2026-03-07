import { useState, useMemo, useEffect } from 'react'
import { useConfig } from '../context/ConfigContext'

// yyyymm形式かどうかをキー個別に判定（全体でなく1キーずつ）
const isYYYYMM = (key) => /^\d{6}$/.test(key)

const IconGallery = ({ icons, selectedMonth, setSelectedMonth, loading, iconError }) => {
  const config = useConfig()
  const [searchTerm, setSearchTerm] = useState('')
  const [popupUser, setPopupUser] = useState(null)

  const availableMonths = useMemo(() => {
    const keys = Object.keys(icons).filter(k => k !== '_orderedKeys' && icons[k].length > 0)
    // yyyymmキーは降順、文字列キーは_orderedKeysの順序を維持してyyyymmの後ろに並べる
    const monthKeys = keys.filter(isYYYYMM).sort().reverse()
    const orderedKeys = icons._orderedKeys || keys
    const categoryKeys = orderedKeys.filter(k => !isYYYYMM(k) && icons[k] && icons[k].length > 0)
    return [...monthKeys, ...categoryKeys]
  }, [icons])

  // 選択中の月/カテゴリの全ユーザー（名前順）
  const allUsers = useMemo(() => {
    if (!selectedMonth || !icons[selectedMonth]) return []
    const uniqueUsers = [...new Set(icons[selectedMonth].map(item => item.label))]
    return uniqueUsers.sort((a, b) => a.localeCompare(b, 'ja'))
  }, [selectedMonth, icons])

  // 検索フィルター適用後のユーザー
  const filteredUsers = useMemo(() => {
    if (!searchTerm) return allUsers
    return allUsers.filter(user => user.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [allUsers, searchTerm])

  const getIconsForUser = (user) => {
    if (!selectedMonth || !icons[selectedMonth]) return []
    return icons[selectedMonth].filter(item => item.label === user)
  }

  useEffect(() => {
    if (!popupUser) return
    const handleEscape = (e) => { if (e.key === 'Escape') setPopupUser(null) }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [popupUser])

  const handleMonthChange = (month) => {
    setSelectedMonth(month)
    setSearchTerm('')
    setPopupUser(null)
  }

  const formatKey = (key) => {
    if (!key) return ''
    if (isYYYYMM(key)) {
      const year = key.substring(0, 4)
      const m = parseInt(key.substring(4, 6), 10)
      return `${year}年${m}月`
    }
    return key
  }

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-4 animate-pulse">🖼️</div>
        <div className="text-xl text-primary animate-shimmer">{config.ui.iconLoading}</div>
      </div>
    )
  }

  if (iconError) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-4">⚠️</div>
        <div className="text-xl text-tuna-red">{iconError}</div>
      </div>
    )
  }

  if (availableMonths.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-4">📭</div>
        <div className="text-xl text-sub-text">{config.ui.iconEmpty}</div>
      </div>
    )
  }

  const popupIcons = popupUser ? getIconsForUser(popupUser) : []

  return (
    <div className="space-y-6">
      {/* 月タブ */}
      {availableMonths.filter(isYYYYMM).length > 0 && (
        <div className="overflow-x-auto">
          <div className="flex gap-2 pb-1 min-w-max">
            {availableMonths.filter(isYYYYMM).map((month) => (
              <button
                key={month}
                onClick={() => handleMonthChange(month)}
                className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                  selectedMonth === month
                    ? 'bg-primary/20 border border-primary/50 text-primary'
                    : 'glass-effect border border-card-border/20 text-sub-text hover:text-primary hover:border-card-border/40'
                }`}
              >
                {formatKey(month)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* カテゴリタブ */}
      {availableMonths.filter(k => !isYYYYMM(k)).length > 0 && (
        <div className="overflow-x-auto">
          <div className="flex gap-2 pb-1 min-w-max">
            {availableMonths.filter(k => !isYYYYMM(k)).map((month) => (
              <button
                key={month}
                onClick={() => handleMonthChange(month)}
                className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                  selectedMonth === month
                    ? 'bg-primary/20 border border-primary/50 text-primary'
                    : 'glass-effect border border-card-border/20 text-sub-text hover:text-primary hover:border-card-border/40'
                }`}
              >
                {formatKey(month)}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedMonth && (
        <>
          {/* 検索ボックス */}
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={config.ui.searchPlaceholder}
            className="w-full max-w-md px-4 py-2 glass-effect border border-card-border/30 rounded-xl focus:outline-none focus:border-card-hover transition-all text-white placeholder-gray-500 text-sm"
          />

          {/* ユーザー名グリッド */}
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-sub-text">{config.ui.iconNoImages}</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredUsers.map((user) => (
                <button
                  key={user}
                  onClick={() => setPopupUser(user)}
                  className="glass-effect rounded-xl p-4 border border-card-border/20 hover:border-card-hover text-name-text text-sm font-body transition-all text-center"
                >
                  {user}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* ユーザーアイコンポップアップ */}
      {popupUser && (
        <div
          onClick={() => setPopupUser(null)}
          className="fixed inset-0 flex items-start justify-center p-4 z-50 overflow-y-auto"
          style={{ backgroundColor: 'var(--popup-overlay-bg)' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-effect rounded-2xl p-8 border border-card-border/30 box-glow-soft max-w-2xl w-full relative my-8"
          >
            <button
              onClick={() => setPopupUser(null)}
              className="absolute top-4 right-4 text-2xl text-sub-text hover:text-white transition-colors z-10"
            >
              ×
            </button>

            <h2 className="text-2xl font-body mb-6 text-highlight text-center">
              {config.ui.userIconTitle.replace('{user}', popupUser)}
            </h2>

            {popupIcons.length === 0 ? (
              <div className="text-center py-8 text-sub-text">{config.ui.iconNoImages}</div>
            ) : (
              <div className="flex flex-wrap gap-4 justify-center">
                {popupIcons.map((icon, index) => (
                  <a
                    key={index}
                    href={icon.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-32 h-32 rounded-xl overflow-hidden border border-card-border/30 hover:border-card-hover transition-all group flex-shrink-0"
                  >
                    <img
                      src={icon.thumbnailUrl}
                      alt={`${icon.label}のアイコン`}
                      className="w-full h-full object-contain bg-deep-blue/30 group-hover:scale-105 transition-transform"
                      loading="lazy"
                      onError={(e) => {
                        e.target.onerror = null
                        e.target.src = `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="128" height="128"%3E%3Crect width="128" height="128" fill="%23222"%3E%3C/rect%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23666" font-size="11"%3E${encodeURIComponent(config.ui.imageError)}%3C/text%3E%3C/svg%3E`
                      }}
                    />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default IconGallery
