// ─────────────────────────────────────────────────────────────────────────────
// Quiz data + question generation — all four body systems, all regions
//
// Each region now has a separate array per layer:
//   region.skeleton, region.muscles, region.joints, region.vascular
//
// buildQuiz(regionKey, level, layer) picks the right pool automatically.
// ─────────────────────────────────────────────────────────────────────────────

export const QUIZ_LAYERS = [
  { key: 'skeleton', label: 'Skeleton', icon: '🦴', enabled: true },
  { key: 'muscles',  label: 'Muscles',  icon: '💪', enabled: true },
  { key: 'joints',   label: 'Joints',   icon: '🦵', enabled: true },
  { key: 'vascular', label: 'Vascular', icon: '🫀', enabled: true },
]

export const QUIZ_MODES = [
  { level: 1, label: 'Multiple Choice', icon: '🔤', desc: 'Pick the right name from four options.' },
  { level: 2, label: 'Spot Test',       icon: '🎯', desc: 'Click the named structure on the model.' },
  { level: 3, label: 'Description',     icon: '📖', desc: 'Identify the structure from a clue.' },
  { level: 4, label: 'Type the Name',   icon: '⌨️', desc: 'Type the name of the highlighted structure.' },
]

// ─────────────────────────────────────────────────────────────────────────────
// SKULL
// ─────────────────────────────────────────────────────────────────────────────

const SKULL_SKELETON = [
  { name: 'Frontal Bone',   target: 'frontal bone',   synonyms: ['forehead bone'],        description: 'Forms the forehead and the upper part of the eye sockets.' },
  { name: 'Parietal Bone',  target: 'parietal bone',  synonyms: [],                       description: 'A pair of bones forming the sides and roof of the cranium.' },
  { name: 'Occipital Bone', target: 'occipital bone', synonyms: [],                       description: 'Forms the back and base of the skull, surrounding the spinal cord opening.' },
  { name: 'Temporal Bone',  target: 'temporal bone',  synonyms: [],                       description: 'Houses the ear structures and forms the lower sides of the skull.' },
  { name: 'Sphenoid Bone',  target: 'sphenoid bone',  synonyms: ['sphenoid'],             description: 'A butterfly-shaped bone at the base of the skull behind the eyes.' },
  { name: 'Ethmoid Bone',   target: 'ethmoid bone',   synonyms: ['ethmoid'],              description: 'A delicate bone between the eyes forming part of the nasal cavity.' },
  { name: 'Zygomatic Bone', target: 'zygomatic bone', synonyms: ['cheekbone'],            description: 'The cheekbone, forming the prominence of the cheek.' },
  { name: 'Nasal Bone',     target: 'nasal bone',     synonyms: [],                       description: 'A pair of small bones forming the bridge of the nose.' },
  { name: 'Maxilla',        target: 'maxilla',        synonyms: ['upper jaw'],            description: 'The upper jaw bone, which holds the upper teeth.' },
  { name: 'Mandible',       target: 'mandible',       synonyms: ['lower jaw', 'jawbone'], description: 'The lower jaw — the only movable bone of the skull.' },
  { name: 'Vomer',          target: 'vomer',          synonyms: [],                       description: 'A thin bone forming the lower part of the nasal septum.' },
  { name: 'Lacrimal Bone',  target: 'lacrimal bone',  synonyms: [],                       description: 'The smallest facial bone, forming part of the inner eye socket.' },
  { name: 'Palatine Bone',  target: 'palatine bone',  synonyms: [],                       description: 'Forms part of the hard palate and the floor of the nasal cavity.' },
  { name: 'Hyoid Bone',     target: 'hyoid bone',     synonyms: ['hyoid'],                description: 'A U-shaped bone in the neck that anchors the tongue.' },
]

const SKULL_MUSCLES = [
  { name: 'Temporalis',           target: 'temporalis',           synonyms: [],              description: 'A fan-shaped temple muscle that closes the jaw and pulls it back.' },
  { name: 'Masseter',             target: 'masseter',             synonyms: [],              description: 'The powerful jaw muscle that elevates the mandible for chewing.' },
  { name: 'Orbicularis Oculi',    target: 'orbicularis oculi',    synonyms: [],              description: 'The ring muscle around the eye that closes the eyelid.' },
  { name: 'Orbicularis Oris',     target: 'orbicularis oris',     synonyms: [],              description: 'The ring muscle around the mouth that closes and purses the lips.' },
  { name: 'Zygomaticus Major',    target: 'zygomaticus major',    synonyms: [],              description: 'Pulls the corner of the mouth upward and outward — the smiling muscle.' },
  { name: 'Buccinator',           target: 'buccinator',           synonyms: [],              description: 'The cheek muscle that compresses the cheeks during chewing.' },
  { name: 'Frontalis',            target: 'frontalis',            synonyms: [],              description: 'Raises the eyebrows and wrinkles the forehead.' },
  { name: 'Sternocleidomastoid',  target: 'sternocleidomastoid',  synonyms: ['scm'],         description: 'A prominent neck muscle that rotates and flexes the head.' },
  { name: 'Mentalis',             target: 'mentalis',             synonyms: [],              description: 'The chin muscle that elevates and wrinkles the skin of the chin.' },
  { name: 'Depressor Anguli Oris', target: 'depressor anguli oris', synonyms: [],            description: 'Pulls the corner of the mouth downward, as in a frown.' },
]

const SKULL_JOINTS = [
  { name: 'Articular Capsule of Temporomandibular Joint', target: 'articular capsule of temporomandibular', synonyms: ['tmj capsule'], description: 'The fibrous sleeve enclosing the jaw joint.' },
  { name: 'Articular Disc of Temporomandibular Joint',    target: 'articular disc of temporomandibular',    synonyms: [],             description: 'A fibrocartilage disc inside the jaw joint that cushions movement.' },
  { name: 'Lateral Temporomandibular Ligament',           target: 'lateral temporomandibular ligament',     synonyms: [],             description: 'The primary ligament reinforcing the outer side of the jaw joint.' },
  { name: 'Sphenomandibular Ligament',                    target: 'sphenomandibular ligament',              synonyms: [],             description: 'Connects the sphenoid bone to the mandible, guiding jaw movement.' },
  { name: 'Stylomandibular Ligament',                     target: 'stylomandibular ligament',               synonyms: [],             description: 'Runs from the styloid process to the angle of the mandible.' },
  { name: 'Stylohyoid Ligament',                          target: 'stylohyoid ligament',                    synonyms: [],             description: 'Connects the styloid process to the hyoid bone.' },
]

const SKULL_VASCULAR = [
  { name: 'Internal Carotid Artery',    target: 'internal carotid artery',    synonyms: [],              description: 'Supplies blood to the brain, eyes and forehead.' },
  { name: 'External Carotid Artery',    target: 'external carotid artery',    synonyms: [],              description: 'Supplies blood to the face, scalp and neck structures.' },
  { name: 'Facial Artery',              target: 'facial artery',              synonyms: [],              description: 'Branches from the external carotid to supply the face.' },
  { name: 'Basilar Artery',             target: 'basilar artery',             synonyms: [],              description: 'Formed by the vertebral arteries, supplying the brainstem and cerebellum.' },
  { name: 'Middle Cerebral Artery',     target: 'middle cerebral artery',     synonyms: ['mca'],         description: 'The largest branch of the internal carotid, supplying most of the cerebral cortex.' },
  { name: 'Superficial Temporal Artery', target: 'superficial temporal artery', synonyms: [],            description: 'A terminal branch of the external carotid felt pulsing at the temple.' },
  { name: 'Maxillary Artery',           target: 'maxillary artery',           synonyms: [],              description: 'Supplies the deep face, nasal cavity and teeth.' },
  { name: 'Internal Jugular Vein',      target: 'internal jugular vein',      synonyms: [],              description: 'The largest vein of the neck, draining blood from the brain and face.' },
  { name: 'Occipital Artery',           target: 'occipital artery',           synonyms: [],              description: 'Supplies the back of the scalp and upper neck muscles.' },
]

// ─────────────────────────────────────────────────────────────────────────────
// SPINE
// ─────────────────────────────────────────────────────────────────────────────

const SPINE_SKELETON = [
  { name: 'Atlas (C1)',             target: 'atlas',        synonyms: ['c1'],        description: 'The first cervical vertebra that supports the skull and allows the head to nod.' },
  { name: 'Axis (C2)',              target: 'axis',         synonyms: ['c2'],        description: 'The second cervical vertebra, with a peg that lets the head rotate.' },
  { name: 'Cervical Vertebra (C7)', target: 'vertebra c7',  synonyms: ['c7'],        description: 'The lowest neck vertebra, with a long spine felt at the base of the neck.' },
  { name: 'Thoracic Vertebra (T6)', target: 'vertebra t6',  synonyms: ['t6'],        description: 'A mid-back vertebra that articulates with a pair of ribs.' },
  { name: 'Lumbar Vertebra (L3)',   target: 'vertebra l3',  synonyms: ['l3'],        description: 'A large lower-back vertebra that carries much of the body\'s weight.' },
  { name: 'Sacrum',                 target: 'sacrum',       synonyms: [],            description: 'A triangular bone of fused vertebrae at the base of the spine.' },
  { name: 'Coccyx',                 target: 'coccyx',       synonyms: ['tailbone'],  description: 'The tailbone — the small bone at the very bottom of the spine.' },
]

const SPINE_MUSCLES = [
  { name: 'Trapezius',         target: 'trapezius',      synonyms: ['traps'],  description: 'A large diamond-shaped back muscle that moves the shoulder blade and neck.' },
  { name: 'Splenius Capitis',  target: 'splenius capitis', synonyms: [],       description: 'A neck muscle that extends and rotates the head.' },
  { name: 'Semispinalis',      target: 'semispinalis',   synonyms: [],         description: 'A deep back and neck muscle that extends and rotates the vertebral column.' },
  { name: 'Multifidus',        target: 'multifidus',     synonyms: [],         description: 'A deep spinal stabiliser running along the grooves of the vertebrae.' },
  { name: 'Levator Scapulae',  target: 'levator scapulae', synonyms: [],       description: 'Elevates the scapula and helps tilt the neck sideways.' },
  { name: 'Longus Colli',      target: 'longus colli',   synonyms: [],         description: 'A deep anterior neck muscle that flexes the cervical spine.' },
  { name: 'Rhomboid Major',    target: 'rhomboid major', synonyms: [],         description: 'Retracts and rotates the scapula, pulling it toward the spine.' },
  { name: 'Erector Spinae',    target: 'erector spinae', synonyms: [],         description: 'A group of muscles running along the spine that keep the back erect.' },
]

const SPINE_JOINTS = [
  { name: 'Anterior Longitudinal Ligament', target: 'anterior longitudinal ligament', synonyms: ['all'], description: 'A broad band running down the front of the vertebral column.' },
  { name: 'Posterior Longitudinal Ligament', target: 'posterior longitudinal ligament', synonyms: ['pll'], description: 'Runs down the back of the vertebral bodies inside the spinal canal.' },
  { name: 'Ligamenta Flava',                target: 'ligamenta flava',                synonyms: [],      description: 'Elastic yellow ligaments connecting adjacent laminae of the vertebrae.' },
  { name: 'Nuchal Ligament',                target: 'nuchal ligament',                synonyms: [],      description: 'A strong ligament running along the back of the neck from skull to C7.' },
  { name: 'Interspinous Ligaments',         target: 'interspinous ligaments',         synonyms: [],      description: 'Connect adjacent spinous processes of the vertebrae.' },
  { name: 'Supraspinous Ligament',          target: 'supraspinous ligament',          synonyms: [],      description: 'Runs along the tips of the spinous processes from C7 to the sacrum.' },
  { name: 'Intervertebral Disc (L1-L2)',    target: 'intervertebral disc l1',         synonyms: [],      description: 'A fibrocartilage cushion between adjacent vertebral bodies.' },
]

const SPINE_VASCULAR = [
  { name: 'Vertebral Artery',              target: 'vertebral artery',              synonyms: [],  description: 'Runs through the cervical vertebrae to supply the brainstem and cerebellum.' },
  { name: 'Anterior Spinal Artery',        target: 'anterior spinal artery',        synonyms: [],  description: 'Supplies the anterior two-thirds of the spinal cord.' },
  { name: 'Posterior Intercostal Arteries', target: 'posterior intercostal arteries', synonyms: [], description: 'Supply the intercostal spaces and back muscles from the thoracic aorta.' },
  { name: 'Thoracic Aorta',               target: 'thoracic aorta',               synonyms: [],   description: 'The descending portion of the aorta passing through the thorax.' },
  { name: 'Lumbar Arteries',              target: 'lumbar arteries',              synonyms: [],    description: 'Paired arteries from the abdominal aorta supplying the back and spinal cord.' },
]

// ─────────────────────────────────────────────────────────────────────────────
// THORAX
// ─────────────────────────────────────────────────────────────────────────────

const THORAX_SKELETON = [
  { name: 'Clavicle',             target: 'clavicle',        synonyms: ['collarbone'],    description: 'The collarbone, connecting the arm to the trunk.' },
  { name: 'Scapula',              target: 'scapula',         synonyms: ['shoulder blade'], description: 'The shoulder blade, a flat triangular bone of the upper back.' },
  { name: 'Manubrium of Sternum', target: 'manubrium',       synonyms: ['manubrium'],     description: 'The upper part of the breastbone, where the collarbones attach.' },
  { name: 'Body of Sternum',      target: 'body of sternum', synonyms: [],               description: 'The long central part of the breastbone.' },
  { name: 'Xiphoid Process',      target: 'xiphoid',         synonyms: [],               description: 'The small pointed tip at the bottom of the breastbone.' },
  { name: 'First Rib',            target: 'first rib',       synonyms: [],               description: 'The topmost rib — the shortest and most curved.' },
  { name: 'Seventh Rib',          target: 'seventh rib',     synonyms: [],               description: 'The last true rib, joining the sternum directly via cartilage.' },
]

const THORAX_MUSCLES = [
  { name: 'Pectoralis Major',   target: 'pectoralis major',  synonyms: ['pecs'],            description: 'The large fan-shaped chest muscle that draws the arm across the body.' },
  { name: 'Pectoralis Minor',   target: 'pectoralis minor',  synonyms: [],                  description: 'A smaller chest muscle beneath pectoralis major that pulls the scapula forward.' },
  { name: 'Serratus Anterior',  target: 'serratus anterior', synonyms: [],                  description: 'Fans across the ribcage and protracts the scapula — the "boxer\'s muscle".' },
  { name: 'Diaphragm',          target: 'diaphragm',         synonyms: [],                  description: 'The dome-shaped breathing muscle separating the chest from the abdomen.' },
  { name: 'External Oblique',   target: 'external oblique',  synonyms: [],                  description: 'The outermost lateral abdominal muscle, which rotates and flexes the trunk.' },
  { name: 'Rectus Abdominis',   target: 'rectus abdominis',  synonyms: ['abs'],             description: 'The "six-pack" muscle running vertically along the front of the abdomen.' },
  { name: 'Latissimus Dorsi',   target: 'latissimus dorsi',  synonyms: ['lats'],            description: 'The broad back muscle that pulls the arm downward and backward.' },
  { name: 'Subclavius',         target: 'subclavius',        synonyms: [],                  description: 'A small muscle that depresses and stabilises the clavicle.' },
]

const THORAX_JOINTS = [
  { name: 'Anterior Sternoclavicular Ligament', target: 'anterior sternoclavicular ligament', synonyms: [], description: 'Reinforces the front of the sternoclavicular joint.' },
  { name: 'Costoclavicular Ligament',           target: 'costoclavicular ligament',           synonyms: [], description: 'Anchors the clavicle down to the first rib.' },
  { name: 'Acromioclavicular Ligament',         target: 'acromioclavicular ligament',         synonyms: [], description: 'Connects the acromion to the clavicle at the top of the shoulder.' },
  { name: 'Costotransverse Ligament',           target: 'costotransverse ligament',           synonyms: [], description: 'Connects the neck of a rib to the transverse process of its vertebra.' },
  { name: 'Radiate Ligament of Head of Rib',    target: 'radiate ligament of head of rib',    synonyms: [], description: 'A fan of fibres anchoring the head of each rib to adjacent vertebral bodies.' },
  { name: 'External Intercostal Membrane',      target: 'external intercostal membrane',      synonyms: [], description: 'A thin fibrous sheet between ribs where the external intercostals are absent.' },
]

const THORAX_VASCULAR = [
  { name: 'Aortic Arch',           target: 'aortic arch',           synonyms: [],           description: 'The curved part of the aorta that gives off vessels to the head and arms.' },
  { name: 'Ascending Aorta',       target: 'ascending aorta',       synonyms: [],           description: 'The first section of the aorta, rising from the left ventricle.' },
  { name: 'Superior Vena Cava',    target: 'superior vena cava',    synonyms: ['svc'],      description: 'Returns deoxygenated blood from the upper body to the right atrium.' },
  { name: 'Left Coronary Artery',  target: 'left coronary artery',  synonyms: ['coronary'], description: 'Supplies blood to the left side of the heart muscle.' },
  { name: 'Right Coronary Artery', target: 'right coronary artery', synonyms: [],           description: 'Supplies blood to the right side of the heart and inferior left ventricle.' },
  { name: 'Left Pulmonary Artery', target: 'left pulmonary artery', synonyms: [],           description: 'Carries deoxygenated blood from the right ventricle to the left lung.' },
  { name: 'Internal Thoracic Artery', target: 'internal thoracic artery', synonyms: [],     description: 'Runs down inside the chest wall — commonly used in coronary bypass surgery.' },
  { name: 'Brachiocephalic Trunk', target: 'brachiocephalic trunk', synonyms: [],           description: 'The first branch of the aortic arch, dividing into the right carotid and subclavian.' },
]

// ─────────────────────────────────────────────────────────────────────────────
// UPPER LIMB
// ─────────────────────────────────────────────────────────────────────────────

const UPPER_LIMB_SKELETON = [
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

const UPPER_LIMB_MUSCLES = [
  { name: 'Deltoid',                   target: 'deltoid',                   synonyms: [],              description: 'The triangular shoulder muscle that raises the arm to the side.' },
  { name: 'Biceps Brachii',            target: 'biceps brachii',            synonyms: ['biceps'],      description: 'The two-headed muscle at the front of the upper arm that flexes the elbow.' },
  { name: 'Triceps Brachii',           target: 'triceps brachii',           synonyms: ['triceps'],     description: 'The three-headed muscle at the back of the upper arm that extends the elbow.' },
  { name: 'Brachialis',                target: 'brachialis',                synonyms: [],              description: 'A deep arm muscle beneath the biceps that flexes the elbow.' },
  { name: 'Brachioradialis',           target: 'brachioradialis',           synonyms: [],              description: 'Flexes the forearm and helps pronate and supinate it.' },
  { name: 'Pronator Teres',            target: 'pronator teres',            synonyms: [],              description: 'Pronates the forearm — turns the palm to face downward.' },
  { name: 'Flexor Carpi Radialis',     target: 'flexor carpi radialis',     synonyms: [],              description: 'Flexes and abducts the wrist.' },
  { name: 'Extensor Carpi Radialis',   target: 'extensor carpi radialis',   synonyms: [],              description: 'Extends and abducts the wrist.' },
  { name: 'Flexor Digitorum Superficialis', target: 'flexor digitorum superficialis', synonyms: [],    description: 'Flexes the middle phalanges of the four fingers.' },
  { name: 'Infraspinatus',             target: 'infraspinatus',             synonyms: [],              description: 'A rotator cuff muscle that externally rotates the arm.' },
]

const UPPER_LIMB_JOINTS = [
  { name: 'Articular Capsule of Glenohumeral Joint', target: 'articular capsule of glenohumeral', synonyms: ['shoulder capsule'], description: 'The fibrous sleeve enclosing the shoulder joint.' },
  { name: 'Glenoid Labrum',             target: 'glenoid labrum',             synonyms: [],      description: 'A fibrocartilage ring that deepens the shoulder socket.' },
  { name: 'Coracohumeral Ligament',     target: 'coracohumeral ligament',     synonyms: [],      description: 'Reinforces the superior shoulder joint capsule.' },
  { name: 'Articular Capsule of Elbow Joint', target: 'articular capsule of elbow', synonyms: [], description: 'The fibrous sleeve enclosing the elbow joint.' },
  { name: 'Annular Ligament of Radius', target: 'annular ligament of radius', synonyms: [],      description: 'A ring of fibrous tissue that holds the head of the radius against the ulna.' },
  { name: 'Ulnar Collateral Ligament',  target: 'ulnar collateral ligament',  synonyms: ['ucl'], description: 'Stabilises the medial side of the elbow joint.' },
  { name: 'Radial Collateral Ligament', target: 'radial collateral ligament', synonyms: [],      description: 'Stabilises the lateral side of the elbow joint.' },
  { name: 'Interosseous Membrane of Forearm', target: 'interosseous membrane of forearm', synonyms: [], description: 'A fibrous sheet connecting the radius and ulna along their length.' },
  { name: 'Articular Capsule of Radiocarpal Joint', target: 'articular capsule of radiocarpal', synonyms: [], description: 'The fibrous sleeve enclosing the wrist joint.' },
]

const UPPER_LIMB_VASCULAR = [
  { name: 'Axillary Artery',       target: 'axillary artery',       synonyms: [],  description: 'The artery of the armpit, continuing as the brachial artery into the arm.' },
  { name: 'Brachial Artery',       target: 'brachial artery',       synonyms: [],  description: 'The main artery of the upper arm, used to measure blood pressure.' },
  { name: 'Radial Artery',         target: 'radial artery',         synonyms: [],  description: 'A forearm artery on the thumb side — where you feel your pulse at the wrist.' },
  { name: 'Ulnar Artery',          target: 'ulnar artery',          synonyms: [],  description: 'A forearm artery on the little-finger side.' },
  { name: 'Deep Brachial Artery',  target: 'deep brachial artery',  synonyms: [],  description: 'The main branch of the brachial artery supplying the posterior arm.' },
  { name: 'Cephalic Vein',         target: 'cephalic vein',         synonyms: [],  description: 'A superficial vein running up the lateral arm and forearm.' },
  { name: 'Basilic Vein',          target: 'basilic vein',          synonyms: [],  description: 'A superficial vein running up the medial forearm and arm.' },
  { name: 'Deep Palmar Arch',      target: 'deep palmar arch',      synonyms: [],  description: 'An arterial arch in the palm formed mainly by the radial artery.' },
  { name: 'Superficial Palmar Arch', target: 'superficial palmar arch', synonyms: [], description: 'An arterial arch in the palm formed mainly by the ulnar artery.' },
]

// ─────────────────────────────────────────────────────────────────────────────
// LOWER LIMB
// ─────────────────────────────────────────────────────────────────────────────

const LOWER_LIMB_SKELETON = [
  { name: 'Femur',          target: 'femur',     synonyms: ['thigh bone', 'thighbone'], description: 'The longest bone in the body, forming the thigh.' },
  { name: 'Patella',        target: 'patella',   synonyms: ['kneecap'],                 description: 'The kneecap, protecting the front of the knee joint.' },
  { name: 'Tibia',          target: 'tibia',     synonyms: ['shin bone', 'shinbone'],   description: 'The larger, weight-bearing bone of the lower leg.' },
  { name: 'Fibula',         target: 'fibula',    synonyms: [],                          description: 'The thin bone running alongside the tibia in the lower leg.' },
  { name: 'Calcaneus',      target: 'calcaneus', synonyms: ['heel bone'],               description: 'The heel bone — the largest bone of the foot.' },
  { name: 'Talus',          target: 'talus',     synonyms: [],                          description: 'The ankle bone, sitting between the leg bones and the heel.' },
  { name: 'Navicular Bone', target: 'navicular', synonyms: [],                          description: 'A boat-shaped bone on the inner side of the foot.' },
  { name: 'Cuboid Bone',    target: 'cuboid',    synonyms: [],                          description: 'A cube-shaped bone on the outer side of the foot.' },
]

const LOWER_LIMB_MUSCLES = [
  { name: 'Rectus Femoris',    target: 'rectus femoris',    synonyms: [],                  description: 'Part of the quadriceps group, extending the knee and flexing the hip.' },
  { name: 'Vastus Lateralis',  target: 'vastus lateralis',  synonyms: [],                  description: 'The outer head of the quadriceps, extending the knee.' },
  { name: 'Vastus Medialis',   target: 'vastus medialis',   synonyms: [],                  description: 'The inner head of the quadriceps; the teardrop-shaped muscle above the kneecap.' },
  { name: 'Biceps Femoris',    target: 'biceps femoris',    synonyms: ['hamstrings'],       description: 'Part of the hamstring group at the back of the thigh.' },
  { name: 'Semitendinosus',    target: 'semitendinosus',    synonyms: [],                  description: 'A hamstring muscle that flexes the knee and extends the hip.' },
  { name: 'Gastrocnemius',     target: 'gastrocnemius',     synonyms: ['calf muscle'],     description: 'The large calf muscle that plantar-flexes the foot and flexes the knee.' },
  { name: 'Soleus',            target: 'soleus',            synonyms: [],                  description: 'A deep calf muscle beneath the gastrocnemius that plantar-flexes the foot.' },
  { name: 'Tibialis Anterior', target: 'tibialis anterior', synonyms: [],                  description: 'The shin muscle that dorsiflexes and inverts the foot.' },
  { name: 'Fibularis Longus',  target: 'fibularis longus',  synonyms: ['peroneus longus'], description: 'Runs down the outer lower leg to plantar-flex and evert the foot.' },
  { name: 'Gracilis',          target: 'gracilis',          synonyms: [],                  description: 'A slender inner thigh muscle that adducts the thigh and flexes the knee.' },
]

const LOWER_LIMB_JOINTS = [
  { name: 'Anterior Cruciate Ligament',   target: 'anterior cruciate ligament',   synonyms: ['acl'], description: 'A key stabilising ligament inside the knee preventing forward sliding of the tibia.' },
  { name: 'Posterior Cruciate Ligament',  target: 'posterior cruciate ligament',  synonyms: ['pcl'], description: 'The stronger cruciate ligament, preventing backward displacement of the tibia.' },
  { name: 'Medial Meniscus',              target: 'medial meniscus',              synonyms: [],      description: 'A C-shaped cartilage pad on the inner side of the knee joint.' },
  { name: 'Lateral Meniscus',             target: 'lateral meniscus',             synonyms: [],      description: 'A near-circular cartilage pad on the outer side of the knee joint.' },
  { name: 'Articular Capsule of Knee Joint', target: 'articular capsule of knee', synonyms: [],      description: 'The fibrous sleeve enclosing the knee joint.' },
  { name: 'Fibular Collateral Ligament',  target: 'fibular collateral ligament',  synonyms: ['lcl'], description: 'The lateral stabilising ligament of the knee.' },
  { name: 'Superficial Part of Tibial Collateral Ligament', target: 'superficial part of tibial collateral', synonyms: ['mcl'], description: 'The medial stabilising ligament of the knee.' },
  { name: 'Anterior Talofibular Ligament', target: 'anterior talofibular ligament', synonyms: [],    description: 'The most commonly sprained ligament — on the outer side of the ankle.' },
  { name: 'Calcaneofibular Ligament',     target: 'calcaneofibular ligament',     synonyms: [],      description: 'Connects the fibula to the calcaneus on the outer ankle.' },
  { name: 'Acetabular Labrum',            target: 'acetabular labrum',            synonyms: [],      description: 'A fibrocartilage ring that deepens the hip socket.' },
]

const LOWER_LIMB_VASCULAR = [
  { name: 'Femoral Artery',         target: 'femoral artery',         synonyms: [],  description: 'The main artery of the thigh, supplying blood to the lower limb.' },
  { name: 'Deep Femoral Artery',    target: 'deep femoral artery',    synonyms: [],  description: 'The largest branch of the femoral artery, supplying the thigh muscles.' },
  { name: 'Popliteal Artery',       target: 'popliteal artery',       synonyms: [],  description: 'The artery behind the knee, continuation of the femoral artery.' },
  { name: 'Anterior Tibial Artery', target: 'anterior tibial artery', synonyms: [],  description: 'Supplies the front of the lower leg and continues as the dorsalis pedis.' },
  { name: 'Posterior Tibial Artery', target: 'posterior tibial artery', synonyms: [], description: 'Supplies the posterior lower leg and divides into the plantar arteries.' },
  { name: 'Fibular Artery',         target: 'fibular artery',         synonyms: [],  description: 'Runs along the fibula supplying the lateral lower leg.' },
  { name: 'Great Saphenous Vein',   target: 'great saphenous vein',   synonyms: [],  description: 'The longest vein in the body, running up the inner leg.' },
  { name: 'Small Saphenous Vein',   target: 'small saphenous vein',   synonyms: [],  description: 'A superficial vein of the calf draining into the popliteal vein.' },
  { name: 'Dorsalis Pedis Artery',  target: 'dorsalis pedis artery',  synonyms: [],  description: 'Runs across the top of the foot — its pulse can be felt here.' },
]

// ─────────────────────────────────────────────────────────────────────────────
// PELVIS
// ─────────────────────────────────────────────────────────────────────────────

const PELVIS_SKELETON = [
  { name: 'Hip Bone', target: 'hip bone', synonyms: ['pelvic bone'], description: 'The large bone forming the side and front of the pelvis and the hip socket.' },
  { name: 'Sacrum',   target: 'sacrum',   synonyms: [],              description: 'The triangular bone wedged between the two hip bones at the back of the pelvis.' },
  { name: 'Coccyx',   target: 'coccyx',   synonyms: ['tailbone'],    description: 'The tailbone, at the very bottom of the pelvis.' },
]

const PELVIS_MUSCLES = [
  { name: 'Gluteus Maximus',    target: 'gluteus maximus',    synonyms: ['glutes'],  description: 'The largest gluteal muscle, responsible for hip extension and thigh rotation.' },
  { name: 'Gluteus Medius',     target: 'gluteus medius',     synonyms: [],          description: 'A hip muscle that abducts the thigh and stabilises the pelvis when walking.' },
  { name: 'Gluteus Minimus',    target: 'gluteus minimus',    synonyms: [],          description: 'The smallest gluteal muscle, assisting in abduction and medial rotation of the thigh.' },
  { name: 'Piriformis',         target: 'piriformis',         synonyms: [],          description: 'A deep hip rotator running from the sacrum to the femur.' },
  { name: 'Tensor Fasciae Latae', target: 'tensor fasciae latae', synonyms: ['tfl'], description: 'Tenses the iliotibial band and helps flex and abduct the hip.' },
  { name: 'Iliopsoas',          target: 'iliopsoas',          synonyms: [],          description: 'The primary hip flexor, formed by the iliacus and psoas major.' },
  { name: 'Obturator Internus', target: 'obturator internus', synonyms: [],          description: 'A deep hip muscle that laterally rotates the extended hip.' },
]

const PELVIS_JOINTS = [
  { name: 'Pubic Symphysis',              target: 'pubic symphysis',              synonyms: [],            description: 'The cartilaginous joint connecting the two pubic bones at the front of the pelvis.' },
  { name: 'Sacrotuberous Ligament',       target: 'sacrotuberous ligament',       synonyms: [],            description: 'Connects the sacrum to the ischial tuberosity, stabilising the pelvis.' },
  { name: 'Sacrospinous Ligament',        target: 'sacrospinous ligament',        synonyms: [],            description: 'Converts the greater sciatic notch into a foramen.' },
  { name: 'Anterior Sacro-iliac Ligament', target: 'anterior sacro-iliac ligament', synonyms: [],          description: 'Reinforces the front of the sacroiliac joint.' },
  { name: 'Iliolumbar Ligament',          target: 'iliolumbar ligament',          synonyms: [],            description: 'Anchors the fifth lumbar vertebra to the iliac crest.' },
  { name: 'Articular Capsule of Hip Joint', target: 'articular capsule of hip',  synonyms: ['hip capsule'], description: 'The fibrous sleeve enclosing the hip joint.' },
  { name: 'Acetabular Labrum',            target: 'acetabular labrum',            synonyms: [],            description: 'A fibrocartilage ring deepening the hip socket.' },
  { name: 'Obturator Membrane',           target: 'obturator membrane',           synonyms: [],            description: 'A fibrous sheet covering the obturator foramen of the hip bone.' },
]

const PELVIS_VASCULAR = [
  { name: 'Common Iliac Artery',    target: 'common iliac artery',    synonyms: [],  description: 'The aorta bifurcates into two common iliac arteries supplying the lower limbs and pelvis.' },
  { name: 'Internal Iliac Artery',  target: 'internal iliac artery',  synonyms: [],  description: 'Supplies the pelvic organs, gluteal region and perineum.' },
  { name: 'External Iliac Artery',  target: 'external iliac artery',  synonyms: [],  description: 'Continues as the femoral artery into the lower limb.' },
  { name: 'Superior Gluteal Artery', target: 'superior gluteal artery', synonyms: [], description: 'The largest branch of the internal iliac, supplying the gluteal muscles.' },
  { name: 'Obturator Artery',       target: 'obturator artery',       synonyms: [],  description: 'Passes through the obturator foramen to supply the medial thigh.' },
  { name: 'Internal Pudendal Artery', target: 'internal pudendal artery', synonyms: [], description: 'The main artery of the perineum, supplying the external genitalia.' },
  { name: 'Median Sacral Artery',   target: 'median sacral artery',   synonyms: [],  description: 'A small artery arising from the back of the aorta at its bifurcation.' },
]

// ─────────────────────────────────────────────────────────────────────────────
// WHOLE BODY (mixed, most recognisable structures per system)
// ─────────────────────────────────────────────────────────────────────────────

const WHOLE_BODY_SKELETON = [
  { name: 'Frontal Bone', target: 'frontal bone', synonyms: ['forehead bone'],    description: 'Forms the forehead and the upper part of the eye sockets.' },
  { name: 'Mandible',     target: 'mandible',     synonyms: ['lower jaw'],        description: 'The lower jaw — the only movable bone of the skull.' },
  { name: 'Clavicle',     target: 'clavicle',     synonyms: ['collarbone'],       description: 'The collarbone, connecting the arm to the trunk.' },
  { name: 'Scapula',      target: 'scapula',      synonyms: ['shoulder blade'],   description: 'The shoulder blade, a flat triangular bone of the upper back.' },
  { name: 'Humerus',      target: 'humerus',      synonyms: ['upper arm bone'],   description: 'The single bone of the upper arm, connecting the shoulder to the elbow.' },
  { name: 'Radius',       target: 'radius',       synonyms: [],                   description: 'The forearm bone on the thumb side of the arm.' },
  { name: 'Ulna',         target: 'ulna',         synonyms: [],                   description: 'The longer forearm bone, on the little-finger side.' },
  { name: 'Hip Bone',     target: 'hip bone',     synonyms: ['pelvic bone'],      description: 'A large bone of the pelvis that forms the socket of the hip joint.' },
  { name: 'Sacrum',       target: 'sacrum',       synonyms: [],                   description: 'A triangular bone at the base of the spine, between the hip bones.' },
  { name: 'Femur',        target: 'femur',        synonyms: ['thigh bone'],       description: 'The longest bone in the body, forming the thigh.' },
  { name: 'Patella',      target: 'patella',      synonyms: ['kneecap'],          description: 'The kneecap, protecting the front of the knee.' },
  { name: 'Tibia',        target: 'tibia',        synonyms: ['shin bone'],        description: 'The larger, weight-bearing bone of the lower leg.' },
  { name: 'Fibula',       target: 'fibula',       synonyms: [],                   description: 'The thin bone running alongside the tibia in the lower leg.' },
  { name: 'Calcaneus',    target: 'calcaneus',    synonyms: ['heel bone'],        description: 'The heel bone — the largest bone of the foot.' },
]

const WHOLE_BODY_MUSCLES = [
  { name: 'Temporalis',        target: 'temporalis',        synonyms: [],              description: 'A fan-shaped temple muscle that closes the jaw.' },
  { name: 'Sternocleidomastoid', target: 'sternocleidomastoid', synonyms: ['scm'],     description: 'A prominent neck muscle that rotates and flexes the head.' },
  { name: 'Trapezius',         target: 'trapezius',         synonyms: ['traps'],       description: 'A large diamond-shaped back muscle that moves the shoulder blade and neck.' },
  { name: 'Pectoralis Major',  target: 'pectoralis major',  synonyms: ['pecs'],        description: 'The large fan-shaped chest muscle that draws the arm across the body.' },
  { name: 'Deltoid',           target: 'deltoid',           synonyms: [],              description: 'The triangular shoulder muscle that raises the arm to the side.' },
  { name: 'Biceps Brachii',    target: 'biceps brachii',    synonyms: ['biceps'],      description: 'The two-headed muscle at the front of the upper arm.' },
  { name: 'Triceps Brachii',   target: 'triceps brachii',   synonyms: ['triceps'],     description: 'The three-headed muscle at the back of the upper arm.' },
  { name: 'Latissimus Dorsi',  target: 'latissimus dorsi',  synonyms: ['lats'],        description: 'The broad back muscle that pulls the arm downward and backward.' },
  { name: 'Rectus Abdominis',  target: 'rectus abdominis',  synonyms: ['abs'],         description: 'The "six-pack" muscle running vertically along the front of the abdomen.' },
  { name: 'Gluteus Maximus',   target: 'gluteus maximus',   synonyms: ['glutes'],      description: 'The largest gluteal muscle, responsible for hip extension.' },
  { name: 'Rectus Femoris',    target: 'rectus femoris',    synonyms: [],              description: 'Part of the quadriceps group, extending the knee and flexing the hip.' },
  { name: 'Biceps Femoris',    target: 'biceps femoris',    synonyms: ['hamstrings'],  description: 'Part of the hamstring group at the back of the thigh.' },
  { name: 'Gastrocnemius',     target: 'gastrocnemius',     synonyms: ['calf muscle'], description: 'The large calf muscle that plantar-flexes the foot.' },
  { name: 'Tibialis Anterior', target: 'tibialis anterior', synonyms: [],              description: 'The shin muscle that dorsiflexes the foot.' },
]

const WHOLE_BODY_JOINTS = [
  { name: 'Anterior Cruciate Ligament',  target: 'anterior cruciate ligament',  synonyms: ['acl'],       description: 'A key stabilising ligament inside the knee.' },
  { name: 'Medial Meniscus',             target: 'medial meniscus',             synonyms: [],            description: 'A C-shaped cartilage pad on the inner side of the knee.' },
  { name: 'Glenoid Labrum',              target: 'glenoid labrum',              synonyms: [],            description: 'A fibrocartilage ring that deepens the shoulder socket.' },
  { name: 'Acetabular Labrum',           target: 'acetabular labrum',           synonyms: [],            description: 'A fibrocartilage ring that deepens the hip socket.' },
  { name: 'Nuchal Ligament',             target: 'nuchal ligament',             synonyms: [],            description: 'A strong ligament running along the back of the neck.' },
  { name: 'Anterior Longitudinal Ligament', target: 'anterior longitudinal ligament', synonyms: ['all'], description: 'A broad band running down the front of the vertebral column.' },
  { name: 'Sacrotuberous Ligament',      target: 'sacrotuberous ligament',      synonyms: [],            description: 'Connects the sacrum to the ischial tuberosity, stabilising the pelvis.' },
  { name: 'Pubic Symphysis',             target: 'pubic symphysis',             synonyms: [],            description: 'The cartilaginous joint connecting the two pubic bones.' },
  { name: 'Anterior Talofibular Ligament', target: 'anterior talofibular ligament', synonyms: [],        description: 'The most commonly sprained ligament, on the outer ankle.' },
  { name: 'Coracohumeral Ligament',      target: 'coracohumeral ligament',      synonyms: [],            description: 'Reinforces the superior shoulder joint capsule.' },
]

const WHOLE_BODY_VASCULAR = [
  { name: 'Aortic Arch',           target: 'aortic arch',           synonyms: [],           description: 'The curved part of the aorta that gives off vessels to the head and arms.' },
  { name: 'Left Coronary Artery',  target: 'left coronary artery',  synonyms: ['coronary'], description: 'Supplies blood to the left side of the heart muscle.' },
  { name: 'Internal Carotid Artery', target: 'internal carotid artery', synonyms: [],       description: 'Supplies blood to the brain, eyes and forehead.' },
  { name: 'Basilar Artery',        target: 'basilar artery',        synonyms: [],           description: 'Formed by the vertebral arteries, supplying the brainstem.' },
  { name: 'Brachial Artery',       target: 'brachial artery',       synonyms: [],           description: 'The main artery of the upper arm, used to measure blood pressure.' },
  { name: 'Radial Artery',         target: 'radial artery',         synonyms: [],           description: 'Felt at the wrist — the most common site for taking a pulse.' },
  { name: 'Superior Mesenteric Artery', target: 'superior mesenteric artery', synonyms: ['sma'], description: 'Supplies blood to most of the small intestine and right colon.' },
  { name: 'Abdominal Aorta',       target: 'abdominal aorta',       synonyms: [],           description: 'The portion of the aorta running through the abdomen.' },
  { name: 'Femoral Artery',        target: 'femoral artery',        synonyms: [],           description: 'The main artery of the thigh, supplying blood to the lower limb.' },
  { name: 'Great Saphenous Vein',  target: 'great saphenous vein',  synonyms: [],           description: 'The longest vein in the body, running up the inner leg.' },
  { name: 'Popliteal Artery',      target: 'popliteal artery',      synonyms: [],           description: 'The artery behind the knee, continuation of the femoral artery.' },
  { name: 'Anterior Tibial Artery', target: 'anterior tibial artery', synonyms: [],         description: 'Supplies the front of the lower leg and becomes the dorsalis pedis.' },
]

// ─────────────────────────────────────────────────────────────────────────────
// REGIONS — each has a pool per layer + group for camera/filter focus
// ─────────────────────────────────────────────────────────────────────────────

export const QUIZ_REGIONS = {
  whole_body: {
    key: 'whole_body', label: 'Whole Body', group: 'All Bones', icon: '🦴',
    desc: 'The full body — all systems.',
    skeleton: WHOLE_BODY_SKELETON,
    muscles:  WHOLE_BODY_MUSCLES,
    joints:   WHOLE_BODY_JOINTS,
    vascular: WHOLE_BODY_VASCULAR,
  },
  skull: {
    key: 'skull', label: 'Skull', group: 'Skull', icon: '💀',
    desc: 'Head and face.',
    skeleton: SKULL_SKELETON,
    muscles:  SKULL_MUSCLES,
    joints:   SKULL_JOINTS,
    vascular: SKULL_VASCULAR,
  },
  spine: {
    key: 'spine', label: 'Spine', group: 'Spine', icon: '🧬',
    desc: 'The vertebral column, from neck to tailbone.',
    skeleton: SPINE_SKELETON,
    muscles:  SPINE_MUSCLES,
    joints:   SPINE_JOINTS,
    vascular: SPINE_VASCULAR,
  },
  thorax: {
    key: 'thorax', label: 'Thorax', group: 'Thorax', icon: '🫁',
    desc: 'The chest — breastbone, ribs and shoulder girdle.',
    skeleton: THORAX_SKELETON,
    muscles:  THORAX_MUSCLES,
    joints:   THORAX_JOINTS,
    vascular: THORAX_VASCULAR,
  },
  upper_limb: {
    key: 'upper_limb', label: 'Upper Limb', group: 'Upper Limb', icon: '💪',
    desc: 'Arm, forearm and the bones of the wrist.',
    skeleton: UPPER_LIMB_SKELETON,
    muscles:  UPPER_LIMB_MUSCLES,
    joints:   UPPER_LIMB_JOINTS,
    vascular: UPPER_LIMB_VASCULAR,
  },
  lower_limb: {
    key: 'lower_limb', label: 'Lower Limb', group: 'Lower Limb', icon: '🦵',
    desc: 'Thigh, lower leg and the foot.',
    skeleton: LOWER_LIMB_SKELETON,
    muscles:  LOWER_LIMB_MUSCLES,
    joints:   LOWER_LIMB_JOINTS,
    vascular: LOWER_LIMB_VASCULAR,
  },
  pelvis: {
    key: 'pelvis', label: 'Pelvis', group: 'Pelvis', icon: '🩻',
    desc: 'The hip bones, sacrum and coccyx.',
    skeleton: PELVIS_SKELETON,
    muscles:  PELVIS_MUSCLES,
    joints:   PELVIS_JOINTS,
    vascular: PELVIS_VASCULAR,
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const MAX_QUESTIONS = 10

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildOptions(bone, pool) {
  const distractors = shuffle(pool.filter(b => b.name !== bone.name)).slice(0, 3).map(b => b.name)
  return shuffle([bone.name, ...distractors])
}

// ─────────────────────────────────────────────────────────────────────────────
// Main question builder
// buildQuiz(regionKey, level, layer) — App.jsx calls buildQuiz(config.region, config.level, config.layer)
// ─────────────────────────────────────────────────────────────────────────────

export function buildQuiz(regionKey, level, layer = 'skeleton') {
  const region = QUIZ_REGIONS[regionKey]
  const pool = QUIZ_REGIONS[regionKey]?.[layer] || LAYER_POOLS[layer]

  if (!pool.length) return []

  const count = Math.min(MAX_QUESTIONS, pool.length)
  const bones = shuffle(pool).slice(0, count)

  return bones.map(bone => {
    const base = { target: bone.target, answer: bone.name, level }
    switch (level) {
      case 1:
        return { ...base, prompt: 'What structure is highlighted?', options: buildOptions(bone, pool) }
      case 2:
        return { ...base, prompt: `Click the ${bone.name.toUpperCase()} on the model.` }
      case 3:
        return { ...base, prompt: bone.description }
      case 4:
        return { ...base, prompt: 'Type the name of the highlighted structure.', synonyms: [bone.target, ...bone.synonyms] }
      default:
        return base
    }
  })
}