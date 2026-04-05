import { useConfig } from '../context/ConfigContext'
import IconRenderer from './IconRenderer'
import { GRADIENT_DIR } from '../lib/constants'

const Sidebar = ({ currentView, onViewChange, lastUpdate }) => {
  const config = useConfig()
  const enabledViews = config.views.filter(v => v.enabled)
  const glowClass = config.brand.titleGlow !== false ? 'text-glow-soft' : ''

  return (
    <aside
      style={{ backgroundColor: 'var(--sidebar-bg, var(--override-glass-bg, rgba(10, 22, 40, 0.6)))', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      className="hidden md:fixed md:flex md:flex-col md:left-0 md:top-0 md:bottom-0 md:w-64 border-r border-card-border/30 z-40 p-6"
    >
      <div className="mb-8">
        {config.brand.titleGradient !== false ? (
          <h1
            className={`text-2xl font-display font-black text-transparent bg-clip-text ${glowClass}`}
            style={{
              backgroundImage: `linear-gradient(${GRADIENT_DIR[config.brand.titleGradientDirection] || 'to right'}, var(--color-title-gradient-start, var(--color-ocean-teal)), var(--color-title-gradient-mid, var(--color-light-blue)), var(--color-title-gradient-end, var(--color-amber)))`,
            }}
          >
            {config.brand.sidebarTitle}
          </h1>
        ) : (
          <h1
            className={`text-2xl font-display font-black text-primary ${glowClass}`}
            style={{ color: 'var(--color-title, var(--color-primary))' }}
          >
            {config.brand.sidebarTitle}
          </h1>
        )}
      </div>

      <nav className="flex-1 space-y-2">
        {enabledViews.map((view) => (
          <button
            key={view.id}
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
