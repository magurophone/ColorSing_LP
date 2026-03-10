import { useState } from 'react'
import { Lock } from '@phosphor-icons/react'
import { convertDriveUrl } from '../lib/sheets'

const LockedContentModal = ({ tier, onClose }) => {
  const [input, setInput] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [error, setError] = useState(false)
  const content = tier.lockedContent || {}
  const imageUrl = content.imageUrl ? convertDriveUrl(content.imageUrl, 800) : null

  const verify = () => {
    if (input === tier.accessKey) {
      setUnlocked(true)
      setError(false)
    } else {
      setError(true)
    }
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 flex items-center justify-center p-4 z-[70]"
      style={{ backgroundColor: 'var(--popup-overlay-bg)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-effect rounded-2xl p-6 border border-gold/30 box-glow-soft max-w-md w-full relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-xl text-sub-text hover:text-white transition-colors"
        >
          ×
        </button>

        <div className="flex items-center gap-2 mb-4">
          <Lock size={20} className="text-gold" weight="fill" />
          <span className="text-gold font-bold font-body">{tier.key}</span>
        </div>

        {!unlocked ? (
          <div>
            <p className="text-sm text-gray-300 mb-3">アクセスキーを入力してください</p>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && verify()}
              className="w-full px-3 py-2 glass-effect border border-gold/40 rounded-lg text-white text-sm focus:outline-none focus:border-gold mb-2"
              placeholder="アクセスキー"
              autoFocus
            />
            {error && <p className="text-red-400 text-xs mb-2">アクセスキーが違います</p>}
            <button
              onClick={verify}
              className="w-full py-2 bg-gold/20 hover:bg-gold/30 border border-gold/50 rounded-lg text-gold text-sm font-bold transition-all"
            >
              確認
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {imageUrl && (
              <img src={imageUrl} alt="" className="w-full rounded-xl object-cover" />
            )}
            {content.text && (
              <p className="text-sm text-gray-200 whitespace-pre-line leading-relaxed">{content.text}</p>
            )}
            {!imageUrl && !content.text && (
              <p className="text-sm text-gray-500">（コンテンツなし）</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default LockedContentModal
