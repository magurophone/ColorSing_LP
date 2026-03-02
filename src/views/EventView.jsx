import { useState } from 'react'
import { useConfig } from '../context/ConfigContext'
import { convertDriveUrl } from '../lib/sheets'
import { formatEventDate } from '../lib/utils'

const SetlistBlock = ({ text }) => {
  if (!text) return null
  return (
    <div className="text-sm text-content-text whitespace-pre-line leading-relaxed">
      {text}
    </div>
  )
}

const PastEventCard = ({ event }) => {
  const [open, setOpen] = useState(false)
  const imgSrc = event.imageUrl ? convertDriveUrl(event.imageUrl, 600) : null

  return (
    <div className="glass-effect rounded-xl border border-card-border/30 overflow-hidden">
      <div className="flex gap-4 md:gap-6 p-4 md:p-5">
        {imgSrc && (
          <img
            src={imgSrc}
            alt={event.title}
            className="w-20 h-28 md:w-28 md:h-40 object-cover rounded-lg shrink-0"
            loading="lazy"
          />
        )}
        <div className="flex-1 min-w-0">
          {event.date && (
            <div className="text-xs md:text-sm text-gray-500 mb-1">{formatEventDate(event.date)}</div>
          )}
          <h3 className="text-base md:text-lg font-body text-white mb-2 leading-snug">{event.title}</h3>
          {event.notes && (
            <p className="text-xs md:text-sm text-gray-400 mb-2">{event.notes}</p>
          )}
          {event.setlist && (
            <>
              <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="text-xs text-light-blue hover:text-white transition-colors"
              >
                {open ? 'セットリストを閉じる ▲' : 'セットリストを見る ▼'}
              </button>
              {open && (
                <div className="mt-2 pl-3 border-l border-light-blue/30">
                  <SetlistBlock text={event.setlist} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const EventView = ({ events }) => {
  const config = useConfig()
  const viewConfig = config.views.find(v => v.id === 'events')
  const title = viewConfig?.title || 'イベント'
  if (!events || viewConfig?.enabled === false) return null
  const { upcoming, past } = events

  return (
    <>
      {/* 開催済みイベント */}
      {past.length > 0 ? (
        <section>
          <h2 className="text-2xl md:text-4xl font-body mb-6 text-center text-glow-soft text-primary">
            {title} 履歴
          </h2>
          <div className="space-y-3">
            {past.map((event, i) => (
              <PastEventCard key={`${event.date}-${i}`} event={event} />
            ))}
          </div>
        </section>
      ) : (
        <section className="text-center py-16">
          <p className="text-sub-text">まだイベント履歴がありません</p>
        </section>
      )}
    </>
  )
}

export default EventView
