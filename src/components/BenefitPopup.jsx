import { useState } from 'react'
import { Lock } from '@phosphor-icons/react'
import { useConfig } from '../context/ConfigContext'
import { BENEFIT_FIELDS } from '../lib/rights'
import IconRenderer from './IconRenderer'
import LockedContentModal from './LockedContentModal'

const BenefitPopup = ({ benefit, onClose }) => {
  const config = useConfig()
  const [lockedTier, setLockedTier] = useState(null)

  if (!benefit) return null

  const title = String(benefit[BENEFIT_FIELDS.TITLE] || '').trim()
  const tier = config.benefitTiers?.find(t => t.key === title)
  const hasLocked = tier?.useKey && tier?.accessKey

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 flex items-center justify-center p-4 z-[60]"
        style={{ backgroundColor: 'var(--popup-overlay-bg)' }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="glass-effect rounded-2xl p-8 border border-card-border/30 max-w-md w-full relative"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-2xl text-sub-text hover:text-white transition-colors"
          >
            ×
          </button>

          <div className="text-center">
            {tier && (
              <div className="flex items-center justify-center gap-3 mb-4">
                <IconRenderer icon={tier.icon} size={48} className="text-highlight" />
              </div>
            )}
            <p className="text-lg font-bold mb-4 whitespace-pre-line text-content-text">{benefit[BENEFIT_FIELDS.NAME]}</p>
            <p className="text-sm text-content-text/70 whitespace-pre-line">{benefit[BENEFIT_FIELDS.DESCRIPTION]}</p>
            {hasLocked && (
              <button
                onClick={() => setLockedTier(tier)}
                className="mt-4 flex items-center gap-2 text-gold text-sm hover:text-gold/70 transition-colors mx-auto"
              >
                <Lock size={16} weight="fill" />
                <span>限定コンテンツを見る</span>
              </button>
            )}
          </div>
        </div>
      </div>
      {lockedTier && <LockedContentModal tier={lockedTier} onClose={() => setLockedTier(null)} />}
    </>
  )
}

export default BenefitPopup
