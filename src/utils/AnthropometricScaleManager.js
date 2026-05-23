/**
 * AnthropometricScaleManager.js
 * ANSUR II Male (n=4082) — statistically-driven per-segment scaling
 * with kinematic chain translation to maintain joint integrity.
 */
import * as THREE from 'three'

// ── Normal Distribution Utilities ─────────────────────────────────────────────
function erf(x) {
  const a1 =  0.254829592, a2 = -0.284496736, a3 =  1.421413741;
  const a4 = -1.453152027, a5 =  1.061405429, p  =  0.3275911;
  const sign = (x < 0) ? -1 : 1;
  x = Math.abs(x);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

function normCDF(x, mean = 0, sd = 1) {
  return 0.5 * (1 + erf((x - mean) / (sd * Math.sqrt(2))));
}

function probit(p) {
  p = Math.max(0.001, Math.min(0.999, p))
  const a = [-3.969683028665376e1,2.209460984245205e2,-2.759285104469687e2,1.383577518672690e2,-3.066479806614716e1,2.506628277459239]
  const b = [-5.447609879822406e1,1.615858368580409e2,-1.556989798598866e2,6.680131188771972e1,-1.328068155288572e1]
  const c = [-7.784894002430293e-3,-3.223964580411365e-1,-2.400758277161838,-2.549732539343734,4.374664141464968,2.938163982698783]
  const d = [7.784695709041462e-3,3.224671290700398e-1,2.445134137142996,3.754408661907416]
  const pl = 0.02425, ph = 1 - pl
  let q, r
  if (p < pl) {
    q = Math.sqrt(-2*Math.log(p))
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
           ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)
  } else if (p <= ph) {
    q = p - 0.5; r = q*q
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q /
           (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1)
  } else {
    q = Math.sqrt(-2*Math.log(1-p))
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
            ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)
  }
}

// ── ANSUR II Male statistics (computed from n=4082 subjects) ─────────────────
export const ANSUR = {
  stature:               { mean:1756.21, sd:68.54,  label:'Stature',          unit:'mm' },
  buttockkneelength:     { mean:617.95,  sd:30.58,  label:'Femur length',      unit:'mm' },
  kneeheightmidpatella:  { mean:488.39,  sd:28.12,  label:'Tibia length',      unit:'mm' },
  acromionradialelength: { mean:335.24,  sd:17.48,  label:'Humerus length',    unit:'mm' },
  radialestylionlength:  { mean:267.88,  sd:15.42,  label:'Forearm length',    unit:'mm' },
  handlength:            { mean:193.28,  sd:9.95,   label:'Hand length',       unit:'mm' },
  footlength:            { mean:271.18,  sd:13.10,  label:'Foot length',       unit:'mm' },
  sittingheight:         { mean:918.29,  sd:35.69,  label:'Sitting height',    unit:'mm' },
  biacromialbreadth:     { mean:415.68,  sd:19.16,  label:'Shoulder breadth',  unit:'mm' },
  hipbreadth:            { mean:345.73,  sd:24.16,  label:'Hip breadth',       unit:'mm' },
}

// ── Kinematic chains (proximal → distal order) ────────────────────────────────
// girthFactor: X/Z scale = 1 + (scaleY-1) * girthFactor
// proximalTop: true = anchor is at max Y of segment bbox (most limb bones)
const CHAINS = [
  [ // Lower limb
    { id:'femur',   ansurKey:'buttockkneelength',     keywords:['femur','patella'],             proximalTop:true,  girthFactor:0.35 },
    { id:'tibia',   ansurKey:'kneeheightmidpatella',  keywords:['tibia','fibula'],              proximalTop:true,  girthFactor:0.30 },
    { id:'foot',    ansurKey:'footlength',             keywords:['calcaneus','talus','navicular','cuneiform','metatarsal','phalanx of foot','cuboid','sesamoid'], proximalTop:true, girthFactor:0.25 },
  ],
  [ // Upper limb
    { id:'humerus', ansurKey:'acromionradialelength',  keywords:['humerus'],                     proximalTop:true,  girthFactor:0.35 },
    { id:'forearm', ansurKey:'radialestylionlength',   keywords:['radius','ulna'],               proximalTop:true,  girthFactor:0.30 },
    { id:'hand',    ansurKey:'handlength',             keywords:['finger of hand','metacarpal bone','scaphoid','lunate','triquetrum','pisiform','hamate','capitate','trapezoid bone','trapezium bone'], proximalTop:true, girthFactor:0.20 },
  ],
]

// Segments scaled only in X/Z (width/depth) — no kinematic chain needed
const WIDTH_SEGS = [
  { id:'shoulder', ansurKey:'biacromialbreadth', keywords:['clavicle','scapula'],  label:'Shoulder breadth' },
  { id:'hip',      ansurKey:'hipbreadth',        keywords:['hip bone'],             label:'Hip breadth' },
]

// ── Class ─────────────────────────────────────────────────────────────────────
export class AnthropometricScaleManager {
  /**
   * @param {THREE.Object3D} skeletonScene  – raw scene from useGLTF('/Skeleton.glb')
   */
  constructor(skeletonScene) {
    this._scene = skeletonScene

    // name → mesh lookup
    this._byName = {}
    skeletonScene.traverse(c => { if (c.isMesh) this._byName[c.name] = c })

    // snapshot original transforms (idempotent apply)
    this._orig = new Map()
    skeletonScene.traverse(c => {
      if (c.isMesh) this._orig.set(c.uuid, { pos: c.position.clone(), scale: c.scale.clone() })
    })

    // build rest-pose segment data
    this._segData = new Map()
    for (const chain of CHAINS) for (const seg of chain) this._buildSeg(seg)
    for (const seg of WIDTH_SEGS) this._buildSeg(seg)

    this.measurements = {}
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  _findMeshes(keywords) {
    return Object.values(this._byName).filter(m =>
      keywords.some(k => m.name.toLowerCase().includes(k.toLowerCase())))
  }

  _buildSeg(seg) {
    const meshes = this._findMeshes(seg.keywords)
    if (!meshes.length) { this._segData.set(seg.id, null); return }
    let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity
    for (const m of meshes) {
      m.geometry.computeBoundingBox()
      const bb = m.geometry.boundingBox
      const o  = this._orig.get(m.uuid)
      const y0 = o.pos.y + bb.min.y * o.scale.y
      const y1 = o.pos.y + bb.max.y * o.scale.y
      const x0 = o.pos.x + bb.min.x * o.scale.x
      const x1 = o.pos.x + bb.max.x * o.scale.x
      if (y0 < minY) minY = y0;  if (y1 > maxY) maxY = y1
      if (x0 < minX) minX = x0;  if (x1 > maxX) maxX = x1
    }
    this._segData.set(seg.id, { seg, meshes, minY, maxY, restLen: maxY - minY, cx: (minX+maxX)/2 })
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  /**
   * Apply ANSUR-driven scaling for a given population percentile (1–99).
   * Returns the computed clinical measurements object.
   */
  apply(percentile) {
    const p = Math.max(1, Math.min(99, percentile)) / 100
    const z = probit(p)
    this.measurements = {}

    // Reset all meshes to rest pose
    this._scene.traverse(c => {
      if (c.isMesh && this._orig.has(c.uuid)) {
        const o = this._orig.get(c.uuid)
        c.position.copy(o.pos)
        c.scale.copy(o.scale)
      }
    })

    // ── Kinematic chains ──────────────────────────────────────────────────────
    for (const chain of CHAINS) {
      let cumDelta = 0  // accumulated Y displacement from parent segments

      for (const seg of chain) {
        const data = this._segData.get(seg.id)
        if (!data) continue

        const stats    = ANSUR[seg.ansurKey]
        const scaleY   = (stats.mean + z * stats.sd) / stats.mean
        const scaleXZ  = 1 + (scaleY - 1) * seg.girthFactor

        // Proximal anchor in scene space (shifted by cumulative delta from parents)
        const proxY = (seg.proximalTop ? data.maxY : data.minY) + cumDelta

        for (const m of data.meshes) {
          const o = this._orig.get(m.uuid)
          // Scale around proximalY: newPos = proxY + (origPos + cumDelta - proxY) * scaleY
          m.position.y   = proxY + (o.pos.y + cumDelta - proxY) * scaleY
          m.scale.y      = o.scale.y * scaleY
          m.position.x   = o.pos.x * scaleXZ
          m.position.z   = o.pos.z * scaleXZ
          m.scale.x      = o.scale.x * scaleXZ
          m.scale.z      = o.scale.z * scaleXZ
        }

        // New distal Y → delta to pass down to next segment
        const restDistalY = seg.proximalTop ? data.minY : data.maxY
        const newDistalY  = proxY + (restDistalY + cumDelta - proxY) * scaleY
        cumDelta = newDistalY - restDistalY

        const measMm = stats.mean + z * stats.sd
        this.measurements[seg.id] = { label: stats.label, mm: +measMm.toFixed(1), cm: +(measMm/10).toFixed(2), percentile }
      }
    }

    // ── Width-only segments ───────────────────────────────────────────────────
    for (const seg of WIDTH_SEGS) {
      const data = this._segData.get(seg.id)
      if (!data) continue
      const stats   = ANSUR[seg.ansurKey]
      const scaleX  = (stats.mean + z * stats.sd) / stats.mean
      for (const m of data.meshes) {
        const o = this._orig.get(m.uuid)
        m.scale.x    = o.scale.x * scaleX
        m.scale.z    = o.scale.z * scaleX
        m.position.x = o.pos.x * scaleX
        m.position.z = o.pos.z * scaleX
      }
      const measMm = stats.mean + z * stats.sd
      this.measurements[seg.id] = { label: stats.label, mm: +measMm.toFixed(1), cm: +(measMm/10).toFixed(2), percentile }
    }

    const statureMm = ANSUR.stature.mean + z * ANSUR.stature.sd
    this.measurements['stature'] = { label: 'Stature', mm: +statureMm.toFixed(1), cm: +(statureMm/10).toFixed(2), percentile }

    return this.measurements
  }

  /** Stature in mm for a given percentile */
  statureMm(percentile) {
    const z = probit(Math.max(1, Math.min(99, percentile)) / 100)
    return ANSUR.stature.mean + z * ANSUR.stature.sd
  }

  /** Percentile (1-99) for a given stature in mm */
  percentileFromStatureMm(mm) {
    const z = (mm - ANSUR.stature.mean) / ANSUR.stature.sd
    const p = normCDF(z)
    return Math.max(1, Math.min(99, Math.round(p * 100)))
  }
}

export { probit, normCDF }
export default AnthropometricScaleManager
