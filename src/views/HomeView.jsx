import { useConfig } from '../context/ConfigContext'
import { convertDriveUrl } from '../lib/sheets'
import { formatEventDate, isEventEnded } from '../lib/utils'
import CountUp from '../components/CountUp'
import closedImg from '../assets/closed.png'

const RANKING_FIELDS = { RANK: 0, NAME: 1, POINTS: 2, IMAGE: 3 }

const HomeView = ({ ranking, goals, events }) => {
  const config = useConfig()
  const eventsEnabled = config.views?.find(v => v.id === 'events')?.enabled !== false

  return (
    <>
      {/* ランキング */}
      <section className="text-center">
        <h2 className="text-2xl md:text-4xl font-body mb-4 md:mb-8 text-glow-soft text-primary">{config.home.rankingTitle}</h2>
        <div className="grid grid-cols-1 xs:grid-cols-3 gap-3 md:gap-6">
          {ranking.slice(0, 3).map((person, index) => (
            <div
              key={`${person[RANKING_FIELDS.NAME] ?? 'rank'}-${index}`}
              className={`glass-effect rounded-2xl p-4 md:p-8 border transition-all hover:scale-105 water-shimmer ${index === 0 ? 'box-glow-soft' : 'border-card-border/30'}`}
              style={index === 0 ? { borderColor: `var(--color-rank1-card, var(--base-accent))` } : undefined}
            >
              <div className="mb-2 md:mb-4 flex justify-center">
                {person[RANKING_FIELDS.IMAGE] && (
                  <img
                    src={convertDriveUrl(person[RANKING_FIELDS.IMAGE], 128)}
                    alt={`${index + 1}位`}
                    className="w-12 h-12 md:w-16 md:h-16 object-cover rounded-full"
                  />
                )}
              </div>
              <div className="text-xs md:text-2xl font-body mb-1 md:mb-2 text-name-text whitespace-nowrap overflow-hidden h-4 md:h-8">{person[RANKING_FIELDS.NAME]}</div>
              <div
                className={`text-2xl md:text-4xl font-black ${index !== 0 ? 'text-highlight' : ''}`}
                style={index === 0 ? { color: `var(--color-rank1-card, var(--base-accent))` } : undefined}
              >
                <CountUp end={person[RANKING_FIELDS.POINTS]} unit={config.home.pointsUnit ?? 'k'} />
              </div>
              <div className="text-xs md:text-sm text-sub-text mt-1 md:mt-2">{config.home.pointsLabel}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 目標 */}
      <section className="text-center">
        <h2 className="text-2xl md:text-4xl font-body mb-4 md:mb-8 text-glow-soft text-primary">{config.home.targetsTitle}</h2>
        <div className="grid grid-cols-2 gap-3 md:gap-6 max-w-4xl mx-auto">
          {config.home.targetLabels.map((label, colIndex) => (
            <div
              key={colIndex}
              className={`glass-effect rounded-2xl p-4 md:p-6 border border-card-hover/30 ${
                goals.length === 0 || !goals[0] || !goals[0][colIndex] ? 'opacity-50' : ''
              }`}
            >
              <h3 className="text-lg md:text-2xl font-body mb-2 md:mb-4 text-primary">{label}</h3>
              {goals.map((goal, index) => (
                goal[colIndex] && (
                  <div key={`goal-${colIndex}-${index}`} className="text-sm md:text-lg mb-2 md:mb-4 last:mb-0 text-content-text">
                    <span className="text-highlight">▸</span> {goal[colIndex]}
                  </div>
                )
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* 次回イベント告知: eventsビューが無効またはeventsがnullの場合は非表示 */}
      {eventsEnabled && events !== null && <section className="max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-4xl font-body mb-4 md:mb-8 text-center text-glow-soft text-primary">
          New Event
        </h2>
        {events?.upcoming?.title ? (() => {
          const ended = events.upcoming.date ? isEventEnded(events.upcoming.date) : false
          return (
          <div className={`glass-effect rounded-2xl border overflow-hidden ${ended ? 'border-card-border/30' : 'border-amber/40'}`}>
            {events.upcoming.imageUrl && (
              <div className="relative">
                <img
                  src={convertDriveUrl(events.upcoming.imageUrl, 1200)}
                  alt={events.upcoming.title}
                  className={`w-full object-cover${ended ? ' brightness-50' : ''}`}
                />
                {ended && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <img
                      src={closedImg}
                      alt="CLOSED"
                      className="w-2/3 md:w-1/2 max-w-sm select-none pointer-events-none"
                      style={{ filter: 'drop-shadow(0 0 8px rgba(0,0,0,1)) drop-shadow(0 0 16px rgba(0,0,0,1)) drop-shadow(0 2px 24px rgba(0,0,0,1)) drop-shadow(0 0 50px rgba(0,0,0,1)) drop-shadow(0 0 80px rgba(0,0,0,0.8))' }}
                    />
                  </div>
                )}
              </div>
            )}
            <div className={`p-5 md:p-8 text-center${ended ? ' opacity-40' : ''}`}>
              {events.upcoming.date && (
                <div className="text-amber text-sm font-body mb-2">
                  {formatEventDate(events.upcoming.date)}
                </div>
              )}
              <h3 className="text-xl md:text-3xl font-body text-white mb-3">
                {events.upcoming.title}
              </h3>
              {events.upcoming.setlist && (
                <div className="flex justify-center mb-3">
                  <div className="text-sm text-content-text space-y-1 text-left">
                    {events.upcoming.setlist.split('\n').filter(l => l.trim()).map((line, i) => (
                      <div key={i} className="flex items-baseline gap-1.5">
                        <span className="text-highlight shrink-0">▸</span>
                        <span>{line.trim()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {events.upcoming.notes && (
                <p className="text-sm text-gray-400">{events.upcoming.notes}</p>
              )}
            </div>
          </div>
          )
        })() : (
          <div className="glass-effect rounded-2xl border border-card-border/20 py-14 text-center">
            <div className="text-[10px] tracking-[0.6em] text-sub-text uppercase mb-5">coming up</div>
            <p className="text-4xl md:text-6xl font-display font-black tracking-widest text-primary">
              Stay Tuned
            </p>
            <div className="flex justify-center gap-2 mt-6">
              <span className="block w-8 h-px bg-primary/30" />
              <span className="block w-1.5 h-1.5 rounded-full bg-primary/50 -mt-0.5" />
              <span className="block w-8 h-px bg-primary/30" />
            </div>
          </div>
        )}
      </section>}

      {/* FAQ */}
      {config.home.faq.enabled !== false && config.home.faq.items.length > 0 && (
        <section className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-4xl font-body mb-8 text-center text-glow-soft text-highlight">{config.home.faq.title}</h2>
          <div className="glass-effect rounded-2xl p-8 border border-card-border/30 space-y-6">
            {config.home.faq.items.map((item, index) => (
              <div key={`faq-${index}-${item.question}`}>
                <h3 className="text-xl font-body text-highlight mb-2">▸ {item.question}</h3>
                <p className="text-content-text ml-6">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  )
}

export default HomeView
