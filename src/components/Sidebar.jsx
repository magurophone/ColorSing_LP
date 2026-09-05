import { useConfig } from '../context/ConfigContext'
import { useEditingPreview } from '../context/PublicPageConfig'
import IconRenderer from './IconRenderer'
import { GRADIENT_DIR } from '../lib/constants'

const Sidebar = ({ currentView, onViewChange, lastUpdate }) => {
  const config = useConfig()
  const editing = useEditingPreview()
  const allViews = config.views.map((view, sourceIndex) => ({ view, sourceIndex }))
  const enabledViews = allViews.filter(({ view }) => view.enabled)
  /* 出していないページは、編集中だけ「非表示」の見た目でここへ並べる。
   * そうしないと、出していないページの名前やアイコンへ手が届かない。
   * 一般公開では editing が false なので、DOMにも出ない。 */
  const hiddenViews = editing ? allViews.filter(({ view }) => !view.enabled) : []
  const glowClass = config.brand.titleGlow !== false ? 'text-glow-soft' : ''

  return (
    <aside
      style={{ backgroundColor: 'var(--sidebar-bg, var(--override-glass-bg, rgba(10, 22, 40, 0.6)))', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      className="hidden md:fixed md:flex md:flex-col md:left-0 md:top-0 md:bottom-0 md:w-64 border-r border-card-border/30 z-40 p-6"
    >
      <div className="mb-8">
        {/* サイドバー名を別に決めていない人には、基本情報の表示名をそのまま出す。
            決めていないだけでテンプレートの名前が顧客のページに残っていた。 */}
        {config.brand.titleGradient !== false ? (
          <h1
            data-page-setting-target="brand.sidebarTitle"
            className={`text-2xl font-display font-black text-transparent bg-clip-text ${glowClass}`}
            style={{
              backgroundImage: `linear-gradient(${GRADIENT_DIR[config.brand.titleGradientDirection] || 'to right'}, var(--color-title-gradient-start, var(--color-ocean-teal)), var(--color-title-gradient-mid, var(--color-light-blue)), var(--color-title-gradient-end, var(--color-amber)))`,
            }}
          >
            {config.brand.sidebarTitle?.trim() || config.brand.name}
          </h1>
        ) : (
          <h1
            data-page-setting-target="brand.sidebarTitle"
            className={`text-2xl font-display font-black text-primary ${glowClass}`}
            style={{ color: 'var(--color-title, var(--color-primary))' }}
          >
            {config.brand.sidebarTitle?.trim() || config.brand.name}
          </h1>
        )}
      </div>

      <nav className="flex-1 space-y-2">
        {enabledViews.map(({ view, sourceIndex }) => (
          <button
            key={view.id}
            data-page-setting-target={`views:${sourceIndex}`}
            onClick={() => onViewChange(view.id)}
            className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center gap-3 ${
              currentView === view.id
                ? 'bg-primary/20 border border-primary/50 text-primary'
                : 'hover:bg-primary/10 text-sub-text hover:text-primary'
            }`}
          >
            <IconRenderer icon={view.icon} size={20} />
            <span className="font-body">{view.label}</span>
          </button>
        ))}
        {hiddenViews.map(({ view, sourceIndex }) => (
          <button
            key={view.id}
            data-page-setting-target={`views:${sourceIndex}`}
            data-preview-ghost="true"
            onClick={() => onViewChange(view.id)}
            className="w-full text-left px-4 py-3 rounded-lg border border-dashed border-sub-text/40 text-sub-text/70 flex items-center gap-3"
          >
            <IconRenderer icon={view.icon} size={20} />
            <span className="font-body">{view.label}</span>
            <span className="ml-auto text-xs">非表示</span>
          </button>
        ))}
      </nav>

      {lastUpdate && (
        <div className="mt-auto pt-6 border-t border-card-border/20 text-xs text-sub-text">
          {config.ui.lastUpdate}: {lastUpdate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </aside>
  )
}

export default Sidebar
