import { useConfig } from '../context/ConfigContext'
import { useEditingPreview } from '../context/PublicPageConfig'
import IconRenderer from './IconRenderer'

const BottomNav = ({ currentView, onViewChange }) => {
  const config = useConfig()
  const editing = useEditingPreview()
  const allViews = config.views.map((view, sourceIndex) => ({ view, sourceIndex }))
  const enabledViews = allViews.filter(({ view }) => view.enabled)
  /* 出していないページも、編集中だけ「非表示」の見た目でここへ並べる。
   * 一般公開では editing が false なので、これまでと1つも増えない。 */
  const shownViews = editing ? [...enabledViews, ...allViews.filter(({ view }) => !view.enabled)] : enabledViews

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 border-t border-card-border/30 z-40"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        backgroundColor: 'var(--bottom-nav-bg, var(--override-glass-bg, rgba(10, 22, 40, 0.6)))',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)'
      }}
    >
      <div
        className="h-16"
        style={{ display: 'grid', gridTemplateColumns: `repeat(${shownViews.length}, minmax(0, 1fr))` }}
      >
        {shownViews.map(({ view, sourceIndex }) => (
          <button
            key={view.id}
            data-page-setting-target={`views:${sourceIndex}`}
            {...(view.enabled ? {} : { 'data-preview-ghost': 'true' })}
            onClick={() => onViewChange(view.id)}
            className={`flex flex-col items-center justify-center gap-1 transition-all ${
              !view.enabled
                ? 'text-sub-text/60 border border-dashed border-sub-text/30'
                : currentView === view.id
                  ? 'text-primary'
                  : 'text-sub-text hover:text-primary'
            }`}
          >
            <IconRenderer icon={view.icon} size={20} />
            <span className="text-xs font-body">{view.enabled ? view.label : `${view.label}（非表示）`}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}

export default BottomNav
