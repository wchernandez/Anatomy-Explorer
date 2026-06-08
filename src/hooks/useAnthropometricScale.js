/**
 * useAnthropometricScale.js
 *
 * Custom React hook that applies the multi-variable regression formula to
 * convert { ethnicity, age, heightCm, weightKg } into the three 3D scale
 * factors already consumed by the existing SkeletonModel / MuscleModel pipeline:
 *
 *   statureScale  → groupRef.scale.y  (overall height)
 *   shoulderScale → groupRef.scale.x/z for upper body (biacromial)
 *   hipScale      → groupRef.scale.x/z for lower body (hip breadth)
 *
 * Formula (per measurement):
 *   fitted_mm     = β₀ + β₁ × height_cm + β₂ × weight_kg
 *   age_corrected = fitted_mm + AGE_DELTA[key] × (age - ANSUR_AGE_MEAN)
 *   scale         = age_corrected / ANSUR_BASELINE[key]
 *
 * The hook is pure memoised math — no Three.js calls, no side-effects.
 * Outputs are stable object references when inputs are unchanged.
 */

import { useMemo } from 'react'
import {
  REGRESSION_COEFFICIENTS,
  ANSUR_BASELINE,
  AGE_DELTA,
  ANSUR_AGE_MEAN,
} from '../utils/regressionCoefficients.js'

// ANSUR II population mean weight (kg). Used as the reference weight for the
// "body" scales (skeleton / joints / vascular): evaluating the regression at
// this fixed weight removes the weight slider's influence from those layers,
// so only the muscle layer thickens/thins with body weight.
const REFERENCE_WEIGHT_KG = 85.5

// Measurement keys we expose to the UI for educational display
const DISPLAY_KEYS = [
  'sittingheight',
  'buttockkneelength',
  'acromionradialelength',
  'biacromialbreadth',
  'hipbreadth',
]

const DISPLAY_LABELS = {
  sittingheight:          'Sitting Height',
  buttockkneelength:      'Est. Femur',
  acromionradialelength:  'Est. Humerus',
  biacromialbreadth:      'Shoulder Breadth',
  hipbreadth:             'Hip Breadth',
}

/**
 * Apply the regression formula for a single measurement.
 * @param {object} coef        — { beta0, beta1, beta2 }
 * @param {number} heightCm    — user height in cm
 * @param {number} weightKg    — user weight in kg
 * @param {string} measKey     — key into AGE_DELTA / ANSUR_BASELINE
 * @param {number} age         — user age in years
 * @returns {number}           — estimated measurement in mm
 */
function fitMeasurement(coef, heightCm, weightKg, measKey, age) {
  const fitted = coef.beta0 + coef.beta1 * heightCm + coef.beta2 * weightKg
  const ageDelta = AGE_DELTA[measKey] ?? 0
  return fitted + ageDelta * (age - ANSUR_AGE_MEAN)
}

/**
 * Clamp a scale value to a safe range so extreme inputs don't break the model.
 * Range [0.55, 1.6] covers the full realistic human variation.
 */
function clampScale(s) {
  return Math.max(0.55, Math.min(1.60, s))
}

/**
 * @param {object} params
 * @param {string} params.ethnicity   — key from ETHNICITY_META (e.g. 'Caucasian')
 * @param {number} params.age         — subject age in years (17–58)
 * @param {number} params.heightCm    — subject height in cm (140–210)
 * @param {number} params.weightKg    — subject weight in kg (40–160)
 *
 * @returns {object} {
 *   statureScale,       // 3D Y scale (weight has no effect on stature)
 *   shoulderScale,      // FULL X/Z upper-body scale (weight included) — muscle layer
 *   hipScale,           // FULL X/Z lower-body scale (weight included) — muscle layer
 *   bodyShoulderScale,  // weight-free upper-body X/Z — skeleton / joints / vascular
 *   bodyHipScale,       // weight-free lower-body X/Z — skeleton / joints / vascular
 *   measurements,       // array of { key, label, mm, cm } for UI display
 * }
 */
export function useAnthropometricScale({ ethnicity, age, heightCm, weightKg }) {
  return useMemo(() => {
    // Resolve coefficient set — fall back to Caucasian if key missing
    const coefSet = REGRESSION_COEFFICIENTS[ethnicity]
      ?? REGRESSION_COEFFICIENTS['Caucasian']

    // ── 1. Compute stature scale ──────────────────────────────────────────────
    // Stature beta1=10 exactly, so fitted_mm = height_cm × 10 (= height in mm).
    // Age correction: stature shrinks ~0.5mm/yr after ~30.
    const statureMm = fitMeasurement(
      coefSet.stature, heightCm, weightKg, 'stature', age
    )
    // Normalise: scale = subject_mm / ANSUR_baseline_mm
    const statureScale = clampScale(statureMm / ANSUR_BASELINE.stature)

    // ── 2. Compute shoulder (biacromial) scale ────────────────────────────────
    // Two variants:
    //   • shoulderScale     — FULL regression (actual weight) → drives the MUSCLE
    //                         layer so it broadens/narrows with body weight.
    //   • bodyShoulderScale — evaluated at REFERENCE_WEIGHT_KG so weight drops
    //                         out → drives the skeleton / joints / vascular layers
    //                         and the shared body group, which therefore stay
    //                         fixed as the weight slider moves.
    const biacrMm = fitMeasurement(
      coefSet.biacromialbreadth, heightCm, weightKg, 'biacromialbreadth', age
    )
    const shoulderScale = clampScale(biacrMm / ANSUR_BASELINE.biacromialbreadth)

    const biacrMmBody = fitMeasurement(
      coefSet.biacromialbreadth, heightCm, REFERENCE_WEIGHT_KG, 'biacromialbreadth', age
    )
    const bodyShoulderScale = clampScale(biacrMmBody / ANSUR_BASELINE.biacromialbreadth)

    // ── 3. Compute hip scale ──────────────────────────────────────────────────
    // Same FULL vs weight-free split as the shoulder scale above.
    const hipMm = fitMeasurement(
      coefSet.hipbreadth, heightCm, weightKg, 'hipbreadth', age
    )
    const hipScale = clampScale(hipMm / ANSUR_BASELINE.hipbreadth)

    const hipMmBody = fitMeasurement(
      coefSet.hipbreadth, heightCm, REFERENCE_WEIGHT_KG, 'hipbreadth', age
    )
    const bodyHipScale = clampScale(hipMmBody / ANSUR_BASELINE.hipbreadth)

    // ── 4. Build educational display measurements ─────────────────────────────
    const measurements = DISPLAY_KEYS.map(key => {
      const mm = fitMeasurement(coefSet[key], heightCm, weightKg, key, age)
      return {
        key,
        label: DISPLAY_LABELS[key],
        mm:    +mm.toFixed(1),
        cm:    +(mm / 10).toFixed(1),
      }
    })

    return {
      statureScale,
      shoulderScale,
      hipScale,
      bodyShoulderScale,
      bodyHipScale,
      measurements,
    }
  }, [ethnicity, age, heightCm, weightKg])
}
