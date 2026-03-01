import { useState, useMemo, useCallback } from 'react'
import { useConfig } from '../context/ConfigContext'
import { hasRight, RIGHTS_NAME_INDEX } from '../components/PersonPopup'
import { BENEFIT_FIELDS } from '../components/BenefitPopup'
import IconRenderer from '../components/IconRenderer'

const RightsView = ({ rights, history, benefits, onSelectPerson, specialIndex = 8 }) => {
  const config = useConfig()
  const [searchTerm, setSearchTerm] = useState('')

  // TRACK_HISTORY が有効なティアキーのセット
  const trackHistoryTierKeys = useMemo(() => {
    if (!benefits || !benefits.length) return new Set()
    const keys = new Set()
    for (const b of benefits) {
      const title = String(b[BENEFIT_FIELDS.TITLE] || '').trim()
      const flag = String(b[BENEFIT_FIELDS.TRACK_HISTORY] || '').trim().toUpperCase()
      if (title && flag === 'TRUE') keys.add(title)
    }
    return keys
  }, [benefits])

  // TRACK_HISTORY 有効ティアに履歴がある人名セット
  const namesWithHistory = useMemo(() => {
    if (!history || !trackHistoryTierKeys.size) return new Set()
    const names = new Set()
    for (const entry of history) {
      if (trackHistoryTierKeys.has(entry.tierKey) && entry.content) {
        names.add(entry.userName)
      }
    }
    return names
  }, [history, trackHistoryTierKeys])

  // 権利のアイコンを取得（config.benefitTiers ベースで動的）
  const getRightsIcons = useCallback((person) => {
    const icons = []
    config.benefitTiers.forEach((tier) => {
      if (hasRight(person[tier.columnIndex])) {
        icons.push(tier.icon)
      }
    })
    const specialValue = String(person[specialIndex] ?? '').trim()
    if (specialValue && specialValue.toUpperCase() !== 'FALSE' && specialValue !== '0') {
      icons.push('✨')
    }
    return icons
  }, [config.benefitTiers, specialIndex])

  // 権利者を50音順にソート
  const sortedRights = useMemo(() => {
    return [...rights].sort((a, b) =>
      String(a[RIGHTS_NAME_INDEX] ?? '').localeCompare(String(b[RIGHTS_NAME_INDEX] ?? ''), 'ja')
    )
  }, [rights])

  // 検索フィルター
  const filteredRights = useMemo(() => {
    return sortedRights.filter(person => {
      const name = String(person[RIGHTS_NAME_INDEX] ?? '').trim()
      if (!name) return false
      if (!name.toLowerCase().includes(searchTerm.toLowerCase())) return false

      const hasAnyRight = config.benefitTiers.some(tier => hasRight(person[tier.columnIndex]))
      const specialValue = String(person[specialIndex] ?? '').trim()
      const normalizedSpecial = specialValue.toUpperCase()
      const hasSpecial = normalizedSpecial !== '' && normalizedSpecial !== 'FALSE' && normalizedSpecial !== '0'

      return hasAnyRight || hasSpecial || namesWithHistory.has(name)
    })
  }, [sortedRights, searchTerm, config.benefitTiers, namesWithHistory])

  const viewConfig = config.views.find(v => v.id === 'rights') || {}

  return (
    <section>
      <h2 className="text-2xl md:text-4xl font-body mb-4 md:mb-8 text-center text-glow-soft text-primary">
        {viewConfig.title || '🍾 ボトルキープ一覧'}
      </h2>

      <div className="mb-6 max-w-2xl mx-auto">
        <input
          type="text"
          placeholder={config.ui.searchPlaceholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-6 py-3 glass-effect border border-card-border/30 rounded-xl focus:outline-none focus:border-card-hover transition-all text-white placeholder-gray-500"
        />
      </div>

      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRights.map((person) => (
          <div
            key={person[RIGHTS_NAME_INDEX]}
            onClick={() => onSelectPerson(person)}
            className="glass-effect rounded-xl p-4 md:p-6 border border-card-border/30 hover:border-card-hover transition-all hover:scale-105 cursor-pointer group h-32 md:h-36 text-center flex flex-col"
          >
            <h3
              className="text-base md:text-xl font-body text-name-text group-hover:text-highlight transition-colors flex items-center justify-center"
              style={{ flexGrow: 1, flexShrink: 1, flexBasis: '0%', minHeight: 0 }}
            >
              {person[RIGHTS_NAME_INDEX]}
            </h3>
            <div
              className="flex items-center justify-center flex-wrap gap-2 text-lg md:text-2xl"
              style={{ flexGrow: 2, flexShrink: 1, flexBasis: '0%', minHeight: 0, paddingTop: '13px', alignContent: 'flex-start', boxSizing: 'border-box' }}
            >
              {getRightsIcons(person).map((icon, i) => (
                <span key={`${icon}-${i}`} className={config.effects?.iconFloat !== false ? 'animate-float' : ''} style={config.effects?.iconFloat !== false ? { animationDelay: `${i * 0.2}s` } : undefined}>
                  <IconRenderer icon={icon} size={20} className="text-highlight" />
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default RightsView
