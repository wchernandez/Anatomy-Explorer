import { useState, useCallback } from 'react'
import Scene from './components/Scene.jsx'
import QuizPanel from './components/QuizPanel.jsx'
import InfoPanel from './components/InfoPanel.jsx'
import LayerControls from './components/LayerControls.jsx'
import CameraControls from './components/CameraControls.jsx'
import DemographicPanel from './components/DemographicPanel.jsx'
import questions from './data/questions.json'

function formatName(raw) {
  if (!raw) return 'Unknown Structure'
  let name = raw.replace(/\.g$/, '').replace(/_/g, ' ')
  name = name.replace(/\s+\d+$/, '')
  if (/ [lL]$/.test(name)) name = name.slice(0, -2).trim() + ' (L)'
  else if (/ [rR]$/.test(name)) name = name.slice(0, -2).trim() + ' (R)'
  return name.replace(/\b\w/g, c => c.toUpperCase()).trim()
}

const initialQuiz = { currentQ: 0, answered: false, result: null, feedback: 'Waiting for selection…' }

export default function App() {
  const [selectedBone, setSelectedBone] = useState(null)

  // Scaling state — driven by the Demographic (ANSUR II regression) panel.
  const [statureScale,  setStatureScale]  = useState(1)
  const [shoulderScale, setShoulderScale] = useState(1)
  const [hipScale,      setHipScale]      = useState(1)
  const [showDemoPanel, setShowDemoPanel] = useState(false)

  // Quiz + menu state
  const [quizStarted, setQuizStarted] = useState(false)
  const [quizLevel, setQuizLevel] = useState(1)
  const [quiz, setQuiz] = useState(initialQuiz)
  const [showStartScreen, setShowStartScreen] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeMenuItem, setActiveMenuItem] = useState('Quiz')

  const levelQuestions = questions.filter(q => q.level === quizLevel)

  const highlightBone =
    quizStarted && (quizLevel === 1 || quizLevel === 4) && !quiz.answered && levelQuestions[quiz.currentQ]
      ? levelQuestions[quiz.currentQ].target
      : null

  // Layer visibility
  const [showSkeleton, setShowSkeleton] = useState(true)
  const [showMuscles,  setShowMuscles]  = useState(false)
  const [showJoints,   setShowJoints]   = useState(false)
  const [showVascular, setShowVascular] = useState(false)

  // Whole-layer fade — render a layer as a semi-transparent ghost
  const [skeletonFaded, setSkeletonFaded] = useState(false)
  const [musclesFaded,  setMusclesFaded]  = useState(false)
  const [jointsFaded,   setJointsFaded]   = useState(false)
  const [vascularFaded, setVascularFaded] = useState(false)
  const faded = { skeleton: skeletonFaded, muscles: musclesFaded, joints: jointsFaded, vascular: vascularFaded }
  function toggleFade(key) {
    if      (key === 'skeleton') setSkeletonFaded(v => !v)
    else if (key === 'muscles')  setMusclesFaded(v => !v)
    else if (key === 'joints')   setJointsFaded(v => !v)
    else if (key === 'vascular') setVascularFaded(v => !v)
  }

  // Group filters
  const [activeGroup, setActiveGroup] = useState('All Muscles')
  const [filterMode,  setFilterMode]  = useState('fade')
  const [activeJointGroup, setActiveJointGroup] = useState('All Joints')
  const [jointFilterMode,  setJointFilterMode]  = useState('fade')
  const [activeVascularGroup, setActiveVascularGroup] = useState('All Vessels')
  const [vascularFilterMode,  setVascularFilterMode]  = useState('fade')
  const [activeBoneGroup, setActiveBoneGroup] = useState('All Bones')
  const [boneFadeMode,    setBoneFadeMode]    = useState('fade')

  // Wrappers that clear the selection whenever a layer or filter changes
  const clearingSet = fn => v => { setSelectedBone(null); fn(v) }
  const setShowSkeletonC        = clearingSet(setShowSkeleton)
  const setShowMusclesC         = clearingSet(setShowMuscles)
  const setShowJointsC          = clearingSet(setShowJoints)
  const setShowVascularC        = clearingSet(setShowVascular)
  const setActiveGroupC         = clearingSet(setActiveGroup)
  const setActiveJointGroupC    = clearingSet(setActiveJointGroup)
  const setActiveVascularGroupC = clearingSet(setActiveVascularGroup)
  const setActiveBoneGroupC     = clearingSet(setActiveBoneGroup)

  // Camera preset
  const [cameraPreset, setCameraPreset] = useState('front')

  // Accepts EITHER the legacy (type, value) string form OR the object form
  // { statureScale, shoulderScale, hipScale } emitted by DemographicPanel.
  const handleScaleChange = useCallback(function handleScaleChange(typeOrObj, value) {
    if (typeOrObj && typeof typeOrObj === 'object') {
      const { statureScale: sY, shoulderScale: sXZ, hipScale: hXZ } = typeOrObj
      if (sY  !== undefined) setStatureScale(sY)
      if (sXZ !== undefined) setShoulderScale(sXZ)
      if (hXZ !== undefined) setHipScale(hXZ)
    } else {
      if      (typeOrObj === 'stature')  setStatureScale(value)
      else if (typeOrObj === 'shoulder') setShoulderScale(value)
      else if (typeOrObj === 'hip')      setHipScale(value)
    }
  }, [])

  function handleBoneSelect(mesh) {
    setSelectedBone(mesh)
    if (!quizStarted || (quizLevel !== 2 && quizLevel !== 3) || quiz.answered || !mesh) return

    const q           = levelQuestions[quiz.currentQ]
    const clickedName = (mesh.name || mesh.parent?.name || '').toLowerCase()
    if (!q) return

    const correct  = q.target === null || clickedName.includes(q.target)
    const boneName = formatName(mesh.name || mesh.parent?.name)
    setQuiz(prev => ({
      ...prev,
      answered: true,
      result:   correct ? 'correct' : 'wrong',
      feedback: correct
        ? (q.target === null ? `Good job! That's the ${boneName}.` : 'Correct! Well done.')
        : `Not quite — that's the ${boneName}.`,
    }))
  }

  function handleMultipleChoiceAnswer(option) {
    if (quiz.answered) return
    const q = levelQuestions[quiz.currentQ]
    if (!q) return
    const correct = option.toLowerCase() === q.answer.toLowerCase()
    setQuiz(prev => ({
      ...prev,
      answered: true,
      result:   correct ? 'correct' : 'wrong',
      feedback: correct ? 'Correct! Well done.' : `Not quite — the answer was ${q.answer}.`,
    }))
  }

  function handleTypeAnswer(input) {
    if (quiz.answered || !input.trim()) return
    const q        = levelQuestions[quiz.currentQ]
    if (!q) return
    const typed    = input.trim().toLowerCase()
    const target   = q.target.toLowerCase()
    const synonyms = q.synonyms || []
    const correct  = typed === target || synonyms.map(s => s.toLowerCase()).includes(typed)
    setQuiz(prev => ({
      ...prev,
      answered: true,
      result:   correct ? 'correct' : 'wrong',
      feedback: correct ? 'Correct! Well done.' : `Not quite — the answer was "${q.target}".`,
    }))
  }

  function handleStartQuiz()    { setSelectedBone(null); setQuiz(initialQuiz); setQuizStarted(true) }
  function handleEndQuiz()      { setSelectedBone(null); setQuiz(initialQuiz); setQuizStarted(false) }
  function handleNextQuestion() {
    setSelectedBone(null)
    setQuiz(prev => ({ ...initialQuiz, currentQ: (prev.currentQ + 1) % levelQuestions.length }))
  }

  function handleStart() { setShowStartScreen(false) }
  function toggleMenuItem(item) { setActiveMenuItem(prev => (prev === item ? '' : item)) }

  if (showStartScreen) {
    return (
      <div className="main-menu">
        <div className="menu-card panel">
          <div className="menu-title">Smoke and Mirrors</div>
          <div className="menu-subtitle">Step into the interactive model and test your anatomy knowledge.</div>
          <button onClick={handleStart}>Begin Learning</button>
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
        showJoints={showJoints}
        activeGroup={activeGroup}
        filterMode={filterMode}
        activeJointGroup={activeJointGroup}
        jointFilterMode={jointFilterMode}
        statureScale={statureScale}
        shoulderScale={shoulderScale}
        hipScale={hipScale}
        cameraPreset={cameraPreset}
        activeBoneGroup={activeBoneGroup}
        boneFadeMode={boneFadeMode}
        highlightBone={highlightBone}
        showVascular={showVascular}
        activeVascularGroup={activeVascularGroup}
        vascularFilterMode={vascularFilterMode}
        skeletonFaded={skeletonFaded}
        musclesFaded={musclesFaded}
        jointsFaded={jointsFaded}
        vascularFaded={vascularFaded}
      />

      {/* ── Top bar with hamburger menu (dev menu) ─────────────────────────── */}
      <div id="topbar">
        <button
          id="menu-toggle"
          type="button"
          className={menuOpen ? 'open' : ''}
          onClick={() => setMenuOpen(open => !open)}
        >
          <span className="hamburger">☰</span>
          <span>Menu</span>
        </button>
        <div>
          <div className="title-main">Anatomy Explorer</div>
          <div className="title-sub">Human Anatomy · Interactive Model</div>
        </div>
      </div>

      {menuOpen && (
        <aside id="app-menu" className="panel">
          <div className="panel-label">Menu</div>

          <div className="menu-item">
            <button
              type="button"
              className={`menu-toggle${activeMenuItem === 'Quiz' ? ' active' : ''}`}
              onClick={() => toggleMenuItem('Quiz')}
            >
              <span>Quiz</span>
              <span>{activeMenuItem === 'Quiz' ? '▾' : '▸'}</span>
            </button>
            {activeMenuItem === 'Quiz' && (
              <div className="menu-section-body">
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
              </div>
            )}
          </div>

          <div className="menu-item">
            <button
              type="button"
              className={`menu-toggle${activeMenuItem === 'Measurements' ? ' active' : ''}`}
              onClick={() => toggleMenuItem('Measurements')}
            >
              <span>Measurements</span>
              <span>{activeMenuItem === 'Measurements' ? '▾' : '▸'}</span>
            </button>
            {activeMenuItem === 'Measurements' && (
              <div className="menu-section-body">
                <div className="menu-subtitle">Scale the body by demographic (ANSUR II regression).</div>
                <button
                  id="demographic-toggle"
                  className={`preset-btn${showDemoPanel ? ' active' : ''}`}
                  onClick={() => setShowDemoPanel(v => !v)}
                  title="Demographic Regression Scaling"
                >
                  <span className="preset-ft">🧬</span>
                  <span className="preset-sub">Demographics</span>
                </button>
              </div>
            )}
          </div>

          <div className="menu-item">
            <button
              type="button"
              className={`menu-toggle${activeMenuItem === 'Camera Angles' ? ' active' : ''}`}
              onClick={() => toggleMenuItem('Camera Angles')}
            >
              <span>Camera Angles</span>
              <span>{activeMenuItem === 'Camera Angles' ? '▾' : '▸'}</span>
            </button>
            {activeMenuItem === 'Camera Angles' && (
              <div className="menu-section-body">
                <CameraControls onAngleSelect={setCameraPreset} />
              </div>
            )}
          </div>
        </aside>
      )}

      {/* ── Layer / filter controls (skeleton, muscles, joints, vascular + groups) ── */}
      <LayerControls
        showSkeleton={showSkeleton}               setShowSkeleton={setShowSkeletonC}
        showMuscles={showMuscles}                 setShowMuscles={setShowMusclesC}
        showJoints={showJoints}                   setShowJoints={setShowJointsC}
        showVascular={showVascular}               setShowVascular={setShowVascularC}
        activeGroup={activeGroup}                 setActiveGroup={setActiveGroupC}
        filterMode={filterMode}                   setFilterMode={setFilterMode}
        activeJointGroup={activeJointGroup}       setActiveJointGroup={setActiveJointGroupC}
        jointFilterMode={jointFilterMode}         setJointFilterMode={setJointFilterMode}
        activeVascularGroup={activeVascularGroup} setActiveVascularGroup={setActiveVascularGroupC}
        vascularFilterMode={vascularFilterMode}   setVascularFilterMode={setVascularFilterMode}
        activeBoneGroup={activeBoneGroup}         setActiveBoneGroup={setActiveBoneGroupC}
        boneFadeMode={boneFadeMode}               setBoneFadeMode={setBoneFadeMode}
        faded={faded}                             onToggleFade={toggleFade}
      />

      {/* ── Demographic Regression Panel — floating, toggled from the menu ──── */}
      <DemographicPanel
        visible={showDemoPanel}
        onClose={() => setShowDemoPanel(false)}
        onScaleChange={handleScaleChange}
      />

      <InfoPanel selectedBone={selectedBone} />
    </>
  )
}
