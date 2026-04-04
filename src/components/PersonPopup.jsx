import { useMemo } from 'react'
import { useConfig } from '../context/ConfigContext'
import { BENEFIT_FIELDS, RIGHTS_NAME_INDEX, hasRight, isTrackHistory } from '../lib/rights'
import IconRenderer from './IconRenderer'

const PersonPopup = ({ person, benefits, history, specialIndex = 8, onClose, onSelectBenefit }) => {
  const config = useConfig()

  const personName = person?.[RIGHTS_NAME_INDEX] || ''

  // ユーザーの履歴をティアキーごと→年ごとにグループ化（昇順：古い→新しい）
  const historyByTier = useMemo(() => {
    if (!history || !personName) return {}
    const grouped = {}
    for (const entry of history) {
      if (entry.userName !== personName) continue
      if (!entry.content || !String(entry.content).trim()) continue
      if (!grouped[entry.tierKey]) grouped[entry.tierKey] = []
      grouped[entry.tierKey].push(entry)
    }
    // 各ティアの履歴を年ごとにグループ化（昇順）
    const result = {}
    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => String(a.month).localeCompare(String(b.month)))
      const yearGroups = []
      let currentYear = null
      let currentEntries = []
      for (const entry of grouped[key]) {
        const m = String(entry.month)
        const year = m.length >= 4 ? m.slice(0, 4) : m
        if (year !== currentYear) {
          if (currentYear !== null) yearGroups.push({ year: currentYear, entries: currentEntries })
          currentYear = year
          currentEntries = []
        }
        currentEntries.push(entry)
      }
      if (currentYear !== null) yearGroups.push({ year: currentYear, entries: currentEntries })
      result[key] = yearGroups
    }
    return result
  }, [history, personName])

  if (!person) return null

  const getBenefitByTitle = (title) => {
    return benefits.find(b => String(b[BENEFIT_FIELDS.TITLE] || '').trim() === title)
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 flex items-start justify-center p-4 z-50 overflow-y-auto"
      style={{ backgroundColor: 'var(--popup-overlay-bg)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-effect rounded-2xl p-8 border border-card-border/30 box-glow-soft max-w-2xl w-full relative my-8 max-h-[90vh] flex flex-col"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-2xl text-sub-text hover:text-white transition-colors z-10"
        >
          ×
        </button>

        <h2 className="text-2xl md:text-4xl font-body mb-4 md:mb-8 text-glow-soft text-highlight flex-shrink-0 text-center">
          {person[RIGHTS_NAME_INDEX]}
        </h2>

        <div className="space-y-6 overflow-y-auto pr-2 flex-1">
          {config.benefitTiers.map((tier) => {
            if (!tier.columnIndex || tier.columnIndex < 1) return null
            const value = person[tier.columnIndex]

            const benefit = getBenefitByTitle(tier.key)
            const trackHistory = isTrackHistory(benefit?.[BENEFIT_FIELDS.TRACK_HISTORY])
            const hasPastHistory = trackHistory && (historyByTier[tier.key]?.length ?? 0) > 0
            const active = hasRight(value)

            if (!active && !hasPastHistory) return null

            const displayText = tier.isBoolean
              ? tier.displayTemplate
              : tier.displayTemplate.replace('{value}', value)

            return (
              <div
                key={tier.key}
                onClick={() => active && benefit && onSelectBenefit(benefit)}
                style={{ backgroundColor: 'var(--tier-card-bg)' }}
                className={`p-4 md:p-6 rounded-xl border transition-all text-center flex flex-col overflow-hidden ${
                  active ? 'cursor-pointer hover:border-card-hover' : 'cursor-default opacity-70'
                } ${
                  tier.isMembership
                    ? 'border-highlight/30 bg-gradient-to-r from-gold/10 to-transparent'
                    : 'border-card-border/20'
                }`}
              >
                {benefit && (
                  <div className="mb-4 pb-3 border-b border-highlight/30 bg-highlight/10 -mx-4 md:-mx-6 -mt-4 md:-mt-6 px-4 md:px-6 py-3 rounded-t-xl">
                    <div className="flex items-center justify-center pt-1">
                      <span className="text-sm md:text-base text-highlight font-body">
                        {benefit[BENEFIT_FIELDS.TITLE]}{benefit[BENEFIT_FIELDS.LABEL] ? ` ${benefit[BENEFIT_FIELDS.LABEL]}` : ''}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex-1">
                  <div className="flex items-center justify-center mb-2">
                    <IconRenderer icon={tier.icon} size={32} className="text-highlight" />
                  </div>
                  {active
                    ? <p className="text-content-text">{displayText}</p>
                    : <p className="text-sub-text text-sm opacity-60">（使用済み）</p>
                  }
                </div>

                {isTrackHistory(benefit?.[BENEFIT_FIELDS.TRACK_HISTORY]) && historyByTier[tier.key]?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-card-border/20 text-left" onClick={(e) => e.stopPropagation()}>
                    {historyByTier[tier.key].map((yearGroup) => (
                      <div key={yearGroup.year} className="mb-2 last:mb-0">
                        <p className="text-xs text-sub-text font-bold mb-0.5">{yearGroup.year}年</p>
                        {yearGroup.entries.map((entry, i) => {
                          const monthNum = String(entry.month).slice(4)
                          const monthLabel = monthNum ? `${parseInt(monthNum, 10)}月` : ''
                          return (
                            <div key={i} className="flex text-xs text-sub-text">
                              <span className="text-sub-text flex-shrink-0">{monthLabel}</span>
                              <span className="ml-2 overflow-x-auto whitespace-nowrap">{entry.content}</span>
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {/* Special権利 */}
          {person[specialIndex] && (
            <div className="bg-gradient-to-r from-highlight/20 to-primary/20 p-6 rounded-xl border border-highlight/30 text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                <span className="text-3xl">✨</span>
                <h3 className="text-xl font-body text-highlight">{config.ui.specialRightLabel}</h3>
              </div>
              <p className="text-content-text">{person[specialIndex]}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PersonPopup
