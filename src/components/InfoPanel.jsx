function formatName(raw) {
  if (!raw) return 'Unknown Structure'
  return raw
    .replace(/\.g$/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim()
}

export default function InfoPanel({ selectedBone }) {
  return (
    <div id="info-panel" className={`panel ${selectedBone ? '' : 'empty'}`}>
      <div className="panel-label">Selected Structure</div>
      <div className="bone-name">
        {selectedBone ? formatName(selectedBone.name || selectedBone.parent?.name) : '—'}
      </div>
      <div className="divider" />
      <div className="bone-detail">
        {selectedBone
          ? `Part of the human skeletal system.\nMesh: ${selectedBone.name || 'unnamed'}`
          : 'Hover or click a bone to inspect it.'}
      </div>
    </div>
  )
}
