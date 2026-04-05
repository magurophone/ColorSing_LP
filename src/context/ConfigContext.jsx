import { createContext, useContext, useEffect } from 'react'
import { convertDriveUrl } from '../lib/sheets'
import { hexToRgba } from '../lib/utils'

const ConfigContext = createContext(null)


export function ConfigProvider({ config, children }) {
  // ベースカラー + オーバーライドをCSS変数に注入
  useEffect(() => {
    if (!config?.colors) return
    const root = document.documentElement
    const o = config.colorOverrides || {}

    // ベースカラー（--base-* → @theme が参照）
    root.style.setProperty('--base-deep-blue', config.colors.deepBlue)
    root.style.setProperty('--base-ocean-teal', config.colors.oceanTeal)
    root.style.setProperty('--base-light-blue', config.colors.lightBlue)
    root.style.setProperty('--base-amber', config.colors.amber)
    root.style.setProperty('--base-accent', config.colors.accent)
    root.style.setProperty('--base-gold', config.colors.gold)

    // エリア別オーバーライド（--override-* → @themeまたはCSS直接参照）
    // 各オーバーライドは対応するエリアのみに影響する
    const overrides = {
      'override-primary-text': o.primaryText,           // → text-primary
      'override-accent-text': o.accentText,             // → text-highlight
      'override-card-border': o.cardBorder,             // → border-card-border
      'override-card-border-hover': o.cardBorderHover,  // → border-card-hover
      'override-background-main': o.backgroundMain,     // → body背景グラデ
      'override-background-mid': o.backgroundMid,       // → body背景グラデ
      'color-header-gradient-start': o.headerGradientStart, // → Header.jsx
      'color-header-gradient-end': o.headerGradientEnd,     // → Header.jsx
      'color-title-gradient-start': o.titleGradientStart,   // → Header.jsx / Sidebar.jsx（タイトルグラデ開始色）
      'color-title-gradient-mid': o.titleGradientMid,       // → Header.jsx / Sidebar.jsx（タイトルグラデ中間色）
      'color-title-gradient-end': o.titleGradientEnd,       // → Header.jsx / Sidebar.jsx（タイトルグラデ終了色）
      'color-rank1-card': o.rank1Card,                      // → HomeView.jsx
      'color-title': o.titleColor,                          // → Header.jsx（グラデーションOFF時）
      'override-name-text': o.nameText,                     // → text-name-text（ランキング名・権利者名）
      'override-footer-text': o.footerText,                 // → text-footer-text（フッターメインテキスト）
      'override-content-text': o.contentText,               // → text-content-text（目標内容・FAQ本文）
      'override-sub-text': o.subText,                       // → text-sub-text（補足テキスト・ナビ非選択）
    }
    Object.entries(overrides).forEach(([key, value]) => {
      if (value) {
        root.style.setProperty(`--${key}`, value)
      } else {
        root.style.removeProperty(`--${key}`)
      }
    })

    const isLight = config.colors.brightness === 'light'

    // glass-effect 背景色（カラーピッカー色 + 不透明度スライダーを rgba に変換）
    // 未設定時も base deepBlue を基準に常に計算することで preset 変更に追従させる
    {
      const col = (o.glassBgColor && /^#[0-9a-f]{6}$/i.test(o.glassBgColor))
        ? o.glassBgColor
        : config.colors.deepBlue
      const a = (o.glassBgOpacity !== '' && o.glassBgOpacity != null) ? o.glassBgOpacity : (isLight ? 0.85 : 0.6)
      const glassBgRgba = hexToRgba(col, a)
      if (glassBgRgba) {
        root.style.setProperty('--override-glass-bg', glassBgRgba)
      }
    }

    // menu card label background（未設定時はカード背景色と同じ色相 = glassBgColor フォールバック）
    // accentText（文字色）を背景に流用する設計ミスを排除
    {
      const col = (o.menuCardLabelColor && /^#[0-9a-f]{6}$/i.test(o.menuCardLabelColor))
        ? o.menuCardLabelColor
        : ((o.glassBgColor && /^#[0-9a-f]{6}$/i.test(o.glassBgColor)) ? o.glassBgColor : config.colors.deepBlue)
      const a = (o.menuCardLabelOpacity !== '' && o.menuCardLabelOpacity != null)
        ? o.menuCardLabelOpacity
        : 0.1
      const menuLabelRgba = hexToRgba(col, a)
      if (menuLabelRgba) {
        root.style.setProperty('--menu-card-label-bg', menuLabelRgba)
      }
    }

    // sidebar 背景色（色 or 透明度いずれか設定されていれば適用。未設定項目は glassBgColor/deepBlue にフォールバック）
    {
      const hasColor = o.sidebarBgColor && /^#[0-9a-f]{6}$/i.test(o.sidebarBgColor)
      const hasOpacity = o.sidebarBgOpacity !== '' && o.sidebarBgOpacity != null
      if (hasColor || hasOpacity) {
        const col = hasColor
          ? o.sidebarBgColor
          : ((o.glassBgColor && /^#[0-9a-f]{6}$/i.test(o.glassBgColor)) ? o.glassBgColor : config.colors.deepBlue)
        const a = hasOpacity ? o.sidebarBgOpacity : (isLight ? 0.85 : 0.6)
        const rgba = hexToRgba(col, a)
        if (rgba) root.style.setProperty('--sidebar-bg', rgba)
      } else {
        root.style.removeProperty('--sidebar-bg')
      }
    }

    // bottom nav 背景色（同上）
    {
      const hasColor = o.bottomNavBgColor && /^#[0-9a-f]{6}$/i.test(o.bottomNavBgColor)
      const hasOpacity = o.bottomNavBgOpacity !== '' && o.bottomNavBgOpacity != null
      if (hasColor || hasOpacity) {
        const col = hasColor
          ? o.bottomNavBgColor
          : ((o.glassBgColor && /^#[0-9a-f]{6}$/i.test(o.glassBgColor)) ? o.glassBgColor : config.colors.deepBlue)
        const a = hasOpacity ? o.bottomNavBgOpacity : (isLight ? 0.85 : 0.6)
        const rgba = hexToRgba(col, a)
        if (rgba) root.style.setProperty('--bottom-nav-bg', rgba)
      } else {
        root.style.removeProperty('--bottom-nav-bg')
      }
    }

    // menu card 背景色（特典内容ビュー専用、色or透明度いずれか設定で有効）
    {
      const hasColor = o.menuCardBgColor && /^#[0-9a-f]{6}$/i.test(o.menuCardBgColor)
      const hasOpacity = o.menuCardBgOpacity !== '' && o.menuCardBgOpacity != null
      if (hasColor || hasOpacity) {
        const col = hasColor
          ? o.menuCardBgColor
          : ((o.glassBgColor && /^#[0-9a-f]{6}$/i.test(o.glassBgColor)) ? o.glassBgColor : config.colors.deepBlue)
        const a = hasOpacity ? o.menuCardBgOpacity : 0.85
        const menuCardRgba = hexToRgba(col, a)
        if (menuCardRgba) {
          root.style.setProperty('--menu-card-bg', menuCardRgba)
        }
      } else {
        root.style.removeProperty('--menu-card-bg')
      }
    }

    // tier card 背景色（未設定時は deepBlue 50% / ライトテーマは白 55%）
    {
      const col = (o.tierCardBgColor && /^#[0-9a-f]{6}$/i.test(o.tierCardBgColor))
        ? o.tierCardBgColor
        : (isLight ? '#ffffff' : config.colors.deepBlue)
      const a = (o.tierCardBgOpacity !== '' && o.tierCardBgOpacity != null)
        ? o.tierCardBgOpacity
        : (isLight ? 0.55 : 0.5)
      const tierCardRgba = hexToRgba(col, a)
      if (tierCardRgba) {
        root.style.setProperty('--tier-card-bg', tierCardRgba)
      }
    }

    // popup overlay 背景色（ライトテーマ未設定時は oceanTeal ベース 55%、ダーク未設定時は黒 70%）
    {
      const col = o.popupOverlayColor
        || (isLight ? config.colors.oceanTeal : '#000000')
      const a = o.popupOverlayOpacity ?? (isLight ? 0.55 : 0.7)
      const popupRgba = hexToRgba(col, a)
      if (popupRgba) {
        root.style.setProperty('--popup-overlay-bg', popupRgba)
      }
    }
  }, [config?.colors, config?.colorOverrides])

  // ライト/ダークテーマの切り替え
  useEffect(() => {
    const brightness = config?.colors?.brightness ?? 'dark'
    if (brightness === 'light') {
      document.documentElement.dataset.theme = 'light'
    } else {
      delete document.documentElement.dataset.theme
    }
  }, [config?.colors?.brightness])

  // ヘッダー画像をプリロード
  useEffect(() => {
    if (!config?.images) return
    const resolvedMobile = convertDriveUrl(config.images.headerMobile, 800)
    const resolvedDesktop = convertDriveUrl(config.images.headerDesktop, 1600)
    const isMobile = window.matchMedia('(max-width: 767.98px)').matches
    const preloadUrl = isMobile ? resolvedMobile : resolvedDesktop
    if (preloadUrl) {
      const id = 'preload-header'
      let link = document.getElementById(id)
      if (!link) {
        link = document.createElement('link')
        link.id = id
        link.rel = 'preload'
        link.as = 'image'
        document.head.appendChild(link)
      }
      link.href = preloadUrl
    }
  }, [config?.images])

  // フォントをCSS変数に注入 + Google Fonts動的読み込み
  useEffect(() => {
    if (!config?.fonts) return
    const root = document.documentElement
    if (config.fonts.display) {
      root.style.setProperty('--font-display', config.fonts.display)
    }
    if (config.fonts.body) {
      root.style.setProperty('--font-body', config.fonts.body)
      document.body.style.fontFamily = config.fonts.body
    }

    // タイトルフォントURL
    const loadFontLink = (id, url) => {
      let link = document.getElementById(id)
      if (url) {
        if (link) {
          link.href = url
        } else {
          link = document.createElement('link')
          link.id = id
          link.rel = 'stylesheet'
          link.href = url
          document.head.appendChild(link)
        }
      } else if (link) {
        link.remove()
      }
    }

    // 旧形式(googleFontsUrl)との互換性
    const displayUrl = config.fonts.displayUrl || config.fonts.googleFontsUrl || ''
    loadFontLink('google-fonts-display', displayUrl)
    loadFontLink('google-fonts-body', config.fonts.bodyUrl || '')
  }, [config?.fonts])

  // ページタイトルを設定
  useEffect(() => {
    if (config?.brand?.pageTitle) {
      document.title = config.brand.pageTitle
    }
  }, [config?.brand?.pageTitle])

  // ファビコンを設定
  useEffect(() => {
    if (config?.images?.favicon) {
      const link = document.querySelector("link[rel~='icon']") || document.createElement('link')
      link.rel = 'icon'
      link.href = config.images.favicon
      if (!link.parentNode) {
        document.head.appendChild(link)
      }
    }
  }, [config?.images?.favicon])

  return (
    <ConfigContext.Provider value={config}>
      {children}
    </ConfigContext.Provider>
  )
}

export function useConfig() {
  const config = useContext(ConfigContext)
  if (!config) {
    throw new Error('useConfig must be used within ConfigProvider')
  }
  return config
}
