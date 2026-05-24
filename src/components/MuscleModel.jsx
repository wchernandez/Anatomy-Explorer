import { useEffect, useMemo, useRef, useState } from 'react'
import { useGLTF, useCursor } from '@react-three/drei'
import * as THREE from 'three'

const SKULL_KEYS = [
  'frontal bone','parietal bone','occipital bone','temporal bone','sphenoid bone',
  'zygomatic','nasal bone','maxilla','mandible','vomer','palatine bone','lacrimal',
  'inferior nasal','ethmoid','sinus of','malleus','incus','stapes','hyoid',
  'tooth','incisor','molar','premolar','upper canine','lower canine',
]
const isSkull = n => SKULL_KEYS.some(k => n.toLowerCase().includes(k))

const LOWER_KEYS = [
  'femur','tibia','fibula','patella','hip','sacrum','coccyx','gluteus','iliacus',
  'psoas','calcaneus','talus','navicular','cuneiform','metatarsal',
  'phalanx of foot','sesamoid','cuboid','gastrocnemius','soleus','tibialis',
  'peroneus','fibularis','popliteus','adductor','quadriceps','hamstring',
]
const isLower = n => LOWER_KEYS.some(k => n.toLowerCase().includes(k))

// ── Overhauled Naming Correction Function ────────────────────────────────────
function cleanMuscleName(name) {
  if (!name) return ''
  
  // 1. Convert underscores to spaces
  let cleaned = name.replace(/_/g, ' ')
  
  // 2. GLOBAL TRAILING 'l' AND 'r' FIX:
  // Catches things like 'musclel', 'longusl', 'brevisr' at the end of the string
  if (cleaned.endsWith('l') || cleaned.endsWith('L')) {
    cleaned = cleaned.slice(0, -1).trim() + ' (L)'
  } else if (cleaned.endsWith('r') || cleaned.endsWith('R')) {
    cleaned = cleaned.slice(0, -1).trim() + ' (R)'
  }
  
  // 3. Fix minor truncated typos if they exist
  if (cleaned.toLowerCase().endsWith('muscl')) {
    cleaned = cleaned.slice(0, -5) + 'Muscle'
  }

  // 4. Cleanly capitalize every single word
  return cleaned.replace(/\b\w/g, c => c.toUpperCase())
}

// ── Override materials ────────────────────────────────────────────────────────
const baseForceMat = new THREE.MeshStandardMaterial({
  color: 0xC87832, roughness: 0.38, metalness: 0.15,
})

const hoverMat = new THREE.MeshStandardMaterial({
  color: 0xff9f43, roughness: 0.4, metalness: 0.1,
  emissive: new THREE.Color(0x7a3800), emissiveIntensity: 0.6,
})

const selectedMat = new THREE.MeshStandardMaterial({
  color: 0xffe033, roughness: 0.3, metalness: 0.15,
  emissive: new THREE.Color(0x7a6000), emissiveIntensity: 0.7,
})

const MAT_OVERRIDES = {
  'Tendon':            new THREE.MeshStandardMaterial({ color: 0xEDE3CC, roughness: 0.5, metalness: 0.0 }),
  'Ligament':          new THREE.MeshStandardMaterial({ color: 0xE6DBCA, roughness: 0.5, metalness: 0.0 }),
  'Articular capsule': new THREE.MeshStandardMaterial({ color: 0xE0DAC7, roughness: 0.45, metalness: 0.0 }),
  'Cartilage':         new THREE.MeshStandardMaterial({ color: 0x3FC8C8, roughness: 0.2, metalness: 0.0 }),
  'Bursa':             (() => {
    const m = new THREE.MeshStandardMaterial({ color: 0x2DB8B8, roughness: 0.2, metalness: 0.0 })
    m.transparent = true
    m.opacity = 0.85
    m.depthWrite = false
    return m
  })(),
  'Fat': new THREE.MeshStandardMaterial({ color: 0xAD6E1E, roughness: 0.7, metalness: 0.0 }),
}

// ── Muscle Group Keyword Map ──────────────────────────────────────────────────
const MUSCLE_GROUPS = {
  'All Muscles': null,
  'Upper Limb': [
    'deltoid','infraspinatus','subscapularis','supraspinatus','teres',
    'biceps brachii','brachialis','coracobrachialis',
    'triceps','anconeus','brachioradialis',
    'extensor carpi','extensor digiti','extensor indicis',
    'extensor pollicis','abductor pollicis longus','supinator',
    
    // Forearm Extensor Target
    'extensor digitorum muscle',
    'extensor digitorum of hand',
    'extensor digitorum superficialis',
    
    'flexor carpi',
    
    // Forearm Flexor Targets
    'flexor digitorum superficialis',
    'flexor digitorum profundus',
    'flexor digitorum of hand', 
    'flexor digitorum muscle',
    
    'flexor pollicis','palmaris','pronator',
    
    // Hand Muscles
    'interossei muscles of hand',
    'interosseous muscles of hand',
    'lumbrical muscles of hand',
    
    // Opponens
    'opponens pollicis',
    'opponens digiti minimi of hand',
    'opponens digiti minimi muscle of hand',
    
    'abductor digiti minimi of hand',
    'abductor pollicis brevis','flexor digiti minimi of hand','flexor pollicis brevis',
    
    // Adductor Pollicis variations
    'adductor pollicis',
    'transverse head of adductor pollicis',
    'oblique head of adductor pollicis',
    'oblique head of adductor pollicis 1',
    'transverse head of adductor pollicis 1',
    
    // ── HAND & FINGER JOINT FIXES ───────────────────────────────────────────
    // Captures the hand, knuckle, and finger articular capsules perfectly
    'interphalangeal joint', 
    'metacarpophalangeal',
    'metacarpal',
    // ─────────────────────────────────────────────────────────────────────────
    
    'palmar aponeurosis','brachial fascia','deltoid fascia',
    'dorsal fascia of hand','flexor retinaculum of wrist','extensor retinaculum of wrist',
    'antebrachial fascia','clavipectoral fascia','pectoral fascia',
    'lateral intermuscular septum of arm','medial intermuscular septum of arm',
    'superficial transverse metacarpal','tendon sheath of extensor digitorum muscle',
    'common flexor tendon',
  ],
  'Lower Limb': [
    'gluteus','tensor fasciae','iliotibial','piriformis',
    'obturator','gemellus','quadratus femoris',
    'rectus femoris','vastus','sartorius',
    
    // Leg Adductors explicitly targeted
    'adductor longus',
    'adductor magnus',
    'adductor brevis',
    'adductor minimus',
    'adductor muscle', 
    
    'gracilis','pectineus',
    'biceps femoris','semimembranosus','semitendinosus',
    'tibialis',
    
    // Explicit Lower Limb Leg Segments
    'extensor digitorum longus',
    'extensor hallucis longus',
    'fibularis',
    'gastrocnemius','soleus','plantaris','popliteus',
    'flexor digitorum longus',
    
    'flexor hallucis longus','calcaneal',
    'abductor digiti minimi of foot','abductor hallucis',
    'adductor hallucis',
    
    // Explicit Foot & Toe Targets
    'dorsal interossei muscles of foot',
    'plantar interossei',
    'extensor digitorum brevis','extensor hallucis brevis',
    'flexor digiti minimi of foot','flexor digitorum brevis',
    'flexor hallucis brevis','lumbrical muscles of foot',
    'quadratus plantae','opponens digiti minimi muscle of foot',
    
    // Toe and Foot Capsule Fixes
    'toe',
    'metatarsophalangeal',
    'phalanx of foot',
    
    'fascia lata','crural fascia','popliteal fascia','flexor retinaculum of ankle',
    'inferior extensor retinaculum','inferior fibular retinaculum',
    'superior extensor retinaculum','superior fibular retinaculum',
    'lateral femoral intermuscular','medial femoral intermuscular',
    'anterior intermuscular septum of leg','posterior intermuscular septum of leg',
    'transverse intermuscular septum','plantar aponeurosis','iliopectineal arch',
    'superficial transverse metatarsal','piriformis fascia',
    'tendon of extensor digitorum longus',
    'tendon sheath of tibialis',
    'tendon sheath of flexor',
  ],
  'Thoracic': [
    'diaphragm','intercostal','levatores','pectoralis','serratus anterior',
    'subclavius','transversus thoracis','serratus posterior',
    'iliocostalis thoracis','longissimus thoracis','spinalis thoracis',
    'multifidus thoracis','semispinalis thoracis','interspinales thoracis','rotatores',
  ],
  'Abdominal': [
    'external abdominal oblique',
    'rectus abdominis','transversus abdominis',
    'pyramidalis','quadratus lumborum','linea alba','inguinal',
    'iliocostalis lumborum','multifidus lumborum','interspinales lumborum',
    'intertransversarii lumborum','iliacus','psoas',
    'diaphragmatic fascia','iliopsoas fascia','transversalis fascia','investing abdominal fascia',
  ],
  'Dorsal': [
    'latissimus dorsi','levator scapulae','rhomboid','trapezius',
    'thoracolumbar fascia',
  ],
  'Cervical': [
    'omohyoid','sternohyoid','sternothyroid','thyrohyoid','platysma',
    'sternocleidomastoid','scalenus','longus capitis','longus colli',
    'rectus anterior capitis','rectus lateralis capitis',
    'digastric','geniohyoid','mylohyoid','stylohyoid',
    'pharyngeal constrictor','stylopharyngeus','palatopharyngeus',
    'genioglossus','hyoglossus',
    'arytenoid','crico','thyro-epiglottic','cricothyroid',
    'obliquus inferior capitis','obliquus superior capitis',
    'rectus posterior','splenius',
    'interspinales colli','semispinalis colli','multifidus colli',
    'longissimus capitis','longissimus colli','spinalis capitis','spinalis colli',
    'superficial investing cervical fascia',
  ],
  'Cranial': [
    'frontalis','occipitalis','temporoparietalis','epicranial',
    'bucinator','corrugator','depressor anguli','depressor labii','depressor septi',
    'levator anguli oris','levator labii','levator nasolabialis',
    'mentalis','nasalis','orbicularis oris','procerus','risorius',
    'orbicularis oculi','zygomaticus',
    'temporalis','masseter','pterygoid',
    'inferior oblique','superior oblique', 
    'inferior rectus muscle','lateral rectus',
    'levator palpebrae','medial rectus','superior rectus muscle',
    'trochlea','superior tarsus','inferior tarsus','common tendinous ring',
    'masseteric fascia','superficial layer of temporal fascia',
  ],
  'Pelvic': [
    'coccygeus','iliococcygeus','pubo-analis','pubococcygeus','levator ani','anal sphincter',
  ],
}

// ── Simple Matching ──────────────────────────────────────────────────────────
function meshMatchesGroup(name, keywords) {
  if (!keywords) return true
  const lowerName = name.toLowerCase()
  return keywords.some(keyword => lowerName.includes(keyword.toLowerCase()))
}

function getBaseMat(mesh) {
  return MAT_OVERRIDES[mesh.userData.originalMatName] ?? baseForceMat
}

export default function MuscleModel({ 
  visible, selectedBone, onSelect, activeGroup, filterMode, 
  heightPreset = 'short', statureScale = 1, shoulderScale = 1, hipScale = 1 
}) {
  const { scene } = useGLTF('/Muscles.glb')
  const [hovered, setHovered] = useState(null)
  const groupRef = useRef()

  useCursor(!!hovered && visible)

  const meshes = useMemo(() => {
    const list = []
    scene.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
        
        child.name = cleanMuscleName(child.name)

        const originalMat = Array.isArray(child.material) ? child.material[0] : child.material
        child.userData.originalMatName = originalMat?.name ?? ''
        child.material = MAT_OVERRIDES[originalMat?.name] ?? baseForceMat
        list.push(child)
      }
    })
    return list
  }, [scene])

  const snapRef = useRef(null)

  useEffect(() => {
    if (!groupRef.current) return

    if (!snapRef.current) {
      const skull = [], lower = []
      scene.traverse(child => {
        if (!child.isMesh) return
        const entry = { mesh: child, ox: child.scale.x, oz: child.scale.z }
        if      (isSkull(child.name)) skull.push(entry)
        else if (isLower(child.name)) lower.push(entry)
      })
      snapRef.current = { skull, lower }
    }

    for (const { mesh, ox, oz } of snapRef.current.skull)  { mesh.scale.x = ox; mesh.scale.z = oz }
    for (const { mesh, ox, oz } of snapRef.current.lower)  { mesh.scale.x = ox; mesh.scale.z = oz }

    groupRef.current.scale.set(1, 1, 1)
    groupRef.current.position.set(0, 0, 0)
    const box  = new THREE.Box3().setFromObject(groupRef.current)
    const size = box.getSize(new THREE.Vector3())
    const base = 3 / Math.max(size.x, size.y, size.z)

    groupRef.current.scale.set(
      base * shoulderScale,
      base * statureScale,
      base * shoulderScale
    )
    const scaled = new THREE.Box3().setFromObject(groupRef.current)
    const cx = (scaled.min.x + scaled.max.x) / 2
    const cz = (scaled.min.z + scaled.max.z) / 2
    groupRef.current.position.set(-cx, -1.5 - scaled.min.y, -cz)

    for (const { mesh, ox, oz } of snapRef.current.skull) {
      mesh.scale.x = ox / shoulderScale
      mesh.scale.z = oz / shoulderScale
    }
    for (const { mesh, ox, oz } of snapRef.current.lower) {
      mesh.scale.x = ox * hipScale / shoulderScale
      mesh.scale.z = oz * hipScale / shoulderScale
    }
  }, [scene, heightPreset, statureScale, shoulderScale, hipScale])

  const fadedMats = useMemo(() => new Map(), [])
  const keywords = MUSCLE_GROUPS[activeGroup] ?? null

  // ── Unified Material & Raycast Resolution Loop ─────────────────────────────
  meshes.forEach(mesh => {
    const inGroup = meshMatchesGroup(mesh.name, keywords)
    const base = getBaseMat(mesh)
    const isInteractive = visible && inGroup

    if (mesh === selectedBone) {
      mesh.material = selectedMat
      mesh.visible = true
      mesh.raycast = visible ? THREE.Mesh.prototype.raycast : () => null
    } else if (mesh === hovered && isInteractive) {
      mesh.material = hoverMat
      mesh.visible = true
      mesh.raycast = THREE.Mesh.prototype.raycast
    } else if (inGroup) {
      mesh.material = base
      mesh.visible = true
      mesh.raycast = visible ? THREE.Mesh.prototype.raycast : () => null
    } else {
      mesh.raycast = () => null

      if (filterMode === 'hide') {
        mesh.visible = false
      } else {
        mesh.visible = true
        if (!fadedMats.has(mesh.uuid)) {
          const faded = base.clone()
          faded.transparent = true
          faded.opacity = 0.08
          faded.depthWrite = false
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
        onClick={(e) => {
          if (!visible) return
          e.stopPropagation()
          if (meshMatchesGroup(e.object.name, keywords)) {
            onSelect(e.object)
          }
        }}
        onPointerOver={(e) => {
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

useGLTF.preload('/Muscles.glb')

export { MUSCLE_GROUPS }