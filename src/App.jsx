import { useState } from 'react'
import Scene from './components/Scene.jsx'
import QuizPanel from './components/QuizPanel.jsx'
import InfoPanel from './components/InfoPanel.jsx'
import LayerControls from './components/LayerControls.jsx'
import BoneControls from './components/BoneControls.jsx'
import CameraControls from './components/CameraControls.jsx'
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
  const [quizLevel, setQuizLevel] = useState(1)
  const [quiz, setQuiz] = useState(initialQuiz)
  const [showMenu, setShowMenu] = useState(true)

  const levelQuestions = questions.filter(q => q.level === quizLevel)

  // Level 1 and 4 highlights a bone for the user to identify
  const highlightBone = quizStarted && (quizLevel === 1 || quizLevel === 4) && !quiz.answered && levelQuestions[quiz.currentQ] ? levelQuestions[quiz.currentQ].target : null

  // Layer visibility state
  const [showSkeleton, setShowSkeleton] = useState(true)
  const [showMuscles, setShowMuscles] = useState(false)
  const [activeGroup, setActiveGroup] = useState('All')
  const [filterMode, setFilterMode] = useState('fade')

  // Camera preset state
  const [cameraPreset, setCameraPreset] = useState('front')

  // Bone group and fade state
  const [activeBoneGroup, setActiveBoneGroup] = useState('All Bones')
  const [boneFadeMode, setBoneFadeMode] = useState('fade')

  function handlePresetChange(key) {
    setHeightPreset(key)
    const newScale = presetStatureScale(key)
    const preset = HEIGHT_PRESETS[key]
    setStatureScale(newScale)
    setShoulderScale(preset.sxz)
    setHipScale(preset.sxz)
  }

  function handleScaleChange(type, value) {
    if (type === 'stature') setStatureScale(value)
    else if (type === 'shoulder') setShoulderScale(value)
    else if (type === 'hip') setHipScale(value)
  }

  function handleBoneSelect(mesh) {
    setSelectedBone(mesh)
    // Level 2 and Level 3 use model clicks during a quiz
    if (!quizStarted || (quizLevel !== 2 && quizLevel !== 3) || quiz.answered || !mesh) return

    const q = levelQuestions[quiz.currentQ]
    const clickedName = (mesh.name || mesh.parent?.name || '').toLowerCase()
    if (!q) return

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

  // Level 1: user clicks one of the multiple choice buttons
  function handleMultipleChoiceAnswer(option) {
    if (quiz.answered) return
    const q = levelQuestions[quiz.currentQ]
    if (!q) return

    const correct = option.toLowerCase() === q.answer.toLowerCase()

    setQuiz(prev => ({
      ...prev,
      answered: true,
      result: correct ? 'correct' : 'wrong',
      feedback: correct
        ? 'Correct! Well done.'
        : `Not quite — the answer was ${q.answer}.`,
    }))
  }

  // Level 4: user types the name of the bone
  function handleTypeAnswer(input) {
    if (quiz.answered || !input.trim()) return

    const q = levelQuestions[quiz.currentQ]
    if (!q) return

    const typed = input.trim().toLowerCase()
    const target = q.target.toLowerCase()
    const synonyms = q.synonyms || []

    const correct = typed === target || synonyms.map(s => s.toLowerCase()).includes(typed)

    setQuiz(prev => ({
      ...prev,
      answered: true,
      result: correct ? 'correct' : 'wrong',
      feedback: correct
        ? 'Correct! Well done.'
        : `Not quite — the answer was "${q.target}".`,
    }))
  }

  function handleStartQuiz()  { setSelectedBone(null); setQuiz(initialQuiz); setQuizStarted(true) }
  function handleEndQuiz()    { setSelectedBone(null); setQuiz(initialQuiz); setQuizStarted(false) }
  function handleNextQuestion() {
    setSelectedBone(null)
    setQuiz(prev => ({
      ...initialQuiz,
      currentQ: (prev.currentQ + 1) % levelQuestions.length,
    }))
  }

  function handleStart() {
    setShowMenu(false)
  }

  if (showMenu) {
    return (
      <div className="main-menu">
        <div className="menu-card panel">
          <div className="menu-title">Smokes and Mirrors</div>
          <div className="menu-subtitle">Step into the interactive skeletal atlas and test your anatomy knowledge.</div>
          <button onClick={handleStart}>Start now</button>
        </div>
      </div>
    )
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
        cameraPreset={cameraPreset}
        activeBoneGroup={activeBoneGroup}
        boneFadeMode={boneFadeMode}
        highlightBone={highlightBone}
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

      <BoneControls
        showSkeleton={showSkeleton}
        activeBoneGroup={activeBoneGroup}
        setActiveBoneGroup={setActiveBoneGroup}
        boneFadeMode={boneFadeMode}
        setBoneFadeMode={setBoneFadeMode}
      />

      <CameraControls onAngleSelect={setCameraPreset} />

      <QuizPanel
        quiz={quiz}
        questions={levelQuestions}
        started={quizStarted}
        quizLevel={quizLevel}
        onLevelChange={setQuizLevel}
        onStart={handleStartQuiz}
        onEnd={handleEndQuiz}
        onNext={handleNextQuestion}
        onAnswer={handleMultipleChoiceAnswer}
        onTypeAnswer={handleTypeAnswer}
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
