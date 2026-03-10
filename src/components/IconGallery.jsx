import { useState, useMemo, useEffect } from 'react'
import { Lock } from '@phosphor-icons/react'
import { useConfig } from '../context/ConfigContext'

const LOCK_PREFIX = '🔒'
const SESSION_KEY = 'iconGalleryUnlocked'

const isYYYYMM = (key) => /^\d{6}$/.test(key.replace(LOCK_PREFIX, ''))
const isLocked = (key) => key.startsWith(LOCK_PREFIX)
const displayKey = (key) => key.replace(LOCK_PREFIX, '')

const IconGallery = ({ icons, selectedMonth, setSelectedMonth, loading, iconError }) => {
  const config = useConfig()
  const accessKey = config.iconGallery?.accessKey || ''
  const [searchTerm, setSearchTerm] = useState('')
  const [popupUser, setPopupUser] = useState(null)
  const [lockModalKey, setLockModalKey] = useState(null)
  const [keyInput, setKeyInput] = useState('')
  const [keyError, setKeyError] = useState(false)
  const [unlockedKeys, setUnlockedKeys] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || '[]') } catch { return [] }
  })

  const availableMonths = useMemo(() => {
    const keys = Object.keys(icons).filter(k => k !== '_orderedKeys' && icons[k].length > 0)
    const monthKeys = keys.filter(k => isYYYYMM(k)).sort((a, b) => displayKey(b).localeCompare(displayKey(a)))
    const orderedKeys = icons._orderedKeys || keys
    const categoryKeys = orderedKeys.filter(k => !isYYYYMM(k) && icons[k] && icons[k].length > 0)
    return [...monthKeys, ...categoryKeys]
  }, [icons])

  const allUsers = useMemo(() => {
    if (!selectedMonth || !icons[selectedMonth]) return []
    const uniqueUsers = [...new Set(icons[selectedMonth].map(item => item.label))]
    return uniqueUsers.sort((a, b) => a.localeCompare(b, 'ja'))
  }, [selectedMonth, icons])

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

  useEffect(() => {
    if (!lockModalKey) return
    const handleEscape = (e) => { if (e.key === 'Escape') closeLockModal() }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [lockModalKey])

  const handleMonthChange = (key) => {
    if (isLocked(key) && accessKey && !unlockedKeys.includes(key)) {
      setLockModalKey(key)
      setKeyInput('')
      setKeyError(false)
      return
    }
    setSelectedMonth(key)
    setSearchTerm('')
    setPopupUser(null)
  }

  const closeLockModal = () => {
    setLockModalKey(null)
    setKeyInput('')
    setKeyError(false)
  }

  const verifyKey = () => {
    if (keyInput === accessKey) {
      const next = [...unlockedKeys, lockModalKey]
      setUnlockedKeys(next)
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(next))
      setSelectedMonth(lockModalKey)
      setSearchTerm('')
      setPopupUser(null)
      closeLockModal()
    } else {
      setKeyError(true)
    }
  }

  const formatKey = (key) => {
    const k = displayKey(key)
    if (!k) return ''
    if (/^\d{6}$/.test(k)) {
      const year = k.substring(0, 4)
      const m = parseInt(k.substring(4, 6), 10)
      return `${year}年${m}月`
    }
    return k
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

  const renderTab = (key) => {
    const locked = isLocked(key) && accessKey && !unlockedKeys.includes(key)
    const active = selectedMonth === key
    return (
      <button
        key={key}
        onClick={() => handleMonthChange(key)}
        className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
          active
            ? 'bg-primary/20 border border-primary/50 text-primary'
            : 'glass-effect border border-card-border/20 text-sub-text hover:text-primary hover:border-card-border/40'
        }`}
      >
        {locked && <Lock size={13} weight="fill" className="opacity-70 flex-shrink-0" />}
        {formatKey(key)}
      </button>
    )
  }

  const monthTabs = availableMonths.filter(k => isYYYYMM(k))
  const categoryTabs = availableMonths.filter(k => !isYYYYMM(k))

  return (
    <div className="space-y-6">
      {/* 月タブ */}
      {monthTabs.length > 0 && (
        <div className="overflow-x-auto">
          <div className="flex gap-2 pb-1 min-w-max">
            {monthTabs.map(renderTab)}
          </div>
        </div>
      )}

      {/* カテゴリタブ */}
      {categoryTabs.length > 0 && (
        <div className="overflow-x-auto">
          <div className="flex gap-2 pb-1 min-w-max">
            {categoryTabs.map(renderTab)}
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

      {/* ロック解除モーダル */}
      {lockModalKey && (
        <div
          onClick={closeLockModal}
          className="fixed inset-0 flex items-center justify-center p-4 z-[70]"
          style={{ backgroundColor: 'var(--popup-overlay-bg)' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-effect rounded-2xl p-6 border border-gold/30 box-glow-soft max-w-sm w-full relative"
          >
            <button
              onClick={closeLockModal}
              className="absolute top-4 right-4 text-xl text-sub-text hover:text-white transition-colors"
            >
              ×
            </button>

            <div className="flex items-center gap-2 mb-4">
              <Lock size={20} className="text-gold" weight="fill" />
              <span className="text-gold font-bold font-body">{formatKey(lockModalKey)}</span>
            </div>

            <p className="text-sm text-gray-300 mb-3">アクセスキーを入力してください</p>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && verifyKey()}
              className="w-full px-3 py-2 glass-effect border border-gold/40 rounded-lg text-white text-sm focus:outline-none focus:border-gold mb-2"
              placeholder="アクセスキー"
              autoFocus
            />
            {keyError && <p className="text-red-400 text-xs mb-2">アクセスキーが違います</p>}
            <button
              onClick={verifyKey}
              className="w-full py-2 bg-gold/20 hover:bg-gold/30 border border-gold/50 rounded-lg text-gold text-sm font-bold transition-all"
            >
              確認
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default IconGallery
