import { useState, useEffect, useRef } from 'react'

// Glob all txt files in the script directory lazily
const scriptFiles = import.meta.glob('/src/data/script/*.txt', { as: 'raw' })

// Normalised filename → file path lookup
const fileMap = Object.keys(scriptFiles).reduce((acc, path) => {
  const filename   = path.split('/').pop().replace('.txt', '')
  const normalized = filename.toLowerCase().replace(/[^a-z0-9]/g, '')
  acc[normalized]  = path
  return acc
}, {})

function normalize(name) {
  if (!name) return ''
  return name.toLowerCase()
    .replace(/\.g$/, '')
    .replace(/_[lr]$/i, '')
    .replace(/[^a-z0-9]/g, '')
}

function formatName(raw) {
  if (!raw) return 'Unknown Structure'
  let name = raw
    .replace(/\.g$/, '')
    .replace(/_/g, ' ')
    .replace(/\s+\d+$/, '')
  if (/ [lL]$/.test(name)) name = name.slice(0, -2).trim() + ' (L)'
  else if (/ [rR]$/.test(name)) name = name.slice(0, -2).trim() + ' (R)'
  return name.replace(/\b\w/g, c => c.toUpperCase()).trim()
}

// Extract only the intro summary (text before the first == heading) and source URL
function parseContent(raw) {
  if (!raw) return { intro: [], sourceUrl: '' }

  const lines = raw.split('\n')
  let sourceUrl   = ''
  const intro     = []
  let paragraphBuf = []
  let pastTitle    = false
  let hitSection   = false

  const flushParagraph = () => {
    const text = paragraphBuf.join(' ').trim()
    if (text && !hitSection) intro.push(text)
    paragraphBuf = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (line.startsWith('https://') || line.startsWith('http://')) {
      sourceUrl = line
      continue
    }

    // Stop collecting once a == section heading appears
    if (line.match(/^==\s+.+\s+==\s*$/)) {
      flushParagraph()
      hitSection = true
      continue
    }

    if (hitSection) continue

    // Skip the title line — identified by being ALL CAPS (strip parens/spaces to check)
    if (!pastTitle && line) {
      const stripped = line.replace(/[^a-zA-Z]/g, '')
      if (stripped.length > 0 && stripped === stripped.toUpperCase()) {
        pastTitle = true
        continue
      }
      pastTitle = true // not a title line — fall through to content
    }

    if (!line) { flushParagraph(); continue }

    paragraphBuf.push(line)
  }

  flushParagraph()
  return { intro, sourceUrl }
}

export default function InfoPanel({ selectedBone }) {
  const [rawText, setRawText] = useState('')
  const [loading, setLoading] = useState(false)
  const contentRef = useRef(null)

  const boneName = selectedBone ? (selectedBone.name || selectedBone.parent?.name) : null

  useEffect(() => {
    async function loadDescription() {
      if (!boneName) { setRawText(''); return }

      setLoading(true)
      if (contentRef.current) contentRef.current.scrollTop = 0

      const normName = normalize(boneName)
      const filePath = fileMap[normName]
        ?? fileMap[Object.keys(fileMap).find(k => normName.includes(k) || k.includes(normName)) ?? '']

      if (filePath) {
        try {
          setRawText(await scriptFiles[filePath]())
        } catch {
          setRawText('')
        }
      } else {
        setRawText('')
      }
      setLoading(false)
    }
    loadDescription()
  }, [boneName])

  const { intro, sourceUrl } = parseContent(rawText)

  return (
    <div id="info-panel" className={`panel${!selectedBone ? ' empty' : ''}`}>

      <div className="info-header">
        <span className="panel-label">Selected Structure</span>
      </div>

      <div className="bone-name">
        {selectedBone ? formatName(boneName) : '—'}
      </div>

      <div className="divider" />

      <div className="bone-detail" ref={contentRef}>
        {loading ? (
          <div className="info-loading">
            <span className="info-loading-dot" />
            <span className="info-loading-dot" />
            <span className="info-loading-dot" />
          </div>
        ) : !selectedBone ? (
          <div className="info-empty-state">
            <div className="info-empty-icon">⬡</div>
            <div>Click any structure in the model to inspect it.</div>
            <div className="info-empty-hint">Click again to deselect.</div>
          </div>
        ) : (
          <>
            {(!rawText || intro.length === 0) ? (
              <div className="info-empty-state">
                <div className="info-empty-icon">∅</div>
                <div>No anatomical data found for this structure.</div>
              </div>
            ) : (
              intro.map((p, i) => (
                <p key={i} className="info-paragraph">{p}</p>
              ))
            )}

            {/* Always offer an external link — the file's source if present,
                otherwise a Wikipedia search for the structure. */}
            <div className="info-source">
              <a
                href={sourceUrl || `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(formatName(boneName))}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                External links ↗
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
