import { useEffect, useMemo, useRef, useState } from 'react'
import { useGLTF, useCursor } from '@react-three/drei'
import * as THREE from 'three'

// ── Joint group definitions ───────────────────────────────────────────────────
// Keywords are matched against mesh names loaded from Joints.glb.
// Add or rename groups here — LayerControls picks them up automatically.

export const JOINT_GROUPS = {
  'All Joints': null,

  'Head & Neck': [
    'temporomandibular', 'sphenomandibular', 'stylomandibular', 'pterygospinous',
    'stylohyoid', 'thyrohyoid', 'cricothyroid', 'cricopharyngeal',
    'quadrangular membrane',
  ],

  'Spine': [
    'intervertebral disc', 'nucleus pulposus',
    'anterior longitudinal', 'posterior longitudinal',
    'ligamenta flava', 'interspinous', 'supraspinous', 'nuchal',
    'sacrococcygeal', 'intercornual',
    'costotransverse', 'radiate ligament of head of rib',
    'intra-articular ligament of head of rib',
  ],

  'Thorax': [
    'sternoclavicular', 'costoclavicular', 'interclavicular',
    'external intercostal', 'internal intercostal',
  ],

  'Shoulder': [
    'glenohumeral', 'coracohumeral', 'transverse humeral',
    'coraco-acromial', 'transverse scapular', 'conoid ligament',
    'trapezoid ligament', 'glenoid labrum', 'acromioclavicular',
  ],

  'Upper Limb': [
    'elbow', 'annular ligament of radius', 'radial collateral ligament',
    'ulnar collateral ligament', 'quadrate ligament', 'oblique cord',
    'radio-ulnar', 'interosseous membrane of forearm',
    'radiocarpal', 'ulnocarpal', 'carpometacarpal', 'intercarpal',
    'articular capsule of radiocarpal',
  ],

  'Hand': [
    'metacarpal', 'metacarpophalangeal',
    'articular capsules of distal interphalangeal joints',
    'articular capsules of proximal interphalangeal joints',
    'collateral interphalangeal ligaments of hand',
    'palmar interphalangeal', 'dorsal radio-ulnar', 'palmar radio-ulnar',
    'pisohamate', 'pisometacarpal', 'pisotriquetral',
    'lunotriquetral', 'scapholunate', 'scaphocapitate', 'scaphotrapezio',
    'trapeziotrapezoidal', 'trapezoideocapitate', 'capitohamate',
    'triquetrocapitate', 'triquetrohamate',
    'radiate carpal', 'radioscaphocapitate', 'radiocapitate',
    'ulnocapitate', 'ulnolunate', 'ulnopisiform', 'ulnotriquetral',
    'deep transverse metacarpal', 'dorsal scaphotriquetral',
    'palmar lunotriquetral', 'palmar scaphotriquetral',
    'palmar trapezoideocapitate', 'palmar carpometacarpal',
    'palmar metacarpal', 'dorsal carpometacarpal',
    'dorsal intercarpal', 'dorsal metacarpal',
    'interosseous metacarpal', 'collateral metacarpophalangeal',
  ],

  'Pelvis': [
    'pubic symphysis', 'interpubic disc', 'superior pubic ligament',
    'inferior pubic ligament', 'iliolumbar', 'obturator membrane',
    'sacrospinous', 'sacrotuberous', 'sacro-iliac', 'triradiate',
  ],

  'Hip': [
    'acetabular labrum', 'articular capsule of hip', 'iliofemoral',
    'frenula capsulae', 'ischiofemoral', 'ligament of head of femur',
    'pubofemoral', 'transverse acetabular',
  ],

  'Knee': [
    'cruciate ligament', 'meniscotibial', 'arcuate popliteal',
    'articular capsule of knee', 'tibial collateral', 'fibular collateral',
    'infrapatellar', 'lateral meniscus', 'medial meniscus', 'meniscopatellar',
    'oblique popliteal', 'popliteofibular', 'transverse ligament of knee',
    'ligament of fibular head', 'articular capsule of superior tibiofibular',
  ],

  'Ankle & Foot': [
    'interosseous membrane of leg', 'tibiofibular',
    'talofibular', 'calcaneofibular', 'tibiotalar', 'tibiocalcaneal',
    'tibionavicular', 'talocalcaneal', 'talonavicular', 'calcaneocuboid',
    'calcaneonavicular', 'cuneocuboid', 'cuboideonavicular', 'cuneonavicular',
    'intercuneiform', 'long plantar', 'tarsometatarsal', 'intersesamoid',
    'interphalangeal joint of great toe',
    'articular capsules of distal interphalangeal joints of foot',
    'articular capsules of proximal interphalangeal joints of foot',
    'articular capsules of metatarsophalangeal',
    'collateral interphalangeal ligaments of foot',
    'collateral metatarsophalangeal',
    'plantar interphalangeal', 'plantar metatarsophalangeal',
    'plantar calcaneocuboid', 'plantar cuboideonavicular', 'plantar cuneocuboid',
    'plantar cuneonavicular', 'plantar intercuneiform',
    'plantar calcaneonavicular', 'plantar metatarsal', 'plantar tarsometatarsal',
    'deep transverse metatarsal', 'metatarsal interosseous',
    'cuneometatarsal interosseous', 'intercuneiform interosseous',
    'cuneocuboid interosseous',
    'dorsal calcaneocuboid', 'dorsal cuboideonavicular', 'dorsal cuneocuboid',
    'dorsal cuneonavicular', 'dorsal intercuneiform', 'dorsal metatarsal',
    'dorsal tarsometatarsal',
  ],
}


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

// ── Region detection for proportional scaling ─────────────────────────────────
// Skull joints are protected from shoulder-width scaling.
// Lower-limb joints use hipScale instead of shoulderScale for X/Z.

const SKULL_KEYS = [
  'temporomandibular', 'sphenomandibular', 'stylomandibular', 'pterygospinous',
  'stylohyoid', 'thyrohyoid', 'cricothyroid', 'cricopharyngeal',
  'quadrangular membrane',
]

const LOWER_KEYS = [
  'pubic symphysis', 'interpubic', 'superior pubic', 'inferior pubic',
  'iliolumbar', 'obturator membrane', 'sacrospinous', 'sacrotuberous',
  'sacro-iliac', 'triradiate',
  'acetabular labrum', 'articular capsule of hip', 'iliofemoral',
  'frenula capsulae', 'ischiofemoral', 'ligament of head of femur',
  'pubofemoral', 'transverse acetabular',
  'cruciate ligament', 'meniscotibial', 'arcuate popliteal',
  'articular capsule of knee', 'tibial collateral', 'fibular collateral',
  'infrapatellar', 'lateral meniscus', 'medial meniscus', 'meniscopatellar',
  'oblique popliteal', 'popliteofibular', 'transverse ligament of knee',
  'ligament of fibular head', 'articular capsule of superior tibiofibular',
  'interosseous membrane of leg', 'tibiofibular',
  'talofibular', 'calcaneofibular', 'tibiotalar', 'tibiocalcaneal',
  'tibionavicular', 'talocalcaneal', 'talonavicular', 'calcaneocuboid',
  'calcaneonavicular', 'cuneocuboid', 'cuboideonavicular', 'cuneonavicular',
  'intercuneiform', 'long plantar', 'metatarsal', 'tarsometatarsal',
  'intersesamoid', 'great toe', 'interphalangeal joints of foot',
  'plantar', 'deep transverse metatarsal',
]

const isSkull = name => SKULL_KEYS.some(k => name.toLowerCase().includes(k))
const isLower = name => LOWER_KEYS.some(k => name.toLowerCase().includes(k))

// ── Materials ─────────────────────────────────────────────────────────────────

// Colors match MuscleModel's MAT_OVERRIDES so joint elements look consistent
// when viewed alongside or instead of the muscle layer.
const MAT_LIGAMENT = new THREE.MeshStandardMaterial({
  color: 0xE6DBCA,  // matches MuscleModel 'Ligament'
  roughness: 0.5,
  metalness: 0.0,
  side: THREE.DoubleSide,
})

const MAT_CARTILAGE = (() => {
  const m = new THREE.MeshStandardMaterial({
    color: 0x3FC8C8,  // matches MuscleModel 'Cartilage'
    roughness: 0.2,
    metalness: 0.0,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
  })
  return m
})()

const MAT_CAPSULE = (() => {
  const m = new THREE.MeshStandardMaterial({
    color: 0xE0DAC7,  // matches MuscleModel 'Articular capsule'
    roughness: 0.45,
    metalness: 0.0,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  })
  return m
})()

const MAT_FAT = new THREE.MeshStandardMaterial({
  color: 0xAD6E1E,  // matches MuscleModel 'Fat'
  roughness: 0.7,
  metalness: 0.0,
  side: THREE.DoubleSide,
})

const MAT_HOVER = new THREE.MeshStandardMaterial({
  color: 0xffe0a0,
  roughness: 0.3,
  metalness: 0.05,
  emissive: new THREE.Color(0x7a5800),
  emissiveIntensity: 0.5,
  side: THREE.DoubleSide,
})

const MAT_SELECTED = new THREE.MeshStandardMaterial({
  color: 0xffe033,
  roughness: 0.25,
  metalness: 0.1,
  emissive: new THREE.Color(0x806200),
  emissiveIntensity: 0.65,
  side: THREE.DoubleSide,
})

// Map original GLB material names → override materials
const MATERIAL_MAP = {
  'Ligament':          MAT_LIGAMENT,
  'Cartilage':         MAT_CARTILAGE,
  'Articular capsule': MAT_CAPSULE,
  'Fat':               MAT_FAT,
}

function getBaseMat(mesh) {
  return MATERIAL_MAP[mesh.userData.originalMatName] ?? MAT_LIGAMENT
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function meshMatchesGroup(name, keywords) {
  if (!keywords) return true
  const lower = name.toLowerCase()
  return keywords.some(k => lower.includes(k.toLowerCase()))
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function JointModel({
  visible       = false,
  selectedBone  = null,
  onSelect,
  activeGroup   = 'All Joints',
  filterMode    = 'fade',       // 'fade' | 'hide'
  shoulderScale = 1,
  hipScale      = 1,
  layerFaded    = false,
}) {
  const { scene }  = useGLTF('/Joints.glb')
  const [hovered, setHovered] = useState(null)
  const snapRef  = useRef(null)   // snapshot of per-mesh scale + position taken once

  useCursor(!!hovered && visible)

  // ── Assign typed materials once on load ────────────────────────────────────
  const meshes = useMemo(() => {
    const list = []
    scene.traverse(child => {
      if (!child.isMesh) return
      child.castShadow    = true
      child.receiveShadow = true
      child.name = cleanName(child.name)
      const originalMat = Array.isArray(child.material) ? child.material[0] : child.material
      child.userData.originalMatName = originalMat?.name ?? ''
      child.material = MATERIAL_MAP[originalMat?.name] ?? MAT_LIGAMENT
      list.push(child)
    })
    return list
  }, [scene])

  // ── Disable raycasting while the layer is hidden ───────────────────────────
  useEffect(() => {
    meshes.forEach(mesh => {
      mesh.raycast = visible ? THREE.Mesh.prototype.raycast : () => {}
    })
  }, [visible, meshes])

  // ── Region-specific X/Z corrections ────────────────────────────────────────
  // The shared body group (in Scene) owns the overall scale + position. This
  // layer only neutralises the shared shoulderScale over the skull and swaps it
  // for hipScale over the lower body, per mesh.
  useEffect(() => {
    if (!scene) return

    // 1. Build snapshot once (before any scaling has touched positions)
    if (!snapRef.current) {
      const skull = []
      const lower = []
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

    // 2. Skull joints: neutralise shoulder scale on both shape and baked position
    for (const { mesh, ox, oz, px, pz } of snapRef.current.skull) {
      mesh.scale.x    = ox / shoulderScale
      mesh.scale.z    = oz / shoulderScale
      mesh.position.x = px / shoulderScale
      mesh.position.z = pz / shoulderScale
    }

    // 3. Lower joints: swap shoulderScale for hipScale on shape and position
    for (const { mesh, ox, oz, px, pz } of snapRef.current.lower) {
      mesh.scale.x    = ox * hipScale / shoulderScale
      mesh.scale.z    = oz * hipScale / shoulderScale
      mesh.position.x = px * hipScale / shoulderScale
      mesh.position.z = pz * hipScale / shoulderScale
    }
  }, [scene, shoulderScale, hipScale])

  // ── Per-render material + visibility assignment ────────────────────────────
  const fadedMats = useMemo(() => new Map(), [])
  const keywords  = JOINT_GROUPS[activeGroup] ?? null

  meshes.forEach(mesh => {
    const inGroup = meshMatchesGroup(mesh.name, keywords)
    const base    = getBaseMat(mesh)

    if (layerFaded) {
      mesh.visible  = true
      mesh.raycast  = () => null
      if (!fadedMats.has('__layer__' + mesh.uuid)) {
        const faded       = base.clone()
        faded.transparent = true
        faded.opacity     = 0.15
        faded.depthWrite  = false
        fadedMats.set('__layer__' + mesh.uuid, faded)
      }
      mesh.material = fadedMats.get('__layer__' + mesh.uuid)
      return
    }

    if (mesh === selectedBone) {
      mesh.material = MAT_SELECTED
      mesh.visible  = true
    } else if (mesh === hovered && visible && inGroup) {
      mesh.material = MAT_HOVER
      mesh.visible  = true
    } else if (inGroup) {
      mesh.material = base
      mesh.visible  = visible
    } else {
      // Not in active group — fade or hide
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
    <group visible={visible}>
      <primitive
        object={scene}
        onClick={e => {
          if (!visible) return
          e.stopPropagation()
          if (meshMatchesGroup(e.object.name, keywords)) onSelect(e.object)
        }}
        onPointerOver={e => {
          if (!visible) return
          e.stopPropagation()
          if (meshMatchesGroup(e.object.name, keywords)) setHovered(e.object)
        }}
        onPointerOut={() => setHovered(null)}
      />
    </group>
  )
}

useGLTF.preload('/Joints.glb')
