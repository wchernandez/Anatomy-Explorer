/**
 * DemographicPanel.jsx
 *
 * A separate floating panel that accepts Age, Ethnicity, Height (cm), and
 * Weight (kg) as user inputs, runs the multi-variable regression through
 * useAnthropometricScale, and emits scale changes to the parent (App.jsx)
 * via onScaleChange({ statureScale, shoulderScale, hipScale }).
 *
 * Architecture contract:
 *   - Reads from props:  visible, onClose, onScaleChange
 *   - Maintains its own local UI state (age, ethnicity, heightCm, weightKg)
 *   - Calls onScaleChange whenever the regression output changes
 *   - Does NOT directly touch any Three.js object — pure React/math layer
 */

import { useState, useEffect } from 'react'
import { useAnthropometricScale } from '../hooks/useAnthropometricScale.js'
import {
  ETHNICITY_META,
  ANSUR_AGE_MIN,
  ANSUR_AGE_MAX,
  ANSUR_BASELINE,
} from '../utils/regressionCoefficients.js'
import './DemographicPanel.css'

// ── ANSUR II population mean height & weight (used as slider defaults) ────────
// Mean stature: 1756.21mm → 175.6cm; mean weight field ÷10 → ~85.5kg
const DEFAULT_HEIGHT = 175.6
const DEFAULT_WEIGHT = 85.5
const DEFAULT_AGE    = 30
const DEFAULT_ETH    = 'Caucasian'

// Height and weight range for the sliders
const HEIGHT_MIN = 140
const HEIGHT_MAX = 215
const WEIGHT_MIN = 40
const WEIGHT_MAX = 160

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return <div className="dp-section-label">{children}</div>
}

function DualSlider({ id, label, value, min, max, step = 1, unit, onChange }) {
  return (
    <div className="dp-dual-row">
      <label className="dp-dual-label" htmlFor={id}>{label}</label>
      <div className="dp-dual-controls">
        <input
          id={id}
          type="range"
          min={min} max={max} step={step}
          value={value}
          onChange={e => onChange(+e.target.value)}
          className="dp-slider"
        />
        <div className="dp-num-display">
          <span className="dp-num-val">{typeof value === 'number' ? value.toFixed(step < 1 ? 1 : 0) : value}</span>
          <span className="dp-num-unit">{unit}</span>
        </div>
      </div>
    </div>
  )
}

function MeasRow({ label, cm, baseline }) {
  // Deviation from ANSUR baseline as a small bar indicator
  const pct = Math.max(0, Math.min(200, (cm / (baseline / 10)) * 100))
  const deviation = pct - 100
  return (
    <div className="dp-meas-row">
      <span className="dp-meas-label">{label}</span>
      <div className="dp-meas-bar-wrap">
        <div
          className={`dp-meas-bar ${deviation >= 0 ? 'above' : 'below'}`}
          style={{ width: `${Math.min(100, Math.abs(deviation) * 1.5)}%` }}
        />
      </div>
      <span className="dp-meas-val">{cm} cm</span>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function DemographicPanel({ visible, onClose, onScaleChange }) {
  const [ethnicity, setEthnicity] = useState(DEFAULT_ETH)
  const [age,       setAge]       = useState(DEFAULT_AGE)
  const [heightCm,  setHeightCm]  = useState(DEFAULT_HEIGHT)
  const [weightKg,  setWeightKg]  = useState(DEFAULT_WEIGHT)

  // ── Run regression engine ──────────────────────────────────────────────────
  const { statureScale, shoulderScale, hipScale, measurements } =
    useAnthropometricScale({ ethnicity, age, heightCm, weightKg })

  // ── Propagate scale changes upward to App → Scene → 3D models ─────────────
  // useEffect fires only when the numeric outputs actually change (not on every
  // render), preventing spurious re-renders in the 3D pipeline.
  useEffect(() => {
    onScaleChange?.({ statureScale, shoulderScale, hipScale })
  }, [statureScale, shoulderScale, hipScale, onScaleChange])

  function handleReset() {
    setEthnicity(DEFAULT_ETH)
    setAge(DEFAULT_AGE)
    setHeightCm(DEFAULT_HEIGHT)
    setWeightKg(DEFAULT_WEIGHT)
  }

  if (!visible) return null

  // Small-sample ethnicity keys — show caution indicator
  const smallSample = ['NativeAmerican', 'PacificIslander'].includes(ethnicity)

  return (
    <div id="demographic-panel" role="dialog" aria-label="Demographic Scaling Controls">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="dp-header">
        <div className="dp-title">
          <span className="dp-title-main">Demographic Scaling</span>
          <span className="dp-title-badge">ANSUR II · OLS</span>
        </div>
        <button className="dp-close" onClick={onClose} aria-label="Close">✕</button>
      </div>

      <div className="dp-body">

        {/* ── Ethnicity selector ─────────────────────────────────────────── */}
        <SectionLabel>Ethnicity</SectionLabel>
        <div className="dp-eth-grid">
          {ETHNICITY_META.map(({ key, label, n }) => (
            <button
              key={key}
              id={`eth-btn-${key}`}
              className={`dp-eth-btn${ethnicity === key ? ' active' : ''}`}
              onClick={() => setEthnicity(key)}
              title={`n = ${n.toLocaleString()} subjects`}
            >
              <span className="dp-eth-label">{label}</span>
              <span className="dp-eth-n">n={n}</span>
            </button>
          ))}
        </div>

        {smallSample && (
          <div className="dp-caution">
            ⚠ Small sample (n&lt;35) — wider confidence intervals
          </div>
        )}

        <div className="dp-divider" />

        {/* ── Age slider ─────────────────────────────────────────────────── */}
        <SectionLabel>Age</SectionLabel>
        <DualSlider
          id="demo-age"
          label="Age"
          value={age}
          min={ANSUR_AGE_MIN}
          max={ANSUR_AGE_MAX}
          step={1}
          unit="yrs"
          onChange={setAge}
        />
        <div className="dp-range-hint">
          ANSUR II range: {ANSUR_AGE_MIN}–{ANSUR_AGE_MAX} years
        </div>

        <div className="dp-divider" />

        {/* ── Anthropometrics ────────────────────────────────────────────── */}
        <SectionLabel>Anthropometrics</SectionLabel>

        <DualSlider
          id="demo-height"
          label="Height"
          value={heightCm}
          min={HEIGHT_MIN}
          max={HEIGHT_MAX}
          step={0.5}
          unit="cm"
          onChange={setHeightCm}
        />

        <DualSlider
          id="demo-weight"
          label="Weight"
          value={weightKg}
          min={WEIGHT_MIN}
          max={WEIGHT_MAX}
          step={0.5}
          unit="kg"
          onChange={setWeightKg}
        />

        <div className="dp-divider" />

        {/* ── Regression outputs ─────────────────────────────────────────── */}
        {/*
          Computed scale factors (relative to ANSUR II population mean = 1.0).
          These are what get passed to SkeletonModel / MuscleModel / JointModel.
        */}
        <SectionLabel>Regression Outputs</SectionLabel>
        <div className="dp-scales-row">
          <div className="dp-scale-chip">
            <span className="dp-scale-chip-val">{statureScale.toFixed(3)}</span>
            <span className="dp-scale-chip-lbl">Height Scale</span>
          </div>
          <div className="dp-scale-chip">
            <span className="dp-scale-chip-val">{shoulderScale.toFixed(3)}</span>
            <span className="dp-scale-chip-lbl">Shoulder Scale</span>
          </div>
          <div className="dp-scale-chip">
            <span className="dp-scale-chip-val">{hipScale.toFixed(3)}</span>
            <span className="dp-scale-chip-lbl">Hip Scale</span>
          </div>
        </div>

        <div className="dp-divider" />

        {/* ── Estimated measurements (educational) ───────────────────────── */}
        <SectionLabel>Estimated Measurements</SectionLabel>
        <div className="dp-meas-list">
          {measurements.map(({ key, label, cm }) => (
            <MeasRow
              key={key}
              label={label}
              cm={cm}
              baseline={ANSUR_BASELINE[key]}
            />
          ))}
        </div>

        <div className="dp-divider" />

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="dp-footer-row">
          <button className="dp-reset-btn" onClick={handleReset} title="Reset to ANSUR mean">
            ↺ Reset to Mean
          </button>
        </div>

        <div className="dp-source">
          ANSUR II Male · n = 4,082 · DODRace groups · US Army 2012
        </div>

      </div>
    </div>
  )
}
