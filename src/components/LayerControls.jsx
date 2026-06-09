import { useState, useEffect } from 'react'
import { Bone, Barbell, LinkSimple, Drop } from '@phosphor-icons/react'
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
  { key: 'skeleton', icon: Bone,       label: 'Skeleton', accent: 'bone',     color: '#c9b78f', shadow: 'rgba(201,183,143,0.4)', border: 'rgba(201,183,143,0.5)', bg: 'rgba(201,183,143,0.1)' },
  { key: 'muscles',  icon: Barbell,    label: 'Muscles',  accent: 'muscle',   color: '#cf8a86', shadow: 'rgba(207,138,134,0.4)', border: 'rgba(207,138,134,0.5)', bg: 'rgba(207,138,134,0.1)' },
  { key: 'joints',   icon: LinkSimple, label: 'Joints',   accent: 'joint',    color: '#7bbcc4', shadow: 'rgba(123,188,196,0.4)', border: 'rgba(123,188,196,0.5)', bg: 'rgba(123,188,196,0.1)' },
  { key: 'vascular', icon: Drop,       label: 'Vascular', accent: 'vascular', color: '#8d9fd6', shadow: 'rgba(141,159,214,0.4)', border: 'rgba(141,159,214,0.5)', bg: 'rgba(141,159,214,0.1)' },
]

const GROUP_KEYS = {
  skeleton: BONE_GROUP_KEYS,
  muscles:  MUSCLE_GROUP_KEYS,
  joints:   JOINT_GROUP_KEYS,
  vascular: VASCULAR_GROUP_KEYS,
}

// Whole-layer Show / Fade / Hide — label on top, buttons stacked underneath.
function LayerModeBlock({ accent, mode, onSet }) {
  return (
    <div className="layer-mode-block">
      <span className="filter-label">Whole layer</span>
      <div className="layer-mode-row">
        {['show', 'fade', 'hide'].map(m => (
          <button
            key={m}
            className={`filter-toggle ${accent}-toggle ${mode === m ? 'selected' : ''}`}
            onClick={() => onSet(m)}
          >
            {m[0].toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>
    </div>
  )
}

// Group selector + inactive-group fade/hide + (skeleton) isolate.
function GroupPanel({ groups, active, setActive, fadeMode, setFadeMode, accentClass, isolate }) {
  return (
    <>
      {!isolate?.active && (
        <>
          <div className="filter-mode-block">
            <span className="filter-label">Inactive groups</span>
            <div className="layer-mode-row">
              <button
                className={`filter-toggle ${accentClass}-toggle ${fadeMode === 'fade' ? 'selected' : ''}`}
                onClick={() => setFadeMode('fade')}
              >Fade</button>
              <button
                className={`filter-toggle ${accentClass}-toggle ${fadeMode === 'hide' ? 'selected' : ''}`}
                onClick={() => setFadeMode('hide')}
              >Hide</button>
            </div>
          </div>
          <div className="divider" />
        </>
      )}

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

      {isolate && (
        <button
          className={`dock-isolate-btn${isolate.active ? ' active' : ''}`}
          onClick={isolate.onToggle}
          disabled={!isolate.active && !isolate.enabled}
          title={!isolate.active && !isolate.enabled ? 'Pick a region above to isolate' : undefined}
        >
          {isolate.active ? 'Exit Isolation' : 'Isolate Region'}
        </button>
      )}
    </>
  )
}

function panelPropsFor(key, state) {
  switch (key) {
    case 'skeleton': return { groups: GROUP_KEYS.skeleton, active: state.activeBoneGroup,     setActive: state.setActiveBoneGroup,     fadeMode: state.boneFadeMode,     setFadeMode: state.setBoneFadeMode,     accentClass: 'bone',     isolate: { active: state.isolated, enabled: state.isolateEnabled, onToggle: state.onToggleIsolate } }
    case 'muscles':  return { groups: GROUP_KEYS.muscles,  active: state.activeGroup,         setActive: state.setActiveGroup,         fadeMode: state.filterMode,       setFadeMode: state.setFilterMode,       accentClass: 'muscle' }
    case 'joints':   return { groups: GROUP_KEYS.joints,   active: state.activeJointGroup,    setActive: state.setActiveJointGroup,    fadeMode: state.jointFilterMode,  setFadeMode: state.setJointFilterMode,  accentClass: 'joint' }
    case 'vascular': return { groups: GROUP_KEYS.vascular, active: state.activeVascularGroup, setActive: state.setActiveVascularGroup, fadeMode: state.vascularFilterMode, setFadeMode: state.setVascularFilterMode, accentClass: 'vascular' }
    default: return null
  }
}

export default function LayerControls({
  showSkeleton,     setShowSkeleton,
  showMuscles,      setShowMuscles,
  showJoints,       setShowJoints,
  showVascular,     setShowVascular,
  activeGroup,      setActiveGroup,
  filterMode,       setFilterMode,
  activeJointGroup,   setActiveJointGroup,
  jointFilterMode,    setJointFilterMode,
  activeVascularGroup, setActiveVascularGroup,
  vascularFilterMode,  setVascularFilterMode,
  activeBoneGroup,  setActiveBoneGroup,
  boneFadeMode,     setBoneFadeMode,
  isolated,         onToggleIsolate,
  isolateEnabled,
  skeletonFaded,    setSkeletonFaded,
  musclesFaded,     setMusclesFaded,
  jointsFaded,      setJointsFaded,
  vascularFaded,    setVascularFaded,
  onOpen,           // notify parent when a panel opens (for mutual-exclusivity)
  closeToken = 0,   // bump from parent → close any open layer panel
}) {
  const [openPanel, setOpenPanel] = useState(null)

  // Parent opened another floating panel (Demographics/Camera) → close ours.
  useEffect(() => { setOpenPanel(null) }, [closeToken])

  const show  = { skeleton: showSkeleton,  muscles: showMuscles,  joints: showJoints,  vascular: showVascular }
  const setShow = { skeleton: setShowSkeleton, muscles: setShowMuscles, joints: setShowJoints, vascular: setShowVascular }
  const faded = { skeleton: skeletonFaded, muscles: musclesFaded, joints: jointsFaded, vascular: vascularFaded }
  const setFaded = { skeleton: setSkeletonFaded, muscles: setMusclesFaded, joints: setJointsFaded, vascular: setVascularFaded }

  // Derive the 3-state mode and apply one.
  const modeOf = key => (!show[key] ? 'hide' : faded[key] ? 'fade' : 'show')
  const setMode = (key, mode) => {
    if (mode === 'show')      { setShow[key](true);  setFaded[key](false) }
    else if (mode === 'fade') { setShow[key](true);  setFaded[key](true)  }
    else                      { setShow[key](false) }
  }

  const panelState = {
    activeGroup, setActiveGroup, filterMode, setFilterMode,
    activeJointGroup, setActiveJointGroup, jointFilterMode, setJointFilterMode,
    activeVascularGroup, setActiveVascularGroup, vascularFilterMode, setVascularFilterMode,
    activeBoneGroup, setActiveBoneGroup, boneFadeMode, setBoneFadeMode,
    isolated, onToggleIsolate, isolateEnabled,
  }

  function handleCircleClick(key) {
    setOpenPanel(prev => {
      const next = prev === key ? null : key
      if (next) onOpen?.()   // opening a layer panel → close other floating panels
      return next
    })
  }

  return (
    <div id="layer-dock">
      <div className="dock-header-label">Layers</div>
      {LAYERS.map(layer => {
        const isOpen = openPanel === layer.key
        const mode   = modeOf(layer.key)
        const gp     = panelPropsFor(layer.key, panelState)
        return (
          <div
            key={layer.key}
            className="dock-row"
            style={{ '--layer-color': layer.color, '--layer-shadow': layer.shadow, '--layer-border': layer.border, '--layer-bg': layer.bg }}
          >
            <button
              className={`dock-circle mode-${mode} ${isOpen ? 'open' : ''}`}
              onClick={() => handleCircleClick(layer.key)}
              title={`${layer.label} — ${mode}`}
              aria-expanded={isOpen}
            >
              <layer.icon className="dock-icon" size={22} weight="regular" />
            </button>

            <div className={`dock-panel ${isOpen ? 'visible' : ''}`}>
              <div className="dock-panel-header">
                <span className="dock-panel-title">{layer.label}</span>
                <button className="dock-panel-close" onClick={() => setOpenPanel(null)} aria-label="Close">✕</button>
              </div>
              <div className="dock-panel-body">
                <LayerModeBlock accent={layer.accent} mode={mode} onSet={m => setMode(layer.key, m)} />
                {/* Group filters only matter while the layer is visible */}
                {mode !== 'hide' && (
                  <>
                    <div className="divider" />
                    <GroupPanel {...gp} />
                  </>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
