import { useState } from 'react'
import { COLOR_PRESETS } from '../../lib/presets'

const ColorField = ({ label, value, onChange, onClear, description, pickerValue }) => (
  <div className="mb-5">
    <label className="block text-sm font-body text-light-blue mb-1">{label}</label>
    {description && <p className="text-xs text-gray-500 mb-1">{description}</p>}
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={pickerValue || value || '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="w-12 h-10 rounded-lg border border-light-blue/30 cursor-pointer bg-transparent"
      />
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={!value && pickerValue ? pickerValue : '未設定'}
        className="flex-1 px-4 py-2 glass-effect border border-light-blue/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber transition-all text-sm font-mono"
      />
      {value && onClear && (
        <button
          onClick={onClear}
          className="px-3 py-2 text-xs text-gray-400 hover:text-tuna-red transition-all"
          title="リセット"
        >
          クリア
        </button>
      )}
      <div
        className="w-10 h-10 rounded-lg border border-light-blue/30"
        style={{ backgroundColor: pickerValue || value || '#000000' }}
      />
    </div>
  </div>
)

// CSS color-mix(in oklab) の近似計算（ピッカー表示用）
const blendWithWhite = (hex, ratio) => {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return '#ffffff'
  // sRGB → Linear
  const toLinear = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  const lr = toLinear(parseInt(hex.slice(1, 3), 16) / 255)
  const lg = toLinear(parseInt(hex.slice(3, 5), 16) / 255)
  const lb = toLinear(parseInt(hex.slice(5, 7), 16) / 255)
  // Linear RGB → OKLAB
  const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_
  const A = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
  // White in OKLAB = [1, 0, 0]. Blend in OKLAB space.
  const bL = L * ratio + (1 - ratio)
  const bA = A * ratio
  const bB = B * ratio
  // OKLAB → Linear RGB
  const bl_ = bL + 0.3963377774 * bA + 0.2158037573 * bB
  const bm_ = bL - 0.1055613458 * bA - 0.0638541728 * bB
  const bs_ = bL - 0.0894841775 * bA - 1.2914855480 * bB
  const rl = bl_ ** 3, rm = bm_ ** 3, rs = bs_ ** 3
  const rr =  4.0767416621 * rl - 3.3077115913 * rm + 0.2309699292 * rs
  const rg = -1.2684380046 * rl + 2.6097574011 * rm - 0.3413193965 * rs
  const rb = -0.0041960863 * rl - 0.7034186147 * rm + 1.7076147010 * rs
  // Linear → sRGB → clamp → hex
  const toSRGB = c => Math.max(0, Math.min(1, c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055))
  const out = [rr, rg, rb].map(c => Math.round(toSRGB(c) * 255).toString(16).padStart(2, '0'))
  return `#${out.join('')}`
}

// rgba プレビュー計算（opacity = 0〜1 の不透明度）
const toRgba = (hex, opacity) => {
  const col = hex || '#000000'
  const r = parseInt(col.slice(1, 3), 16)
  const g = parseInt(col.slice(3, 5), 16)
  const b = parseInt(col.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${opacity})`
}

const TABS = ['ベースカラー', 'テキスト', '背景・カード']

const ColorsTab = ({ config, updateConfig }) => {
  const [activeTab, setActiveTab] = useState(0)

  const applyPreset = (preset) => {
    // オーバーライドをクリア（残存防止）
    const overrideKeys = [
      'headerGradientStart', 'headerGradientEnd',
      'titleGradientStart', 'titleGradientMid', 'titleGradientEnd',
      'primaryText', 'accentText', 'nameText', 'contentText', 'footerText', 'titleColor',
      'glassBgColor', 'glassBgOpacity',
      'tierCardBgColor', 'tierCardBgOpacity',
      'menuCardBgColor', 'menuCardBgOpacity',
      'popupOverlayColor', 'popupOverlayOpacity',
      'menuCardLabelColor', 'menuCardLabelOpacity',
      'backgroundMain', 'backgroundMid', 'cardBorder', 'cardBorderHover', 'rank1Card',
      'subText',
    ]
    overrideKeys.forEach((key) => updateConfig(`colorOverrides.${key}`, ''))
    Object.entries(preset.colors).forEach(([key, value]) => {
      updateConfig(`colors.${key}`, value)
    })
    updateConfig('colors.brightness', preset.brightness ?? 'dark')
  }

  const o = config.colorOverrides || {}
  const c = config.colors || {}

  const overrideField = (key, label, description, baseValue) => (
    <ColorField
      key={key}
      label={label}
      description={description}
      value={o[key] || ''}
      pickerValue={o[key] || baseValue || '#000000'}
      onChange={(v) => updateConfig(`colorOverrides.${key}`, v)}
      onClear={() => updateConfig(`colorOverrides.${key}`, '')}
    />
  )

  // 透明度スライダー: UIは「透明度(%)」で表示（100%=完全透明）、内部はopacity(0〜1)で保存
  // opacityDefault: 未設定時のデフォルト不透明度
  const opacitySlider = (opacityKey, opacityDefault) => {
    const opacity = o[opacityKey] !== '' && o[opacityKey] != null ? o[opacityKey] : opacityDefault
    const transparency = 1 - opacity  // UIに表示する透明度（0〜1）
    return {
      sliderValue: transparency,
      displayPct: Math.round(transparency * 100),
      onChange: (e) => updateConfig(`colorOverrides.${opacityKey}`, 1 - parseFloat(e.target.value)),
    }
  }

  const glassSlider = opacitySlider('glassBgOpacity', 0.6)
  const tierCardSlider = opacitySlider('tierCardBgOpacity', 0.5)
  const menuCardSlider = opacitySlider('menuCardBgOpacity', 0.85)
  const popupSlider = opacitySlider('popupOverlayOpacity', 0.7)
  const menuLabelSlider = opacitySlider('menuCardLabelOpacity', 0.1)

  const glassHasChange = o.glassBgColor || (o.glassBgOpacity !== '' && o.glassBgOpacity != null)
  const tierCardHasChange = o.tierCardBgColor || (o.tierCardBgOpacity !== '' && o.tierCardBgOpacity != null)
  const menuCardHasChange = o.menuCardBgColor || (o.menuCardBgOpacity !== '' && o.menuCardBgOpacity != null)
  const popupHasChange = o.popupOverlayColor || (o.popupOverlayOpacity !== '' && o.popupOverlayOpacity != null)
  const menuLabelHasChange = o.menuCardLabelColor || (o.menuCardLabelOpacity !== '' && o.menuCardLabelOpacity != null)

  return (
    <div>
      <h2 className="text-2xl font-body text-light-blue mb-6">カラー設定</h2>

      {/* タブ切り替え */}
      <div className="flex gap-2 mb-6">
        {TABS.map((tab, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${
              activeTab === i
                ? 'bg-amber/30 border border-amber/60 text-amber'
                : 'glass-effect border border-light-blue/30 text-gray-300 hover:border-amber/40'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* タブ1: ベースカラー */}
      {activeTab === 0 && (
        <div>
          <p className="text-sm text-gray-400 mb-4">プリセットを選ぶか、個別にカスタマイズできます。ベースカラーはサイト全体の色調を決めます。</p>

          <div className="flex flex-wrap gap-3 mb-8">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className="flex items-center gap-2 px-3 py-2 glass-effect border border-light-blue/30 rounded-lg hover:border-amber transition-all text-sm"
              >
                <div className="flex gap-1">
                  {[preset.colors.deepBlue, preset.colors.lightBlue, preset.colors.amber, preset.colors.accent].map((col, i) => (
                    <div key={i} className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: col }} />
                  ))}
                </div>
                <div className="flex flex-col items-start gap-0.5">
                  <span className="text-gray-300 leading-tight">{preset.name}</span>
                  <span className={`text-[9px] px-1.5 py-px rounded-full leading-tight ${
                    (preset.brightness ?? 'dark') === 'light'
                      ? 'bg-light-blue/20 text-light-blue/70'
                      : 'bg-amber/25 text-amber/80'
                  }`}>
                    {(preset.brightness ?? 'dark') === 'light' ? 'ライト' : 'ダーク'}
                  </span>
                </div>
              </button>
            ))}
          </div>

          <ColorField
            label="背景メイン"
            value={c.deepBlue}
            onChange={(v) => updateConfig('colors.deepBlue', v)}
            description="ページ背景の基本色。ダークテーマでは一番濃く、ライトテーマでは一番淡く表示されます"
          />
          <ColorField
            label="背景グラデーション（中間色）"
            value={c.oceanTeal}
            onChange={(v) => updateConfig('colors.oceanTeal', v)}
            description="ページ背景の真ん中に使われる色。ヘッダー背景とサイトタイトルのグラデーションにも関係します"
          />
          <ColorField
            label="UIメインカラー"
            value={c.lightBlue}
            onChange={(v) => updateConfig('colors.lightBlue', v)}
            description="見出し・ボーダー・スクロールバーなど、サイト全体で最も広く使われるベースの色"
          />
          <ColorField
            label="UIアクセントカラー"
            value={c.amber}
            onChange={(v) => updateConfig('colors.amber', v)}
            description="強調表示の文字・ホバー時のボーダー・フッター・イベント日付などに使われるアクセント色"
          />
          <ColorField
            label="強調色（1位カード）"
            value={c.accent}
            onChange={(v) => updateConfig('colors.accent', v)}
            description="1位ランキングカードの枠線・ポイント数 + 全ポップアップの周りの光彩"
          />
          <ColorField
            label="プレミアムカラー"
            value={c.gold}
            onChange={(v) => updateConfig('colors.gold', v)}
            description="アクセスキー付き限定コンテンツのボタン・枠線 + メンバーシップ特典カードの装飾色"
          />
        </div>
      )}

      {/* タブ2: テキスト */}
      {activeTab === 1 && (
        <div>
          <p className="text-sm text-gray-400 mb-6">未設定の場合、ベースカラーが適用されます。</p>

          {overrideField('primaryText', 'メインテキスト色（見出し・選択中タブ）',
            '各ページの大見出し（Ranking・Targets・特典内容 など）、ナビの選択中タブ、更新ボタン、ローディング表示の文字色',
            c.lightBlue)}
          {overrideField('accentText', 'アクセントテキスト色（強調文字全般）',
            'ランキング2〜3位の数字、目標やFAQの▸矢印、FAQ見出し、特典ラベル（1k/3k等）、人物名ポップアップの名前、全アイコン類 ― 最も目立つ場所に使われる強調色',
            c.amber)}
          {overrideField('nameText', '人物名テキスト色',
            'ランキング・特典権利者・枠内アイコンに表示される各人物の名前の色',
            blendWithWhite(c.lightBlue, 0.2))}
          {overrideField('contentText', '本文テキスト色',
            '目標の内容、FAQ回答、イベント説明、特典の名前・説明文などの本文テキストの色',
            blendWithWhite(c.lightBlue, 0.1))}
          {overrideField('footerText', 'フッターメインテキスト色',
            'ページ下部フッターのメイン行の色（副文・注釈は「補足テキスト色」で調整）',
            c.amber)}
          {overrideField('subText', '補足テキスト色（脇役全般）',
            'タイムスタンプ、×閉じるボタン、ナビの非選択タブ、空の一覧メッセージ、フッターの副文・注釈、「歌推しPt」ラベルなど',
            '#9ca3af')}

          <hr className="border-light-blue/20 my-6" />
          <h3 className="text-base font-body text-amber mb-4">タイトルテキスト色</h3>

          {overrideField('titleColor', 'タイトル単色（グラデOFF時）',
            'サイト名（ヘッダー・サイドバー）を単色で表示するときの色。タイトルのグラデーションをOFFにしている場合のみ反映されます',
            c.lightBlue)}

          <div className="mb-2">
            <p className="text-xs text-gray-500 mb-4">サイト名のグラデーション（3色）。タイトルグラデーションをONにしている場合に使われます。</p>
          </div>
          {overrideField('titleGradientStart', 'サイト名グラデ（左側）',
            'サイト名グラデーションの左端の色',
            c.oceanTeal)}
          {overrideField('titleGradientMid', 'サイト名グラデ（真ん中）',
            'サイト名グラデーションの真ん中の色',
            c.lightBlue)}
          {overrideField('titleGradientEnd', 'サイト名グラデ（右側）',
            'サイト名グラデーションの右端の色',
            c.amber)}
        </div>
      )}

      {/* タブ3: 背景・カード */}
      {activeTab === 2 && (
        <div>
          <p className="text-sm text-gray-400 mb-6">未設定の場合、ベースカラーが適用されます。</p>

          {/* カード背景色（色 + 透明度） */}
          <div className="mb-5">
            <label className="block text-sm font-body text-light-blue mb-1">カード背景色（サイト全体）</label>
            <p className="text-xs text-gray-500 mb-2">サイト上の全てのカード・ポップアップ・ナビ・入力欄の背景色（ホームのランキング/目標/イベントカード、特典カード、人物ポップアップ、サイドバー、メニューバーなど全て）</p>
            <div className="flex items-center gap-3 mb-2">
              <input
                type="color"
                value={o.glassBgColor || c.deepBlue || '#0a1628'}
                onChange={(e) => updateConfig('colorOverrides.glassBgColor', e.target.value)}
                className="w-12 h-10 rounded-lg border border-light-blue/30 cursor-pointer bg-transparent"
              />
              <span className="text-xs text-gray-400 w-16">透明度</span>
              <input
                type="range"
                min="0" max="1" step="0.05"
                value={glassSlider.sliderValue}
                onChange={glassSlider.onChange}
                className="flex-1"
              />
              <span className="text-xs text-gray-300 w-10 text-right">
                {glassSlider.displayPct}%
              </span>
              {glassHasChange && (
                <button
                  onClick={() => { updateConfig('colorOverrides.glassBgColor', ''); updateConfig('colorOverrides.glassBgOpacity', '') }}
                  className="px-3 py-2 text-xs text-gray-400 hover:text-tuna-red transition-all"
                  title="リセット"
                >クリア</button>
              )}
              <div
                className="w-10 h-10 rounded-lg border border-light-blue/30"
                style={{ backgroundColor: toRgba(o.glassBgColor || c.deepBlue || '#0a1628', 1 - glassSlider.sliderValue) }}
              />
            </div>
          </div>

          {/* メニューカードラベル背景色（色 + 透明度） */}
          <div className="mb-5">
            <label className="block text-sm font-body text-light-blue mb-1">特典カード内側の色掛け</label>
            <p className="text-xs text-gray-500 mb-2">特典内容ページのカード内側に重ねる色。PC版ではカード上部のラベル帯、スマホ版ではカード全面に適用されます（カード背景色の上に薄く重なります）</p>
            <div className="flex items-center gap-3 mb-2">
              <input
                type="color"
                value={o.menuCardLabelColor || o.accentText || c.amber || '#d4a574'}
                onChange={(e) => updateConfig('colorOverrides.menuCardLabelColor', e.target.value)}
                className="w-12 h-10 rounded-lg border border-light-blue/30 cursor-pointer bg-transparent"
              />
              <span className="text-xs text-gray-400 w-16">透明度</span>
              <input
                type="range"
                min="0" max="1" step="0.05"
                value={menuLabelSlider.sliderValue}
                onChange={menuLabelSlider.onChange}
                className="flex-1"
              />
              <span className="text-xs text-gray-300 w-10 text-right">
                {menuLabelSlider.displayPct}%
              </span>
              {menuLabelHasChange && (
                <button
                  onClick={() => { updateConfig('colorOverrides.menuCardLabelColor', ''); updateConfig('colorOverrides.menuCardLabelOpacity', '') }}
                  className="px-3 py-2 text-xs text-gray-400 hover:text-tuna-red transition-all"
                  title="リセット"
                >クリア</button>
              )}
              <div
                className="w-10 h-10 rounded-lg border border-light-blue/30"
                style={{ backgroundColor: toRgba(o.menuCardLabelColor || o.accentText || c.amber || '#d4a574', 1 - menuLabelSlider.sliderValue) }}
              />
            </div>
          </div>

          {/* ティアカード背景色（色 + 透明度） */}
          <div className="mb-5">
            <label className="block text-sm font-body text-light-blue mb-1">人物ポップアップ内のティアカード背景</label>
            <p className="text-xs text-gray-500 mb-2">人物名をタップして開くポップアップ内に並ぶ、各特典ティア（1k・3k・5k…）カードの背景色</p>
            <div className="flex items-center gap-3 mb-2">
              <input
                type="color"
                value={o.tierCardBgColor || c.deepBlue || '#0a1628'}
                onChange={(e) => updateConfig('colorOverrides.tierCardBgColor', e.target.value)}
                className="w-12 h-10 rounded-lg border border-light-blue/30 cursor-pointer bg-transparent"
              />
              <span className="text-xs text-gray-400 w-16">透明度</span>
              <input
                type="range"
                min="0" max="1" step="0.05"
                value={tierCardSlider.sliderValue}
                onChange={tierCardSlider.onChange}
                className="flex-1"
              />
              <span className="text-xs text-gray-300 w-10 text-right">
                {tierCardSlider.displayPct}%
              </span>
              {tierCardHasChange && (
                <button
                  onClick={() => { updateConfig('colorOverrides.tierCardBgColor', ''); updateConfig('colorOverrides.tierCardBgOpacity', '') }}
                  className="px-3 py-2 text-xs text-gray-400 hover:text-tuna-red transition-all"
                  title="リセット"
                >クリア</button>
              )}
              <div
                className="w-10 h-10 rounded-lg border border-light-blue/30"
                style={{ backgroundColor: toRgba(o.tierCardBgColor || c.deepBlue || '#0a1628', 1 - tierCardSlider.sliderValue) }}
              />
            </div>
          </div>

          {/* メニューカード背景色（色 + 透明度） */}
          <div className="mb-5">
            <label className="block text-sm font-body text-light-blue mb-1">特典内容ページのカード背景</label>
            <p className="text-xs text-gray-500 mb-2">特典内容ページ専用のカード背景色。ここだけ他のカードと違う色にしたい場合に使います（未設定なら「カード背景色」と同じ）</p>
            <div className="flex items-center gap-3 mb-2">
              <input
                type="color"
                value={o.menuCardBgColor || o.glassBgColor || c.deepBlue || '#0a1628'}
                onChange={(e) => updateConfig('colorOverrides.menuCardBgColor', e.target.value)}
                className="w-12 h-10 rounded-lg border border-light-blue/30 cursor-pointer bg-transparent"
              />
              <span className="text-xs text-gray-400 w-16">透明度</span>
              <input
                type="range"
                min="0" max="1" step="0.05"
                value={menuCardSlider.sliderValue}
                onChange={menuCardSlider.onChange}
                className="flex-1"
              />
              <span className="text-xs text-gray-300 w-10 text-right">
                {menuCardSlider.displayPct}%
              </span>
              {menuCardHasChange && (
                <button
                  onClick={() => { updateConfig('colorOverrides.menuCardBgColor', ''); updateConfig('colorOverrides.menuCardBgOpacity', '') }}
                  className="px-3 py-2 text-xs text-gray-400 hover:text-tuna-red transition-all"
                  title="リセット"
                >クリア</button>
              )}
              <div
                className="w-10 h-10 rounded-lg border border-light-blue/30"
                style={{ backgroundColor: toRgba(o.menuCardBgColor || o.glassBgColor || c.deepBlue || '#0a1628', 1 - menuCardSlider.sliderValue) }}
              />
            </div>
          </div>

          {overrideField('backgroundMain', 'ページ背景（上下）',
            'ページ背景のグラデーションで、画面の上端と下端に使う色',
            c.deepBlue)}
          {overrideField('backgroundMid', 'ページ背景（中央）',
            'ページ背景のグラデーションで、画面中央に使う色',
            c.oceanTeal)}
          {overrideField('cardBorder', 'カード枠線色',
            '全てのカード・入力欄・ポップアップ・サイドバー・メニューバーの枠線の色',
            c.lightBlue)}
          {overrideField('cardBorderHover', 'カード枠線（ホバー/強調用）',
            'カードにマウスを乗せたときの枠線色。加えて目標カードの枠線と、特典内容カードのラベル帯の仕切り線にも常時使われます',
            c.amber)}
          {overrideField('rank1Card', '1位カード強調色',
            '1位ランキングカードの枠線とポイント数の色',
            c.accent)}

          {/* ポップアップ暗幕（色 + 透明度） */}
          <div className="mb-5">
            <label className="block text-sm font-body text-light-blue mb-1">ポップアップの背景幕</label>
            <p className="text-xs text-gray-500 mb-2">ポップアップを開いたとき、後ろに被せる色付きの幕。ダークテーマでは黒系、ライトテーマでは自動的に明るい色になります</p>
            <div className="flex items-center gap-3 mb-2">
              <input
                type="color"
                value={o.popupOverlayColor || '#000000'}
                onChange={(e) => updateConfig('colorOverrides.popupOverlayColor', e.target.value)}
                className="w-12 h-10 rounded-lg border border-light-blue/30 cursor-pointer bg-transparent"
              />
              <span className="text-xs text-gray-400 w-16">透明度</span>
              <input
                type="range"
                min="0" max="1" step="0.05"
                value={popupSlider.sliderValue}
                onChange={popupSlider.onChange}
                className="flex-1"
              />
              <span className="text-xs text-gray-300 w-10 text-right">
                {popupSlider.displayPct}%
              </span>
              {popupHasChange && (
                <button
                  onClick={() => { updateConfig('colorOverrides.popupOverlayColor', ''); updateConfig('colorOverrides.popupOverlayOpacity', '') }}
                  className="px-3 py-2 text-xs text-gray-400 hover:text-tuna-red transition-all"
                  title="リセット"
                >クリア</button>
              )}
              <div
                className="w-10 h-10 rounded-lg border border-light-blue/30"
                style={{ backgroundColor: toRgba(o.popupOverlayColor || '#000000', 1 - popupSlider.sliderValue) }}
              />
            </div>
          </div>

          {/* ヘッダー背景グラデーション */}
          <hr className="border-light-blue/20 my-6" />
          <h3 className="text-base font-body text-amber mb-2">ヘッダー背景グラデーション</h3>
          <p className="text-xs text-gray-500 mb-4">未設定の場合、ヘッダー背景はグラデーションなし（透明）。画像がある場合は画像が表示されます。</p>
          {overrideField('headerGradientStart', 'ヘッダー背景グラデ（真ん中の明るい色）',
            'ヘッダー背景の真ん中に使う明るい色。未設定ならヘッダー背景なし（画像があれば画像のみ）',
            c.oceanTeal)}
          {overrideField('headerGradientEnd', 'ヘッダー背景グラデ（上下の暗い色）',
            'ヘッダー背景の上端と下端に使う暗い色。未設定ならヘッダー背景なし',
            c.deepBlue)}
        </div>
      )}
    </div>
  )
}

export default ColorsTab
