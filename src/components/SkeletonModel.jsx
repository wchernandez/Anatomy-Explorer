import { useEffect, useMemo, useRef, useState } from 'react'
import { useGLTF, useCursor } from '@react-three/drei'
import * as THREE from 'three'

// ── Region detection ──────────────────────────────────────────────────────────

// Skull — protected from X/Z scaling (skull size doesn't change with body width)
const SKULL_KEYS = [
  'frontal bone','parietal bone','occipital bone','temporal bone','sphenoid bone',
  'zygomatic','nasal bone','maxilla','mandible','vomer','palatine bone','lacrimal',
  'inferior nasal','ethmoid','sinus of','malleus','incus','stapes','hyoid',
  'tooth','incisor','molar','premolar','upper canine','lower canine',
]
const isSkull = n => SKULL_KEYS.some(k => n.toLowerCase().includes(k))

// Lower body — use hipScale instead of shoulderScale for X/Z
const LOWER_KEYS = [
  'femur','thigh','femoral','shaft of femur',
  'tibia','fibula','patella','knee',
  'hip bone','sacrum','coccyx',
  'calcaneus','talus','navicular','cuneiform','metatarsal',
  'phalanx of foot','sesamoid','cuboid',
  'lower leg','shin',
]
const isLower = n => LOWER_KEYS.some(k => n.toLowerCase().includes(k))

// ── Name cleaning ─────────────────────────────────────────────────────────────
// Shared pattern used by all layer models:
//   • strip .g extension
//   • underscores → spaces
//   • strip trailing numbers
//   • trailing space + l/r → (L)/(R)   (handles _l / _r suffixes from Blender)
//   • Title-case every word
function cleanBoneName(name) {
  if (!name) return ''
  let s = name
    .replace(/\.g$/, '')
    .replace(/_/g, ' ')
    .replace(/\s+\d+$/, '')
    .trim()
  if (/ [lL]$/.test(s)) s = s.slice(0, -2).trim()
  else if (/ [rR]$/.test(s)) s = s.slice(0, -2).trim()
  // Fallback: glued laterality (no space), e.g. "muscler"→"muscle", "toer"→"toe".
  // Skip if preceded by 'a' (plantar, fibular, dorsal…) or 'o' (extensor, flexor…)
  // — those are real anatomical word endings, not laterality suffixes.
  else if (s.length > 2) {
    const last = s[s.length - 1]
    const prev = s[s.length - 2].toLowerCase()
    if ((last === 'l' || last === 'L') && prev !== 'a') s = s.slice(0, -1).trim()
    else if ((last === 'r' || last === 'R') && prev !== 'a' && prev !== 'o' && prev !== 'u') s = s.slice(0, -1).trim()
  }
  return s.replace(/\b\w/g, c => c.toUpperCase())
}

// ── Bone Groups for skeletal filtering ───────────────────────────────────────
export const BONE_GROUPS = {
  'All Bones': null,
  'Skull': [
    'frontal bone','parietal bone','occipital bone','temporal bone','sphenoid bone',
    'zygomatic','nasal bone','maxilla','mandible','vomer','palatine bone','lacrimal',
    'inferior nasal concha','ethmoid','sinus of frontal','sinus of sphenoid',
    'malleus','incus','stapes','hyoid',
    'canine','incisor','molar','premolar',
  ],
  'Spine': [
    'vertebra','atlas','axis','sacrum','coccyx',
  ],
  'Thorax': [
    'sternum','manubrium','xiphoid','rib','costal','clavicle','scapula',
  ],
  'Upper Limb': [
    'humerus','radius','ulna',
    'scaphoid','lunate','triquetrum','pisiform','trapezium','trapezoid bone',
    'capitate','hamate',
    'metacarpal bone',
    'finger of hand',
  ],
  'Lower Limb': [
    'femur','tibia','fibula','patella',
    'calcaneus','talus','navicular bone','cuboid bone','cuneiform bone',
    'metatarsal bone',
    'finger of foot','sesamoid bones of foot',
  ],
  'Pelvis': [
    'hip bone','sacrum','coccyx',
  ],
}

function meshMatchesBoneGroup(name, keywords) {
  if (!keywords) return true
  const lower = name.toLowerCase()
  return keywords.some(k => lower.includes(k.toLowerCase()))
}

// Measure a node's bounding box in its OWN local frame, independent of any
// parent transform. This lets the skeleton compute its normalisation factor
// even though it lives inside the shared body group that is already scaled.
function measureLocalBox(root) {
  const box = new THREE.Box3()
  const tmp = new THREE.Box3()
  const mat = new THREE.Matrix4()
  root.updateWorldMatrix(true, true)
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert()
  root.traverse(c => {
    if (!c.isMesh) return
    if (!c.geometry.boundingBox) c.geometry.computeBoundingBox()
    tmp.copy(c.geometry.boundingBox)
    mat.multiplyMatrices(inv, c.matrixWorld)
    tmp.applyMatrix4(mat)
    box.union(tmp)
  })
  return box
}

// polygonOffset pushes bone fragments slightly deeper in the depth buffer so
// that an overlying muscle/joint surface reliably wins where the two are
// near-coincident (subcutaneous bone, z-fighting), preventing bone from
// speckling through the muscle layer. No visual effect when the skeleton is
// shown on its own.
const defaultMat  = new THREE.MeshStandardMaterial({ color: 0xc8b89a, roughness: 0.65, metalness: 0.05, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 })
const hoverMat    = new THREE.MeshStandardMaterial({ color: 0xe8d8b8, roughness: 0.5,  metalness: 0.1, emissive: new THREE.Color(0x3a2a10), emissiveIntensity: 0.4 })
const selectedMat = new THREE.MeshStandardMaterial({ color: 0xff8060, roughness: 0.4,  metalness: 0.1, emissive: new THREE.Color(0x8a2010), emissiveIntensity: 0.6 })
// Quiz highlight — yellow, used for the bone being asked about during a quiz.
const quizHighlightMat = new THREE.MeshStandardMaterial({ color: 0xffd24a, roughness: 0.4, metalness: 0.1, emissive: new THREE.Color(0x6a5010), emissiveIntensity: 0.7 })
const fadedMat      = new THREE.MeshStandardMaterial({ color: 0x8a7860, roughness: 0.65, metalness: 0.05, transparent: true, opacity: 0.3 })
const hiddenMat     = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0 })
const layerFadedMat = new THREE.MeshStandardMaterial({ color: 0xc8b89a, roughness: 0.65, metalness: 0.05, transparent: true, opacity: 0.2, depthWrite: false })

export default function SkeletonModel({
  visible       = true,
  selectedBone,
  onSelect,
  heightPreset  = 'short',
  statureScale  = 1,
  shoulderScale = 1,
  hipScale      = 1,
  activeBoneGroup = 'All Bones',
  boneFadeMode  = 'fade',
  highlightBone = null,
  onTransformReady = null, // ({scale:[x,y,z], position:[x,y,z]}) => void — drives the shared body group
  onSceneReady = null,     // (scene) => void — exposes the skeleton scene for region camera framing
  layerFaded    = false,
  quizMode      = false,   // during a quiz: highlight target yellow, never keep a clicked bone selected (red)
}) {
  const { scene } = useGLTF('/Skeleton.glb')
  const [hovered, setHovered]                 = useState(null)
  const [highlightedMesh, setHighlightedMesh] = useState(null)
  const groupRef = useRef()
  const snapRef  = useRef(null)   // { skull: [{mesh,ox,oz,px,pz}], lower: [{mesh,ox,oz,px,pz}] }

  useCursor(!!hovered && visible)

  const meshes = useMemo(() => {
    const list = []
    scene.traverse(child => {
      if (child.isMesh) {
        child.castShadow    = true
        child.receiveShadow = true
        child.name = cleanBoneName(child.name)
        list.push(child)
      }
    })
    return list
  }, [scene])

  // Expose the scene (with cleaned mesh names) so the camera can frame regions.
  useEffect(() => {
    if (scene && meshes.length) onSceneReady?.(scene)
  }, [scene, meshes, onSceneReady])

  // Find the mesh matching highlightBone string
  useEffect(() => {
    if (!highlightBone) { setHighlightedMesh(null); return }
    const target = meshes.find(m =>
      (m.name || m.parent?.name || '').toLowerCase().includes(highlightBone.toLowerCase())
    )
    setHighlightedMesh(target || null)
  }, [highlightBone, meshes])

  // ── Proportional scaling ──────────────────────────────────────────────────
  // The skeleton is the reference layer. It does NOT transform its own group;
  // instead it computes the shared body-group transform (scale + position) and
  // reports it upward so every layer is driven by ONE identical transform.
  // Region-specific X/Z corrections (skull, lower body) are still applied per
  // mesh here, cancelling the shared shoulderScale exactly as before.
  useEffect(() => {
    if (!scene) return

    // 1. Build snapshot once — capture BOTH scale AND position so offsets can
    //    be correctly neutralised per-region when scales change.
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

    // 2. Restore special meshes to original scale + position before measuring bbox
    for (const { mesh, ox, oz, px, pz } of snapRef.current.skull) {
      mesh.scale.x = ox; mesh.scale.z = oz
      mesh.position.x = px; mesh.position.z = pz
    }
    for (const { mesh, ox, oz, px, pz } of snapRef.current.lower) {
      mesh.scale.x = ox; mesh.scale.z = oz
      mesh.position.x = px; mesh.position.z = pz
    }

    // 3. Measure the raw skeleton bbox in scene-local space (cancels the parent
    //    body group's current scale, so this is stable across slider changes).
    const box  = measureLocalBox(scene)
    const size = box.getSize(new THREE.Vector3())
    const base = 3 / Math.max(size.x, size.y, size.z)

    // 4. Compute shared group scale: Y = stature, X/Z = shoulder width
    const sx = base * shoulderScale
    const sy = base * statureScale
    const sz = base * shoulderScale

    // 5. Compute shared group position from the scaled bbox: centre on X/Z,
    //    pin feet to the floor at y = -1.5.
    const cx = (box.min.x + box.max.x) / 2 * sx
    const cz = (box.min.z + box.max.z) / 2 * sz
    const minY = box.min.y * sy

    // 6. Report the transform that drives the shared body group for ALL layers.
    onTransformReady?.({ scale: [sx, sy, sz], position: [-cx, -1.5 - minY, -cz] })

    // 7. Skull: neutralise X/Z scaling so the skull doesn't stretch
    //    with shoulder width changes.
    for (const { mesh, ox, oz, px, pz } of snapRef.current.skull) {
      mesh.scale.x    = ox / shoulderScale
      mesh.scale.z    = oz / shoulderScale
      mesh.position.x = px / shoulderScale
      mesh.position.z = pz / shoulderScale
    }

    // 8. Lower body: swap shoulderScale for hipScale on shape AND position
    for (const { mesh, ox, oz, px, pz } of snapRef.current.lower) {
      mesh.scale.x    = ox * hipScale / shoulderScale
      mesh.scale.z    = oz * hipScale / shoulderScale
      mesh.position.x = px * hipScale / shoulderScale
      mesh.position.z = pz * hipScale / shoulderScale
    }
  }, [scene, heightPreset, statureScale, shoulderScale, hipScale, onTransformReady])

  // ── Per-render material + visibility ─────────────────────────────────────
  meshes.forEach(mesh => {
    if (!visible) {
      mesh.raycast  = () => {}
      mesh.material = hiddenMat
      mesh.visible  = false
      return
    }

    mesh.visible = true
    mesh.raycast = layerFaded ? () => {} : THREE.Mesh.prototype.raycast

    if (layerFaded) {
      mesh.material = layerFadedMat
      return
    }

    if (mesh === highlightedMesh) {
      // Quiz target → yellow; outside a quiz the highlight reuses the selected look.
      mesh.material = quizMode ? quizHighlightMat : selectedMat
    } else if (mesh === selectedBone && !quizMode) {
      // Persistent red selection only applies outside the quiz.
      mesh.material = selectedMat
    } else if (mesh === hovered) {
      mesh.material = hoverMat
    } else {
      const keywords = BONE_GROUPS[activeBoneGroup]
      const inGroup  = meshMatchesBoneGroup(mesh.name, keywords)
      mesh.material  = inGroup ? defaultMat : (boneFadeMode === 'fade' ? fadedMat : hiddenMat)
      if (!inGroup && boneFadeMode === 'hide') mesh.visible = false
    }
  })

  return (
    <group ref={groupRef}>
      <primitive
        object={scene}
        onClick={e => {
          if (!visible) return
          e.stopPropagation()
          const keywords = BONE_GROUPS[activeBoneGroup]
          if (!meshMatchesBoneGroup(e.object.name, keywords)) return
          onSelect(e.object)
        }}
        onPointerOver={e => {
          if (!visible) return
          e.stopPropagation()
          const keywords = BONE_GROUPS[activeBoneGroup]
          if (!meshMatchesBoneGroup(e.object.name, keywords)) return
          setHovered(e.object)
        }}
        onPointerOut={() => setHovered(null)}
      />
    </group>
  )
}

useGLTF.preload('/Skeleton.glb')
