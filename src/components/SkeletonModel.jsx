import { useEffect, useMemo, useRef, useState } from 'react'
import { useGLTF, useCursor } from '@react-three/drei'
import * as THREE from 'three'

// Skull — protected from X/Z scaling (skull size doesn't change with body width)
const SKULL_KEYS = [
  'frontal bone','parietal bone','occipital bone','temporal bone','sphenoid bone',
  'zygomatic','nasal bone','maxilla','mandible','vomer','palatine bone','lacrimal',
  'inferior nasal','ethmoid','sinus of','malleus','incus','stapes','hyoid',
  'tooth','incisor','molar','premolar','upper canine','lower canine',
]
const isSkull = n => SKULL_KEYS.some(k => n.toLowerCase().includes(k))

// Lower body — use hipScale instead of group shoulderScale for X/Z
const LOWER_KEYS = [
  'femur','tibia','fibula','patella','hip bone','sacrum','coccyx',
  'calcaneus','talus','navicular','cuneiform','metatarsal',
  'phalanx of foot','sesamoid','cuboid',
]
const isLower = n => LOWER_KEYS.some(k => n.toLowerCase().includes(k))

// ── Bone Groups for skeletal filtering ──────────────────────────────────────
export const BONE_GROUPS = {
  'All Bones': null,
  'Skull': [
    'frontal bone','parietal bone','occipital bone','temporal bone','sphenoid bone',
    'zygomatic','nasal bone','maxilla','mandible','vomer','palatine bone','lacrimal',
    'inferior nasal','ethmoid','sinus of','malleus','incus','stapes','hyoid',
  ],
  'Spine': [
    'cervical vertebra','thoracic vertebra','lumbar vertebra','sacrum','coccyx','vertebra',
    'atlas','axis',
  ],
  'Thorax': [
    'sternum','rib','clavicle','scapula',
  ],
  'Upper Limb': [
    'humerus','radius','ulna','carpus','carpal','metacarpal','phalanx of hand',
    'scaphoid','lunate','triquetrum','pisiform','trapezium','trapezoid',
  ],
  'Lower Limb': [
    'femur','tibia','fibula','patella','calcaneus','talus','navicular',
    'cuneiform','metatarsal','phalanx of foot','cuboid','tarsus','tarsal',
  ],
  'Pelvis': [
    'hip bone','ilium','ischium','pubis','sacrum','coccyx',
  ],
}

function meshMatchesBoneGroup(name, keywords) {
  if (!keywords) return true
  const lower = name.toLowerCase()
  return keywords.some(k => lower.includes(k.toLowerCase()))
}

const defaultMat  = new THREE.MeshStandardMaterial({ color: 0xc8b89a, roughness: 0.65, metalness: 0.05 })
const hoverMat    = new THREE.MeshStandardMaterial({ color: 0xe8d8b8, roughness: 0.5,  metalness: 0.1, emissive: new THREE.Color(0x3a2a10), emissiveIntensity: 0.4 })
const selectedMat = new THREE.MeshStandardMaterial({ color: 0xff8060, roughness: 0.4,  metalness: 0.1, emissive: new THREE.Color(0x8a2010), emissiveIntensity: 0.6 })
const fadedMat     = new THREE.MeshStandardMaterial({ color: 0x8a7860, roughness: 0.65, metalness: 0.05, transparent: true, opacity: 0.3 })
const hiddenMat    = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0 })

export default function SkeletonModel({ 
  selectedBone, 
  onSelect, 
  heightPreset = 'short', 
  statureScale = 1, 
  shoulderScale = 1, 
  hipScale = 1,
  activeBoneGroup = 'All Bones',
  boneFadeMode = 'fade',
  highlightBone = null,
}) {
  const { scene } = useGLTF('/Skeleton.glb')
  const [hovered, setHovered] = useState(null)
  const [highlightedMesh, setHighlightedMesh] = useState(null)
  const groupRef  = useRef()
  const snapRef   = useRef(null)   // { skull: [{mesh,ox,oz}], lower: [{mesh,ox,oz}] }

  useCursor(!!hovered)

  const meshes = useMemo(() => {
    const list = []
    scene.traverse(child => {
      if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; list.push(child) }
    })
    return list
  }, [scene])

  // Find the mesh matching highlightBone string
  useEffect(() => {
    if (!highlightBone) {
      setHighlightedMesh(null)
      return
    }
    const target = meshes.find(mesh => 
      (mesh.name || mesh.parent?.name || '').toLowerCase().includes(highlightBone.toLowerCase())
    )
    setHighlightedMesh(target || null)
  }, [highlightBone, meshes])

  useEffect(() => {
    if (!groupRef.current) return

    // ── 1. Lazy-init mesh snapshot (runs once per scene, BEFORE any scale reset) ──
    if (!snapRef.current) {
      const skull = [], lower = []
      scene.traverse(child => {
        if (!child.isMesh) return
        const entry = { mesh: child, ox: child.scale.x, oz: child.scale.z }
        if      (isSkull(child.name))  skull.push(entry)
        else if (isLower(child.name))  lower.push(entry)
      })
      snapRef.current = { skull, lower }
    }

    // ── 2. Reset special meshes to originals before bbox measurement ──
    for (const { mesh, ox, oz } of snapRef.current.skull)  { mesh.scale.x = ox; mesh.scale.z = oz }
    for (const { mesh, ox, oz } of snapRef.current.lower)  { mesh.scale.x = ox; mesh.scale.z = oz }

    // ── 3. Reset group, measure raw bbox ──
    groupRef.current.scale.set(1, 1, 1)
    groupRef.current.position.set(0, 0, 0)
    const box  = new THREE.Box3().setFromObject(groupRef.current)
    const size = box.getSize(new THREE.Vector3())
    const base = 3 / Math.max(size.x, size.y, size.z)

    // ── 4. Apply group scale (statureScale for Y, shoulderScale for X/Z) ──
    groupRef.current.scale.set(
      base * shoulderScale,
      base * statureScale,
      base * shoulderScale
    )

    // ── 5. Pin feet ──
    const scaled = new THREE.Box3().setFromObject(groupRef.current)
    const cx = (scaled.min.x + scaled.max.x) / 2
    const cz = (scaled.min.z + scaled.max.z) / 2
    groupRef.current.position.set(-cx, -1.5 - scaled.min.y, -cz)

    // ── 6. Counterscale skull (neutralise X/Z group scale → skull stays same size) ──
    for (const { mesh, ox, oz } of snapRef.current.skull) {
      mesh.scale.x = ox / shoulderScale
      mesh.scale.z = oz / shoulderScale
    }

    // ── 7. Override lower body X/Z with hipScale (independent of upper body) ──
    // group already applied shoulderScale; to get hipScale instead: multiply by hipScale/shoulderScale
    for (const { mesh, ox, oz } of snapRef.current.lower) {
      mesh.scale.x = ox * hipScale / shoulderScale
      mesh.scale.z = oz * hipScale / shoulderScale
    }
  }, [scene, heightPreset, statureScale, shoulderScale, hipScale])

  meshes.forEach(mesh => {
    if (mesh === selectedBone) {
      mesh.material = selectedMat
    } else if (mesh === highlightedMesh) {
      mesh.material = selectedMat
    } else if (mesh === hovered) {
      mesh.material = hoverMat
    } else {
      // Check if this mesh belongs to the active bone group
      const keywords = BONE_GROUPS[activeBoneGroup]
      const inGroup = meshMatchesBoneGroup(mesh.name, keywords)
      
      if (inGroup) {
        mesh.material = defaultMat
      } else {
        // Bone is not in active group
        mesh.material = boneFadeMode === 'fade' ? fadedMat : hiddenMat
      }
    }
  })

  return (
    <group ref={groupRef}>
      <primitive
        object={scene}
        onClick={(e) => {
          e.stopPropagation()
          onSelect(e.object)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(e.object)
        }}
        onPointerOut={() => setHovered(null)}
      />
    </group>
  )
}

useGLTF.preload('/Skeleton.glb')
