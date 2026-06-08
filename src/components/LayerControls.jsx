import { useState, useEffect } from 'react'
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
    faded,              toggleFade,
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
        layerFaded={faded.skeleton}
        onToggleLayerFade={toggleFade.skeleton}
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
        layerFaded={faded.muscles}
        onToggleLayerFade={toggleFade.muscles}
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
        layerFaded={faded.joints}
        onToggleLayerFade={toggleFade.joints}
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
        layerFaded={faded.vascular}
        onToggleLayerFade={toggleFade.vascular}
      />
    )
  }
  return null
}

function GroupPanel({ groups, active, setActive, fadeMode, setFadeMode, accentClass, layerFaded, onToggleLayerFade }) {
  return (
    <>
      <div className="filter-mode-row">
        <span className="filter-label">Whole layer:</span>
        <button
          className={`filter-toggle ${accentClass}-toggle ${layerFaded ? 'selected' : ''}`}
          onClick={onToggleLayerFade}
        >Fade</button>
      </div>
      <div className="divider" />
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
  // whole-layer fade
  skeletonFaded,    setSkeletonFaded,
  musclesFaded,     setMusclesFaded,
  jointsFaded,      setJointsFaded,
  vascularFaded,    setVascularFaded,
  // filters menu (top bar)
  showFiltersPanel,
  setShowFiltersPanel,
  // mutual exclusion with other panels
  showDemoPanel,
  showCameraPanel,
  onFiltersOpened,
}) {
  // Which layer's filter detail is open; null = strip only (step 1)
  const [openPanel, setOpenPanel] = useState(null)

  // Close layer detail when filters menu or other panels close
  useEffect(() => {
    if (!showFiltersPanel || showDemoPanel || showCameraPanel) {
      setOpenPanel(null)
    }
  }, [showFiltersPanel, showDemoPanel, showCameraPanel])

  const visibility = {
    skeleton: showSkeleton,
    muscles:  showMuscles,
    joints:   showJoints,
    vascular: showVascular,
  }

  const faded = {
    skeleton: skeletonFaded,
    muscles:  musclesFaded,
    joints:   jointsFaded,
    vascular: vascularFaded,
  }

  const toggleFade = {
    skeleton: () => setSkeletonFaded(v => !v),
    muscles:  () => setMusclesFaded(v => !v),
    joints:   () => setJointsFaded(v => !v),
    vascular: () => setVascularFaded(v => !v),
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
    faded,              toggleFade,
  }

  // Active layers in order — determines which circles appear
  const activeLayers = LAYERS.filter(l => visibility[l.key])

  function handleLayerChipClick(key) {
    if (openPanel !== key) {
      onFiltersOpened()
    }
    setOpenPanel(prev => prev === key ? null : key)
  }

  const openLayer = LAYERS.find(l => l.key === openPanel)

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

      {/* ── Top filters menu (step 1: layer strip, step 2: filter detail) ── */}
      {showFiltersPanel && (
        <div id="filters-menu">
          <div id="filters-strip">
            <span className="filters-strip-label">Active Layers</span>
            {activeLayers.length === 0 ? (
              <span className="filters-strip-empty">Turn on layers below to filter them</span>
            ) : (
              <div className="filters-strip-chips">
                {activeLayers.map(layer => {
                  const isOpen = openPanel === layer.key
                  return (
                    <button
                      key={layer.key}
                      className={`filter-layer-chip ${layer.key} ${isOpen ? 'open' : ''}`}
                      onClick={() => handleLayerChipClick(layer.key)}
                      title={`${layer.label} filters`}
                      aria-expanded={isOpen}
                    >
                      <span className="filter-layer-icon">{layer.icon}</span>
                      {layer.label}
                    </button>
                  )
                })}
              </div>
            )}
            <button
              className="filters-strip-close"
              onClick={() => setShowFiltersPanel(false)}
              aria-label="Close filters"
            >✕</button>
          </div>

          {openLayer && (
            <div
              id="filter-detail-panel"
              style={{
                '--layer-color': openLayer.color,
                '--layer-shadow': openLayer.shadow,
                '--layer-border': openLayer.border,
                '--layer-bg': openLayer.bg,
              }}
            >
              <div className="filter-detail-header">
                <span className="filter-detail-title">{openLayer.label} Filters</span>
                <button
                  className="filter-detail-close"
                  onClick={() => setOpenPanel(null)}
                  aria-label="Close layer filters"
                >✕</button>
              </div>
              <div className="filter-detail-body">
                <PanelContent layerKey={openLayer.key} state={panelState} />
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}