import { useEffect, useMemo, useRef, useState } from 'react'
import { useGLTF, useCursor } from '@react-three/drei'
import * as THREE from 'three'


// ── Name cleaning: strips .g, underscores, trailing numbers, then l/r → (L)/(R) ──
function cleanName(name) {
  if (!name) return ''
  let s = name.replace(/\.g$/, '').replace(/_/g, ' ').replace(/\s+\d+$/, '').trim()
  if (/ [lL]$/.test(s)) s = s.slice(0, -2).trim()
  else if (/ [rR]$/.test(s)) s = s.slice(0, -2).trim()
  // Fallback: glued laterality (no space), e.g. "muscler"→"muscle", "toer"→"toe".
  // Skip if preceded by 'a' (plantar, fibular, dorsal…) or 'o' (extensor, flexor…)
  // — those are real anatomical word endings, not laterality suffixes.
  else if (s.length > 2) {
    const last = s[s.length - 1]
    const prev = s[s.length - 2].toLowerCase()
    if ((last === 'l' || last === 'L') && prev !== 'a') s = s.slice(0, -1).trim()
    else if ((last === 'r' || last === 'R') && prev !== 'a' && prev !== 'o') s = s.slice(0, -1).trim()
  }
  return s.replace(/\b\w/g, c => c.toUpperCase())
}

// ── Region detection — same logic as Muscle / Joint models ──────────────────

const SKULL_KEYS = [
  'frontal','parietal','occipital','temporal','sphenoid','zygomatic',
  'nasal','maxilla','mandible','cerebral','carotid','facial','ophthalmic',
  'basilar','vertebral artery','jugular','facial vein','lingual',
]
const isSkull = n => SKULL_KEYS.some(k => n.toLowerCase().includes(k))

const LOWER_KEYS = [
  'femoral','popliteal','tibial','fibular','peroneal','saphenous',
  'iliac','obturator','pudendal','gluteal','plantar','dorsalis pedis',
  'great saphenous','small saphenous','foot','toe',
]
const isLower = n => LOWER_KEYS.some(k => n.toLowerCase().includes(k))

// ── Materials ────────────────────────────────────────────────────────────────

// Arteries — bright red
const ARTERY_MAT = new THREE.MeshStandardMaterial({
  color: 0xcc1a1a,
  roughness: 0.35,
  metalness: 0.1,
})

// Veins — deep blue-purple
const VEIN_MAT = new THREE.MeshStandardMaterial({
  color: 0x2a3fa0,
  roughness: 0.4,
  metalness: 0.05,
})

// Capillaries / generic vessels — mid red
const CAPILLARY_MAT = new THREE.MeshStandardMaterial({
  color: 0x993333,
  roughness: 0.5,
  metalness: 0.05,
})

const hoverMat = new THREE.MeshStandardMaterial({
  color: 0xff6666,
  roughness: 0.3,
  metalness: 0.1,
  emissive: new THREE.Color(0x6a0000),
  emissiveIntensity: 0.6,
})

const selectedMat = new THREE.MeshStandardMaterial({
  color: 0xffdd44,
  roughness: 0.25,
  metalness: 0.15,
  emissive: new THREE.Color(0x7a6000),
  emissiveIntensity: 0.7,
})

/** Pick a base material from the mesh name / original material name */
function getBaseMat(mesh) {
  const name = (mesh.name + ' ' + (mesh.userData.originalMatName ?? '')).toLowerCase()
  if (name.includes('vein') || name.includes('venous') || name.includes('sinus'))
    return VEIN_MAT
  if (name.includes('capillar'))
    return CAPILLARY_MAT
  // Default: artery
  return ARTERY_MAT
}

// ── Vascular Group definitions ───────────────────────────────────────────────

export const VASCULAR_GROUPS = {
  'All Vessels': null,
  'Head & Neck': [
    'carotid','vertebral','basilar','cerebral','facial','ophthalmic',
    'maxillary','lingual','thyroid','subclavian','jugular','temporal artery',
    'occipital artery','ascending pharyngeal','deep cervical',
  ],
  'Thorax': [
    'aorta','coronary','pulmonary','intercostal','bronchial','esophageal',
    'pericardial','mediastinal','subclavian','brachiocephalic','axillary',
    'superior vena cava','azygos','hemiazygos','internal thoracic',
  ],
  'Abdomen': [
    'celiac','hepatic','splenic','gastric','mesenteric','renal','suprarenal',
    'lumbar','inferior vena cava','portal','splenic vein','mesenteric vein',
    'gonadal','phrenic','abdominal aorta',
  ],
  'Upper Limb': [
    'axillary','brachial','radial','ulnar','palmar','digital artery',
    'cephalic','basilic','median cubital','forearm vein','hand vein',
    'interosseous artery',
  ],
  'Lower Limb': [
    'femoral','popliteal','tibial','fibular','peroneal','saphenous',
    'iliac','obturator','pudendal','gluteal','plantar','dorsalis pedis',
    'great saphenous','small saphenous',
  ],
  'Pelvis': [
    'internal iliac','external iliac','common iliac','obturator','gluteal',
    'pudendal','uterine','vaginal','vesical','rectal artery','rectal vein',
    'iliac vein',
  ],
}

function meshMatchesGroup(name, keywords) {
  if (!keywords) return true
  const lower = name.toLowerCase()
  return keywords.some(k => lower.includes(k.toLowerCase()))
}

// ── Component ────────────────────────────────────────────────────────────────

export default function VascularModel({
  visible,
  selectedBone,
  onSelect,
  activeGroup   = 'All Vessels',
  filterMode    = 'fade',
  heightPreset  = 'short',
  statureScale  = 1,
  shoulderScale = 1,
  hipScale      = 1,
  sharedBase    = null,   // normalisation factor shared from SkeletonModel
  sharedOffsetX = null,
  sharedOffsetZ = null,
}) {
  const { scene } = useGLTF('/Vascular.glb')
  const [hovered, setHovered] = useState(null)
  const groupRef = useRef()
  const snapRef  = useRef(null)

  useCursor(!!hovered && visible)

  // ── Assign override materials on first load ──────────────────────────────
  const meshes = useMemo(() => {
    const list = []
    scene.traverse(child => {
      if (!child.isMesh) return
      child.castShadow    = true
      child.receiveShadow = true
      child.name = cleanName(child.name)
      const originalMat = Array.isArray(child.material) ? child.material[0] : child.material
      child.userData.originalMatName = originalMat?.name ?? ''
      child.material = getBaseMat(child)
      list.push(child)
    })
    return list
  }, [scene])

  // ── Disable raycasting when hidden ──────────────────────────────────────
  useEffect(() => {
    meshes.forEach(mesh => {
      mesh.raycast = visible ? THREE.Mesh.prototype.raycast : () => {}
    })
  }, [visible, meshes])

  // ── Proportional scaling — identical to JointModel ───────────────────────
  useEffect(() => {
    if (!groupRef.current) return

    if (!snapRef.current) {
      const skull = [], lower = []
      scene.traverse(child => {
        if (!child.isMesh) return
        const entry = {
          mesh: child,
          ox: child.scale.x,    oz: child.scale.z,
          px: child.position.x, pz: child.position.z,
        }
        if      (isSkull(child.name)) skull.push(entry)
        else if (isLower(child.name)) lower.push(entry)
      })
      snapRef.current = { skull, lower }
    }

    // Reset special meshes before measuring bbox
    for (const { mesh, ox, oz, px, pz } of snapRef.current.skull) {
      mesh.scale.x = ox; mesh.scale.z = oz
      mesh.position.x = px; mesh.position.z = pz
    }
    for (const { mesh, ox, oz, px, pz } of snapRef.current.lower) {
      mesh.scale.x = ox; mesh.scale.z = oz
      mesh.position.x = px; mesh.position.z = pz
    }

    groupRef.current.scale.set(1, 1, 1)
    groupRef.current.position.set(0, 0, 0)
    const box  = new THREE.Box3().setFromObject(groupRef.current)
    const size = box.getSize(new THREE.Vector3())

    // Use sharedBase from Skeleton so all layers normalise identically
    const base = sharedBase ?? (3 / Math.max(size.x, size.y, size.z))

    groupRef.current.scale.set(
      base * shoulderScale,
      base * statureScale,
      base * shoulderScale,
    )

    const scaled = new THREE.Box3().setFromObject(groupRef.current)
    const cx = (scaled.min.x + scaled.max.x) / 2
    const cz = (scaled.min.z + scaled.max.z) / 2
    const posX = sharedOffsetX !== null ? sharedOffsetX : -cx
    const posZ = sharedOffsetZ !== null ? sharedOffsetZ : -cz
    groupRef.current.position.set(posX, -1.5 - scaled.min.y, posZ)

    // Skull: neutralise shoulder scale on shape & position
    for (const { mesh, ox, oz, px, pz } of snapRef.current.skull) {
      mesh.scale.x    = ox / shoulderScale
      mesh.scale.z    = oz / shoulderScale
      mesh.position.x = px / shoulderScale
      mesh.position.z = pz / shoulderScale
    }

    // Lower: replace shoulderScale with hipScale on shape & position
    for (const { mesh, ox, oz, px, pz } of snapRef.current.lower) {
      mesh.scale.x    = ox * hipScale / shoulderScale
      mesh.scale.z    = oz * hipScale / shoulderScale
      mesh.position.x = px * hipScale / shoulderScale
      mesh.position.z = pz * hipScale / shoulderScale
    }
  }, [scene, heightPreset, statureScale, shoulderScale, hipScale, sharedBase, sharedOffsetX, sharedOffsetZ])

  // ── Per-frame material assignment ────────────────────────────────────────
  const fadedMats = useMemo(() => new Map(), [])
  const keywords  = VASCULAR_GROUPS[activeGroup] ?? null

  meshes.forEach(mesh => {
    const inGroup = meshMatchesGroup(mesh.name, keywords)
    const base    = getBaseMat(mesh)

    if (mesh === selectedBone) {
      mesh.material = selectedMat
      mesh.visible  = true
    } else if (mesh === hovered && visible && inGroup) {
      mesh.material = hoverMat
      mesh.visible  = true
    } else if (inGroup) {
      mesh.material = base
      mesh.visible  = true
    } else {
      if (filterMode === 'hide') {
        mesh.visible = false
      } else {
        mesh.visible = true
        if (!fadedMats.has(mesh.uuid)) {
          const faded       = base.clone()
          faded.transparent = true
          faded.opacity     = 0.07
          faded.depthWrite  = false
          fadedMats.set(mesh.uuid, faded)
        }
        mesh.material = fadedMats.get(mesh.uuid)
      }
    }
  })

  return (
    <group ref={groupRef} visible={visible}>
      <primitive
        object={scene}
        onClick={e => {
          if (!visible) return
          e.stopPropagation()
          if (meshMatchesGroup(e.object.name, keywords)) {
            onSelect(e.object)
          }
        }}
        onPointerOver={e => {
          if (!visible) return
          e.stopPropagation()
          if (meshMatchesGroup(e.object.name, keywords)) {
            setHovered(e.object)
          }
        }}
        onPointerOut={() => setHovered(null)}
      />
    </group>
  )
}

useGLTF.preload('/Vascular.glb')
