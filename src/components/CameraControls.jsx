import { useState } from 'react'

// Preset camera angles with positions and target focuses
const CAMERA_PRESETS = {
  front: {
    label: 'Front',
    icon: '⊙',
    position: [0, 1.6, 4],
    target: [0, 1.6, 0],
  },
  back: {
    label: 'Back',
    icon: '⊕',
    position: [0, 1.6, -4],
    target: [0, 1.6, 0],
  },
  left: {
    label: 'Left',
    icon: '◄',
    position: [-4, 1.6, 0],
    target: [0, 1.6, 0],
  },
  right: {
    label: 'Right',
    icon: '►',
    position: [4, 1.6, 0],
    target: [0, 1.6, 0],
  },
  top: {
    label: 'Top',
    icon: '▲',
    position: [0, 5, 0.5],
    target: [0, 1.6, 0],
  },
  bottom: {
    label: 'Bottom',
    icon: '▼',
    position: [0, -2, 0.5],
    target: [0, 1.6, 0],
  },
  isometric: {
    label: 'Isometric',
    icon: '◆',
    position: [3, 3, 3],
    target: [0, 1.6, 0],
  },
}

export default function CameraControls({ onAngleSelect }) {
  const [panelOpen, setPanelOpen] = useState(true)

  const handleAngleClick = (angleKey) => {
    onAngleSelect(angleKey)
  }

  return (
    <div id="camera-panel" className="panel">
      <div className="panel-label">
        <button
          className="panel-collapse-btn"
          onClick={() => setPanelOpen(v => !v)}
          title={panelOpen ? 'Collapse' : 'Expand'}
        >
          {panelOpen ? '▾' : '▸'}
        </button>
        Camera Angles
      </div>

      {panelOpen && (
        <div className="camera-grid">
          {Object.entries(CAMERA_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              className="camera-btn"
              onClick={() => handleAngleClick(key)}
              title={preset.label}
            >
              <span className="camera-icon">{preset.icon}</span>
              <span className="camera-label">{preset.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export { CAMERA_PRESETS }
