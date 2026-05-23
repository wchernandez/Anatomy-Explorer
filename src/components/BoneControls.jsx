import { useState } from 'react'
import { BONE_GROUPS } from './SkeletonModel.jsx'
import { MUSCLE_GROUPS } from './MuscleModel.jsx'

const BONE_GROUPS_LIST = Object.keys(BONE_GROUPS)
const MUSCLE_GROUPS_LIST = Object.keys(MUSCLE_GROUPS)

export default function BoneControls({
  showSkeleton,
  showMuscles,
  activeBoneGroup, setActiveBoneGroup,
  boneFadeMode, setBoneFadeMode,
  activeGroup, setActiveGroup,
  filterMode, setFilterMode,
}) {
  const [panelOpen, setPanelOpen] = useState(true)

  if (!showSkeleton && !showMuscles) return null

  return (
    <div id="bone-panel" className="panel">
      <div className="panel-label">
        <button
          className="panel-collapse-btn"
          onClick={() => setPanelOpen(v => !v)}
          title={panelOpen ? 'Collapse' : 'Expand'}
        >
          {panelOpen ? '▾' : '▸'}
        </button>
        Structure Groups
      </div>

      {panelOpen && (
        <>
          {showSkeleton && (
            <>
              <div className="subsection-label">Bone Groups</div>
              <div className="filter-mode-row">
                <span className="filter-label">Inactive:</span>
                <button
                  className={`filter-toggle ${boneFadeMode === 'fade' ? 'selected' : ''}`}
                  onClick={() => setBoneFadeMode('fade')}
                >Fade</button>
                <button
                  className={`filter-toggle ${boneFadeMode === 'hide' ? 'selected' : ''}`}
                  onClick={() => setBoneFadeMode('hide')}
                >Hide</button>
              </div>
              <div className="divider" />
              <div className="group-list">
                {BONE_GROUPS_LIST.map(group => (
                  <button
                    key={group}
                    className={`group-btn ${activeBoneGroup === group ? 'selected' : ''}`}
                    onClick={() => setActiveBoneGroup(group)}
                  >
                    <span className={`group-dot ${activeBoneGroup === group ? 'active' : ''}`} />
                    {group}
                  </button>
                ))}
              </div>
            </>
          )}

          {showMuscles && (
            <>
              <div className="subsection-label">Muscle Groups</div>
              <div className="filter-mode-row">
                <span className="filter-label">Inactive:</span>
                <button
                  className={`filter-toggle ${filterMode === 'fade' ? 'selected' : ''}`}
                  onClick={() => setFilterMode('fade')}
                >Fade</button>
                <button
                  className={`filter-toggle ${filterMode === 'hide' ? 'selected' : ''}`}
                  onClick={() => setFilterMode('hide')}
                >Hide</button>
              </div>
              <div className="divider" />
              <div className="group-list">
                {MUSCLE_GROUPS_LIST.map(group => (
                  <button
                    key={group}
                    className={`group-btn ${activeGroup === group ? 'selected' : ''}`}
                    onClick={() => setActiveGroup(group)}
                  >
                    <span className={`group-dot ${activeGroup === group ? 'active' : ''}`} />
                    {group}
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
