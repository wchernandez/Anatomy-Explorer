import { useEffect, useMemo, useRef, useState } from 'react'
import { useGLTF, useCursor } from '@react-three/drei'
import * as THREE from 'three'

// ── Override materials (guaranteed colours, no reliance on GLB materials) ─────
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

// ── Per-material overrides for non-muscle tissue ──────────────────────────────
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
    'extensor carpi','extensor digiti','extensor digitorum','extensor indicis',
    'extensor pollicis','abductor pollicis longus','supinator',
    'flexor carpi','flexor digitorum','flexor pollicis','palmaris','pronator',
    'interossei','lumbrical','opponens','abductor digiti minimi of hand',
    'abductor pollicis brevis','flexor digiti minimi of hand','flexor pollicis brevis',
    'adductor pollicis','palmar aponeurosis','brachial fascia','deltoid fascia',
    'dorsal fascia of hand','flexor retinaculum of wrist','extensor retinaculum of wrist',
    'antebrachial fascia','clavipectoral fascia','pectoral fascia',
    'lateral intermuscular septum of arm','medial intermuscular septum of arm',
    'superficial transverse metacarpal','tendon sheath','common flexor tendon',
  ],
  'Lower Limb': [
    'gluteus','tensor fasciae','iliotibial','piriformis',
    'obturator','gemellus','quadratus femoris',
    'rectus femoris','vastus','sartorius',
    'adductor','gracilis','pectineus',
    'biceps femoris','semimembranosus','semitendinosus',
    'tibialis','extensor digitorum longus','extensor hallucis longus','fibularis',
    'gastrocnemius','soleus','plantaris','popliteus',
    'flexor digitorum longus','flexor hallucis longus','calcaneal',
    'abductor digiti minimi of foot','abductor hallucis',
    'adductor hallucis','dorsal interossei muscles of foot',
    'extensor digitorum brevis','extensor hallucis brevis',
    'flexor digiti minimi of foot','flexor digitorum brevis',
    'flexor hallucis brevis','lumbrical muscles of foot',
    'plantar interossei','quadratus plantae','opponens digiti minimi muscle of foot',
    'fascia lata','crural fascia','popliteal fascia','flexor retinaculum of ankle',
    'inferior extensor retinaculum','inferior fibular retinaculum',
    'superior extensor retinaculum','superior fibular retinaculum',
    'lateral femoral intermuscular','medial femoral intermuscular',
    'anterior intermuscular septum of leg','posterior intermuscular septum of leg',
    'transverse intermuscular septum','plantar aponeurosis','iliopectineal arch',
    'superficial transverse metatarsal','piriformis fascia',
    'tendon of extensor digitorum longus','tendon sheath of tibialis',
    'tendon sheath of flexor',
  ],
  'Thoracic': [
    'diaphragm','intercostal','levatores','pectoralis','serratus anterior',
    'subclavius','transversus thoracis','serratus posterior',
    'iliocostalis thoracis','longissimus thoracis','spinalis thoracis',
    'multifidus thoracis','semispinalis thoracis','interspinales thoracis','rotatores',
  ],
  'Abdominal': [
    'abdominal oblique','rectus abdominis','transversus abdominis',
    'pyramidalis','quadratus lumborum','linea alba','inguinal',
    'iliocostalis lumborum','multifidus lumborum','interspinales lumborum',
    'intertransversarii lumborum','coccygeus','iliococcygeus','pubo-analis',
    'pubococcygeus','levator ani','anal sphincter','iliacus','psoas',
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
    'inferior oblique muscle','inferior rectus muscle','lateral rectus',
    'levator palpebrae','medial rectus','superior oblique muscle','superior rectus muscle',
    'trochlea','superior tarsus','inferior tarsus','common tendinous ring',
    'masseteric fascia','superficial layer of temporal fascia',
  ],
  'Pelvic': [
    'coccygeus','iliococcygeus','pubo-analis','pubococcygeus','levator ani','anal sphincter',
  ],
}

function meshMatchesGroup(name, keywords) {
  if (!keywords) return true
  const lower = name.toLowerCase()
  return keywords.some(k => lower.includes(k.toLowerCase()))
}

// ── Read base mat from cached userData name, not live material ────────────────
function getBaseMat(mesh) {
  return MAT_OVERRIDES[mesh.userData.originalMatName] ?? baseForceMat
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function MuscleModel({ visible, selectedBone, onSelect, activeGroup, filterMode }) {
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
        // Cache original material name BEFORE overwriting it
        const originalMat = Array.isArray(child.material) ? child.material[0] : child.material
        child.userData.originalMatName = originalMat?.name ?? ''
        child.material = MAT_OVERRIDES[originalMat?.name] ?? baseForceMat
        list.push(child)
      }
    })
    return list
  }, [scene])

  // Toggle raycasting so hidden muscles don't swallow skeleton clicks
  useEffect(() => {
    meshes.forEach(mesh => {
      mesh.raycast = visible ? THREE.Mesh.prototype.raycast : () => {}
    })
  }, [visible, meshes])

  useEffect(() => {
    if (!groupRef.current) return
    const box = new THREE.Box3().setFromObject(groupRef.current)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const scale = 3 / Math.max(size.x, size.y, size.z)
    groupRef.current.scale.setScalar(scale)
    groupRef.current.position.sub(center.multiplyScalar(scale))
  }, [scene])

  // Faded versions cache
  const fadedMats = useMemo(() => new Map(), [])

  const keywords = MUSCLE_GROUPS[activeGroup] ?? null

  meshes.forEach(mesh => {
    const inGroup = meshMatchesGroup(mesh.name, keywords)
    const base = getBaseMat(mesh)

    if (mesh === selectedBone) {
      mesh.material = selectedMat
      mesh.visible = true
    } else if (mesh === hovered) {
      mesh.material = hoverMat
      mesh.visible = true
    } else if (inGroup) {
      mesh.material = base
      mesh.visible = true
    } else {
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
          onSelect(e.object)
        }}
        onPointerOver={(e) => {
          if (!visible) return
          e.stopPropagation()
          setHovered(e.object)
        }}
        onPointerOut={() => setHovered(null)}
      />
    </group>
  )
}

useGLTF.preload('/Muscles.glb')

export { MUSCLE_GROUPS }