/**
 * ProportionalScaler.js
 *
 * Moves bone/muscle meshes by adjusting Object3D position + scale, not vertex buffers.
 * Each mesh already lives at its correct world position in the GLB scene graph.
 * We move those positions using zone-based stacking.
 *
 * ANSUR II Male: meanStature=1756.21mm, meanBreadth=415.68mm, ratio=0.14864
 */

import * as THREE from 'three'

const ANSUR_CORRELATION_RATIO = 0.14864

// Zones: normalised Y [0=feet, 1=crown].
// h  → heightParticipation: 1 = zone grows with height, 0 = fixed-size (just translates)
// xz → true = no lateral widening applied here
const ZONES = [
  { name: 'feet',     yMin: 0.000, yMax: 0.065, h: 0.0, xz: true  },
  { name: 'lowerLeg', yMin: 0.065, yMax: 0.280, h: 1.0, xz: false },
  { name: 'knee',     yMin: 0.280, yMax: 0.330, h: 0.0, xz: false },
  { name: 'thigh',    yMin: 0.330, yMax: 0.520, h: 1.0, xz: false },
  { name: 'pelvis',   yMin: 0.520, yMax: 0.580, h: 0.0, xz: false },
  { name: 'abdomen',  yMin: 0.580, yMax: 0.680, h: 1.0, xz: false },
  { name: 'thorax',   yMin: 0.680, yMax: 0.790, h: 1.0, xz: false },
  { name: 'neck',     yMin: 0.790, yMax: 0.880, h: 0.0, xz: false },
  { name: 'head',     yMin: 0.880, yMax: 1.000, h: 0.0, xz: true  },
]

const HAND_KW = [
  'hand','finger','thumb','phalanx','phalange',
  'metacarpal','carpus','carpal','wrist',
  'pisiform','hamate','capitate','trapezoid','trapezium',
  'scaphoid','lunate','triquetrum',
]
const isHand = n => HAND_KW.some(k => n.toLowerCase().includes(k))
const isFoot = n => ['foot','feet','talus','calcaneus','metatarsal','toe'].some(k => n.toLowerCase().includes(k))

export class ProportionalScaler {
  constructor(skeletonScene, muscleScene) {
    this.params = { height: 1.0, width: 1.0 }

    const allMeshes = this._collect(skeletonScene).concat(this._collect(muscleScene))

    // ── Per-mesh data ─────────────────────────────────────────────────────────
    this._data = []

    for (const mesh of allMeshes) {
      // Compute local centroid from vertex buffer
      const buf = mesh.geometry.attributes.position.array
      let lx = 0, ly = 0, lz = 0
      const n = buf.length / 3
      for (let i = 0; i < buf.length; i += 3) { lx += buf[i]; ly += buf[i+1]; lz += buf[i+2] }
      lx /= n; ly /= n; lz /= n

      // Scene-space centroid: walk up the hierarchy accumulating position offsets.
      // We do NOT rely on matrixWorld because it may not be valid before the first render.
      const sp = this._scenePosition(mesh)
      const wx = sp.x + lx
      const wy = sp.y + ly
      const wz = sp.z + lz

      this._data.push({
        mesh,
        origPos:   mesh.position.clone(),
        origScale: mesh.scale.clone(),
        lcx: lx, lcy: ly, lcz: lz,
        wx, wy, wz,
        hand: isHand(mesh.name),
        foot: isFoot(mesh.name),
      })
    }

    // ── Scene-space Y bounding box ────────────────────────────────────────────
    let yMin = Infinity, yMax = -Infinity
    for (const d of this._data) {
      if (d.wy < yMin) yMin = d.wy
      if (d.wy > yMax) yMax = d.wy
    }
    const ySpan  = Math.max(yMax - yMin, 1e-4)
    this._yMin   = yMin
    this._ySpan  = ySpan

    // Assign each mesh to its anatomical zone
    for (const d of this._data) {
      const t = Math.max(0, Math.min(0.9999, (d.wy - yMin) / ySpan))
      d.zone = ZONES.find(z => t >= z.yMin && t < z.yMax) ?? ZONES[ZONES.length - 1]
    }

    this.apply()
  }

  /**
   * Walk up the Object3D hierarchy accumulating position vectors.
   * Stops at the Scene root so we stay within scene-space coordinates.
   */
  _scenePosition(obj) {
    const p = new THREE.Vector3()
    let cur = obj
    while (cur && cur.type !== 'Scene') {
      p.add(cur.position)
      cur = cur.parent
    }
    return p
  }

  _collect(root) {
    const out = []
    root.traverse(c => { if (c.isMesh && c.geometry?.attributes?.position) out.push(c) })
    return out
  }

  /**
   * Compute the stacked zone layout for height multiplier h.
   * Returns a Map<zoneName, {yScale, baseW, newBaseW, spanW, newSpanW}>.
   *
   * Scalable zones grow; fixed zones keep their natural size but shift because
   * the zones below them changed — this is the "stacking" that makes limbs
   * actually move rather than stretching in place.
   */
  _layout(h) {
    const totalW       = this._ySpan
    const scalableFrac = ZONES.reduce((s, z) => s + (z.yMax - z.yMin) * z.h, 0)
    const fixedFrac    = 1 - scalableFrac
    const newScalableW = h * totalW - fixedFrac * totalW
    const sf           = scalableFrac > 0 ? newScalableW / (scalableFrac * totalW) : 1

    const map = new Map()
    let baseW = this._yMin, newBaseW = this._yMin

    for (const z of ZONES) {
      const spanW    = (z.yMax - z.yMin) * totalW
      const yScale   = z.h > 0 ? sf : 1.0
      const newSpanW = spanW * yScale
      map.set(z.name, { yScale, baseW, newBaseW, spanW, newSpanW })
      baseW    += spanW
      newBaseW += newSpanW
    }
    return map
  }

  apply() {
    const h  = this.params.height
    const w  = this.params.width
    const coupling = 1.0 + (h - 1.0) * ANSUR_CORRELATION_RATIO
    const xzScale  = coupling * w
    const layout   = this._layout(h)

    for (const d of this._data) {
      const { mesh, origScale, zone, wy, wx, wz, lcx, lcy, lcz, hand, foot } = d
      const L = layout.get(zone.name)

      // ── Y (height) ───────────────────────────────────────────────────────────
      // Relative position of this mesh within its zone (0 = bottom, 1 = top)
      const tInZone = L.spanW > 0 ? Math.max(0, Math.min(1, (wy - L.baseW) / L.spanW)) : 0.5
      // New scene-space Y for this mesh's centroid
      const newWY   = L.newBaseW + tInZone * L.newSpanW
      const newSY   = origScale.y * L.yScale
      mesh.scale.y  = newSY
      // Derivation: sceneY = mesh.position.y + lcy * mesh.scale.y
      //   → mesh.position.y = newWY - lcy * newSY
      mesh.position.y = newWY - lcy * newSY

      // ── XZ (width) ───────────────────────────────────────────────────────────
      const s     = (hand || foot || zone.xz) ? 1.0 : xzScale
      const newSX = origScale.x * s
      const newSZ = origScale.z * s
      mesh.scale.x    = newSX
      mesh.scale.z    = newSZ
      // Scale the mesh's scene-space X/Z centroid outward from the body axis (0,0)
      // sceneX = mesh.position.x + lcx * mesh.scale.x → solve for mesh.position.x
      mesh.position.x = wx * s - lcx * newSX
      mesh.position.z = wz * s - lcz * newSZ
    }
  }

  reset() {
    this.params.height = 1.0
    this.params.width  = 1.0
    this.apply()
  }

  getDatasetInfo() {
    return Object.freeze({
      source: 'ANSUR II Male (2012, n ≈ 4 082)',
      meanStatureMm: 1756.21,
      meanBreadthMm: 415.68,
      correlationRatio: ANSUR_CORRELATION_RATIO,
    })
  }
}

export default ProportionalScaler
