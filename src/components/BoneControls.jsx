import { useState } from 'react'
import { BONE_GROUPS } from './SkeletonModel.jsx'

const GROUPS = Object.keys(BONE_GROUPS)

export default function BoneControls({
  showSkeleton,
  activeBoneGroup, setActiveBoneGroup,
  boneFadeMode, setBoneFadeMode,
}) {
  const [panelOpen, setPanelOpen] = useState(true)

  // Only show this panel when skeleton is visible
  if (!showSkeleton) return null

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
        Bone Groups
      </div>

      {panelOpen && (
        <>
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
            {GROUPS.map(group => (
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
    </div>
  )
}
