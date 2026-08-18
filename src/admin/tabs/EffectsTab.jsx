const PARTICLE_OPTIONS = [
  { value: 'bubble', label: '泡（バブル）', preview: '○' },
  { value: 'star', label: '星（スター）', preview: '★' },
  { value: 'heart', label: 'ハート', preview: '♥' },
  { value: 'none', label: 'なし', preview: '—' },
]

const DIRECTION_OPTIONS = [
  { value: 'up', label: '下から上へ ↑' },
  { value: 'down', label: '上から下へ ↓' },
]

const SIZE_OPTIONS = [
  { value: 0.5, label: '極小' },
  { value: 0.75, label: '小' },
  { value: 1, label: '標準' },
  { value: 1.5, label: '大' },
  { value: 2, label: '極大' },
]

const EffectsTab = ({ config, updateConfig }) => {
  const effects = config.effects || {}

  return (
    <div>
      <h2 className="text-2xl font-body text-light-blue mb-6">エフェクト設定</h2>
      <p className="text-sm text-gray-400 mb-6">背景パーティクルやアイコンアニメーションを設定します。</p>

      {/* アイコン揺らぎ */}
      <h3 className="text-lg font-body text-amber mb-4">アイコン揺らぎ</h3>
      <div className="mb-6">
        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={effects.iconFloat !== false}
            onChange={(e) => updateConfig('effects.iconFloat', e.target.checked)}
            className="accent-amber"
          />
          Menu・特典一覧のアイコンを揺らす
        </label>
        <p className="text-xs text-gray-500 mt-1">OFFにするとアイコンが静止状態になります</p>
      </div>

      <hr className="border-light-blue/20 my-8" />

      {/* 背景パーティクル */}
      <h3 className="text-lg font-body text-amber mb-4">背景パーティクル</h3>

      <div className="mb-6">
        <label className="block text-xs text-gray-500 mb-2">エフェクトの種類</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {PARTICLE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateConfig('effects.particles', opt.value)}
              className={`px-3 py-3 rounded-lg border transition-all text-center ${
                (effects.particles || 'bubble') === opt.value
                  ? 'border-amber bg-amber/20 text-amber'
                  : 'border-light-blue/20 glass-effect text-gray-300 hover:border-light-blue/40'
              }`}
            >
              <div className="text-2xl mb-1">{opt.preview}</div>
              <div className="text-xs">{opt.label}</div>
            </button>
          ))}
        </div>
      </div>

      {(effects.particles || 'bubble') !== 'none' && (
        <div className="space-y-6 ml-4 border-l-2 border-light-blue/20 pl-4">
          {/* 方向 */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">流れる方向</label>
            <div className="flex gap-2">
              {DIRECTION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateConfig('effects.particleDirection', opt.value)}
                  className={`px-4 py-2 rounded-lg border transition-all text-sm ${
                    (effects.particleDirection || 'up') === opt.value
                      ? 'border-amber bg-amber/20 text-amber'
                      : 'border-light-blue/20 glass-effect text-gray-300 hover:border-light-blue/40'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* サイズ */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">サイズ</label>
            <div className="flex flex-wrap gap-2">
              {SIZE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateConfig('effects.particleSize', opt.value)}
                  className={`px-3 py-2 rounded-lg border transition-all text-sm ${
                    (effects.particleSize || 1) === opt.value
                      ? 'border-amber bg-amber/20 text-amber'
                      : 'border-light-blue/20 glass-effect text-gray-300 hover:border-light-blue/40'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 濃さ */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">
              濃さ <span className="text-amber ml-2">×{effects.particleOpacity || 1}</span>
            </label>
            <input
              type="range"
              min="0.5"
              max="5"
              step="0.5"
              value={effects.particleOpacity || 1}
              onChange={(e) => updateConfig('effects.particleOpacity', parseFloat(e.target.value))}
              className="w-full accent-amber"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>薄い</span>
              <span>濃い</span>
            </div>
          </div>

          {/* カラー */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">パーティクルの色</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={effects.particleColor || '#8ab4f8'}
                onChange={(e) => updateConfig('effects.particleColor', e.target.value)}
                className="w-10 h-10 rounded-lg border border-light-blue/30 cursor-pointer bg-transparent"
              />
              <button
                onClick={() => updateConfig('effects.particleColor', '')}
                className="px-3 py-2 text-xs rounded-lg border border-light-blue/20 glass-effect text-gray-400 hover:text-light-blue transition-all"
              >
                デフォルトに戻す
              </button>
              {effects.particleColor && (
                <span className="text-xs text-gray-500">カスタムカラー設定中</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EffectsTab
