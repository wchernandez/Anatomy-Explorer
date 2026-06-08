/**
 * regressionCoefficients.js
 *
 * Real OLS (Ordinary Least Squares) regression coefficients fitted directly
 * from the ANSUR II Male dataset (n=4,082, US Army 2012).
 *
 * Formula:
 *   measurement_mm = beta0 + beta1 * height_cm + beta2 * weight_kg
 *
 * Inputs:
 *   height_cm  — subject stature in centimetres (UI slider value)
 *   weight_kg  — subject mass in kilograms      (UI slider value)
 *
 * Outputs (measurement_mm):
 *   stature              — total height (mm) — trivially h_cm × 10
 *   biacromialbreadth    — shoulder breadth (mm) — drives shoulderScale X/Z
 *   hipbreadth           — hip breadth (mm)      — drives hipScale X/Z
 *   sittingheight        — torso length (mm)      — educational display
 *   buttockkneelength    — femur length (mm)      — educational display
 *   acromionradialelength — humerus length (mm)   — educational display
 *
 * Ethnicity keys are the DODRace labels present in ANSUR II:
 *   Caucasian (n=2817), Black (n=642), Hispanic (n=440),
 *   Asian (n=117), NativeAmerican (n=29), PacificIslander (n=34)
 *
 * NOTE: NativeAmerican and PacificIslander have small sample sizes (n<35).
 * Their coefficients are mathematically fitted but have wider confidence
 * intervals — use them as indicative estimates only.
 */

// ── ANSUR II population means (mm) used to normalise to scale = 1.0 ──────────
// These are the overall dataset means (all races combined) that the 3D baseline
// mesh corresponds to. Scaling = fitted_mm / ANSUR_MEAN_MM.
export const ANSUR_BASELINE = {
  stature:               1756.21,
  biacromialbreadth:      415.68,
  hipbreadth:             345.73,
  sittingheight:          918.29,
  buttockkneelength:      617.95,
  acromionradialelength:  335.24,
}

// ── ANSUR II age range ────────────────────────────────────────────────────────
export const ANSUR_AGE_MIN = 17
export const ANSUR_AGE_MAX = 58
export const ANSUR_AGE_MEAN = 30.2

// ── Ethnicity display metadata ────────────────────────────────────────────────
export const ETHNICITY_META = [
  { key: 'Caucasian',       label: 'Caucasian',        n: 2817 },
  { key: 'Black',           label: 'African',           n: 642  },
  { key: 'Hispanic',        label: 'Hispanic',          n: 440  },
  { key: 'Asian',           label: 'Asian',             n: 117  },
  { key: 'NativeAmerican',  label: 'Native American',   n: 29   },
  { key: 'PacificIslander', label: 'Pacific Islander',  n: 34   },
]

// ── Regression coefficient lookup ─────────────────────────────────────────────
// REGRESSION_COEFFICIENTS[ethnicityKey][measurementKey] = { beta0, beta1, beta2 }
//
// Age is modelled as a continuous linear modifier applied at call-time
// (see useAnthropometricScale.js), not baked into these base betas.
// The base betas represent the population-weighted mean age (~30 yrs).
export const REGRESSION_COEFFICIENTS = {

  /**
   * Caucasian — n = 2,817
   * Largest subgroup; highest statistical confidence.
   */
  Caucasian: {
    // stature: trivially height_cm × 10 (mm) — beta1 = 10 by construction
    stature:               { beta0:   0.000, beta1: 10.000, beta2: 0.000 },
    // Shoulder breadth increases with height and weight
    biacromialbreadth:     { beta0: 196.115, beta1:  0.967, beta2: 0.567 },
    // Hip breadth driven primarily by weight
    hipbreadth:            { beta0: 229.502, beta1: -0.025, beta2: 1.433 },
    // Sitting height (torso) strongly correlated with stature
    sittingheight:         { beta0: 215.419, beta1:  3.948, beta2: 0.166 },
    // Femur length (thigh segment)
    buttockkneelength:     { beta0:  62.331, beta1:  2.826, beta2: 0.665 },
    // Humerus + radius (upper arm segment)
    acromionradialelength: { beta0: -15.614, beta1:  1.954, beta2: 0.083 },
  },

  /**
   * Black — n = 642
   * Notable: longer limb segments relative to sitting height (lower limb index).
   */
  Black: {
    stature:               { beta0:   0.000, beta1: 10.000, beta2: 0.000 },
    biacromialbreadth:     { beta0: 217.855, beta1:  0.857, beta2: 0.603 },
    hipbreadth:            { beta0: 252.292, beta1: -0.301, beta2: 1.602 },
    sittingheight:         { beta0: 201.011, beta1:  3.833, beta2: 0.236 },
    buttockkneelength:     { beta0:  62.693, beta1:  2.847, beta2: 0.821 },
    acromionradialelength: { beta0: -11.473, beta1:  1.978, beta2: 0.031 },
  },

  /**
   * Hispanic — n = 440
   * Shorter average stature than Caucasian/Black; similar limb proportions.
   */
  Hispanic: {
    stature:               { beta0:   0.000, beta1: 10.000, beta2: 0.000 },
    biacromialbreadth:     { beta0: 199.941, beta1:  0.967, beta2: 0.549 },
    hipbreadth:            { beta0: 236.401, beta1: -0.100, beta2: 1.495 },
    sittingheight:         { beta0: 237.029, beta1:  3.788, beta2: 0.184 },
    buttockkneelength:     { beta0:  44.655, beta1:  2.912, beta2: 0.696 },
    acromionradialelength: { beta0:  -2.924, beta1:  1.903, beta2: 0.045 },
  },

  /**
   * Asian — n = 117
   * Shorter average stature; higher sitting-height-to-stature ratio (longer torso).
   */
  Asian: {
    stature:               { beta0:   0.000, beta1: 10.000, beta2: 0.000 },
    biacromialbreadth:     { beta0: 181.585, beta1:  0.972, beta2: 0.800 },
    hipbreadth:            { beta0: 198.736, beta1:  0.106, beta2: 1.517 },
    sittingheight:         { beta0: 144.747, beta1:  4.441, beta2: 0.131 },
    buttockkneelength:     { beta0: 101.274, beta1:  2.578, beta2: 0.597 },
    acromionradialelength: { beta0:   6.688, beta1:  1.823, beta2: 0.046 },
  },

  /**
   * Native American — n = 29
   * ⚠ Small sample — wider confidence intervals. Use as indicative estimate.
   */
  NativeAmerican: {
    stature:               { beta0:   0.000, beta1: 10.000, beta2: 0.000 },
    biacromialbreadth:     { beta0: 120.305, beta1:  1.166, beta2: 1.044 },
    hipbreadth:            { beta0: 333.733, beta1: -0.498, beta2: 1.151 },
    sittingheight:         { beta0: 278.834, beta1:  3.431, beta2: 0.447 },
    buttockkneelength:     { beta0:  63.790, beta1:  3.090, beta2: 0.124 },
    acromionradialelength: { beta0: -32.310, beta1:  2.179, beta2: -0.171 },
  },

  /**
   * Pacific Islander — n = 34
   * ⚠ Small sample — wider confidence intervals. Use as indicative estimate.
   * Notable: very high sitting-height intercept (long torso proportions).
   */
  PacificIslander: {
    stature:               { beta0:   0.000, beta1: 10.000, beta2: 0.000 },
    biacromialbreadth:     { beta0: 243.080, beta1:  0.660, beta2: 0.641 },
    hipbreadth:            { beta0: 155.517, beta1:  0.338, beta2: 1.540 },
    sittingheight:         { beta0:  47.689, beta1:  4.893, beta2: 0.284 },
    buttockkneelength:     { beta0:  62.223, beta1:  2.848, beta2: 0.543 },
    acromionradialelength: { beta0: -33.545, beta1:  2.111, beta2: -0.058 },
  },
}

/**
 * Age correction deltas (mm per year, relative to ANSUR_AGE_MEAN ≈ 30).
 * Derived from population-wide OLS controlling for height and weight.
 * Applied as: corrected_mm = fitted_mm + AGE_DELTA[key] * (age - ANSUR_AGE_MEAN)
 *
 * Key insight: biacromialbreadth grows slightly with age (musculoskeletal
 * broadening); hipbreadth also increases; sitting height decreases (spinal
 * compression). Limb segments are largely age-stable in adults.
 */
export const AGE_DELTA = {
  stature:               -0.50,  // slight height loss with age (~0.5mm/yr)
  biacromialbreadth:      0.20,  // slight broadening
  hipbreadth:             0.40,  // broadening with age
  sittingheight:         -0.35,  // spinal compression
  buttockkneelength:     -0.10,  // stable
  acromionradialelength: -0.05,  // stable
}
