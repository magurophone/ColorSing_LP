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
            description="サイト背景のメイン色（ダーク時は最暗、ライト時は最明）。カード背景・ティアカード背景・ヘッダー背景グラデ両端のフォールバック元"
          />
          <ColorField
            label="背景グラデーション（中間色）"
            value={c.oceanTeal}
            onChange={(v) => updateConfig('colors.oceanTeal', v)}
            description="body背景グラデの中間色 + ヘッダー背景グラデの中央 + タイトルグラデ開始色のフォールバック"
          />
          <ColorField
            label="UIメインカラー"
            value={c.lightBlue}
            onChange={(v) => updateConfig('colors.lightBlue', v)}
            description="text-primary / card-border / タイトルグラデ中間色 / スクロールバー / text-glow / water-shimmer のベース色"
          />
          <ColorField
            label="UIアクセントカラー"
            value={c.amber}
            onChange={(v) => updateConfig('colors.amber', v)}
            description="text-highlight / card-border-hover / footer-text / タイトルグラデ終了色のベース色。イベント日付・未終了イベント枠にもハードコード使用"
          />
          <ColorField
            label="強調色（1位カード・エラー）"
            value={c.accent}
            onChange={(v) => updateConfig('colors.accent', v)}
            description="1位カードの border・ポイント数 + box-glow-soft の光彩色（全ポップアップ・ランキング1位に影響）"
          />
          <ColorField
            label="プレミアムカラー"
            value={c.gold}
            onChange={(v) => updateConfig('colors.gold', v)}
            description="限定コンテンツ（アクセスキー）関連のボタン・ボーダー・モーダル枠 + メンバーシップティアカードのグラデ"
          />
        </div>
      )}

      {/* タブ2: テキスト */}
      {activeTab === 1 && (
        <div>
          <p className="text-sm text-gray-400 mb-6">未設定の場合、ベースカラーが適用されます。</p>

          {overrideField('primaryText', 'メインテキスト色',
            '全セクション見出し（Ranking/Targets/特典内容等）、目標ラベル、Sidebar/BottomNav選択中タブ、Header更新ボタン、ローディング表示、サイト名フォールバック（グラデOFF時）。未設定 → UIメインカラー',
            c.lightBlue)}
          {overrideField('accentText', 'アクセントテキスト色（内部名: highlight）',
            'ランキング2〜3位の数字、▸矢印（目標/イベント）、FAQ見出し・質問、MenuView全ティアラベル+カード名、PersonPopup人物名+全ティアヘッダー+Special権利、全アイコン類。最も広く使われるハイライト色。未設定 → UIアクセントカラー',
            c.amber)}
          {overrideField('nameText', 'カード名前テキスト色',
            '人物名カード専用（ランキングの人物名、権利者カード、枠内アイコンのユーザー名）。未設定 → ダーク時: lightBlue+白 20%ブレンド / ライト時: lightBlue+#2c1810 35%ブレンド',
            blendWithWhite(c.lightBlue, 0.2))}
          {overrideField('contentText', 'コンテンツ本文テキスト色',
            '目標内容/FAQ回答/イベント説明/MenuViewカード名+説明/PersonPopupティア+Special権利/BenefitPopup特典名+説明。未設定 → ダーク時: lightBlue+白 10%ブレンド / ライト時: lightBlue+#2c1810 25%ブレンド',
            blendWithWhite(c.lightBlue, 0.1))}
          {overrideField('footerText', 'フッターテキスト色',
            'フッターのメインテキスト（footerText のみ、副文・注釈は補足テキスト色）。未設定 → UIアクセントカラー',
            c.amber)}
          {overrideField('subText', '補足テキスト色',
            'ナビ非選択/補足テキスト/×閉じるボタン/タイムスタンプ/空状態メッセージ/フッター副文・注釈。未設定 → ダーク時: #9ca3af / ライト時: #6b5a4e（暖色茶）',
            '#9ca3af')}

          <hr className="border-light-blue/20 my-6" />
          <h3 className="text-base font-body text-amber mb-4">タイトルテキスト色</h3>

          {overrideField('titleColor', 'タイトルテキスト色（グラデOFF時）',
            'Header/Sidebar のサイト名テキスト（タイトルグラデーションOFF時のみ有効）。未設定 → primaryText → UIメインカラーの順でフォールバック',
            c.lightBlue)}

          <div className="mb-2">
            <p className="text-xs text-gray-500 mb-4">グラデーションON時のタイトル色（3色）。未設定の場合は背景グラデ中間色 → UIメイン → UIアクセントの順で適用されます。</p>
          </div>
          {overrideField('titleGradientStart', 'タイトルグラデーション（開始色）',
            'Header/Sidebar タイトルグラデの開始色（左側）。未設定 → oceanTeal（背景グラデ中間色）',
            c.oceanTeal)}
          {overrideField('titleGradientMid', 'タイトルグラデーション（中間色）',
            'タイトルグラデの中間色。未設定 → UIメインカラー（lightBlue）',
            c.lightBlue)}
          {overrideField('titleGradientEnd', 'タイトルグラデーション（終了色）',
            'タイトルグラデの終了色（右側）。未設定 → UIアクセントカラー（amber）',
            c.amber)}
        </div>
      )}

      {/* タブ3: 背景・カード */}
      {activeTab === 2 && (
        <div>
          <p className="text-sm text-gray-400 mb-6">未設定の場合、ベースカラーが適用されます。</p>

          {/* カード背景色（色 + 透明度） */}
          <div className="mb-5">
            <label className="block text-sm font-body text-light-blue mb-1">カード背景色（全ガラスエフェクト）</label>
            <p className="text-xs text-gray-500 mb-2">全glass-effect要素の背景：Home全カード、MenuViewカード（メニューカード背景未設定時）、RightsView検索+人物カード、EventViewカード、全ポップアップパネル、Sidebar、BottomNav、Header更新ボタン、IconGallery各要素。未設定 → deepBlue ベース、不透明度60%（ライト時は自動85%）</p>
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
            <label className="block text-sm font-body text-light-blue mb-1">メニューカード内側レイヤー色</label>
            <p className="text-xs text-gray-500 mb-2">MenuViewカード内側のサブレイヤー：デスクトップは上部ラベル帯、モバイルはカード内側全面を占有。未設定 → glassBgColor ベース、不透明度10%</p>
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
            <label className="block text-sm font-body text-light-blue mb-1">特典ティアカード背景色</label>
            <p className="text-xs text-gray-500 mb-2">PersonPopup（個人特典ポップアップ）の各ティアカード背景。未設定 → ダーク時: deepBlue@50% / ライト時: #ffffff@55%</p>
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
            <label className="block text-sm font-body text-light-blue mb-1">メニューカード背景色</label>
            <p className="text-xs text-gray-500 mb-2">MenuView（特典内容）のカード背景専用。未設定 → カード背景色（glassBgColor）にフォールバック、不透明度85%</p>
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

          {overrideField('backgroundMain', '背景メインカラー（override）',
            'body背景グラデーションの両端（上下）。未設定 → deepBlue',
            c.deepBlue)}
          {overrideField('backgroundMid', '背景中間グラデーション（override）',
            'body背景グラデーションの中央。未設定 → oceanTeal',
            c.oceanTeal)}
          {overrideField('cardBorder', 'カードボーダー色',
            '全カード・入力欄・ポップアップ・Sidebar境界・BottomNav境界・Footer境界・仕切り線の外枠ボーダー。未設定 → UIメインカラー',
            c.lightBlue)}
          {overrideField('cardBorderHover', 'カードボーダー（ホバー+一部常時）',
            'カードホバー時のボーダー + 一部カードの常時ボーダー（HomeView目標カード / MenuViewデスクトップのラベル帯下線）。未設定 → UIアクセントカラー',
            c.amber)}
          {overrideField('rank1Card', '1位カード強調色',
            'HomeViewの1位ランキングカードのboder色 + ポイント数テキスト色。未設定 → accent（強調色）',
            c.accent)}

          {/* ポップアップ暗幕（色 + 透明度） */}
          <div className="mb-5">
            <label className="block text-sm font-body text-light-blue mb-1">ポップアップ暗幕色</label>
            <p className="text-xs text-gray-500 mb-2">全ポップアップの背景暗幕（PersonPopup/BenefitPopup/LockedContentModal/IconGalleryモーダル）。未設定 → ダーク時: 黒@70% / ライト時: oceanTeal@55%</p>
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
          {overrideField('headerGradientStart', 'ヘッダー背景グラデ（中央・明るい側）',
            'ヘッダー背景グラデーションの中央（50%位置）の明るい色。未設定 → 背景なし（ヘッダー画像があれば画像）',
            c.oceanTeal)}
          {overrideField('headerGradientEnd', 'ヘッダー背景グラデ（両端・暗い側）',
            'ヘッダー背景グラデーションの両端（上下）の暗い色。未設定 → 背景なし',
            c.deepBlue)}
        </div>
      )}
    </div>
  )
}

export default ColorsTab
