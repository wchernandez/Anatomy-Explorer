import { useState, useEffect } from 'react'

// Glob all txt files in the script directory lazily
const scriptFiles = import.meta.glob('/src/data/script/*.txt', { as: 'raw' })

// Create a lookup map once to map normalized names to file paths
const fileMap = Object.keys(scriptFiles).reduce((acc, path) => {
  const filename = path.split('/').pop().replace('.txt', '')
  const normalized = filename.toLowerCase().replace(/[^a-z0-9]/g, '')
  acc[normalized] = path
  return acc
}, {})

function normalize(name) {
  if (!name) return ''
  return name.toLowerCase()
    .replace(/\.g$/, '') // Remove .g extension if present
    .replace(/_[lr]$/i, '') // Remove left/right suffixes
    .replace(/[^a-z0-9]/g, '') // Remove non-alphanumeric
}

function formatName(raw) {
  if (!raw) return 'Unknown Structure'
  return raw
    .replace(/\.g$/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim()
}

export default function InfoPanel({ selectedBone }) {
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const boneName = selectedBone ? (selectedBone.name || selectedBone.parent?.name) : null

  useEffect(() => {
    async function loadDescription() {
      if (!boneName) {
        setDescription('')
        return
      }

      setLoading(true)
      const normName = normalize(boneName)
      const filePath = fileMap[normName]

      if (filePath) {
        try {
          const content = await scriptFiles[filePath]()
          setDescription(content)
        } catch (err) {
          console.error('Failed to load description:', err)
          setDescription('Error loading anatomical details.')
        }
      } else {
        // Try fallback for sub-parts (e.g. "Femur L" -> "Femur")
        const fallbackPath = Object.keys(fileMap).find(key => normName.includes(key) || key.includes(normName))
        if (fallbackPath) {
          try {
            const content = await scriptFiles[fileMap[fallbackPath]]()
            setDescription(content)
          } catch {
            setDescription('Part of the human skeletal system.')
          }
        } else {
          setDescription('Anatomical details not found in database.')
        }
      }
      setLoading(false)
    }

    loadDescription()
  }, [boneName])

  return (
    <div id="info-panel" className={`panel ${selectedBone ? '' : 'empty'}`}>
      <div className="panel-label">Selected Structure</div>
      <div className="bone-name">
        {selectedBone ? formatName(boneName) : '—'}
      </div>
      <div className="divider" />
      <div className="bone-detail">
        {loading ? (
          <span style={{ opacity: 0.5 }}>Retrieving data…</span>
        ) : selectedBone ? (
          <div className="description-box description-box--scroll">
            {description}
          </div>
        ) : (
          'Hover or click a bone to inspect it.'
        )}
      </div>
    </div>
  )
}
