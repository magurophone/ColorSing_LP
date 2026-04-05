import { useConfig } from '../context/ConfigContext'
import IconRenderer from './IconRenderer'

const BottomNav = ({ currentView, onViewChange }) => {
  const config = useConfig()
  const enabledViews = config.views.filter(v => v.enabled)

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
        style={{ display: 'grid', gridTemplateColumns: `repeat(${enabledViews.length}, minmax(0, 1fr))` }}
      >
        {enabledViews.map((view) => (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id)}
            className={`flex flex-col items-center justify-center gap-1 transition-all ${
              currentView === view.id
                ? 'text-primary'
                : 'text-sub-text hover:text-primary'
            }`}
          >
            <IconRenderer icon={view.icon} size={20} />
            <span className="text-xs font-body">{view.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}

export default BottomNav
