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
    'carotid','vertebral artery','vertebral vein',
    'basilar','cerebral','ophthalmic','ophthalmic vein',
    'facial artery','facial vein','common facial vein',
    'maxillary artery','maxillary vein','lingual',
    'thyroid artery','thyroid vein',
    'jugular','ascending pharyngeal','deep cervical',
    'retromandibular','angular artery','angular vein',
    'labial artery','labial vein','submental',
    'buccal artery','palatine artery','alveolar artery','infra-orbital',
    'meningeal artery','sphenopalatine','striate branch',
    'precentral sulcus','central sulcus','postcentral',
    'posterior parietal artery','frontobasal artery','prefrontal artery',
    'orbitofrontal','temporal branch',
    'ethmoidal artery','retinal artery','lacrimal artery',
    'ciliary arteri','supra-orbital','supratrochlear',
    'callosomarginal','pericallosal',
    'anterior cerebral','posterior cerebral','middle cerebral',
    'cerebellar artery','communicating artery','spinal artery',
    'angular gyrus','temporo-occipital',
    'lateral occipital','medial occipital','parieto-occipital',
    'cavernous sinus','petrosal sinus','intercavernous sinus',
    'transverse sinus','sigmoid sinus','occipital sinus',
    'straight sinus','superior sagittal sinus','inferior sagittal sinus',
    'basilar venous plexus',
    'posterior auricular vein','anterior jugular vein',
    'thyrocervical','costocervical',
    'transverse cervical',
    'insular branch','artery of central','artery of precentral',
    'distal lateral striate','proximal lateral striate',
    'pontine branch','superficial temporal',
    'occipital artery','occipital vein',
    'common carotid','subclavian artery','subclavian vein',
    'suprascapular artery','suprascapular vein',
    'artery of pterygoid canal',
    'temporal artery','temporal vein',
    'external carotid','internal carotid',
  ],

  'Heart': [
    'left atrium','right atrium','left ventricle','right ventricle',
    'papillary muscle','atrioventricular',
    'interventricular artery','circumflex artery of heart',
    'cardiac vein','coronary leaflet','semilunar leaflet','leaflet',
    'coronary sinus','coronary artery','right inferolateral',
    'great cardiac vein','middle cardiac vein',
    'inferior vein of left ventricle',
    'aortic arch','ascending aorta','thoracic aorta',
    'pulmonary trunk','bifurcation of pulmonary',
    'superior vena cava','septal branch','marginal artery',
  ],

  'Thorax': [
    'intercostal artery','intercostal arteries','intercostal vein',
    'internal thoracic','musculophrenic',
    'brachiocephalic trunk','brachiocephalic vein',
    'azygos','hemiazygos','accessory hemi-azygos',
    'supreme intercostal',
    'first posterior intercostal','second posterior intercostal',
    'subcostal',
    'left superior intercostal vein','right superior intercostal vein',
    'left ascending lumbar vein','right ascending lumbar vein',
    'superior phrenic','right superior phrenic',
    'left pulmonary artery','right pulmonary artery','pulmonary vein',
    'of left lung','of right lung',
    'lingular artery','lingular vein',
    'lobar artery','segmental artery','segmental vein',
    'apical vein','apicoposterior vein',
  ],

  'Abdomen': [
    'coeliac trunk','celiac',
    'common hepatic','proper hepatic','hepatic vein','hepatic portal',
    'splenic artery','splenic vein',
    'gastric artery','gastro-omental','gastroduodenal',
    'mesenteric artery','mesenteric vein',
    'renal artery','renal vein','intrarenal',
    'suprarenal','lumbar artery','lumbar arteries','lumbar vein',
    'inferior vena cava','abdominal aorta',
    'gonadal','inferior phrenic',
    'left colic','right colic','middle colic','colic branch',
    'sigmoid arteri','sigmoid vein',
    'ileocolic','ileal branch','appendicular',
    'pancreaticoduodenal','superior anorectal',
    'testicular artery','testicular vein',
    'iliolumbar artery','iliolumbar vein',
    'lumbar branch of iliolumbar','iliacus branch','spinal branch of iliolumbar',
    'median sacral artery',
    'superior epigastric','inferior epigastric',
  ],

  'Upper Limb': [
    'axillary artery','axillary vein',
    'brachial artery','brachial vein','deep brachial',
    'radial artery','radial vein','radial collateral',
    'ulnar artery','ulnar vein','ulnar recurrent',
    'common interosseous','anterior interosseous',
    'posterior interosseous','recurrent interosseous',
    'common palmar digital','proper palmar digital',
    'palmar metacarpal','deep palmar arch','superficial palmar arch',
    'deep venous palmar arch','superficial venous palmar arch',
    'dorsal carpal','dorsal metacarpal arteri',
    'dorsal digital arteries of hand','dorsal venous network of hand',
    'dorsal digital veins of hand',
    'palmar carpal branch','palmar digital vein',
    'cephalic vein','basilic vein','median cubital','median antebrachial',
    'circumflex humeral','circumflex scapular',
    'pectoral branch','thoraco-acromial','thoracodorsal',
    'subscapular artery','subscapular vein',
    'lateral thoracic artery','lateral thoracic vein',
    'superior ulnar collateral','inferior ulnar collateral',
    'middle collateral artery',
  ],

  'Lower Limb': [
    'femoral artery','femoral vein','deep femoral',
    'lateral circumflex femoral','medial circumflex femoral',
    'perforating femoral','perforating vein',
    'popliteal artery','popliteal vein',
    'anterior tibial artery','anterior tibial vein',
    'posterior tibial artery','posterior tibial vein',
    'fibular artery','fibular vein',
    'great saphenous','small saphenous',
    'dorsalis pedis','arcuate artery',
    'lateral tarsal','lateral plantar','medial plantar',
    'plantar arch','plantar venous arch','deep plantar',
    'dorsal digital arteries of foot','dorsal metatarsal arteri',
    'dorsal metatarsal vein','dorsal digital veins of foot',
    'dorsal venous arch of foot','intercapitular vein',
    'plantar metatarsal','plantar digital',
    'calcaneal branch','common plantar digital','proper plantar digital',
    'genicular','patellar anastomosis',
    'superior gluteal','inferior gluteal',
    'obturator artery','obturator vein',
    'deep external pudendal',
    'superficial epigastric artery','superficial epigastric vein',
    'external pudendal',
  ],

  'Pelvis': [
    'internal iliac artery','internal iliac vein',
    'external iliac artery','external iliac vein',
    'common iliac artery','common iliac vein',
    'anterior division of internal iliac','posterior division of internal iliac',
    'pudendal artery','pudendal vein',
    'uterine','vaginal artery','vesical artery','rectal artery','rectal vein',
    'lateral sacral','median sacral',
    'dorsal artery of penis','deep artery of penis',
    'dorsal vein of penis','superficial dorsal vein of penis',
    'deep dorsal vein','superficial external pudendal',
    'iliolumbar artery','iliolumbar vein',
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
  shoulderScale = 1,
  hipScale      = 1,
  layerFaded    = false,
}) {
  const { scene } = useGLTF('/Vascular.glb')
  const [hovered, setHovered] = useState(null)

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

  // ── Per-frame material assignment ────────────────────────────────────────
  const fadedMats = useMemo(() => new Map(), [])
  const keywords  = VASCULAR_GROUPS[activeGroup] ?? null

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

  // The shared body group (in Scene) owns the entire transform. Vessels inherit
  // it directly — no per-mesh region corrections — so vessel endpoints track the
  // bone/muscle endpoints exactly (same scale, same pivot) at any body size.
  return (
    <group visible={visible}>
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
