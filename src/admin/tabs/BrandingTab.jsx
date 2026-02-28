const Field = ({ label, value, onChange, placeholder, description }) => (
  <div className="mb-5">
    <label className="block text-sm font-body text-light-blue mb-1">{label}</label>
    {description && <p className="text-xs text-gray-500 mb-1">{description}</p>}
    <input
      type="text"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-2 glass-effect border border-light-blue/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber transition-all text-sm"
    />
  </div>
)

import { useState } from 'react'
import { FONT_PRESETS, BODY_FONT_PRESETS } from '../../lib/presets'
import FontPicker from '../components/FontPicker'

const BrandingTab = ({ config, updateConfig }) => {
  const [showDisplayPicker, setShowDisplayPicker] = useState(false)
  const [showBodyPicker, setShowBodyPicker] = useState(false)

  const applyDisplayPreset = (preset) => {
    updateConfig('fonts.display', preset.fonts.display)
    updateConfig('fonts.displayUrl', preset.fonts.displayUrl)
  }

  const applyBodyPreset = (preset) => {
    updateConfig('fonts.body', preset.body)
    updateConfig('fonts.bodyUrl', preset.googleFontsUrl || '')
  }

  const handleDisplayFontSelect = (font) => {
    updateConfig('fonts.display', font.cssFamily)
    updateConfig('fonts.displayUrl', font.cssUrl)
    setShowDisplayPicker(false)
  }

  const handleBodyFontSelect = (font) => {
    updateConfig('fonts.body', font.cssFamily)
    updateConfig('fonts.bodyUrl', font.cssUrl)
    setShowBodyPicker(false)
  }

  return (
    <div>
      <h2 className="text-2xl font-body text-light-blue mb-6">ブランディング</h2>
      <p className="text-sm text-gray-400 mb-6">サイト名やフッターのテキストを設定します。</p>

      <Field
        label="サイト名（ヘッダー表示）"
        value={config.brand.name}
        onChange={(v) => updateConfig('brand.name', v)}
        placeholder="サイト名やブランド名を入力"
        description="ヘッダー画像上に大きく表示されるタイトル"
      />

      <div className="mb-3 flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={config.brand.showHeader !== false}
            onChange={(e) => updateConfig('brand.showHeader', e.target.checked)}
            className="accent-amber"
          />
          ヘッダー画像エリアを表示
        </label>
      </div>
      <p className="text-xs text-gray-500 mb-5 ml-6">OFFにすると大きなヘッダー領域を非表示にしてタイトルをコンパクト表示します（画像なしの場合に推奨）</p>

      <div className="mb-5 flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={config.brand.showTitle !== false}
            onChange={(e) => updateConfig('brand.showTitle', e.target.checked)}
            className="accent-amber"
          />
          ヘッダーにタイトルを表示
        </label>
      </div>

      {config.brand.showTitle !== false && (
        <div className="mb-5 space-y-3 ml-4 border-l-2 border-light-blue/20 pl-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">タイトルスタイル</label>
            <select
              value={config.brand.titleStyle || 'glass'}
              onChange={(e) => updateConfig('brand.titleStyle', e.target.value)}
              className="px-3 py-1.5 glass-effect border border-light-blue/30 rounded-lg text-white text-sm focus:outline-none focus:border-amber bg-transparent"
            >
              <option value="glass">ガラス（フロストガラス帯・推奨）</option>
              <option value="gradient">グラデーション（従来）</option>
              <option value="plain">単色</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={config.brand.titleGlow !== false}
              onChange={(e) => updateConfig('brand.titleGlow', e.target.checked)}
              className="accent-amber"
            />
            タイトルにグロー（発光）エフェクトを適用
          </label>

          {(config.brand.titleStyle || 'glass') === 'gradient' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">グラデーション方向</label>
              <select
                value={config.brand.titleGradientDirection || 'to-r'}
                onChange={(e) => updateConfig('brand.titleGradientDirection', e.target.value)}
                className="px-3 py-1.5 glass-effect border border-light-blue/30 rounded-lg text-white text-sm focus:outline-none focus:border-amber bg-transparent"
              >
                <option value="to-r">右へ →</option>
                <option value="to-l">左へ ←</option>
                <option value="to-b">下へ ↓</option>
                <option value="to-t">上へ ↑</option>
                <option value="to-br">右下へ ↘</option>
                <option value="to-bl">左下へ ↙</option>
                <option value="to-tr">右上へ ↗</option>
                <option value="to-tl">左上へ ↖</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">グラデーション色は「カラー設定 → テキスト」タブで変更できます</p>
            </div>
          )}

          {(config.brand.titleStyle || 'glass') === 'plain' && (
            <p className="text-xs text-gray-500">単色の色は「カラー設定 → テキスト」タブの「タイトルテキスト色」で設定できます</p>
          )}

          <div>
            <label className="block text-xs text-gray-500 mb-1">タイトル位置</label>
            <select
              value={config.brand.titlePosition || 'center'}
              onChange={(e) => updateConfig('brand.titlePosition', e.target.value)}
              className="px-3 py-1.5 glass-effect border border-light-blue/30 rounded-lg text-white text-sm focus:outline-none focus:border-amber bg-transparent"
            >
              <option value="center">中央</option>
              <option value="top-left">左上</option>
              <option value="top-right">右上</option>
              <option value="bottom-left">左下</option>
              <option value="bottom-right">右下</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              文字サイズ：{['小', '中', '大', '特大'][(['small','medium','large','xlarge'].indexOf(config.brand.titleSize || 'large'))]}
            </label>
            <input type="range" min="0" max="3" step="1"
              value={['small','medium','large','xlarge'].indexOf(config.brand.titleSize || 'large')}
              onChange={(e) => updateConfig('brand.titleSize', ['small','medium','large','xlarge'][+e.target.value])}
              className="w-full accent-amber"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-0.5">
              <span>小</span><span>中</span><span>大</span><span>特大</span>
            </div>
          </div>

          {(config.brand.titleStyle || 'glass') === 'glass' && (
            <div className="space-y-3 pl-3 border-l-2 border-amber/20">
              <div>
                <label className="block text-xs text-gray-500 mb-1">文字カラー</label>
                <div className="flex gap-2 flex-wrap">
                  {[['default','タイトルカラー追従'],['gradient','グラデーション']].map(([v, label]) => (
                    <button key={v}
                      onClick={() => updateConfig('brand.titleTextFill', v)}
                      className={`px-3 py-1 rounded text-xs transition-all ${(config.brand.titleTextFill || 'default') === v ? 'bg-amber text-deep-blue font-bold' : 'glass-effect border border-light-blue/30 text-gray-300'}`}
                    >{label}</button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">色は「カラー設定 → テキスト → タイトルテキスト色」で変更できます</p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  ガラス背景の濃さ：{Math.round((config.brand.titleGlassBg ?? 0.35) * 100)}%
                </label>
                <input type="range" min="0" max="100" step="5"
                  value={Math.round((config.brand.titleGlassBg ?? 0.35) * 100)}
                  onChange={(e) => updateConfig('brand.titleGlassBg', +e.target.value / 100)}
                  className="w-full accent-amber"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  ブラーの強さ：{config.brand.titleGlassBlur ?? 12}
                </label>
                <input type="range" min="0" max="40" step="1"
                  value={config.brand.titleGlassBlur ?? 12}
                  onChange={(e) => updateConfig('brand.titleGlassBlur', +e.target.value)}
                  className="w-full accent-amber"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  上下の余白：{config.brand.titlePaddingY ?? 12}
                </label>
                <input type="range" min="0" max="60" step="2"
                  value={config.brand.titlePaddingY ?? 12}
                  onChange={(e) => updateConfig('brand.titlePaddingY', +e.target.value)}
                  className="w-full accent-amber"
                />
              </div>
            </div>
          )}
        </div>
      )}

      <Field
        label="サイドバータイトル"
        value={config.brand.sidebarTitle}
        onChange={(v) => updateConfig('brand.sidebarTitle', v)}
        placeholder="短縮名やブランド名を入力"
        description="デスクトップ版サイドバーに表示されるブランド名"
      />
      <Field
        label="ページタイトル"
        value={config.brand.pageTitle}
        onChange={(v) => updateConfig('brand.pageTitle', v)}
        placeholder="サイト名 - 特典管理"
        description="ブラウザタブに表示されるタイトル"
      />

      <hr className="border-light-blue/20 my-8" />
      <h3 className="text-lg font-body text-amber mb-4">フッター設定</h3>

      <Field
        label="フッターメインテキスト"
        value={config.brand.footerText}
        onChange={(v) => updateConfig('brand.footerText', v)}
        placeholder="フッターに表示するメインテキスト"
      />
      <Field
        label="フッターサブテキスト"
        value={config.brand.footerSubText}
        onChange={(v) => updateConfig('brand.footerSubText', v)}
        placeholder="フッターに表示するサブテキスト"
      />
      <Field
        label="フッター注記"
        value={config.brand.footerNote}
        onChange={(v) => updateConfig('brand.footerNote', v)}
        placeholder="フッター下部の補足テキスト"
      />

      <hr className="border-light-blue/20 my-8" />
      <h3 className="text-lg font-body text-amber mb-4">ローディング表示</h3>

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="ローディング絵文字"
          value={config.brand.loadingEmoji}
          onChange={(v) => updateConfig('brand.loadingEmoji', v)}
          placeholder="絵文字を入力"
        />
        <Field
          label="ローディングテキスト"
          value={config.brand.loadingText}
          onChange={(v) => updateConfig('brand.loadingText', v)}
          placeholder="Loading..."
        />
      </div>

      <hr className="border-light-blue/20 my-8" />
      <h3 className="text-lg font-body text-amber mb-4">ヘッダー画像</h3>
      <p className="text-xs text-gray-500 mb-3">Google DriveのURLまたはファイルパスを指定します。未設定の場合は <code className="text-gray-400">public/customer/</code> 内の画像が使われます。</p>

      <Field
        label="ヘッダー画像（PC用）"
        value={config.images?.headerDesktop}
        onChange={(v) => updateConfig('images.headerDesktop', v)}
        placeholder="https://drive.google.com/file/d/xxx/view  または  ./customer/header.png"
        description="横長画像（1920×600px推奨）。Google DriveのURLを貼り付けるか、ファイルパスを入力"
      />
      <Field
        label="ヘッダー画像（モバイル用）"
        value={config.images?.headerMobile}
        onChange={(v) => updateConfig('images.headerMobile', v)}
        placeholder="https://drive.google.com/file/d/xxx/view  または  ./customer/header-mobile.png"
        description="横長画像（750×400px推奨）。省略するとPC用画像が使われます"
      />

      <div className="mb-5">
        <label className="block text-sm font-body text-light-blue mb-1">オーバーレイの暗さ</label>
        <p className="text-xs text-gray-500 mb-2">画像上の黒い半透明レイヤーの濃さ（0=なし〜1=真っ黒）</p>
        <div className="flex items-center gap-3">
          <input
            type="range" min="0" max="1" step="0.05"
            value={config.brand.headerOverlayOpacity ?? 0.3}
            onChange={(e) => updateConfig('brand.headerOverlayOpacity', parseFloat(e.target.value))}
            className="flex-1 accent-amber"
          />
          <span className="text-sm text-gray-300 w-10 text-right">{Math.round((config.brand.headerOverlayOpacity ?? 0.3) * 100)}%</span>
        </div>
      </div>

      <hr className="border-light-blue/20 my-8" />
      <h3 className="text-lg font-body text-amber mb-4">タイトルフォント</h3>
      <p className="text-xs text-gray-500 mb-3">ヘッダーやサイドバーのブランド名に使われる装飾フォント</p>

      <div className="flex flex-wrap gap-2 mb-4">
        {FONT_PRESETS.map((preset) => (
          <button
            key={preset.name}
            onClick={() => applyDisplayPreset(preset)}
            className="px-3 py-2 glass-effect border border-light-blue/30 rounded-lg hover:border-amber transition-all text-sm"
          >
            <span className="text-gray-300">{preset.name}</span>
            <span className="text-xs text-gray-500 ml-1">({preset.category})</span>
          </button>
        ))}
      </div>

      <button
        onClick={() => setShowDisplayPicker(!showDisplayPicker)}
        className="mb-4 px-4 py-2 bg-light-blue/10 hover:bg-light-blue/20 border border-light-blue/30 rounded-lg transition-all text-light-blue text-xs font-body"
      >
        {showDisplayPicker ? 'フォントブラウザを閉じる' : 'もっと探す（60+フォント）'}
      </button>

      {showDisplayPicker && (
        <div className="mb-4">
          <FontPicker onSelect={handleDisplayFontSelect} onClose={() => setShowDisplayPicker(false)} />
        </div>
      )}

      <Field
        label="タイトルフォント"
        value={config.fonts?.display}
        onChange={(v) => updateConfig('fonts.display', v)}
        placeholder="'Playfair Display', serif"
      />
      <Field
        label="タイトルフォントURL（Google Fonts）"
        value={config.fonts?.displayUrl}
        onChange={(v) => updateConfig('fonts.displayUrl', v)}
        placeholder="https://fonts.googleapis.com/css2?family=..."
        description="プリセット以外のフォントを使う場合にGoogle FontsのURLを指定"
      />

      <hr className="border-light-blue/20 my-8" />
      <h3 className="text-lg font-body text-amber mb-4">本文フォント</h3>
      <p className="text-xs text-gray-500 mb-3">ボタン、ラベル、説明文など一般テキストに使われるフォント</p>

      <div className="flex flex-wrap gap-2 mb-4">
        {BODY_FONT_PRESETS.map((preset) => (
          <button
            key={preset.name}
            onClick={() => applyBodyPreset(preset)}
            className="px-3 py-2 glass-effect border border-light-blue/30 rounded-lg hover:border-amber transition-all text-sm"
          >
            <span className="text-gray-300">{preset.name}</span>
            <span className="text-xs text-gray-500 ml-1">({preset.category})</span>
          </button>
        ))}
      </div>

      <button
        onClick={() => setShowBodyPicker(!showBodyPicker)}
        className="mb-4 px-4 py-2 bg-light-blue/10 hover:bg-light-blue/20 border border-light-blue/30 rounded-lg transition-all text-light-blue text-xs font-body"
      >
        {showBodyPicker ? 'フォントブラウザを閉じる' : 'もっと探す（60+フォント）'}
      </button>

      {showBodyPicker && (
        <div className="mb-4">
          <FontPicker onSelect={handleBodyFontSelect} onClose={() => setShowBodyPicker(false)} />
        </div>
      )}

      <Field
        label="本文フォント"
        value={config.fonts?.body}
        onChange={(v) => updateConfig('fonts.body', v)}
        placeholder="'Yu Gothic Medium', 'YuGothic', sans-serif"
      />
      <Field
        label="本文フォントURL（Google Fonts）"
        value={config.fonts?.bodyUrl}
        onChange={(v) => updateConfig('fonts.bodyUrl', v)}
        placeholder="https://fonts.googleapis.com/css2?family=..."
        description="プリセット以外のフォントを使う場合にGoogle FontsのURLを指定"
      />
    </div>
  )
}

export default BrandingTab
