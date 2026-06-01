import { useState } from 'react'
import { MUSCLE_GROUPS }   from './MuscleModel.jsx'
import { JOINT_GROUPS }    from './JointModel.jsx'
import { VASCULAR_GROUPS } from './VascularModel.jsx'
import { BONE_GROUPS }     from './SkeletonModel.jsx'

const MUSCLE_GROUP_KEYS   = Object.keys(MUSCLE_GROUPS)
const JOINT_GROUP_KEYS    = Object.keys(JOINT_GROUPS)
const VASCULAR_GROUP_KEYS = Object.keys(VASCULAR_GROUPS)
const BONE_GROUP_KEYS     = Object.keys(BONE_GROUPS)

// Layer definitions — order determines vertical stack position
const LAYERS = [
  {
    key:      'skeleton',
    icon:     '🦴',
    label:    'Skeleton',
    color:    '#00ff88',
    shadow:   'rgba(0,255,136,0.45)',
    border:   'rgba(0,255,136,0.55)',
    bg:       'rgba(0,255,136,0.12)',
  },
  {
    key:      'muscles',
    icon:     '💪',
    label:    'Muscles',
    color:    '#ff6b6b',
    shadow:   'rgba(255,80,80,0.45)',
    border:   'rgba(255,80,80,0.55)',
    bg:       'rgba(255,60,60,0.12)',
  },
  {
    key:      'joints',
    icon:     '🔗',
    label:    'Joints',
    color:    '#4dd8e8',
    shadow:   'rgba(40,190,210,0.45)',
    border:   'rgba(60,200,220,0.55)',
    bg:       'rgba(0,180,200,0.12)',
  },
  {
    key:      'vascular',
    icon:     '🩸',
    label:    'Vascular',
    color:    '#7aa8ff',
    shadow:   'rgba(20,50,200,0.5)',
    border:   'rgba(40,80,200,0.65)',
    bg:       'rgba(10,30,120,0.45)',
  },
]

// Fade/Hide only — no group selector
function FadePanel({ fadeMode, setFadeMode, accentClass }) {
  return (
    <div className="filter-mode-row">
      <span className="filter-label">Inactive:</span>
      <button
        className={`filter-toggle ${accentClass}-toggle ${fadeMode === 'fade' ? 'selected' : ''}`}
        onClick={() => setFadeMode('fade')}
      >Fade</button>
      <button
        className={`filter-toggle ${accentClass}-toggle ${fadeMode === 'hide' ? 'selected' : ''}`}
        onClick={() => setFadeMode('hide')}
      >Hide</button>
    </div>
  )
}

// Panel content for each layer
function PanelContent({ layerKey, state }) {
  const {
    activeGroup,        setActiveGroup,        filterMode,        setFilterMode,
    activeJointGroup,   setActiveJointGroup,   jointFilterMode,   setJointFilterMode,
    activeVascularGroup,setActiveVascularGroup, vascularFilterMode,setVascularFilterMode,
    activeBoneGroup,    setActiveBoneGroup,    boneFadeMode,      setBoneFadeMode,
  } = state

  if (layerKey === 'skeleton') {
    return (
      <GroupPanel
        groups={BONE_GROUP_KEYS}
        active={activeBoneGroup}
        setActive={setActiveBoneGroup}
        fadeMode={boneFadeMode}
        setFadeMode={setBoneFadeMode}
        accentClass="bone"
      />
    )
  }
  if (layerKey === 'muscles') {
    return (
      <GroupPanel
        groups={MUSCLE_GROUP_KEYS}
        active={activeGroup}
        setActive={setActiveGroup}
        fadeMode={filterMode}
        setFadeMode={setFilterMode}
        accentClass="muscle"
      />
    )
  }
  if (layerKey === 'joints') {
    return (
      <GroupPanel
        groups={JOINT_GROUP_KEYS}
        active={activeJointGroup}
        setActive={setActiveJointGroup}
        fadeMode={jointFilterMode}
        setFadeMode={setJointFilterMode}
        accentClass="joint"
      />
    )
  }
  if (layerKey === 'vascular') {
    return (
      <GroupPanel
        groups={VASCULAR_GROUP_KEYS}
        active={activeVascularGroup}
        setActive={setActiveVascularGroup}
        fadeMode={vascularFilterMode}
        setFadeMode={setVascularFilterMode}
        accentClass="vascular"
      />
    )
  }
  return null
}

function GroupPanel({ groups, active, setActive, fadeMode, setFadeMode, accentClass }) {
  return (
    <>
      <div className="filter-mode-row">
        <span className="filter-label">Inactive:</span>
        <button
          className={`filter-toggle ${accentClass}-toggle ${fadeMode === 'fade' ? 'selected' : ''}`}
          onClick={() => setFadeMode('fade')}
        >Fade</button>
        <button
          className={`filter-toggle ${accentClass}-toggle ${fadeMode === 'hide' ? 'selected' : ''}`}
          onClick={() => setFadeMode('hide')}
        >Hide</button>
      </div>
      <div className="divider" />
      <div className="group-list">
        {groups.map(group => (
          <button
            key={group}
            className={`group-btn ${accentClass}-group-btn ${active === group ? 'selected' : ''}`}
            onClick={() => setActive(group)}
          >
            <span className={`group-dot ${active === group ? `active ${accentClass}-dot` : ''}`} />
            {group}
          </button>
        ))}
      </div>
    </>
  )
}

export default function LayerControls({
  showSkeleton,     setShowSkeleton,
  showMuscles,      setShowMuscles,
  showJoints,       setShowJoints,
  showVascular,     setShowVascular,
  // muscle
  activeGroup,      setActiveGroup,
  filterMode,       setFilterMode,
  // joint
  activeJointGroup,   setActiveJointGroup,
  jointFilterMode,    setJointFilterMode,
  // vascular
  activeVascularGroup, setActiveVascularGroup,
  vascularFilterMode,  setVascularFilterMode,
  // bone (from BoneControls, now merged here)
  activeBoneGroup,  setActiveBoneGroup,
  boneFadeMode,     setBoneFadeMode,
}) {
  // Which panel is open; null = all closed
  const [openPanel, setOpenPanel] = useState(null)

  const visibility = {
    skeleton: showSkeleton,
    muscles:  showMuscles,
    joints:   showJoints,
    vascular: showVascular,
  }

  const toggleLayer = {
    skeleton: () => { setShowSkeleton(v => !v); if (openPanel === 'skeleton') setOpenPanel(null) },
    muscles:  () => { setShowMuscles(v => !v);  if (openPanel === 'muscles')  setOpenPanel(null) },
    joints:   () => { setShowJoints(v => !v);   if (openPanel === 'joints')   setOpenPanel(null) },
    vascular: () => { setShowVascular(v => !v); if (openPanel === 'vascular') setOpenPanel(null) },
  }

  const panelState = {
    activeGroup,        setActiveGroup,        filterMode,        setFilterMode,
    activeJointGroup,   setActiveJointGroup,   jointFilterMode,   setJointFilterMode,
    activeVascularGroup,setActiveVascularGroup,vascularFilterMode,setVascularFilterMode,
    activeBoneGroup,    setActiveBoneGroup,    boneFadeMode,      setBoneFadeMode,
  }

  // Active layers in order — determines which circles appear
  const activeLayers = LAYERS.filter(l => visibility[l.key])

  function handleCircleClick(key) {
    setOpenPanel(prev => prev === key ? null : key)
  }

  return (
    <>
      {/* ── Bottom layer toggle bar ──────────────────────────────────────── */}
      <div id="layer-bar">
        <div className="layer-label">Layers</div>
        {LAYERS.map(layer => (
          <button
            key={layer.key}
            className={`layer-btn ${visibility[layer.key] ? `active ${layer.key}` : 'inactive'}`}
            onClick={toggleLayer[layer.key]}
          >
            <span className="layer-icon">{layer.icon}</span>
            {layer.label}
          </button>
        ))}
      </div>

      {/* ── Left-side circle dock ────────────────────────────────────────── */}
      <div id="layer-dock">
        <div className="dock-header-label">Filters</div>
        {activeLayers.map((layer, i) => {
          const isOpen = openPanel === layer.key
          return (
            <div
              key={layer.key}
              className="dock-row"
              style={{ '--layer-color': layer.color, '--layer-shadow': layer.shadow, '--layer-border': layer.border, '--layer-bg': layer.bg }}
            >
              {/* Circle trigger */}
              <button
                className={`dock-circle ${isOpen ? 'open' : ''}`}
                onClick={() => handleCircleClick(layer.key)}
                title={`${layer.label} groups`}
                aria-expanded={isOpen}
              >
                <span className="dock-icon">{layer.icon}</span>
              </button>

              {/* Slide-out panel */}
              <div className={`dock-panel ${isOpen ? 'visible' : ''}`}>
                <div className="dock-panel-header">
                  <span className="dock-panel-title">{layer.label} Groups</span>
                  <button
                    className="dock-panel-close"
                    onClick={() => setOpenPanel(null)}
                    aria-label="Close"
                  >✕</button>
                </div>
                <div className="dock-panel-body">
                  <PanelContent layerKey={layer.key} state={panelState} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}