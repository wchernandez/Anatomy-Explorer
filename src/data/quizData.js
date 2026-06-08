// ─────────────────────────────────────────────────────────────────────────────
// Quiz data + question generation
//
// Each region maps to a BONE_GROUP (see SkeletonModel.jsx) so the model can be
// restricted and the camera focused on that part of the body. For every region
// we keep a curated list of bones with the information needed to generate all
// four quiz modes:
//   • name        — the display / correct answer
//   • target      — lowercase substring used to match the 3D mesh that is clicked
//                   or highlighted (must appear in the cleaned mesh name)
//   • synonyms    — accepted alternatives for the "type the name" mode
//   • description — the clue used by the "description" mode
//
// Questions are generated on demand by buildQuiz() so each round is freshly
// shuffled and multiple-choice distractors are drawn from the same region.
// ─────────────────────────────────────────────────────────────────────────────

export const QUIZ_LAYERS = [
  { key: 'skeleton', label: 'Skeleton', icon: '🦴', enabled: true },
  { key: 'muscles',  label: 'Muscles',  icon: '💪', enabled: false },
  { key: 'joints',   label: 'Joints',   icon: '🦵', enabled: false },
  { key: 'vascular', label: 'Vascular', icon: '🫀', enabled: false },
]

export const QUIZ_MODES = [
  { level: 1, label: 'Multiple Choice', icon: '🔤', desc: 'Pick the right name from four options.' },
  { level: 2, label: 'Spot Test',       icon: '🎯', desc: 'Click the named bone on the model.' },
  { level: 3, label: 'Description',      icon: '📖', desc: 'Identify the bone from a clue.' },
  { level: 4, label: 'Type the Name',   icon: '⌨️', desc: 'Type the name of the highlighted bone.' },
]

// ── Curated bone sets ────────────────────────────────────────────────────────

const SKULL_BONES = [
  { name: 'Frontal Bone',   target: 'frontal bone',   synonyms: ['forehead bone'],          description: 'Forms the forehead and the upper part of the eye sockets.' },
  { name: 'Parietal Bone',  target: 'parietal bone',  synonyms: [],                          description: 'A pair of bones forming the sides and roof of the cranium.' },
  { name: 'Occipital Bone', target: 'occipital bone', synonyms: [],                          description: 'Forms the back and base of the skull, surrounding the spinal cord opening.' },
  { name: 'Temporal Bone',  target: 'temporal bone',  synonyms: [],                          description: 'Houses the ear structures and forms the lower sides of the skull.' },
  { name: 'Sphenoid Bone',  target: 'sphenoid bone',  synonyms: ['sphenoid'],                description: 'A butterfly-shaped bone at the base of the skull behind the eyes.' },
  { name: 'Ethmoid Bone',   target: 'ethmoid bone',   synonyms: ['ethmoid'],                 description: 'A delicate bone between the eyes forming part of the nasal cavity.' },
  { name: 'Zygomatic Bone', target: 'zygomatic bone', synonyms: ['cheekbone', 'cheek bone'], description: 'The cheekbone, forming the prominence of the cheek.' },
  { name: 'Nasal Bone',     target: 'nasal bone',     synonyms: [],                          description: 'A pair of small bones forming the bridge of the nose.' },
  { name: 'Maxilla',        target: 'maxilla',        synonyms: ['upper jaw'],               description: 'The upper jaw bone, which holds the upper teeth.' },
  { name: 'Mandible',       target: 'mandible',       synonyms: ['lower jaw', 'jawbone', 'jaw bone'], description: 'The lower jaw — the only movable bone of the skull.' },
  { name: 'Vomer',          target: 'vomer',          synonyms: [],                          description: 'A thin bone forming the lower part of the nasal septum.' },
  { name: 'Lacrimal Bone',  target: 'lacrimal bone',  synonyms: [],                          description: 'The smallest facial bone, forming part of the inner eye socket.' },
  { name: 'Palatine Bone',  target: 'palatine bone',  synonyms: [],                          description: 'Forms part of the hard palate and the floor of the nasal cavity.' },
  { name: 'Hyoid Bone',     target: 'hyoid bone',     synonyms: ['hyoid'],                   description: 'A U-shaped bone in the neck that anchors the tongue.' },
]

const SPINE_BONES = [
  { name: 'Atlas (C1)',           target: 'atlas',       synonyms: ['c1', 'atlas'],                       description: 'The first cervical vertebra, which supports the skull and allows the head to nod.' },
  { name: 'Axis (C2)',            target: 'axis',        synonyms: ['c2', 'axis'],                        description: 'The second cervical vertebra, with a peg that lets the head rotate side to side.' },
  { name: 'Cervical Vertebra (C7)', target: 'vertebra c7', synonyms: ['c7', 'seventh cervical vertebra'], description: 'The lowest neck vertebra, with a long spine you can feel at the base of the neck.' },
  { name: 'Thoracic Vertebra (T6)', target: 'vertebra t6', synonyms: ['t6'],                              description: 'A mid-back vertebra that joins with a pair of ribs.' },
  { name: 'Lumbar Vertebra (L3)', target: 'vertebra l3', synonyms: ['l3'],                                description: 'A large vertebra of the lower back that carries much of the body’s weight.' },
  { name: 'Sacrum',               target: 'sacrum',      synonyms: [],                                    description: 'A triangular bone of fused vertebrae at the base of the spine.' },
  { name: 'Coccyx',               target: 'coccyx',      synonyms: ['tailbone'],                          description: 'The tailbone — the small bone at the very bottom of the spine.' },
]

const THORAX_BONES = [
  { name: 'Clavicle',           target: 'clavicle',          synonyms: ['collarbone', 'collar bone'], description: 'The collarbone, connecting the arm to the trunk.' },
  { name: 'Scapula',            target: 'scapula',           synonyms: ['shoulder blade'],            description: 'The shoulder blade, a flat triangular bone of the upper back.' },
  { name: 'Manubrium of Sternum', target: 'manubrium',       synonyms: ['manubrium'],                 description: 'The upper part of the breastbone, where the collarbones attach.' },
  { name: 'Body of Sternum',    target: 'body of sternum',   synonyms: [],                            description: 'The long central part of the breastbone.' },
  { name: 'Xiphoid Process',    target: 'xiphoid',           synonyms: ['xiphoid process'],           description: 'The small pointed tip at the bottom of the breastbone.' },
]

const UPPER_LIMB_BONES = [
  { name: 'Humerus',        target: 'humerus',   synonyms: ['upper arm bone'], description: 'The single bone of the upper arm, between the shoulder and elbow.' },
  { name: 'Radius',         target: 'radius',    synonyms: [],                 description: 'The forearm bone on the thumb side of the arm.' },
  { name: 'Ulna',           target: 'ulna',      synonyms: [],                 description: 'The longer forearm bone, on the little-finger side.' },
  { name: 'Scaphoid Bone',  target: 'scaphoid',  synonyms: [],                 description: 'A boat-shaped wrist bone — the carpal most often fractured.' },
  { name: 'Lunate Bone',    target: 'lunate',    synonyms: [],                 description: 'A crescent-moon-shaped bone in the wrist.' },
  { name: 'Capitate Bone',  target: 'capitate',  synonyms: [],                 description: 'The largest carpal bone, at the centre of the wrist.' },
  { name: 'Hamate Bone',    target: 'hamate',    synonyms: [],                 description: 'A wrist bone with a distinctive hook-shaped projection.' },
  { name: 'Trapezium Bone', target: 'trapezium', synonyms: [],                 description: 'A wrist bone at the base of the thumb.' },
  { name: 'Pisiform Bone',  target: 'pisiform',  synonyms: [],                 description: 'A small pea-shaped bone on the little-finger side of the wrist.' },
]

const LOWER_LIMB_BONES = [
  { name: 'Femur',          target: 'femur',     synonyms: ['thigh bone', 'thighbone'], description: 'The longest bone in the body, forming the thigh.' },
  { name: 'Patella',        target: 'patella',   synonyms: ['kneecap'],                 description: 'The kneecap, protecting the front of the knee joint.' },
  { name: 'Tibia',          target: 'tibia',     synonyms: ['shin bone', 'shinbone'],   description: 'The larger, weight-bearing bone of the lower leg.' },
  { name: 'Fibula',         target: 'fibula',    synonyms: [],                          description: 'The thin bone running alongside the tibia in the lower leg.' },
  { name: 'Calcaneus',      target: 'calcaneus', synonyms: ['heel bone'],               description: 'The heel bone — the largest bone of the foot.' },
  { name: 'Talus',          target: 'talus',     synonyms: [],                          description: 'The ankle bone, sitting between the leg bones and the heel.' },
  { name: 'Navicular Bone', target: 'navicular', synonyms: [],                          description: 'A boat-shaped bone on the inner side of the foot.' },
  { name: 'Cuboid Bone',    target: 'cuboid',    synonyms: [],                          description: 'A cube-shaped bone on the outer side of the foot.' },
]

const PELVIS_BONES = [
  { name: 'Hip Bone', target: 'hip bone', synonyms: ['pelvic bone'], description: 'The large bone forming the side and front of the pelvis and the hip socket.' },
  { name: 'Sacrum',   target: 'sacrum',   synonyms: [],              description: 'The triangular bone wedged between the two hip bones at the back of the pelvis.' },
  { name: 'Coccyx',   target: 'coccyx',   synonyms: ['tailbone'],    description: 'The tailbone, at the very bottom of the pelvis.' },
]

const WHOLE_BODY_BONES = [
  { name: 'Frontal Bone', target: 'frontal bone', synonyms: ['forehead bone'],           description: 'Forms the forehead and the upper part of the eye sockets.' },
  { name: 'Mandible',     target: 'mandible',     synonyms: ['lower jaw', 'jawbone'],     description: 'The lower jaw — the only movable bone of the skull.' },
  { name: 'Clavicle',     target: 'clavicle',     synonyms: ['collarbone'],               description: 'The collarbone, connecting the arm to the trunk.' },
  { name: 'Scapula',      target: 'scapula',      synonyms: ['shoulder blade'],           description: 'The shoulder blade, a flat triangular bone of the upper back.' },
  { name: 'Humerus',      target: 'humerus',      synonyms: ['upper arm bone'],           description: 'The single bone of the upper arm, connecting the shoulder to the elbow.' },
  { name: 'Radius',       target: 'radius',       synonyms: [],                           description: 'A forearm bone on the thumb side of the arm.' },
  { name: 'Ulna',         target: 'ulna',         synonyms: [],                           description: 'The longer forearm bone, on the little-finger side.' },
  { name: 'Hip Bone',     target: 'hip bone',     synonyms: ['pelvis', 'pelvic bone'],    description: 'A large bone of the pelvis that forms the socket of the hip joint.' },
  { name: 'Sacrum',       target: 'sacrum',       synonyms: [],                           description: 'A triangular bone at the base of the spine, between the hip bones.' },
  { name: 'Coccyx',       target: 'coccyx',       synonyms: ['tailbone'],                 description: 'A small, triangular bone at the base of the spine — the tailbone.' },
  { name: 'Femur',        target: 'femur',        synonyms: ['thigh bone', 'thighbone'],  description: 'The longest bone in the body, forming the thigh.' },
  { name: 'Patella',      target: 'patella',      synonyms: ['kneecap'],                  description: 'The kneecap, a small bone protecting the front of the knee.' },
  { name: 'Tibia',        target: 'tibia',        synonyms: ['shin bone', 'shinbone'],    description: 'The larger, weight-bearing bone of the lower leg.' },
  { name: 'Fibula',       target: 'fibula',       synonyms: [],                           description: 'The thin bone running alongside the tibia in the lower leg.' },
]

// Region order mirrors the skeleton filter groups in the Filters tab
// (BONE_GROUPS in SkeletonModel.jsx). Each region's `group` selects which bones
// stay visible and where the camera focuses; its `bones` drive the questions.
export const QUIZ_REGIONS = {
  whole_body: { key: 'whole_body', label: 'Whole Body', group: 'All Bones',  icon: '🦴', desc: 'The entire skeleton, head to toe.',            bones: WHOLE_BODY_BONES },
  skull:      { key: 'skull',      label: 'Skull',      group: 'Skull',      icon: '💀', desc: 'Bones of the head and face.',                  bones: SKULL_BONES },
  spine:      { key: 'spine',      label: 'Spine',      group: 'Spine',      icon: '🧬', desc: 'The vertebral column, from neck to tailbone.', bones: SPINE_BONES },
  thorax:     { key: 'thorax',     label: 'Thorax',     group: 'Thorax',     icon: '🫁', desc: 'The chest — breastbone and shoulder girdle.',  bones: THORAX_BONES },
  upper_limb: { key: 'upper_limb', label: 'Upper Limb', group: 'Upper Limb', icon: '💪', desc: 'Arm, forearm and the bones of the wrist.',     bones: UPPER_LIMB_BONES },
  lower_limb: { key: 'lower_limb', label: 'Lower Limb', group: 'Lower Limb', icon: '🦵', desc: 'Thigh, lower leg and the bones of the foot.',   bones: LOWER_LIMB_BONES },
  pelvis:     { key: 'pelvis',     label: 'Pelvis',     group: 'Pelvis',     icon: '🩻', desc: 'The hip bones, sacrum and coccyx.',            bones: PELVIS_BONES },
}

const MAX_QUESTIONS = 10

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Build four-option multiple-choice list: the correct name + 3 distractors
// drawn from other bones in the same region.
function buildOptions(bone, pool) {
  const distractors = shuffle(pool.filter(b => b.name !== bone.name)).slice(0, 3).map(b => b.name)
  return shuffle([bone.name, ...distractors])
}

// Generate a freshly shuffled list of questions for a region + quiz mode.
export function buildQuiz(regionKey, level) {
  const region = QUIZ_REGIONS[regionKey]
  if (!region) return []
  const pool  = region.bones
  const count = Math.min(MAX_QUESTIONS, pool.length)
  const bones = shuffle(pool).slice(0, count)

  return bones.map(bone => {
    const base = { target: bone.target, answer: bone.name, level }
    switch (level) {
      case 1:
        return { ...base, prompt: 'What bone is highlighted?', options: buildOptions(bone, pool) }
      case 2:
        return { ...base, prompt: `Click the ${bone.name.toUpperCase()} on the skeleton.` }
      case 3:
        return { ...base, prompt: bone.description }
      case 4:
        return { ...base, prompt: 'Type the name of the highlighted bone.', synonyms: [bone.target, ...bone.synonyms] }
      default:
        return base
    }
  })
}
