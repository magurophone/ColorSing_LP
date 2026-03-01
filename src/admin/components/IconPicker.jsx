import { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import IconRenderer from '../../components/IconRenderer'

// 絵文字プリセット（variation selector U+FE0F 付きで正しくカラー表示される）
const EMOJI_GROUPS = {
  '定番': ['🏠', '🍾', '👥', '🖼\uFE0F', '📝', '🎵', '🎮', '💬', '🎤', '⚡', '🏆', '👑', '🎧', '📱', '🚀', '🔔', '📌', '📣', '💌', '🗓\uFE0F', '⏰', '🔗', '📢', '✅', '🆕', '🎖\uFE0F', '🔖', '📍'],
  '音楽・エンタメ': ['🎶', '🎼', '🎹', '🎸', '🎺', '🎻', '🥁', '🪗', '🪘', '🎙\uFE0F', '📻', '🎬', '🎭', '🎪', '🎞\uFE0F', '🎦', '🎟\uFE0F', '🎫', '🎲', '🎰', '🕹\uFE0F', '🃏', '🎴', '🀄', '🎠', '🎡', '🎢'],
  '配信・テック': ['📸', '🤳', '📲', '💻', '🖥\uFE0F', '📡', '🎚\uFE0F', '🎛\uFE0F', '📺', '🔭', '🔬', '🧪', '⚙\uFE0F', '🔧', '🔩', '💾', '💿', '📀', '🖨\uFE0F', '⌨\uFE0F'],
  '食事・ドリンク': ['🍷', '🥂', '🍸', '🍹', '🍺', '🍻', '🥃', '🍶', '🧋', '🧃', '☕', '🍵', '🫖', '🍰', '🎂', '🧁', '🍩', '🍫', '🍿', '🍣', '🍱', '🍜', '🍔', '🍕', '🌮', '🍦', '🍭', '🥐', '🫙'],
  'ハート・感情': ['❤\uFE0F', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🩷', '🩵', '🩶', '💖', '💗', '💝', '💞', '💕', '❣\uFE0F', '💟', '✨', '🌟', '⭐', '💫', '🔥', '💯', '🎉', '🎊', '🥳', '🥰', '😍', '🤩'],
  '動物': ['🐟', '🐡', '🐙', '🦑', '🐬', '🦈', '🐱', '🐶', '🐰', '🦊', '🐻', '🐼', '🐨', '🦁', '🐯', '🐮', '🐷', '🐸', '🐵', '🦄', '🐲', '🐧', '🦅', '🦉', '🦋', '🐝', '🦒', '🐘', '🦓', '🐺'],
  '自然': ['🌸', '🌺', '🌻', '🌹', '🌷', '💐', '🌿', '🍀', '🍃', '🌾', '🍄', '🌴', '🌵', '🌙', '🌕', '🌠', '☀\uFE0F', '🌈', '❄\uFE0F', '🔥', '⚡', '💧', '🌊', '🌋', '⛰\uFE0F', '🏔\uFE0F', '🌤\uFE0F', '🌧\uFE0F', '🌪\uFE0F'],
  'ファッション': ['👗', '👘', '🥻', '👔', '🧥', '👠', '👡', '👢', '🥾', '👒', '🎩', '🧢', '💍', '💄', '💅', '👛', '👜', '🎒', '🕶\uFE0F', '🪮', '💎', '🪙'],
  'スポーツ': ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🎱', '⛳', '🏹', '🥊', '🥋', '🏊', '🏄', '🧗', '🏋\uFE0F', '🤸', '⛷\uFE0F', '🏂', '🎿', '🚴'],
  '旅行・場所': ['✈\uFE0F', '🚢', '🚂', '🚗', '🏖\uFE0F', '🏕\uFE0F', '🗼', '🏯', '⛩\uFE0F', '🗺\uFE0F', '🧭', '🌏', '🌃', '🌆', '🌉', '🎆', '🎇', '🏠', '🏰', '⛺'],
  '記号・マーク': ['📊', '📈', '📉', '🏷\uFE0F', '🎨', '🔑', '🗝\uFE0F', '🛡\uFE0F', '💡', '🔮', '🧿', '🪄', '🎀', '🔒', '📷', '🎁', '🎯', '🏅', '🥇', '🥈', '🥉', '🪐', '☯\uFE0F', '⚜\uFE0F', '🔱', '♾\uFE0F'],
}

const LUCIDE_GROUPS = {
  'ナビゲーション': ['home', 'search', 'menu', 'arrow-up', 'arrow-down', 'external-link', 'link', 'eye', 'filter', 'layout-grid', 'list', 'check', 'refresh-cw'],
  '音楽・エンタメ': ['music', 'mic', 'headphones', 'radio', 'volume-2', 'play', 'pause', 'skip-forward', 'skip-back', 'disc-3', 'tv', 'clapperboard', 'popcorn', 'drama', 'dices'],
  'ユーザー': ['users', 'user', 'user-plus', 'user-check', 'contact'],
  'コミュニケーション': ['message-circle', 'message-square', 'mail', 'send', 'phone', 'video'],
  'アワード・実績': ['trophy', 'crown', 'award', 'medal', 'star', 'sparkles', 'party-popper', 'gem', 'target', 'flag'],
  'ショッピング・ギフト': ['gift', 'shopping-cart', 'shopping-bag', 'credit-card', 'banknote', 'coins', 'receipt'],
  '食事・ドリンク': ['wine', 'beer', 'coffee', 'cooking-pot', 'utensils-crossed', 'cherry', 'cake', 'ice-cream-cone'],
  '自然・天気': ['sun', 'moon', 'cloud', 'cloud-rain', 'snowflake', 'flower', 'flower-2', 'tree-pine', 'mountain', 'waves'],
  '動物': ['cat', 'dog', 'bird', 'fish', 'bug', 'rabbit', 'squirrel', 'turtle'],
  'ハート・感情': ['heart', 'heart-handshake', 'thumbs-up', 'thumbs-down', 'smile', 'laugh', 'frown', 'angry'],
  '時間': ['clock', 'calendar', 'calendar-days', 'timer', 'hourglass', 'alarm'],
  'ファイル': ['file-text', 'folder', 'book-open', 'bookmark', 'clipboard-list', 'newspaper', 'notebook-pen'],
  '建物・場所': ['building-2', 'store', 'school', 'landmark', 'map-pin', 'globe', 'compass', 'navigation'],
  'テクノロジー': ['smartphone', 'monitor', 'laptop', 'wifi', 'camera', 'qr-code', 'cpu'],
  'セキュリティ': ['shield', 'shield-check', 'lock', 'unlock', 'key', 'fingerprint'],
  'チャート': ['bar-chart-3', 'trending-up', 'trending-down', 'pie-chart', 'activity'],
  'ツール': ['tag', 'palette', 'rocket', 'alert-triangle', 'info', 'help-circle', 'image', 'download', 'upload', 'edit-3', 'wrench', 'scissors'],
  '交通': ['car', 'bike', 'plane', 'ship', 'train'],
  'その他': ['flame', 'zap', 'lightbulb', 'umbrella', 'glasses', 'shirt', 'watch', 'dumbbell', 'hash', 'infinity', 'circle-dollar-sign'],
}

// Phosphor: 表現力の高い6ウェイトアイコン（値は plain name、表示時に ph: プレフィックス付加）
const PHOSPHOR_GROUPS = {
  '定番': ['star', 'heart', 'house', 'crown', 'trophy', 'diamond', 'gift', 'bell', 'sparkle', 'confetti', 'medal', 'seal-check'],
  '音楽・配信': ['music-note', 'music-notes', 'guitar', 'headphones', 'microphone', 'microphone-stage', 'radio', 'vinyl-record', 'piano-keys', 'speaker-high', 'broadcast', 'webcam'],
  '人物': ['user', 'users', 'user-circle', 'smiley', 'smiley-wink', 'user-sound'],
  'コミュニケーション': ['chat-circle', 'chat-circle-text', 'envelope', 'paper-plane-tilt', 'phone', 'video-camera', 'megaphone'],
  '自然': ['sun', 'moon', 'cloud', 'flower', 'leaf', 'snowflake', 'tree', 'lightning', 'drop', 'fire', 'waves'],
  'テック': ['monitor', 'laptop', 'device-mobile', 'desktop', 'screencast'],
}

// Tabler: 6000+ アイコン・統一ストローク（値は plain name、tb: プレフィックス付加）
const TABLER_GROUPS = {
  '定番': ['star', 'heart', 'home', 'crown', 'trophy', 'diamond', 'gift', 'bell', 'flame', 'bolt', 'confetti', 'medal', 'award'],
  '音楽・配信': ['music', 'headphones', 'microphone', 'radio', 'piano', 'vinyl', 'speakerphone', 'broadcast', 'screen-share'],
  '人物': ['user', 'users', 'mood-smile', 'mood-happy', 'user-check'],
  'コミュニケーション': ['message-circle', 'mail', 'phone', 'video'],
  '自然': ['sun', 'moon', 'cloud', 'flower', 'leaf', 'snowflake', 'tree', 'wave-sine'],
  'テック': ['camera', 'monitor', 'device-mobile', 'device-laptop', 'wifi', 'cpu', 'chart-bar'],
  'ブランド': ['brand-twitch', 'brand-youtube', 'brand-instagram', 'brand-twitter', 'brand-tiktok', 'brand-telegram', 'brand-line'],
}

// Heroicons: Tailwind公式・シンプル（値は plain name、hi: プレフィックス付加）
const HEROICONS_GROUPS = {
  '定番': ['star', 'heart', 'home', 'gift', 'bell', 'bolt', 'fire', 'sparkles', 'trophy'],
  '音楽': ['musical-note', 'microphone', 'speaker-wave', 'play', 'film', 'tv', 'radio'],
  '人物': ['user', 'user-group', 'face-smile'],
  'コミュニケーション': ['chat-bubble-left', 'envelope', 'phone', 'video-camera', 'paper-airplane', 'megaphone'],
  '自然': ['sun', 'moon', 'cloud'],
  'テック': ['camera', 'computer-desktop', 'device-phone-mobile', 'wifi'],
  'アクション': ['magnifying-glass', 'shopping-cart', 'credit-card', 'map-pin', 'globe-alt', 'calendar', 'clock', 'tag', 'rocket-launch', 'key'],
}

const PH_WEIGHTS = ['thin', 'light', 'regular', 'bold', 'fill', 'duotone']

const TABS = [
  { id: 'emoji',    label: '絵文字',   color: 'amber' },
  { id: 'lucide',   label: 'Lucide',   color: 'light-blue' },
  { id: 'phosphor', label: 'Phosphor', color: 'violet' },
  { id: 'tabler',   label: 'Tabler',   color: 'emerald' },
  { id: 'heroicons',label: 'Heroicons',color: 'rose' },
]

const TAB_ACTIVE = {
  amber:        'bg-amber/20 text-amber border border-amber/50',
  'light-blue': 'bg-light-blue/20 text-light-blue border border-light-blue/50',
  violet:       'bg-violet-500/20 text-violet-300 border border-violet-500/50',
  emerald:      'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50',
  rose:         'bg-rose-500/20 text-rose-300 border border-rose-500/50',
}

const IconPicker = ({ value, onChange, label }) => {
  const [open, setOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [pickerPos, setPickerPos] = useState({ top: 0, left: 0, width: 384 })
  const [tab, setTab] = useState('emoji')
  const [search, setSearch] = useState('')
  const [customEmoji, setCustomEmoji] = useState('')
  const [phosphorWeight, setPhosphorWeight] = useState('regular')
  const buttonRef = useRef(null)
  const dropdownRef = useRef(null)

  const handleToggle = () => {
    if (!open && buttonRef.current) {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (!mobile) {
        const rect = buttonRef.current.getBoundingClientRect()
        const vw = window.innerWidth
        const vh = window.innerHeight
        const w = Math.min(384, vw - 16)
        const left = Math.max(8, Math.min(rect.left, vw - w - 8))
        const PICKER_H = 380
        const spaceBelow = vh - rect.bottom - 8
        const top = spaceBelow >= PICKER_H
          ? rect.bottom + 6
          : Math.max(8, rect.top - PICKER_H - 6)
        setPickerPos({ top, left, width: w })
      }
    }
    setOpen(prev => !prev)
  }

  // クリック外で閉じる（PC用）
  useEffect(() => {
    if (!open || isMobile) return
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        buttonRef.current && !buttonRef.current.contains(e.target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, isMobile])

  const activeGroups =
    tab === 'emoji' ? EMOJI_GROUPS :
    tab === 'lucide' ? LUCIDE_GROUPS :
    tab === 'phosphor' ? PHOSPHOR_GROUPS :
    tab === 'tabler' ? TABLER_GROUPS :
    HEROICONS_GROUPS

  const filteredGroups = useMemo(() => {
    if (!search) return activeGroups
    const result = {}
    Object.entries(activeGroups).forEach(([group, icons]) => {
      const filtered = icons.filter(icon => icon.includes(search.toLowerCase()))
      if (filtered.length > 0) result[group] = filtered
    })
    return result
  }, [search, activeGroups])

  // ピッカー本体（モバイル・PCで共通）
  const pickerBody = (
    <div
      ref={dropdownRef}
      className="glass-effect border border-light-blue/30 rounded-xl overflow-hidden shadow-xl"
      style={isMobile ? { width: '100%', maxWidth: 400 } : { position: 'fixed', top: pickerPos.top, left: pickerPos.left, width: pickerPos.width, zIndex: 9999 }}
    >
      {/* ヘッダー: タブ切り替え + 閉じるボタン */}
      <div className="p-2 border-b border-light-blue/20 flex gap-2 items-center">
        <div className="flex gap-1 flex-1 flex-wrap">
          {TABS.map(({ id, label: tabLabel, color }) => (
            <button
              key={id}
              type="button"
              onClick={() => { setTab(id); setSearch('') }}
              className={`px-2 py-0.5 rounded-lg text-[10px] transition-all ${
                tab === id ? TAB_ACTIVE[color] : 'text-gray-400 hover:text-white'
              }`}
            >
              {tabLabel}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="p-1.5 hover:bg-light-blue/10 rounded-lg transition-all text-gray-400 hover:text-white shrink-0"
          title="閉じる"
        >
          <IconRenderer icon="x" size={16} />
        </button>
      </div>

      {/* Phosphorウェイト選択 */}
      {tab === 'phosphor' && (
        <div className="px-2 py-1.5 border-b border-light-blue/20 flex gap-1">
          {PH_WEIGHTS.map(w => (
            <button
              key={w}
              type="button"
              onClick={() => setPhosphorWeight(w)}
              className={`flex-1 py-0.5 rounded text-[9px] transition-all ${
                phosphorWeight === w
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/50'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      )}

      {/* 検索（絵文字以外） */}
      {tab !== 'emoji' && (
        <div className="p-2 border-b border-light-blue/20">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="アイコン名で検索..."
            className="w-full px-3 py-1.5 glass-effect border border-light-blue/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber text-xs"
          />
        </div>
      )}

      <div className="max-h-64 overflow-y-auto p-2">
        {Object.entries(filteredGroups).map(([group, icons]) => (
          <div key={group} className="mb-2">
            <div className="text-[10px] text-gray-500 px-1 mb-1">{group}</div>
            <div className="grid grid-cols-9 gap-1">
              {icons.map(iconName => {
                let iconValue, displayEl
                if (tab === 'emoji') {
                  iconValue = iconName
                  displayEl = <span className="text-base leading-none">{iconName}</span>
                } else if (tab === 'lucide') {
                  iconValue = iconName
                  displayEl = <IconRenderer icon={iconName} size={16} className="text-light-blue" />
                } else if (tab === 'phosphor') {
                  iconValue = `ph:${iconName}:${phosphorWeight}`
                  displayEl = <IconRenderer icon={iconValue} size={16} className="text-violet-300" />
                } else if (tab === 'tabler') {
                  iconValue = `tb:${iconName}`
                  displayEl = <IconRenderer icon={iconValue} size={16} className="text-emerald-300" />
                } else {
                  iconValue = `hi:${iconName}`
                  displayEl = <IconRenderer icon={iconValue} size={16} className="text-rose-300" />
                }

                // Phosphorは名前が一致すればウェイト問わずハイライト
                const isSelected = tab === 'phosphor'
                  ? (value?.startsWith(`ph:${iconName}:`) || value === `ph:${iconName}`)
                  : value === iconValue

                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => { onChange(iconValue); setOpen(false) }}
                    className={`p-1.5 rounded-lg transition-all flex items-center justify-center ${
                      isSelected
                        ? 'bg-light-blue/20 border border-light-blue/50'
                        : 'hover:bg-light-blue/10'
                    }`}
                    title={tab !== 'emoji' ? iconName : undefined}
                  >
                    {displayEl}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* カスタム入力 */}
      <div className="p-2 border-t border-light-blue/20">
        <div className="text-[10px] text-gray-500 mb-1">カスタム入力</div>
        <div className="flex gap-1">
          <input
            type="text"
            value={customEmoji}
            onChange={(e) => setCustomEmoji(e.target.value)}
            placeholder="絵文字 / lucide名 / ph:name:weight / tb:name / hi:name"
            className="flex-1 px-2 py-1 glass-effect border border-light-blue/30 rounded text-white text-xs focus:outline-none focus:border-amber"
          />
          <button
            type="button"
            onClick={() => { if (customEmoji) { onChange(customEmoji); setCustomEmoji(''); setOpen(false) } }}
            className="px-2 py-1 bg-amber/20 border border-amber/50 rounded text-amber text-xs"
          >
            決定
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div>
      <div className="flex items-center gap-2">
        {label && <label className="text-sm font-body text-light-blue">{label}</label>}
        <button
          ref={buttonRef}
          type="button"
          onClick={handleToggle}
          className="flex items-center gap-1.5 px-3 py-1.5 glass-effect border border-light-blue/30 rounded-lg hover:border-amber transition-all text-sm"
        >
          <IconRenderer icon={value} size={16} />
          <span className="text-gray-400 text-xs">変更</span>
        </button>
      </div>

      {open && createPortal(
        isMobile ? (
          // スマホ: 画面中央モーダル
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.55)' }}
            onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
          >
            {pickerBody}
          </div>
        ) : (
          // PC: ボタン近傍に表示
          pickerBody
        ),
        document.body
      )}
    </div>
  )
}

export default IconPicker
