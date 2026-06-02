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

// Neck (cervical spine) — used only to locate the head/neck JOINT (top of the
// atlas). The skull is vertically de-stretched around this point so it keeps a
// constant, natural size and stays seated on top of the (normally-stretching)
// neck instead of elongating with stature.
const NECK_KEYS = ['cervical vertebra','atlas','axis']
const isNeck = n => NECK_KEYS.some(k => n.toLowerCase().includes(k))

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
    'hip bone',
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

// Bounding box of a set of meshes expressed in `root`'s local frame. Used to
// locate the skull/neck anchor robustly, independent of each mesh's individual
// (and inconsistent) origin/pivot in the GLB.
function localBoxOfMeshes(root, meshes) {
  const box = new THREE.Box3()
  const tmp = new THREE.Box3()
  const mat = new THREE.Matrix4()
  root.updateWorldMatrix(true, true)
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert()
  for (const m of meshes) {
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox()
    tmp.copy(m.geometry.boundingBox)
    mat.multiplyMatrices(inv, m.matrixWorld)
    tmp.applyMatrix4(mat)
    box.union(tmp)
  }
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
const fadedMat    = new THREE.MeshStandardMaterial({ color: 0x8a7860, roughness: 0.65, metalness: 0.05, transparent: true, opacity: 0.3 })
const hiddenMat   = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0 })
// Whole-layer fade: a semi-transparent ghost overlay for the entire skeleton.
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
  layerFaded    = false,   // ghost the whole layer (semi-transparent, non-interactive)
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

  // Find the mesh matching highlightBone string
  useEffect(() => {
    if (!highlightBone) { setHighlightedMesh(null); return }
    const target = meshes.find(m =>
      (m.name || m.parent?.name || '').toLowerCase().includes(highlightBone.toLowerCase())
    )
    setHighlightedMesh(target || null)
  }, [highlightBone, meshes])

  // ── Proportional scaling ──────────────────────────────────────────────────
  // The skeleton is the reference layer. It computes the shared body-group
  // transform (scale + position) and reports it upward so every layer is driven
  // by ONE identical transform.
  //
  // The skull is handled as a RIGID UNIT: all skull bones are reparented into a
  // single head group, and that group is counter-scaled to cancel the body's
  // stature (Y) and shoulder (X/Z) scaling, pivoted at the neck joint. This keeps
  // the head a constant, natural size and perfectly intact — no per-bone math, so
  // the GLB's inconsistent mesh origins can't make the skull come apart.
  useEffect(() => {
    if (!scene) return

    // 1. First run: reparent the skull into a head group, snapshot the lower
    //    body, and locate the anchor (top of the neck / atlas) + skull centre.
    //    The setup is persisted on the (cached) scene so it runs exactly ONCE
    //    per GLB — re-mounting the component (HMR, etc.) reuses it rather than
    //    reparenting an already-reparented scene.
    if (!snapRef.current && scene.userData.__skullSetup) {
      snapRef.current = scene.userData.__skullSetup
    }
    if (!snapRef.current) {
      scene.updateMatrixWorld(true)

      const skullMeshes = []
      const neckMeshes  = []
      const lower = []
      scene.traverse(child => {
        if (!child.isMesh) return
        if (isSkull(child.name)) skullMeshes.push(child)
        else if (isLower(child.name)) {
          lower.push({ mesh: child, ox: child.scale.x, oz: child.scale.z, px: child.position.x, pz: child.position.z })
        }
        if (isNeck(child.name)) neckMeshes.push(child)
      })

      // Anchor in scene-local space (robust to each mesh's own origin/pivot).
      const skullBox = localBoxOfMeshes(scene, skullMeshes)
      const neckBox  = neckMeshes.length ? localBoxOfMeshes(scene, neckMeshes) : null
      const anchor = new THREE.Vector3(
        (skullBox.min.x + skullBox.max.x) / 2,
        neckBox ? neckBox.max.y : skullBox.min.y,
        (skullBox.min.z + skullBox.max.z) / 2,
      )

      // Create the head group and reparent every skull bone into it. attach()
      // preserves each bone's current world transform, so nothing moves.
      const headGroup = new THREE.Group()
      headGroup.name = 'HeadGroup'
      scene.add(headGroup)
      for (const m of skullMeshes) headGroup.attach(m)

      scene.userData.__skullSetup = { headGroup, lower, anchor }
      snapRef.current = scene.userData.__skullSetup
    }
    const { headGroup, lower, anchor } = snapRef.current

    // 2. Reset head group + lower meshes to rest before measuring the body bbox.
    headGroup.scale.set(1, 1, 1)
    headGroup.position.set(0, 0, 0)
    for (const { mesh, ox, oz, px, pz } of lower) {
      mesh.scale.x = ox; mesh.scale.z = oz
      mesh.position.x = px; mesh.position.z = pz
    }

    // 3. Measure the rest skeleton bbox in scene-local space → normalisation base.
    const box  = measureLocalBox(scene)
    const size = box.getSize(new THREE.Vector3())
    const base = 3 / Math.max(size.x, size.y, size.z)

    // 4. Shared body-group transform: Y = stature, X/Z = shoulder width.
    const sx = base * shoulderScale
    const sy = base * statureScale
    const sz = base * shoulderScale
    const cx = (box.min.x + box.max.x) / 2 * sx
    const cz = (box.min.z + box.max.z) / 2 * sz
    const minY = box.min.y * sy

    // 5. Report transform (+ head anchor/band for the other layers' skull fix).
    onTransformReady?.({
      scale: [sx, sy, sz], position: [-cx, -1.5 - minY, -cz],
      headAnchorY: anchor.y, headBand: size.y * 0.3,
    })

    // 6. Head group: counter-scale to cancel the body's stature (Y) and shoulder
    //    (X/Z) scaling, pivoted at the neck anchor. Net skull scale = base
    //    (uniform, constant size) and the neck joint stays put → head stays
    //    attached to the (normally-scaling) spine.
    const isx = 1 / shoulderScale, isy = 1 / statureScale, isz = 1 / shoulderScale
    headGroup.scale.set(isx, isy, isz)
    headGroup.position.set(anchor.x * (1 - isx), anchor.y * (1 - isy), anchor.z * (1 - isz))

    // 7. Lower body: swap shoulderScale for hipScale on X/Z.
    for (const { mesh, ox, oz, px, pz } of lower) {
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

    if (mesh === selectedBone || mesh === highlightedMesh) {
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
