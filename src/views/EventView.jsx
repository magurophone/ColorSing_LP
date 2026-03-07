import { useRef, useState } from 'react'
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

const ImageGallery = ({ urls, title }) => {
  const scrollRef = useRef(null)
  const [idx, setIdx] = useState(0)
  const drag = useRef({ active: false, startX: 0, scrollLeft: 0 })

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    setIdx(Math.round(el.scrollLeft / el.offsetWidth))
  }

  const onPointerDown = (e) => {
    const el = scrollRef.current
    if (!el) return
    drag.current = { active: true, startX: e.clientX, scrollLeft: el.scrollLeft }
    el.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e) => {
    if (!drag.current.active) return
    const el = scrollRef.current
    if (!el) return
    el.scrollLeft = drag.current.scrollLeft - (e.clientX - drag.current.startX)
  }

  const onPointerUp = () => { drag.current.active = false }

  return (
    <div className="relative shrink-0 w-20 h-28 md:w-28 md:h-40">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="w-full h-full flex overflow-x-auto snap-x snap-mandatory rounded-lg cursor-grab active:cursor-grabbing select-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {urls.map((url, i) => (
          <img
            key={i}
            src={convertDriveUrl(url, 600)}
            alt={`${title} ${i + 1}`}
            className="w-full h-full object-cover shrink-0 snap-center"
            loading="lazy"
            draggable={false}
          />
        ))}
      </div>
      {urls.length > 1 && (
        <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1 pointer-events-none">
          {urls.map((_, i) => (
            <span
              key={i}
              className={`w-1 h-1 rounded-full transition-colors ${i === idx ? 'bg-white' : 'bg-white/40'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const PastEventCard = ({ event }) => {
  const [open, setOpen] = useState(false)
  const urls = event.imageUrls?.length > 0
    ? event.imageUrls
    : event.imageUrl ? [event.imageUrl] : []

  return (
    <div className="glass-effect rounded-xl border border-card-border/30 overflow-hidden">
      <div className="flex gap-4 md:gap-6 p-4 md:p-5">
        {urls.length > 0 && <ImageGallery urls={urls} title={event.title} />}
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
