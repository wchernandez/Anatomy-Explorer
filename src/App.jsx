import { useState, useCallback } from 'react'
import Scene from './components/Scene.jsx'
import QuizPanel from './components/QuizPanel.jsx'
import QuizSetup from './components/QuizSetup.jsx'
import QuizResults from './components/QuizResults.jsx'
import InfoPanel from './components/InfoPanel.jsx'
import LayerControls from './components/LayerControls.jsx'
import CameraControls from './components/CameraControls.jsx'
import DemographicPanel from './components/DemographicPanel.jsx'
import { QUIZ_REGIONS, buildQuiz } from './data/quizData.js'

function formatName(raw) {
  if (!raw) return 'Unknown Structure'
  let name = raw.replace(/\.g$/, '').replace(/_/g, ' ')
  name = name.replace(/\s+\d+$/, '')
  if (/ [lL]$/.test(name)) name = name.slice(0, -2).trim() + ' (L)'
  else if (/ [rR]$/.test(name)) name = name.slice(0, -2).trim() + ' (R)'
  return name.replace(/\b\w/g, c => c.toUpperCase()).trim()
}

const initialQuiz = { currentQ: 0, answered: false, result: null, feedback: '', score: 0, wrong: [] }

export default function App() {
  const [selectedBone, setSelectedBone] = useState(null)
  const [statureScale,  setStatureScale]  = useState(1)
  const [shoulderScale, setShoulderScale] = useState(1)
  const [hipScale,      setHipScale]      = useState(1)
  // Weight-free X/Z scales — drive the skeleton / joints / vascular layers so
  // they do NOT respond to the weight slider (only the muscle layer does).
  const [bodyShoulderScale, setBodyShoulderScale] = useState(1)
  const [bodyHipScale,      setBodyHipScale]      = useState(1)
  const [showDemoPanel,    setShowDemoPanel]    = useState(false)
  const [showCameraPanel, setShowCameraPanel] = useState(false)
  const [modelActivated,  setModelActivated]  = useState(false)
  const [resetCounter,    setResetCounter]    = useState(0)

  const [quizStarted,   setQuizStarted]   = useState(false)
  const [quizFinished,  setQuizFinished]  = useState(false)
  const [showQuizSetup, setShowQuizSetup] = useState(false)
  const [quizConfig,    setQuizConfig]    = useState({ level: 1, layer: 'skeleton', region: 'whole_body' })
  const [quizQuestions, setQuizQuestions] = useState([])
  const [quizFocusToken, setQuizFocusToken] = useState(0)
  const [quiz,        setQuiz]        = useState(initialQuiz)
  const [showMenu,    setShowMenu]    = useState(true)

  const quizLevel = quizConfig.level
  const highlightBone =
    quizStarted && (quizLevel === 1 || quizLevel === 4) && !quiz.answered && quizQuestions[quiz.currentQ]
      ? quizQuestions[quiz.currentQ].target
      : null

  // Layer visibility
  const [showSkeleton, setShowSkeleton] = useState(true)
  const [showMuscles,  setShowMuscles]  = useState(false)
  const [showJoints,   setShowJoints]   = useState(false)
  const [showVascular, setShowVascular] = useState(false)

  // Muscle group filter
  const [activeGroup, setActiveGroup] = useState('All Muscles')
  const [filterMode,  setFilterMode]  = useState('fade')

  // Joint group filter
  const [activeJointGroup, setActiveJointGroup] = useState('All Joints')
  const [jointFilterMode,  setJointFilterMode]  = useState('fade')

  // Vascular group filter
  const [activeVascularGroup, setActiveVascularGroup] = useState('All Vessels')
  const [vascularFilterMode,  setVascularFilterMode]  = useState('fade')

  // Bone group filter (previously in BoneControls)
  const [activeBoneGroup, setActiveBoneGroup] = useState('All Bones')
  const [boneFadeMode,    setBoneFadeMode]    = useState('fade')

  // Whole-layer faded state (semi-transparent overlay for each layer)
  const [skeletonFaded, setSkeletonFaded] = useState(false)
  const [musclesFaded,  setMusclesFaded]  = useState(false)
  const [jointsFaded,   setJointsFaded]   = useState(false)
  const [vascularFaded, setVascularFaded] = useState(false)

  // Wrappers that clear the selection whenever a layer or filter changes
  const clearingSet = fn => v => { setSelectedBone(null); fn(v) }
  const setShowSkeletonC       = clearingSet(setShowSkeleton)
  const setShowMusclesC        = clearingSet(setShowMuscles)
  const setShowJointsC         = clearingSet(setShowJoints)
  const setShowVascularC       = clearingSet(setShowVascular)
  const setActiveGroupC        = clearingSet(setActiveGroup)
  const setActiveJointGroupC   = clearingSet(setActiveJointGroup)
  const setActiveVascularGroupC= clearingSet(setActiveVascularGroup)
  const setActiveBoneGroupC    = clearingSet(setActiveBoneGroup)

  // Skeleton bone names (keyed by group, populated once model loads)
  const [skeletonBoneNames, setSkeletonBoneNames] = useState({})

  // Camera preset
  const [cameraPreset, setCameraPreset] = useState('front')


  // Accepts EITHER the legacy (type, value) string form OR the object form
  // { statureScale, shoulderScale, hipScale } emitted by both panels.
  const handleScaleChange = useCallback(function handleScaleChange(typeOrObj, value) {
    if (typeOrObj && typeof typeOrObj === 'object') {
      // Object form — emitted by ProportionPanel.emit() and DemographicPanel
      const { statureScale: sY, shoulderScale: sXZ, hipScale: hXZ,
              bodyShoulderScale: bsXZ, bodyHipScale: bhXZ } = typeOrObj
      if (sY  !== undefined) setStatureScale(sY)
      if (sXZ !== undefined) setShoulderScale(sXZ)
      if (hXZ !== undefined) setHipScale(hXZ)
      // Fall back to the full scales for legacy emitters that don't supply the
      // weight-free variants, so the skeleton still tracks them.
      if (bsXZ !== undefined) setBodyShoulderScale(bsXZ)
      else if (sXZ !== undefined) setBodyShoulderScale(sXZ)
      if (bhXZ !== undefined) setBodyHipScale(bhXZ)
      else if (hXZ !== undefined) setBodyHipScale(hXZ)
    } else {
      // Legacy string form (kept for backward compatibility)
      if      (typeOrObj === 'stature')  setStatureScale(value)
      else if (typeOrObj === 'shoulder') { setShoulderScale(value); setBodyShoulderScale(value) }
      else if (typeOrObj === 'hip')      { setHipScale(value); setBodyHipScale(value) }
    }
  }, [])

  // Records the outcome of the current question: flips to the answered state,
  // updates the running score and logs misses for the results screen.
  function applyAnswer(correct, q, feedback) {
    setQuiz(prev => ({
      ...prev,
      answered: true,
      result:   correct ? 'correct' : 'wrong',
      feedback,
      score:    prev.score + (correct ? 1 : 0),
      wrong:    correct ? prev.wrong : [...prev.wrong, { prompt: q.prompt, answer: q.answer }],
    }))
  }

  function handleBoneSelect(mesh) {
    // Clicking the already-selected bone deselects it
    if (mesh && selectedBone && mesh.uuid === selectedBone.uuid) {
      setSelectedBone(null)
      return
    }
    setSelectedBone(mesh)
    if (!quizStarted || (quizLevel !== 2 && quizLevel !== 3) || quiz.answered || !mesh) return

    const q           = quizQuestions[quiz.currentQ]
    const clickedName = (mesh.name || mesh.parent?.name || '').toLowerCase()
    if (!q) return

    const correct  = q.target === null || clickedName.includes(q.target)
    const boneName = formatName(mesh.name || mesh.parent?.name)
    applyAnswer(
      correct, q,
      correct ? `Correct! That's the ${q.answer}.` : `Not quite — that's the ${boneName}. The answer was the ${q.answer}.`,
    )
  }

  function handleMultipleChoiceAnswer(option) {
    if (quiz.answered) return
    const q = quizQuestions[quiz.currentQ]
    if (!q) return
    const correct = option.toLowerCase() === q.answer.toLowerCase()
    applyAnswer(correct, q, correct ? 'Correct! Well done.' : `Not quite — the answer was ${q.answer}.`)
  }

  function handleTypeAnswer(input) {
    if (quiz.answered || !input.trim()) return
    const q        = quizQuestions[quiz.currentQ]
    if (!q) return
    const typed    = input.trim().toLowerCase()
    const target   = q.target.toLowerCase()
    const synonyms = q.synonyms || []
    const correct  = typed === target || synonyms.map(s => s.toLowerCase()).includes(typed)
    applyAnswer(correct, q, correct ? 'Correct! Well done.' : `Not quite — the answer was "${q.answer}".`)
  }

  function startQuiz(config = quizConfig) {
    const qs = buildQuiz(config.region, config.level)
    setQuizConfig(config)
    setQuizQuestions(qs)
    setQuiz(initialQuiz)
    setSelectedBone(null)
    setShowQuizSetup(false)
    setQuizFinished(false)
    setQuizStarted(true)
    setModelActivated(true)
    setQuizFocusToken(t => t + 1)
  }

  function exitToExplorer() {
    setQuizStarted(false)
    setQuizFinished(false)
    setQuiz(initialQuiz)
    setSelectedBone(null)
    setResetCounter(c => c + 1) // fly the camera back to the default view
    setModelActivated(false)
  }

  function handleQuitQuiz() { exitToExplorer() }

  function handleNextQuestion() {
    setSelectedBone(null)
    if (quiz.currentQ >= quizQuestions.length - 1) {
      // Finished — surface the results screen and release the model.
      setQuizStarted(false)
      setQuizFinished(true)
      setResetCounter(c => c + 1)
      return
    }
    setQuiz(prev => ({ ...prev, currentQ: prev.currentQ + 1, answered: false, result: null, feedback: '' }))
  }

  // While a quiz is running the model is locked to the chosen region (only the
  // skeleton layer, other bones hidden) so the user can't stray off-topic.
  const quizGroupName = QUIZ_REGIONS[quizConfig.region]?.group || 'All Bones'
  const effBoneGroup  = quizStarted ? quizGroupName : activeBoneGroup
  const effBoneFade   = quizStarted ? 'hide'        : boneFadeMode
  const effShowSkeleton = quizStarted ? true  : showSkeleton
  const effShowMuscles  = quizStarted ? false : showMuscles
  const effShowJoints   = quizStarted ? false : showJoints
  const effShowVascular = quizStarted ? false : showVascular

  if (showMenu) {
    return (
      <div className="main-menu">
        <div className="menu-card panel">
          <div className="menu-title">Smoke and Mirrors</div>
          <div className="menu-subtitle">Step into the interactive model and test your anatomy knowledge.</div>
          <button onClick={() => setShowMenu(false)}>Begin Learning</button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Scene
        selectedBone={selectedBone}
        onSelect={handleBoneSelect}
        showSkeleton={effShowSkeleton}
        showMuscles={effShowMuscles}
        showJoints={effShowJoints}
        activeGroup={activeGroup}
        filterMode={filterMode}
        activeJointGroup={activeJointGroup}
        jointFilterMode={jointFilterMode}
        statureScale={statureScale}
        shoulderScale={shoulderScale}
        hipScale={hipScale}
        bodyShoulderScale={bodyShoulderScale}
        bodyHipScale={bodyHipScale}
        cameraPreset={cameraPreset}
        activeBoneGroup={effBoneGroup}
        boneFadeMode={effBoneFade}
        highlightBone={highlightBone}
        showVascular={effShowVascular}
        activeVascularGroup={activeVascularGroup}
        vascularFilterMode={vascularFilterMode}
        onBoneNamesReady={setSkeletonBoneNames}
        skeletonFaded={skeletonFaded}
        musclesFaded={musclesFaded}
        jointsFaded={jointsFaded}
        vascularFaded={vascularFaded}
        onInteract={() => setModelActivated(true)}
        resetCounter={resetCounter}
        quizFocusToken={quizFocusToken}
        quizFocusGroup={quizGroupName}
      />

      <div id="topbar">
        <div>
          <div className="title-main">Anatomy Explorer</div>
          <div className="title-sub">Human Anatomy · Interactive Model</div>
        </div>

        <div id="nav-hints-group">
          <div id="nav-hints">
            <div className="nav-hint">
              <span className="nav-hint-key">Left drag</span> Rotate
            </div>
            <div className="nav-hint-sep" />
            <div className="nav-hint">
              <span className="nav-hint-key">Right drag</span> Pan
            </div>
            <div className="nav-hint-sep" />
            <div className="nav-hint">
              <span className="nav-hint-key">Scroll</span> Zoom
            </div>
            <div className="nav-hint-sep" />
            <div className="nav-hint">
              <span className="nav-hint-key">Click</span> Select
            </div>
          </div>

          {modelActivated && (
            <button
              id="reset-view-btn"
              className="preset-btn"
              onClick={() => { setResetCounter(c => c + 1); setModelActivated(false) }}
              title="Reset View"
            >
              <span className="preset-ft">⟳</span>
              <span className="preset-sub">Reset View</span>
            </button>
          )}
        </div>

        {!quizStarted && (
          <div id="topbar-controls">
            <button
              className={`preset-btn${showQuizSetup ? ' active' : ''}`}
              onClick={() => setShowQuizSetup(v => !v)}
              title="Quiz Mode"
            >
              <span className="preset-ft">🎓</span>
              <span className="preset-sub">Quiz</span>
            </button>
            <button
              className={`preset-btn${showCameraPanel ? ' active' : ''}`}
              onClick={() => setShowCameraPanel(v => !v)}
              title="Camera Angles"
            >
              <span className="preset-ft">🎥</span>
              <span className="preset-sub">Camera</span>
            </button>
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

      {/* Demographic Regression Panel — separate floating panel */}
      {!quizStarted && (
      <DemographicPanel
        visible={showDemoPanel}
        onClose={() => setShowDemoPanel(false)}
        onScaleChange={handleScaleChange}
      />
      )}

      {/* LayerControls now absorbs BoneControls — all group props passed here */}
      {!quizStarted && (
      <LayerControls
        skeletonBoneNames={skeletonBoneNames}
        showSkeleton={showSkeleton}           setShowSkeleton={setShowSkeletonC}
        showMuscles={showMuscles}             setShowMuscles={setShowMusclesC}
        showJoints={showJoints}               setShowJoints={setShowJointsC}
        showVascular={showVascular}           setShowVascular={setShowVascularC}
        activeGroup={activeGroup}             setActiveGroup={setActiveGroupC}
        filterMode={filterMode}               setFilterMode={setFilterMode}
        activeJointGroup={activeJointGroup}   setActiveJointGroup={setActiveJointGroupC}
        jointFilterMode={jointFilterMode}     setJointFilterMode={setJointFilterMode}
        activeVascularGroup={activeVascularGroup} setActiveVascularGroup={setActiveVascularGroupC}
        vascularFilterMode={vascularFilterMode}   setVascularFilterMode={setVascularFilterMode}
        activeBoneGroup={activeBoneGroup}     setActiveBoneGroup={setActiveBoneGroupC}
        boneFadeMode={boneFadeMode}           setBoneFadeMode={setBoneFadeMode}
        skeletonFaded={skeletonFaded}         setSkeletonFaded={setSkeletonFaded}
        musclesFaded={musclesFaded}           setMusclesFaded={setMusclesFaded}
        jointsFaded={jointsFaded}             setJointsFaded={setJointsFaded}
        vascularFaded={vascularFaded}         setVascularFaded={setVascularFaded}
      />
      )}

      {!quizStarted && (
        <CameraControls onAngleSelect={setCameraPreset} visible={showCameraPanel} onClose={() => setShowCameraPanel(false)} />
      )}

      {/* Info panel is hidden during a quiz — it would reveal the answer. */}
      {!quizStarted && (
        <InfoPanel
          selectedBone={selectedBone}
          formatName={formatName}
        />
      )}

      {/* In-quiz heads-up panel */}
      {quizStarted && (
        <QuizPanel
          quiz={quiz}
          questions={quizQuestions}
          quizLevel={quizLevel}
          region={quizConfig.region}
          onQuit={handleQuitQuiz}
          onNext={handleNextQuestion}
          onMultipleChoiceAnswer={handleMultipleChoiceAnswer}
          onTypeAnswer={handleTypeAnswer}
        />
      )}

      {/* Full-screen quiz configuration menu */}
      {showQuizSetup && !quizStarted && (
        <QuizSetup
          config={quizConfig}
          onChange={patch => setQuizConfig(c => ({ ...c, ...patch }))}
          onStart={() => startQuiz(quizConfig)}
          onClose={() => setShowQuizSetup(false)}
        />
      )}

      {/* Full-screen results screen */}
      {quizFinished && (
        <QuizResults
          score={quiz.score}
          total={quizQuestions.length}
          wrong={quiz.wrong}
          config={quizConfig}
          onRetry={() => startQuiz(quizConfig)}
          onClose={exitToExplorer}
        />
      )}
    </>
  )
}