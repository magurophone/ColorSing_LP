import { useEffect } from 'react'
import { useConfig } from '../context/ConfigContext'
import { convertDriveUrl } from '../lib/sheets'
import { GRADIENT_DIR } from '../lib/constants'

const TITLE_POS = {
  center:         'items-center justify-center',
  'top-left':     'items-start justify-start pt-8 pl-8',
  'top-right':    'items-start justify-end pt-8 pr-8',
  'bottom-left':  'items-end justify-start pb-8 pl-8',
  'bottom-right': 'items-end justify-end pb-8 pr-8',
}

const sanitizeCssUrl = (url) => {
  if (!url || typeof url !== 'string') return null
  // CSS url()インジェクション防止: 引用符・括弧・セミコロンを除去
  const sanitized = url.replace(/['");\s]/g, '')
  return sanitized ? `url('${sanitized}')` : null
}

// vwベース clamp: 全解像度で自然に拡縮
const TITLE_SIZE = {
  small:  'clamp(1rem,   3vw, 1.75rem)',
  medium: 'clamp(1.5rem, 5vw, 3rem)',
  large:  'clamp(2rem,   7vw, 5rem)',
  xlarge: 'clamp(3rem,  10vw, 8rem)',
}

const TitleText = ({ config, glowClass, compact = false }) => {
  const effectiveStyle = config.brand.titleStyle || 'glass'
  const dir = GRADIENT_DIR[config.brand.titleGradientDirection] || 'to right'
  const fontSize = compact ? '1.25rem' : (TITLE_SIZE[config.brand.titleSize || 'large'])
  const glassBg = config.brand.titleGlassBg ?? 0.35
  const glassBlur = config.brand.titleGlassBlur ?? 12
  const paddingY = config.brand.titlePaddingY ?? 12
  const baseClass = `font-display font-black tracking-wide leading-tight drop-shadow-lg ${glowClass}`

  if (effectiveStyle === 'glass') {
    const textFill = config.brand.titleTextFill || 'default'
    const o = config.colorOverrides || {}
    const gradientStyle = `linear-gradient(${dir}, var(--color-title-gradient-start, var(--color-ocean-teal)), var(--color-title-gradient-mid, var(--color-light-blue)), var(--color-title-gradient-end, var(--color-amber)))`
    const h1Style = { fontSize, ...(
      textFill === 'gradient'
        ? { backgroundImage: gradientStyle, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }
        : textFill === 'white'
          ? { color: '#ffffff' }
          : { color: 'var(--color-title, var(--color-primary))' }
    )}

    return (
      <div className="inline-block">
        <div
          className="px-6 rounded-xl"
          style={{
            backgroundColor: `rgba(0,0,0,${glassBg})`,
            backdropFilter: `blur(${glassBlur}px)`,
            paddingTop: `${paddingY}px`,
            paddingBottom: `${paddingY}px`,
          }}
        >
          <h1
            className={textFill === 'gradient' ? `${baseClass} bg-clip-text text-transparent` : baseClass}
            style={h1Style}
          >
            {config.brand.name}
          </h1>
        </div>
      </div>
    )
  }

  if (effectiveStyle === 'gradient') {
    return (
      <h1
        className={`${baseClass} bg-clip-text text-transparent`}
        style={{
          fontSize,
          backgroundImage: `linear-gradient(${dir}, var(--color-title-gradient-start, var(--color-ocean-teal)), var(--color-title-gradient-mid, var(--color-light-blue)), var(--color-title-gradient-end, var(--color-amber)))`,
        }}
      >
        {config.brand.name}
      </h1>
    )
  }

  return (
    <h1
      className={baseClass}
      style={{ fontSize, color: 'var(--color-title, var(--color-primary))' }}
    >
      {config.brand.name}
    </h1>
  )
}

const Header = ({ lastUpdate, loading, onRefresh }) => {
  const config = useConfig()
  const o = config.colorOverrides || {}
  const hasHeaderBg = o.headerGradientStart || o.headerGradientEnd
  const glowClass = config.brand.titleGlow !== false ? 'text-glow-soft' : ''

  // ヘッダー非表示モード（コンパクト表示）
  if (config.brand.showHeader === false) {
    return (
      <div className="w-full relative px-6 py-4">
        {config.brand.showTitle !== false && (
          <div className="text-center">
            <TitleText config={config} glowClass={glowClass} compact />
          </div>
        )}
        <div className="absolute top-4 right-4 flex items-center gap-3">
          {lastUpdate && (
            <div className="hidden md:block text-xs text-sub-text">
              {config.ui.lastUpdate}: {lastUpdate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="glass-effect px-4 py-2 rounded-lg border border-card-border/30 hover:border-card-hover transition-all text-sm font-body text-primary disabled:opacity-50 disabled:cursor-not-allowed"
            title="データを再読み込み"
          >
            {loading ? '🔄' : '↻'} {config.ui.refreshButton}
          </button>
        </div>
      </div>
    )
  }

  const imgFit = config.brand.headerImageFit || 'cover'
  const overlayOpacity = config.brand.headerOverlayOpacity ?? 0.3
  const titlePos = config.brand.titlePosition || 'center'
  const posClass = TITLE_POS[titlePos] || TITLE_POS.center
  const isCenter = titlePos === 'center'
  const desktopSrc = convertDriveUrl(config.images.headerDesktop, 1600)
  const mobileSrc  = convertDriveUrl(config.images.headerMobile || config.images.headerDesktop, 800)
  const hasImage = desktopSrc || mobileSrc

  const imgW  = config.brand.headerImageW
  const imgH  = config.brand.headerImageH
  const imgWM = config.brand.headerImageWMobile
  const imgHM = config.brand.headerImageHMobile
  const defaultHeightDesktop = hasImage ? '600px' : '120px'
  const defaultHeightMobile  = hasImage ? '400px' : '80px'
  const heightDesktop = config.brand.headerHeight || defaultHeightDesktop
  const heightMobile  = config.brand.headerHeightMobile || defaultHeightMobile

  useEffect(() => {
    const id = 'header-cs-style'
    let el = document.getElementById(id)
    if (!el) {
      el = document.createElement('style')
      el.id = id
      document.head.appendChild(el)
    }
    // 画像サイズが設定されていれば aspect-ratio、なければ従来の height にフォールバック
    const mobile  = (imgWM && imgHM) ? `aspect-ratio:${imgWM}/${imgHM}` : `height:${heightMobile}`
    const desktop = (imgW  && imgH)  ? `aspect-ratio:${imgW}/${imgH}`   : `height:${heightDesktop}`
    el.textContent = `.header-cs{${mobile}}@media(min-width:768px){.header-cs{${desktop}}}`
  }, [imgW, imgH, imgWM, imgHM, heightDesktop, heightMobile, hasImage])

  return (
    <div
      className={`${imgFit !== 'contain' || !hasImage ? 'header-cs ' : ''}w-full relative overflow-hidden`}
      style={{
        background: hasHeaderBg
          ? `linear-gradient(to bottom, var(--color-header-gradient-end, var(--color-deep-blue)), var(--color-header-gradient-start, var(--color-ocean-teal)) 50%, var(--color-header-gradient-end, var(--color-deep-blue)))`
          : 'transparent',
      }}
    >
      {imgFit === 'contain' ? (
        <>
          {mobileSrc  && <img className="md:hidden  w-full block" src={mobileSrc}  alt="" />}
          {desktopSrc && <img className="hidden md:block w-full" src={desktopSrc} alt="" />}
        </>
      ) : (
        <>
          <div
            className="absolute inset-0 hidden md:block"
            style={{
              backgroundImage: sanitizeCssUrl(desktopSrc) || undefined,
              backgroundSize: imgFit,
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          ></div>
          <div
            className="absolute inset-0 md:hidden"
            style={{
              backgroundImage: sanitizeCssUrl(mobileSrc) || undefined,
              backgroundSize: imgFit,
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          ></div>
        </>
      )}
      {(hasImage || hasHeaderBg) && (
        <>
          <div className="absolute inset-0 bg-black" style={{ opacity: overlayOpacity }}></div>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEuNSIgZmlsbD0icmdiYSgxMzgsIDE4MCwgMjQ4LCAwLjA1KSIvPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjIiIGZpbGw9InJnYmEoMTM4LCAxODAsIDI0OCwgMC4wOCkiLz48Y2lyY2xlIGN4PSIzNSIgY3k9IjEwIiByPSIxIiBmaWxsPSJyZ2JhKDEzOCwgMTgwLCAyNDgsIDAuMDMpIi8+PC9zdmc+')] opacity-20 animate-float"></div>
        </>
      )}
      {config.brand.showTitle !== false && (
        <div className={`absolute inset-0 flex ${posClass}`}>
          <div className={`${isCenter ? 'text-center' : ''} px-4`}>
            <TitleText config={config} glowClass={glowClass} />
          </div>
        </div>
      )}

      <div className="absolute top-4 right-4 flex items-center gap-3">
        {lastUpdate && (
          <div className="hidden md:block text-xs text-sub-text">
            {config.ui.lastUpdate}: {lastUpdate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="glass-effect px-4 py-2 rounded-lg border border-card-border/30 hover:border-card-hover transition-all text-sm font-body text-primary disabled:opacity-50 disabled:cursor-not-allowed"
          title="データを再読み込み"
        >
          {loading ? '🔄' : '↻'} {config.ui.refreshButton}
        </button>
      </div>
    </div>
  )
}

export default Header
