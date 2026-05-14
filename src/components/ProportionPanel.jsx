import { useState, useEffect, useRef } from 'react'
import { ANSUR, probit, normCDF } from '../utils/AnthropometricScaleManager.js'
import './ProportionPanel.css'

// (Using ANSUR stats imported from AnthropometricScaleManager)

function ansurScale(key, percentile) {
  const z = probit(percentile / 100)
  const s = ANSUR[key]
  return (s.mean + z * s.sd) / s.mean
}

/** Helper to derive 'effective' measurements from statureScale */
function getEst(key, statureScale) {
  const mm = ANSUR.stature.mean * statureScale
  const z = (mm - ANSUR.stature.mean) / ANSUR.stature.sd
  // For heights well below 1st percentile, we scale linearly from the 1st percentile proportion
  const p = Math.max(0.01, Math.min(0.99, normCDF(z)))
  const baseScale = (ANSUR.stature.mean + probit(p) * ANSUR.stature.sd) / ANSUR.stature.mean
  const extra = statureScale / baseScale
  const measMm = (ANSUR[key].mean + probit(p) * ANSUR[key].sd) * extra
  return (measMm / 10).toFixed(1)
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ label }) {
  return <div className="pp-section-header">{label}</div>
}

function RatioSlider({ label, value, min = 0.7, max = 1.3, step = 0.01, onChange, icon }) {
  return (
    <div className="pp-slider-row">
      <span className="pp-slider-label">{label}</span>
      <input
        type="range" min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(+e.target.value)}
        className="pp-slider"
      />
      <span className="pp-slider-val">{value.toFixed(2)}</span>
      {icon && <span className="pp-slider-icon">{icon}</span>}
    </div>
  )
}

function PercentileTag({ label, pct, active, onClick }) {
  return (
    <button className={`pp-pct-tag${active ? ' active' : ''}`} onClick={onClick}>
      <span className="pp-pct-num">{label}</span>
      <span className="pp-pct-sub">Percentile</span>
    </button>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function ProportionPanel({ visible, onClose, onScaleChange, statureScale = 1, shoulderScale = 1, hipScale = 1 }) {
  const [staturePct, setStaturePct]     = useState(50)
  const [shoulderRatio, setShoulderRatio] = useState(1.00)
  const [hipRatio, setHipRatio]         = useState(1.00)

  const isEmitting = useRef(false)

  // Sync state when props change externally (e.g. from height presets)
  useEffect(() => {
    if (isEmitting.current) { isEmitting.current = false; return }
    
    // Find percentile for the current statureScale
    const mm = ANSUR.stature.mean * statureScale
    const z = (mm - ANSUR.stature.mean) / ANSUR.stature.sd
    const p = Math.max(1, Math.min(99, Math.round(normCDF(z) * 100)))
    setStaturePct(p)

    // Reverse shoulder/hip ratios
    const sBase = ansurScale('biacromialbreadth', p)
    const hBase = ansurScale('hipbreadth', p)
    setShoulderRatio(shoulderScale / sBase)
    setHipRatio(hipScale / hBase)
  }, [statureScale, shoulderScale, hipScale])

  if (!visible) return null

  function emit({ shoulder = shoulderRatio, hip = hipRatio, pct = staturePct } = {}) {
    isEmitting.current = true
    onScaleChange?.({
      statureScale:  ansurScale('stature', pct),
      shoulderScale: shoulder * ansurScale('biacromialbreadth', pct),
      hipScale:      hip      * ansurScale('hipbreadth', pct),
    })
  }

  function handleStaturePct(pct) {
    setStaturePct(pct)
    emit({ pct })
  }

  function handleShoulderRatio(r) {
    setShoulderRatio(r)
    emit({ shoulder: r })
  }

  function handleHipRatio(r) {
    setHipRatio(r)
    emit({ hip: r })
  }

  function handleReset() {
    setStaturePct(50); setShoulderRatio(1); setHipRatio(1); setLegRatio(1); setArmRatio(1)
    onScaleChange?.({ statureScale: 1, shoulderScale: 1 })
  }

  const sCm = (ANSUR.stature.mean * statureScale / 10).toFixed(1)
  const femurMm   = getEst('buttockkneelength', statureScale)
  const tibiaMm   = getEst('kneeheightmidpatella', statureScale)
  const humerMm   = getEst('acromionradialelength', statureScale)
  const forearmMm = getEst('radialestylionlength', statureScale)

  return (
    <div id="proportion-panel" role="dialog" aria-label="Proportion Controls">
      {/* Header */}
      <div className="pp-header">
        <div className="pp-title">
          <span className="pp-title-main">Proportion Controls</span>
          <span className="pp-title-badge">ANSUR II</span>
        </div>
        <button className="pp-close" onClick={onClose} aria-label="Close">✕</button>
      </div>

      <div className="pp-body">

        {/* ── Global Stature ── */}
        <SectionHeader label="GLOBAL — Stature (Total Height)" />

        <div className="pp-stature-display">
          <span className="pp-stature-val">{sCm}</span>
          <span className="pp-stature-unit">cm</span>
          <button className="pp-reset-btn" onClick={handleReset} title="Reset to baseline">↺</button>
        </div>

        <input
          type="range" min={1} max={99} step={1}
          value={staturePct}
          onChange={e => handleStaturePct(+e.target.value)}
          className="pp-slider pp-stature-slider"
          id="stature-slider"
        />
        <div className="pp-pct-tags">
          <PercentileTag label="5th"  pct={5}  active={staturePct===5}  onClick={() => handleStaturePct(5)}  />
          <PercentileTag label="50th" pct={50} active={staturePct===50} onClick={() => handleStaturePct(50)} />
          <PercentileTag label="95th" pct={95} active={staturePct===95} onClick={() => handleStaturePct(95)} />
        </div>

        <div className="pp-divider" />

        {/* ── Upper Body ── */}
        <SectionHeader label="UPPER BODY" />
        <RatioSlider
          label="Body Width (Biacromial)"
          value={shoulderRatio}
          onChange={handleShoulderRatio}
        />
        <div className="pp-edu-row">
          <span className="pp-edu-label">Est. Humerus</span>
          <span className="pp-edu-val">{humerMm} cm</span>
        </div>
        <div className="pp-edu-row">
          <span className="pp-edu-label">Est. Forearm</span>
          <span className="pp-edu-val">{forearmMm} cm</span>
        </div>

        <div className="pp-divider" />

        {/* ── Lower Body ── */}
        <SectionHeader label="LOWER BODY" />
        <RatioSlider
          label="Hip / Lower Width"
          value={hipRatio}
          onChange={handleHipRatio}
        />
        <div className="pp-edu-row">
          <span className="pp-edu-label">Est. Femur</span>
          <span className="pp-edu-val">{femurMm} cm</span>
        </div>
        <div className="pp-edu-row">
          <span className="pp-edu-label">Est. Tibia</span>
          <span className="pp-edu-val">{tibiaMm} cm</span>
        </div>

        <div className="pp-divider" />

        {/* ── Data source ── */}
        <div className="pp-source">
          ANSUR II Male · n = 4,082 · US Army 2012
        </div>
      </div>
    </div>
  )
}
