import { useState } from 'react'
import Scene from './components/Scene.jsx'
import QuizPanel from './components/QuizPanel.jsx'
import InfoPanel from './components/InfoPanel.jsx'
import LayerControls from './components/LayerControls.jsx'
import ProportionPanel from './components/ProportionPanel.jsx'
import questions from './data/questions.json'

// ANSUR II Male mean stature (mm) — used to compute proportional scale ratios
const ANSUR_STATURE_MEAN_MM = 1756.21

// Height presets: target height in mm → proportional statureScale relative to ANSUR mean
// sxz is the lateral-scale coupling at that stature (empirically tuned for anatomy)
export const HEIGHT_PRESETS = {
  child: { label: '4 ft', sub: 'Child',  targetMm: 1219.2, sxz: 0.755 },
  short: { label: '5 ft', sub: 'Adult',  targetMm: 1524.0, sxz: 0.978 },
  tall:  { label: '6 ft', sub: 'Tall',   targetMm: 1828.8, sxz: 1.006 },
}

/** Compute the statureScale (sy) for a preset from its target height */
function presetStatureScale(key) {
  const p = HEIGHT_PRESETS[key]
  return p ? p.targetMm / ANSUR_STATURE_MEAN_MM : 1.0
}

function formatName(raw) {
  if (!raw) return 'Unknown Structure'
  return raw.replace(/\.g$/, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim()
}

const initialQuiz = { currentQ: 0, answered: false, result: null, feedback: 'Waiting for selection…' }

export default function App() {
  const [selectedBone, setSelectedBone] = useState(null)
  const [heightPreset, setHeightPreset] = useState('short')

  // Scaling state — preset provides base statureScale; ProportionPanel can override
  const [statureScale,  setStatureScale]  = useState(() => presetStatureScale('short'))
  const [shoulderScale, setShoulderScale] = useState(HEIGHT_PRESETS.short.sxz)
  const [hipScale,      setHipScale]      = useState(HEIGHT_PRESETS.short.sxz)
  const [showPanel,     setShowPanel]     = useState(false)

  const [quizStarted, setQuizStarted] = useState(false)
  const [quiz, setQuiz]               = useState(initialQuiz)

  const [showSkeleton, setShowSkeleton] = useState(true)
  const [showMuscles,  setShowMuscles]  = useState(false)
  const [activeGroup,  setActiveGroup]  = useState('All Muscles')
  const [filterMode,   setFilterMode]   = useState('fade')

  function handleBoneSelect(mesh) {
    setSelectedBone(mesh)
    if (!quizStarted || quiz.answered || !mesh) return
    const q = questions[quiz.currentQ]
    const clickedName = (mesh.name || mesh.parent?.name || '').toLowerCase()
    const correct = q.target === null || clickedName.includes(q.target)
    const boneName = formatName(mesh.name || mesh.parent?.name)
    setQuiz(prev => ({
      ...prev, answered: true,
      result: correct ? 'correct' : 'wrong',
      feedback: correct
        ? (q.target === null ? `Good job! That's the ${boneName}.` : 'Correct! Well done.')
        : `Not quite — that's the ${boneName}.`,
    }))
  }

  function handleStartQuiz()  { setSelectedBone(null); setQuiz(initialQuiz); setQuizStarted(true) }
  function handleEndQuiz()    { setSelectedBone(null); setQuiz(initialQuiz); setQuizStarted(false) }
  function handleNextQuestion() {
    setSelectedBone(null)
    setQuiz(prev => ({ ...initialQuiz, currentQ: (prev.currentQ + 1) % questions.length }))
  }

  /** Called by height preset buttons — snaps scales to anatomically correct proportions */
  function handlePresetChange(key) {
    setHeightPreset(key)
    const sy  = presetStatureScale(key)
    const sxz = HEIGHT_PRESETS[key].sxz
    setStatureScale(sy)
    setShoulderScale(sxz)
    setHipScale(sxz)
  }

  /** Called by ProportionPanel — fine-grained ANSUR overrides */
  function handleScaleChange({ statureScale: sY, shoulderScale: sXZ, hipScale: sHip }) {
    setStatureScale(sY)
    setShoulderScale(sXZ)
    setHipScale(sHip ?? 1)
  }

  return (
    <>
      <Scene
        selectedBone={selectedBone}
        onSelect={handleBoneSelect}
        showSkeleton={showSkeleton}
        showMuscles={showMuscles}
        activeGroup={activeGroup}
        filterMode={filterMode}
        heightPreset={heightPreset}
        statureScale={statureScale}
        shoulderScale={shoulderScale}
        hipScale={hipScale}
      />

      <div id="topbar">
        <div>
          <div className="title-main">Anatomy Explorer</div>
          <div className="title-sub">Human Anatomy · Interactive Model</div>
        </div>

        <div id="topbar-controls">
          {/* Body proportion presets */}
          <div id="height-presets">
            {Object.entries(HEIGHT_PRESETS).map(([key, p]) => (
              <button
                key={key}
                id={`preset-${key}`}
                className={`preset-btn${heightPreset === key ? ' active' : ''}`}
                onClick={() => handlePresetChange(key)}
              >
                <span className="preset-ft">{p.label}</span>
                <span className="preset-sub">{p.sub}</span>
              </button>
            ))}
          </div>

          {/* Proportions panel toggle */}
          <button
            id="proportion-toggle"
            className={`preset-btn${showPanel ? ' active' : ''}`}
            onClick={() => setShowPanel(v => !v)}
            title="ANSUR II Proportion Controls"
          >
            <span className="preset-ft">⚖</span>
            <span className="preset-sub">Proportions</span>
          </button>
        </div>
      </div>

      {/* ANSUR II Proportion Panel */}
      <ProportionPanel
        visible={showPanel}
        onClose={() => setShowPanel(false)}
        onScaleChange={handleScaleChange}
        statureScale={statureScale}
        shoulderScale={shoulderScale}
        hipScale={hipScale}
      />

      <LayerControls
        showSkeleton={showSkeleton}  setShowSkeleton={setShowSkeleton}
        showMuscles={showMuscles}    setShowMuscles={setShowMuscles}
        activeGroup={activeGroup}    setActiveGroup={setActiveGroup}
        filterMode={filterMode}      setFilterMode={setFilterMode}
      />

      <QuizPanel
        quiz={quiz} questions={questions} started={quizStarted}
        onStart={handleStartQuiz} onEnd={handleEndQuiz} onNext={handleNextQuestion}
      />
      <InfoPanel selectedBone={selectedBone} />

      <div id="controls-hint">
        <div className="hint"><span>DRAG</span>Rotate</div>
        <div className="hint"><span>SCROLL</span>Zoom</div>
        <div className="hint"><span>CLICK</span>Inspect</div>
        <div className="hint"><span>RIGHT DRAG</span>Pan</div>
      </div>
    </>
  )
}
