import { useEffect, useRef, useState } from 'react'
import { ListChecks, Target, BookOpen, Keyboard } from '@phosphor-icons/react'
import { QUIZ_MODES, QUIZ_LAYERS, getQuizRegions, defaultRegion } from '../data/quizData.js'

const MODE_ICONS = { 1: ListChecks, 2: Target, 3: BookOpen, 4: Keyboard }

// Accessible custom dropdown that matches the neon aesthetic. Options carry an
// icon, label, optional sub-text and an optional disabled/"soon" state.
function Dropdown({ id, openId, setOpenId, options, value, onChange, placeholder }) {
  const ref  = useRef(null)
  const open = openId === id
  const selected = options.find(o => o.key === value)

  useEffect(() => {
    if (!open) return
    const onDocClick = e => { if (ref.current && !ref.current.contains(e.target)) setOpenId(null) }
    const onKey = e => { if (e.key === 'Escape') setOpenId(null) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, setOpenId])

  return (
    <div className="quiz-dropdown" ref={ref}>
      <button
        type="button"
        className={`quiz-dropdown-trigger${open ? ' open' : ''}`}
        onClick={() => setOpenId(open ? null : id)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected ? (
          <span className="quiz-dd-current">
            <span className="quiz-dd-text">
              <span className="quiz-dd-label">{selected.label}</span>
              {selected.sub && <span className="quiz-dd-sub">{selected.sub}</span>}
            </span>
          </span>
        ) : (
          <span className="quiz-dd-placeholder">{placeholder}</span>
        )}
        <span className="quiz-dd-chevron" aria-hidden>▾</span>
      </button>

      {open && (
        <div className="quiz-dropdown-menu" role="listbox">
          {options.map(o => (
            <button
              key={o.key}
              type="button"
              role="option"
              aria-selected={o.key === value}
              disabled={o.disabled}
              className={`quiz-dropdown-option${o.key === value ? ' active' : ''}${o.disabled ? ' disabled' : ''}`}
              onClick={() => { if (o.disabled) return; onChange(o.key); setOpenId(null) }}
            >
              <span className="quiz-dd-text">
                <span className="quiz-dd-label">{o.label}</span>
                {o.sub && <span className="quiz-dd-sub">{o.sub}</span>}
              </span>
              {o.badge && <span className="quiz-card-badge">{o.badge}</span>}
              {o.key === value && !o.badge && <span className="quiz-dd-check" aria-hidden>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Full-screen menu for configuring a quiz: pick a mode, a layer (skeleton only
// for now) and a body region, then start. Mirrors the explorer's neon aesthetic.
export default function QuizSetup({ config, onChange, onStart, onClose }) {
  const [openId, setOpenId] = useState(null)

  const layerOptions = QUIZ_LAYERS.map(l => ({
    key: l.key, label: l.label,
    sub: l.enabled ? l.desc : 'Coming soon',
    disabled: !l.enabled,
    badge: l.enabled ? null : 'Soon',
  }))

  // Regions mirror the explorer's Filters tab for the chosen layer.
  const regionOptions = getQuizRegions(config.layer).map(r => ({
    key: r.key, label: r.label, sub: r.desc,
  }))

  return (
    <div className="quiz-overlay">
      <div className="quiz-setup">
        <button className="quiz-overlay-close" onClick={onClose} title="Close">✕</button>

        <div className="quiz-setup-head">
          <div className="quiz-setup-title">Quiz Mode</div>
          <div className="quiz-setup-subtitle">
            Build your challenge — pick a mode, a layer and a region of the body to study.
          </div>
        </div>

        {/* Mode */}
        <div className="quiz-setup-section">
          <div className="quiz-setup-step">1 · Choose a mode</div>
          <div className="quiz-card-grid">
            {QUIZ_MODES.map(m => {
              const Icon = MODE_ICONS[m.level]
              return (
                <button
                  key={m.level}
                  type="button"
                  className={`quiz-card${config.level === m.level ? ' active' : ''}`}
                  onClick={() => onChange({ level: m.level })}
                >
                  <span className="quiz-card-icon">{Icon && <Icon size={22} />}</span>
                  <span className="quiz-card-title">{m.label}</span>
                  <span className="quiz-card-sub">{m.desc}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Layer + Region as dropdowns */}
        <div className="quiz-setup-section quiz-dropdown-row">
          <div className="quiz-dropdown-field">
            <div className="quiz-setup-step">2 · Choose a layer</div>
            <Dropdown
              id="layer"
              openId={openId}
              setOpenId={setOpenId}
              options={layerOptions}
              value={config.layer}
              onChange={key => onChange({ layer: key, region: defaultRegion(key) })}
              placeholder="Select a layer"
            />
          </div>

          <div className="quiz-dropdown-field">
            <div className="quiz-setup-step">3 · Choose a region</div>
            <Dropdown
              id="region"
              openId={openId}
              setOpenId={setOpenId}
              options={regionOptions}
              value={config.region}
              onChange={key => onChange({ region: key })}
              placeholder="Select a region"
            />
          </div>
        </div>

        <button className="quiz-start-btn" onClick={onStart}>
          Start Quiz →
        </button>
      </div>
    </div>
  )
}
