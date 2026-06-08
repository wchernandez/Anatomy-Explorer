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

function formatFeetInches(totalInches) {
  const feet = Math.floor(totalInches / 12)
  const inches = (totalInches % 12).toFixed(1)
  if (parseFloat(inches) === 12) return `${feet + 1}' 0.0"`
  return `${feet}' ${inches}"`
}

function DualSlider({ id, label, value, min, max, step = 1, displayVal, unit, onChange }) {
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
          <span className="dp-num-val">{displayVal !== undefined ? displayVal : (typeof value === 'number' ? value.toFixed(step < 1 ? 1 : 0) : value)}</span>
          <span className="dp-num-unit">{unit}</span>
        </div>
      </div>
    </div>
  )
}

function MeasRow({ label, cm, baseline, isMetric }) {
  // Deviation from ANSUR baseline as a small bar indicator
  const pct = Math.max(0, Math.min(200, (cm / (baseline / 10)) * 100))
  const deviation = pct - 100
  const displayVal = isMetric ? `${cm.toFixed(1)} cm` : `${(cm / 2.54).toFixed(1)} in`
  return (
    <div className="dp-meas-row">
      <span className="dp-meas-label">{label}</span>
      <div className="dp-meas-bar-wrap">
        <div
          className={`dp-meas-bar ${deviation >= 0 ? 'above' : 'below'}`}
          style={{ width: `${Math.min(100, Math.abs(deviation) * 1.5)}%` }}
        />
      </div>
      <span className="dp-meas-val">{displayVal}</span>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function DemographicPanel({ visible, onClose, onScaleChange }) {
  const [isMetric,      setIsMetric]      = useState(true)
  const [ethnicity,     setEthnicity]     = useState(DEFAULT_ETH)
  const [showEthInfo,   setShowEthInfo]   = useState(false)
  const [age,       setAge]       = useState(DEFAULT_AGE)
  const [heightCm,  setHeightCm]  = useState(DEFAULT_HEIGHT)
  const [weightKg,  setWeightKg]  = useState(DEFAULT_WEIGHT)

  function handleUnitToggle(toMetric) {
    if (toMetric === isMetric) return
    setIsMetric(toMetric)
    if (toMetric) {
      setHeightCm(Math.round(heightCm * 2) / 2)
      setWeightKg(Math.round(weightKg * 2) / 2)
    } else {
      const inches = Math.round((heightCm / 2.54) * 2) / 2
      const lbs = Math.round(weightKg / 0.45359237)
      setHeightCm(inches * 2.54)
      setWeightKg(lbs * 0.45359237)
    }
  }

  // ── Run regression engine ──────────────────────────────────────────────────
  // shoulderScale / hipScale are the FULL (weight-included) values shown in the
  // chips and used by the muscle layer; bodyShoulderScale / bodyHipScale are the
  // weight-free values that drive the skeleton / joints / vascular layers.
  const { statureScale, shoulderScale, hipScale, bodyShoulderScale, bodyHipScale, measurements } =
    useAnthropometricScale({ ethnicity, age, heightCm, weightKg })

  // ── Propagate scale changes upward to App → Scene → 3D models ─────────────
  // useEffect fires only when the numeric outputs actually change (not on every
  // render), preventing spurious re-renders in the 3D pipeline.
  useEffect(() => {
    onScaleChange?.({ statureScale, shoulderScale, hipScale, bodyShoulderScale, bodyHipScale })
  }, [statureScale, shoulderScale, hipScale, bodyShoulderScale, bodyHipScale, onScaleChange])

  function handleReset() {
    setEthnicity(DEFAULT_ETH)
    setAge(DEFAULT_AGE)
    setHeightCm(DEFAULT_HEIGHT)
    setWeightKg(DEFAULT_WEIGHT)
  }

  // Small-sample ethnicity keys — show caution indicator
  const smallSample = ['NativeAmerican', 'PacificIslander'].includes(ethnicity)

  return (
    <div id="demographic-panel" role="dialog" aria-label="Demographic Scaling Controls" style={{ display: visible ? 'block' : 'none' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="dp-header">
        <div className="dp-title">
          <span className="dp-title-main">Demographic Scaling</span>
          <span className="dp-title-badge">ANSUR II · OLS</span>
        </div>
        <button className="dp-close" onClick={onClose} aria-label="Close">✕</button>
      </div>

      <div className="dp-body">
        {/* ── Unit Toggle ─────────────────────────────────────────────────── */}
        <div className="dp-unit-toggle">
          <button className={`dp-unit-btn ${isMetric ? 'active' : ''}`} onClick={() => handleUnitToggle(true)}>Metric (cm/kg)</button>
          <button className={`dp-unit-btn ${!isMetric ? 'active' : ''}`} onClick={() => handleUnitToggle(false)}>Imperial (ft/lbs)</button>
        </div>

        <div className="dp-divider" />

        {/* ── Ethnicity selector ─────────────────────────────────────────── */}
        <div className="dp-section-label-row">
          <SectionLabel>Ethnicity</SectionLabel>
          <button
            className="dp-info-btn"
            onClick={() => setShowEthInfo(v => !v)}
            aria-label="Ethnicity group information"
          >?</button>
        </div>

        {showEthInfo && (
          <div className="dp-eth-info">
            {[
              { cat: 'Caucasian',       sub: 'White — of European, Middle Eastern, or North African origin' },
              { cat: 'African',         sub: 'Black or African American — African, Afro-Caribbean & African American origin' },
              { cat: 'Hispanic',        sub: 'Hispanic / Latino — Mexican, Puerto Rican, Cuban, Central & South American, and other Spanish origin' },
              { cat: 'Asian',           sub: 'Chinese, Filipino, Japanese, Korean, Vietnamese, Asian Indian, and other Asian origin' },
              { cat: 'Native American', sub: 'American Indian & Alaska Native' },
              { cat: 'Pacific Islander',sub: 'Native Hawaiian, Samoan, Chamorro / Guamanian, and other Pacific Islander origin' },
            ].map(({ cat, sub }) => (
              <div key={cat} className="dp-eth-info-row">
                <span className="dp-eth-info-cat">{cat}</span>
                <span className="dp-eth-info-sub">{sub}</span>
              </div>
            ))}
            <div className="dp-eth-info-note">
              Groups follow the ANSUR II / U.S. DoD race classifications. Selecting one sets the slider to that group's mean height &amp; weight.
            </div>
          </div>
        )}

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
          value={isMetric ? heightCm : heightCm / 2.54}
          min={isMetric ? HEIGHT_MIN : 55}
          max={isMetric ? HEIGHT_MAX : 85}
          step={0.5}
          unit={isMetric ? "cm" : ""}
          displayVal={isMetric ? heightCm.toFixed(1) : formatFeetInches(heightCm / 2.54)}
          onChange={val => setHeightCm(isMetric ? val : val * 2.54)}
        />

        <DualSlider
          id="demo-weight"
          label="Weight"
          value={isMetric ? weightKg : weightKg / 0.45359237}
          min={isMetric ? WEIGHT_MIN : 88}
          max={isMetric ? WEIGHT_MAX : 352}
          step={isMetric ? 0.5 : 1}
          unit={isMetric ? "kg" : "lbs"}
          displayVal={isMetric ? weightKg.toFixed(1) : Math.round(weightKg / 0.45359237).toString()}
          onChange={val => setWeightKg(isMetric ? val : val * 0.45359237)}
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
              isMetric={isMetric}
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
