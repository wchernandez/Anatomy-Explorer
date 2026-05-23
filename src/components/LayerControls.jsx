import { useState } from 'react'
import { MUSCLE_GROUPS } from './MuscleModel.jsx'

const GROUPS = Object.keys(MUSCLE_GROUPS)

export default function LayerControls({
  showSkeleton, setShowSkeleton,
  showMuscles, setShowMuscles,
  activeGroup, setActiveGroup,
  filterMode, setFilterMode,
}) {
  const [panelOpen, setPanelOpen] = useState(true)

  return (
    <>
      {/* Layer toggle bar */}
      <div id="layer-bar">
        <div className="layer-label">Layers</div>
        <button
          className={`layer-btn ${showSkeleton ? 'active skeleton' : 'inactive'}`}
          onClick={() => setShowSkeleton(v => !v)}
        >
          <span className="layer-icon">🦴</span>
          Skeleton
        </button>
        <button
          className={`layer-btn ${showMuscles ? 'active muscles' : 'inactive'}`}
          onClick={() => setShowMuscles(v => !v)}
        >
          <span className="layer-icon">💪</span>
          Muscles
        </button>
      </div>

      {/* Muscle group panel — only shown when muscles are visible */}
      {showMuscles && (
        <div id="muscle-panel" className="panel">
          <div className="panel-label">
            <button
              className="panel-collapse-btn"
              onClick={() => setPanelOpen(v => !v)}
              title={panelOpen ? 'Collapse' : 'Expand'}
            >
              {panelOpen ? '▾' : '▸'}
            </button>
            Muscle Groups
          </div>

          {panelOpen && (
            <>
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
                {GROUPS.map(group => (
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
        </div>
      )}
    </>
  )
}
