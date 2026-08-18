import IconRenderer from '../../components/IconRenderer'
import IconPicker from '../components/IconPicker'

// 新規顧客はスプレッドシートを使わない。「列インデックス」「シート上のタイトル」
// といった保存場所の話は、その人にとって決めようのない項目なので出さない。
// 並び順がそのまま列の位置になるため、位置は画面の並びから自動で決める。
const withDerivedColumns = tiers => tiers.map((tier, index) => ({ ...tier, columnIndex: index + 1 }))

const TiersTab = ({ config, updateConfig, isLegacyTenant = false }) => {
  const tiers = config.benefitTiers || []
  const commit = next => updateConfig('benefitTiers', isLegacyTenant ? next : withDerivedColumns(next))

  const updateTier = (index, field, value) => {
    if (field === 'key') {
      const duplicate = tiers.some((t, i) => i !== index && t.key === value)
      if (duplicate) return
    }
    commit(tiers.map((t, i) => i === index ? { ...t, [field]: value } : t))
  }

  const addTier = () => {
    const existingKeys = new Set(tiers.map(t => t.key))
    let num = tiers.length + 1
    while (existingKeys.has(`tier${num}`)) num++
    commit([...tiers, {
      key: isLegacyTenant ? `tier${num}` : '',
      icon: '⭐',
      columnIndex: tiers.length + 1,
      displayTemplate: '',
    }])
  }

  const removeTier = (index) => {
    if (!confirm(`「${tiers[index].key || '名前のない段階'}」を削除しますか？`)) return
    commit(tiers.filter((_, i) => i !== index))
  }

  const moveTier = (index, direction) => {
    const next = [...tiers]
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= next.length) return
    ;[next[index], next[newIndex]] = [next[newIndex], next[index]]
    commit(next)
  }

  return (
    <div data-testid="tiers-tab">
      <h2 className="text-2xl font-body text-light-blue mb-6">{isLegacyTenant ? '特典ティア設定' : '特典の段階'}</h2>
      <p className="text-sm text-gray-400 mb-6">
        {isLegacyTenant
          ? '特典の段階（ティア）を自由に追加・削除・並び替えできます。各ティアはGoogleスプレッドシートの権利者データの列に対応します。'
          : '応援の段階ごとに、受け取れるものを決めます。上から順にページへ並びます。'}
      </p>

      {tiers.length === 0 && (
        <div className="glass-effect rounded-xl p-6 border border-light-blue/20 mb-6" data-testid="tiers-empty">
          <p className="text-sm text-gray-300">まだ段階がありません。</p>
          <p className="mt-2 text-sm text-gray-400">
            下のボタンで追加してください。名前は「5K」「10K」のように応援の金額で付けると分かりやすく、
            リスナーにも伝わります。好きな名前にもできます。
          </p>
        </div>
      )}

      <div className="space-y-4 mb-6">
        {tiers.map((tier, index) => (
          <div key={index} className="glass-effect rounded-xl p-4 border border-light-blue/20">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => moveTier(index, -1)}
                  disabled={index === 0}
                  className="text-xs px-2 py-0.5 rounded bg-light-blue/10 hover:bg-light-blue/20 text-light-blue disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  ▲
                </button>
                <button
                  onClick={() => moveTier(index, 1)}
                  disabled={index === tiers.length - 1}
                  className="text-xs px-2 py-0.5 rounded bg-light-blue/10 hover:bg-light-blue/20 text-light-blue disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  ▼
                </button>
              </div>
              <IconRenderer icon={tier.icon} size={24} className="text-amber" />
              <span className="text-sm font-body text-amber font-bold">{tier.key || '（名前未入力）'}</span>
              <button
                onClick={() => removeTier(index)}
                className="ml-auto text-xs px-2 py-1 rounded bg-tuna-red/10 hover:bg-tuna-red/20 border border-tuna-red/30 text-tuna-red transition-all"
              >
                削除
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  {isLegacyTenant ? 'キー（シート上のタイトルと一致させる）' : '段階の名前'}
                </label>
                <input
                  type="text"
                  value={tier.key || ''}
                  onChange={(e) => updateTier(index, 'key', e.target.value)}
                  placeholder={isLegacyTenant ? '' : '5K'}
                  className="w-full px-3 py-1.5 glass-effect border border-light-blue/30 rounded-lg text-white placeholder-gray-600 text-sm focus:outline-none focus:border-amber"
                />
                {!isLegacyTenant && (
                  <p className="mt-1 text-xs text-gray-500">「5K」「10K」のように金額で付けるのが一般的です。好きな名前にもできます。</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">アイコン</label>
                <IconPicker
                  value={tier.icon || ''}
                  onChange={(v) => updateTier(index, 'icon', v)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              {isLegacyTenant && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">列インデックス（権利者データの何列目か、1始まり。0=メニューのみ表示）</label>
                  <input
                    type="number"
                    min="0"
                    value={tier.columnIndex ?? 0}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10)
                      if (!isNaN(v) && v >= 0) updateTier(index, 'columnIndex', v)
                    }}
                    className="w-full px-3 py-1.5 glass-effect border border-light-blue/30 rounded-lg text-white text-sm focus:outline-none focus:border-amber"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  {isLegacyTenant
                    ? <>表示テンプレート（{'{value}'} で値を置換）</>
                    : <>受け取れるもの（{'{value}'} と書くと、その人の数に置き換わります）</>}
                </label>
                <input
                  type="text"
                  value={tier.displayTemplate || ''}
                  onChange={(e) => updateTier(index, 'displayTemplate', e.target.value)}
                  placeholder="リクエスト {value}曲"
                  className="w-full px-3 py-1.5 glass-effect border border-light-blue/30 rounded-lg text-white placeholder-gray-600 text-sm focus:outline-none focus:border-amber"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tier.isBoolean || false}
                  onChange={(e) => updateTier(index, 'isBoolean', e.target.checked)}
                  className="accent-amber"
                />
                {isLegacyTenant ? '真偽値型（値の代わりに固定テキストを表示）' : '数を出さず、文章だけ見せる'}
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tier.isMembership || false}
                  onChange={(e) => updateTier(index, 'isMembership', e.target.checked)}
                  className="accent-gold"
                />
                {isLegacyTenant ? 'メンバーシップ枠（特別スタイル）' : 'メンバーシップとして目立たせる'}
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tier.useKey || false}
                  onChange={(e) => updateTier(index, 'useKey', e.target.checked)}
                  className="accent-gold"
                />
                アクセスキーで保護する
              </label>
            </div>

            {tier.useKey && (
              <div className="mt-3 space-y-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">アクセスキー</label>
                  <input
                    type="text"
                    value={tier.accessKey || ''}
                    onChange={(e) => updateTier(index, 'accessKey', e.target.value)}
                    placeholder="任意の文字列"
                    className="w-full px-3 py-1.5 glass-effect border border-gold/40 rounded-lg text-white text-sm focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">コンテンツ（テキスト）</label>
                  <textarea
                    value={tier.lockedContent?.text || ''}
                    onChange={(e) => updateTier(index, 'lockedContent', { ...(tier.lockedContent || {}), text: e.target.value })}
                    rows={3}
                    placeholder="表示するテキストを入力"
                    className="w-full px-3 py-1.5 glass-effect border border-gold/40 rounded-lg text-white text-sm focus:outline-none focus:border-gold resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">コンテンツ（画像URL）</label>
                  <input
                    type="text"
                    value={tier.lockedContent?.imageUrl || ''}
                    onChange={(e) => updateTier(index, 'lockedContent', { ...(tier.lockedContent || {}), imageUrl: e.target.value })}
                    placeholder="Google Drive URL（省略可）"
                    className="w-full px-3 py-1.5 glass-effect border border-gold/40 rounded-lg text-white text-sm focus:outline-none focus:border-gold"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={addTier}
        data-testid="tiers-add"
        className="px-4 py-2 bg-amber/20 hover:bg-amber/30 border border-amber/50 rounded-lg transition-all text-amber text-sm font-body"
      >
        {isLegacyTenant ? '+ ティアを追加' : '+ 段階を追加'}
      </button>
    </div>
  )
}

export default TiersTab
