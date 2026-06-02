import { useEffect, useMemo, useRef, useState } from 'react'
import { useGLTF, useCursor } from '@react-three/drei'
import * as THREE from 'three'
import { JOINT_MESH_NAMES } from './jointNames.js'

// Joint meshes that should remain visible in the muscles layer
const MUSCLE_JOINT_EXCEPTIONS = new Set([
  'Articular capsules of proximal interphalangeal joints',
  'Articular capsules of metacarpophalangeal joints',
  'Articular capsules of distal interphalangeal joints',
  'Deep transverse metacarpal ligament',
  'Articular capsule of radiocarpal joint',
])

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
  // Thigh muscles overlaying the femur (which scales with hip width) — these
  // mesh names were previously uncaught, so the muscle scaled with shoulder
  // width and the femur poked through at higher weights.
  'vastus','rectus femoris','sartorius','gracilis','pectineus',
  'biceps femoris','semimembranosus','semitendinosus',
  'tensor fasciae','iliotibial','piriformis','obturator','gemellus','quadratus femoris',
  // Lower-leg and foot muscles (use foot-specific names so hand/forearm
  // muscles with similar roots are not misclassified).
  'plantaris','flexor digitorum longus','flexor digitorum brevis',
  'flexor hallucis','extensor digitorum longus','extensor digitorum brevis',
  'extensor hallucis','abductor hallucis','adductor hallucis','quadratus plantae',
  'abductor digiti minimi of foot','flexor digiti minimi of foot',
  'lumbrical muscles of foot','interossei muscles of foot','plantar interossei',
]
const isLower = n => LOWER_KEYS.some(k => n.toLowerCase().includes(k))

// ── Overhauled Naming Correction Function ────────────────────────────────────
function cleanMuscleName(name) {
  if (!name) return ''
  let cleaned = name
    .replace(/\.g$/, '')      // strip Blender .g suffix
    .replace(/_/g, ' ')
    .replace(/\s+\d+$/, '')  // strip trailing numbers
    .trim()

  // Strip trailing _l / _r laterality suffix (space-separated) without
  // adding any label — display name is the same for both sides.
  if (/ [lL]$/.test(cleaned)) cleaned = cleaned.slice(0, -2).trim()
  else if (/ [rR]$/.test(cleaned)) cleaned = cleaned.slice(0, -2).trim()
  // Fallback: glued laterality (no space), e.g. "muscler"→"muscle", "toer"→"toe".
  // Skip if preceded by 'a' (plantar, fibular, dorsal…) or 'o' (extensor, flexor…).
  else if (cleaned.length > 2) {
    const last = cleaned[cleaned.length - 1]
    const prev = cleaned[cleaned.length - 2].toLowerCase()
    if ((last === 'l' || last === 'L') && prev !== 'a') cleaned = cleaned.slice(0, -1).trim()
    else if ((last === 'r' || last === 'R') && prev !== 'a' && prev !== 'o') cleaned = cleaned.slice(0, -1).trim()
  }

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

  'Cranial': [
    'frontalis','occipitalis','temporoparietalis','epicranial aponeurosis',
    'bucinator','corrugator','depressor anguli','depressor labii','depressor septi',
    'levator anguli oris','levator labii','levator nasolabialis',
    'mentalis','nasalis','orbicularis oris','procerus','risorius',
    'orbicularis oculi','zygomaticus',
    'temporalis muscle','masseter','pterygoid',
    'inferior oblique muscle','superior oblique',
    'inferior rectus muscle','lateral rectus muscle','medial rectus','superior rectus muscle',
    'levator palpebrae','inferior tarsus','superior tarsus','common tendinous ring','trochlea',
  ],

  'Cervical': [
    'sternocleidomastoid','platysma',
    'scalenus','longus capitis','longus colli',
    'rectus anterior capitis','rectus lateralis capitis',
    'obliquus inferior capitis','obliquus superior capitis',
    'rectus posterior','splenius',
    'semispinalis colli','multifidus colli','interspinales colli',
    'longissimus capitis','longissimus colli','spinalis capitis','spinalis colli',
    'iliocostalis colli',
    'omohyoid','sternohyoid','sternothyroid','thyrohyoid muscle',
    'anterior belly of digastric','posterior belly of digastric','intermediate tendon of digastric',
    'geniohyoid','mylohyoid','stylohyoid muscle',
    'genioglossus','hyoglossus',
    'pharyngeal constrictor','stylopharyngeus','palatopharyngeus',
    'crico-arytenoid','arytenoid muscle','cricothyroid','thyro-epiglottic','thyro-arytenoid',
    'quadrangular membrane','cricopharyngeal',
  ],

  'Spine': [
    'interspinales thoracis','interspinales lumborum',
    'intertransversarii','rotatores',
  ],

  'Thoracic': [
    'clavicular head of pectoralis major','sternocostal head of pectoralis major',
    '(abdominal part of pectoralis major','pectoralis minor',
    'serratus anterior','subclavius','transversus thoracis',
    'external intercostal','internal intercostal','innermost intercostal',
    'levatores breves costarum','levatores longi costarum','serratus posterior',
    'iliocostalis thoracis','longissimus thoracis','spinalis thoracis',
    'multifidus thoracis','semispinalis thoracis',
    'diaphragm',
  ],

  'Abdominal': [
    'external abdominal oblique','internal abdominal oblique',
    'transversus abdominis','rectus abdominis','pyramidalis',
    'quadratus lumborum','linea alba','inguinal ligament',
    'iliocostalis lumborum','multifidus lumborum','interspinales lumborum',
    'intertransversarii lumborum','iliacus','psoas major',
  ],

  'Dorsal': [
    'ascending part of trapezius','transverse part of trapezius','descending part of trapezius',
    'latissimus dorsi','rhomboid','levator scapulae',
  ],

  'Pelvic': [
    'coccygeus','iliococcygeus','pubococcygeus','pubo-analis',
    'external anal sphincter',
  ],

  'Upper Limb': [
    'acromial part of deltoid','clavicular part of deltoid','scapular spinal part of deltoid',
    'infraspinatus','subscapularis','supraspinatus','teres major','teres minor',
    'long head of biceps brachii','short head of biceps brachii',
    'brachialis muscle','coracobrachialis',
    'lateral head of triceps','long head of triceps','medial head of triceps',
    'anconeus muscle','brachioradialis',
    'extensor carpi radialis brevis','extensor carpi radialis longus',
    'extensor digiti minimi$','extensor digitorum$','extensor indicis',
    'extensor pollicis brevis','extensor pollicis longus',
    'abductor pollicis longus','supinator',
    'humeral head of extensor carpi ulnaris','ulnar head of extensor carpi ulnaris',
    'humeral head of flexor carpi ulnaris','ulnar head of flexor carpi ulnaris',
    'humero-ulnar head of flexor digitorum','radial head of flexor digitorum',
    'flexor carpi radialis','flexor digitorum profundus',
    'flexor pollicis longus','palmaris longus',
    'pronator quadratus','deep head of pronator teres','superficial head of pronator teres',
    'deep head of flexor pollicis brevis','superficial head of flexor pollicis brevis',
    'abductor digiti minimi of hand','abductor pollicis brevis',
    'opponens digiti minimi muscle of hand','opponens pollicis',
    'flexor digiti minimi of hand',
    'oblique head of adductor pollicis','transverse head of adductor pollicis',
    'dorsal interossei muscles of hand','palmar interossei',
    'lumbrical muscles of hand',
    'articular capsules of metacarpophalangeal joints$',
    'articular capsules of proximal interphalangeal joints$',
    'articular capsules of distal interphalangeal joints$',
    'deep transverse metacarpal ligament',
    'articular capsule of radiocarpal joint',
    'common flexor tendon sheath','synovial sheaths of digits of hand',
    'cruciform part of fibrous sheath',
    'tendon sheath - abd','tendon sheath of extensor digitorum and',
    'tendon sheath of extensors carpi',
    'subacromial bursa','subcutaneous acromial bursa','subdeltoid bursa',
    'coracobrachial bursa','bicipitoradial bursa',
    'subtendinous bursa of infraspinatus','subtendinous bursa of teres',
    'subtendinous bursa of trapezius','subtendinous bursa of triceps',
  ],

  'Lower Limb': [
    'gluteus maximus','gluteus medius','gluteus minimus',
    'tensor fasciae latae','iliotibial tract',
    'piriformis muscle','obturator externus','obturator internus',
    'superior gemellus','inferior gemellus','quadratus femoris muscle',
    'rectus femoris','vastus intermedius','vastus lateralis','vastus medialis',
    'sartorius','gracilis muscle','pectineus',
    'adductor brevis','adductor longus','adductor magnus','(adductor minimus)',
    'long head of biceps femoris','short head of biceps femoris',
    'semimembranosus muscle','semitendinosus',
    'tibialis anterior','tibialis posterior',
    'fibularis brevis','fibularis longus','fibularis tertius',
    'common tendon sheath of fibularis',
    'lateral head of gastrocnemius','medial head of gastrocnemius',
    'soleus muscle','plantaris muscle','popliteus muscle',
    'flexor digitorum brevis','flexor digitorum longus',
    'flexor digiti minimi of foot',
    'lateral head of flexor hallucis brevis','medial head of flexor hallucis brevis',
    'flexor hallucis longus',
    'extensor digitorum brevis','extensor digitorum longus',
    'extensor hallucis brevis','extensor hallucis longus',
    'abductor digiti minimi of foot','abductor hallucis',
    'quadratus plantae','lumbrical muscles of foot',
    'dorsal interossei muscles of foot','plantar interossei muscles',
    '(opponens digiti minimi muscle of foot)',
    'oblique head of adductor hallucis','transverse head of adductor hallucis',
    'calcaneal tendon','plantar tendon sheath of fibularis',
    'tendon sheath of tibialis','tendon of extensor digitorum longus',
    'tendon sheath of extensor digitorum longus',
    'tendon sheath of flexor digitorum longus',
    'tendon sheath of flexor hallucis longus',
    'subtendinous calcaneal bursa','subcutaneous calcaneal bursa',
    'subcutaneous bursa of lateral malleolus','subcutaneous bursa of medial malleolus',
    'subcutaneous bursa of tuberosity of tibia','subcutaneous trochanteric bursa',
    'anserine bursa','semimembranosus bursa',
    'sciatic bursa of gluteus','sciatic bursa of obturator',
    'trochanteric bursa','intermuscular gluteal bursae',
    'lateral subtendinous bursa of gastrocnemius','medial subtendinous bursa of gastrocnemius',
    'subtendinous bursa of iliacus','subtendinous bursa of sartorius',
    'inferior subtendinous bursa of biceps femoris','superior bursa of biceps femoris',
    'subtendinous bursa of tibialis anterior',
    '(iliopectineal bursa)',
  ],
}

// ── Simple Matching ──────────────────────────────────────────────────────────
// Keyword ending with '$' requires the name to END with that keyword (exact suffix).
// All other keywords use normal substring matching.
function meshMatchesGroup(name, keywords) {
  if (!keywords) return true
  const lowerName = name.toLowerCase()
  return keywords.some(keyword => {
    if (keyword.endsWith('$')) {
      const k = keyword.slice(0, -1).toLowerCase()
      return lowerName.endsWith(k)
    }
    return lowerName.includes(keyword.toLowerCase())
  })
}

function getBaseMat(mesh) {
  return MAT_OVERRIDES[mesh.userData.originalMatName] ?? baseForceMat
}

export default function MuscleModel({
  visible,
  selectedBone,
  onSelect,
  activeGroup,
  filterMode,
  statureScale  = 1,
  shoulderScale = 1,
  hipScale      = 1,
  headAnchorY   = null,   // shared head/neck anchor from SkeletonModel
  headBand      = null,   // max |py - anchor| eligible for Y de-stretch
  layerFaded    = false,  // ghost the whole layer (semi-transparent, non-interactive)
}) {
  const { scene } = useGLTF('/Muscles.glb')
  const [hovered, setHovered] = useState(null)

  useCursor(!!hovered && visible)

  const meshes = useMemo(() => {
    const list = []
    scene.traverse(child => {
      if (child.isMesh) {
        // Exclude meshes that belong to the joints layer (exact raw name match)
        if ((JOINT_MESH_NAMES.has(child.name) || JOINT_MESH_NAMES.has(child.name.trim())) && !MUSCLE_JOINT_EXCEPTIONS.has(child.name.trim())) {
          child.userData.isJointMesh = true
          child.visible = false
          child.raycast = () => {}
          return
        }

        child.userData.isJointMesh = false
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

  // The shared body group (in Scene) owns the overall scale + position. This
  // layer only applies region-specific X/Z corrections per mesh: cancel the
  // shared shoulderScale over the skull, swap it for hipScale over the lower body.
  useEffect(() => {
    if (!scene) return

    if (!snapRef.current) {
      const skull = [], lower = []
      scene.traverse(child => {
        if (!child.isMesh) return
        const entry = {
          mesh: child,
          ox: child.scale.x,    oy: child.scale.y,    oz: child.scale.z,
          px: child.position.x, py: child.position.y, pz: child.position.z,
        }
        if      (isSkull(child.name)) skull.push(entry)
        else if (isLower(child.name)) lower.push(entry)
      })
      snapRef.current = { skull, lower }
    }

    // Skull/face: cancel shoulder width, and (if the shared head anchor is
    // available) cancel the stature stretch in Y so the head matches the bones.
    for (const { mesh, ox, oy, oz, px, py, pz } of snapRef.current.skull) {
      mesh.scale.x    = ox / shoulderScale
      mesh.scale.z    = oz / shoulderScale
      mesh.position.x = px / shoulderScale
      mesh.position.z = pz / shoulderScale
      if (headAnchorY !== null && (headBand === null || Math.abs(py - headAnchorY) <= headBand)) {
        mesh.scale.y    = oy / statureScale
        mesh.position.y = headAnchorY + (py - headAnchorY) / statureScale
      }
    }
    for (const { mesh, ox, oz, px, pz } of snapRef.current.lower) {
      mesh.scale.x    = ox * hipScale / shoulderScale
      mesh.scale.z    = oz * hipScale / shoulderScale
      mesh.position.x = px * hipScale / shoulderScale
      mesh.position.z = pz * hipScale / shoulderScale
    }
  }, [scene, statureScale, shoulderScale, hipScale, headAnchorY, headBand])

  const fadedMats = useMemo(() => new Map(), [])
  const keywords = MUSCLE_GROUPS[activeGroup] ?? null

  // ── Keep joint meshes permanently hidden (belt-and-suspenders) ───────────────
  scene.traverse(child => {
    if (child.isMesh && child.userData.isJointMesh) {
      child.visible = false
      child.raycast = () => {}
    }
  })

  // ── Unified Material & Raycast Resolution Loop ─────────────────────────────
  meshes.forEach(mesh => {
    const inGroup = meshMatchesGroup(mesh.name, keywords)
    const base = getBaseMat(mesh)
    const isInteractive = visible && inGroup

    // Whole-layer fade overrides everything else.
    if (layerFaded) {
      mesh.visible = true
      mesh.raycast = () => null
      if (!fadedMats.has('__layer__' + mesh.uuid)) {
        const faded = base.clone()
        faded.transparent = true
        faded.opacity = 0.15
        faded.depthWrite = false
        fadedMats.set('__layer__' + mesh.uuid, faded)
      }
      mesh.material = fadedMats.get('__layer__' + mesh.uuid)
      return
    }

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
    <group visible={visible}>
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