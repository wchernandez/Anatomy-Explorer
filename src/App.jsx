import { useState, useCallback } from 'react'
import { Exam, VideoCamera, Ruler, ArrowCounterClockwise } from '@phosphor-icons/react'
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

// Levenshtein edit distance — used to accept near-correct spelling in the
// type-the-name quiz (Level 4) instead of rejecting tiny typos.
function levenshtein(a, b) {
  const m = Array.from({ length: b.length + 1 }, (_, i) => [i])
  for (let j = 0; j <= a.length; j++) m[0][j] = j
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      m[i][j] = b[i - 1] === a[j - 1]
        ? m[i - 1][j - 1]
        : Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1)
    }
  }
  return m[b.length][a.length]
}

const initialQuiz = { currentQ: 0, answered: false, result: null, feedback: '', score: 0, wrong: [], wrongTarget: null }

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
  const [dockCloseToken,  setDockCloseToken]  = useState(0)  // bump → close the Layers panel

  // Opening a floating panel (Demographics/Camera) closes the others, the Layers
  // panel, and any selected structure — so nothing overlaps the info panel.
  function openExclusive(which) {
    setSelectedBone(null)
    setDockCloseToken(t => t + 1)
    if (which === 'demo')   { setShowCameraPanel(false); setShowDemoPanel(v => !v) }
    if (which === 'camera') { setShowDemoPanel(false);   setShowCameraPanel(v => !v) }
  }
  const [modelActivated,  setModelActivated]  = useState(false)
  const [resetCounter,    setResetCounter]    = useState(0)

  const [quizStarted,   setQuizStarted]   = useState(false)
  const [quizFinished,  setQuizFinished]  = useState(false)
  const [showQuizSetup, setShowQuizSetup] = useState(false)
  const [quizConfig,    setQuizConfig]    = useState({ level: 1, layer: 'skeleton', region: 'whole_body' })
  const [quizQuestions, setQuizQuestions] = useState([])
  const [quiz,        setQuiz]        = useState(initialQuiz)
  const [showMenu,    setShowMenu]    = useState(true)

  const quizLevel = quizConfig.level
  const activeQuestion = quizQuestions[quiz.currentQ]
  // Amber "this is the bone" highlight — only before answering, for the modes
  // that show the bone (multiple choice / type the name).
  const highlightBone =
    quizStarted && (quizLevel === 1 || quizLevel === 4) && !quiz.answered && activeQuestion
      ? activeQuestion.target
      : null
  // After answering: the correct bone turns green; the user's wrong answer turns
  // red — a wrong clicked bone (spot test / description) or the bone they named
  // (multiple choice / type the name).
  const quizGreenTarget = quizStarted && quiz.answered && activeQuestion ? activeQuestion.target : null
  const quizRedMesh =
    quizStarted && quiz.answered && quiz.result === 'wrong' && (quizLevel === 2 || quizLevel === 3)
      ? selectedBone
      : null
  const quizRedTarget =
    quizStarted && quiz.answered && quiz.result === 'wrong' && (quizLevel === 1 || quizLevel === 4)
      ? quiz.wrongTarget
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

  // Explorer "Isolate" — hide everything but the active bone group and frame the
  // camera on it (reuses the quiz's region-focus machinery).
  const [isolated,   setIsolated]   = useState(false)
  const [focusToken, setFocusToken] = useState(0)

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

  // Resolves a user's answer text (a multiple-choice option or typed name) to the
  // matching bone's mesh target within the current region — or null if it doesn't
  // correspond to a bone we know (so nothing gets highlighted).
  function resolveBoneTarget(input) {
    if (!input) return null
    const pool = QUIZ_REGIONS[quizConfig.region]?.bones || []
    const s = String(input).trim().toLowerCase()
    if (!s) return null
    const bone = pool.find(b =>
      b.name.toLowerCase() === s ||
      b.target.toLowerCase() === s ||
      (b.synonyms || []).some(syn => syn.toLowerCase() === s)
    )
    return bone ? bone.target : null
  }

  // Records the outcome of the current question: flips to the answered state,
  // updates the running score and logs misses for the results screen.
  // wrongTarget = the bone the user wrongly named (multiple choice / type modes),
  // used to highlight that bone red. Null when their answer maps to no known bone.
  function applyAnswer(correct, q, feedback, wrongTarget = null) {
    setQuiz(prev => ({
      ...prev,
      answered: true,
      result:   correct ? 'correct' : 'wrong',
      feedback,
      wrongTarget,
      score:    prev.score + (correct ? 1 : 0),
      wrong:    correct ? prev.wrong : [...prev.wrong, { prompt: q.prompt, answer: q.answer }],
    }))
  }

  function handleBoneSelect(mesh) {
    // During a quiz the only meaningful click is answering a spot-test / description
    // question that hasn't been answered yet. Every other click (after answering, or
    // in the multiple-choice / type modes) is ignored, so only the correct/wrong
    // answer bones stay highlighted. Hovering is unaffected.
    if (quizStarted) {
      if ((quizLevel === 2 || quizLevel === 3) && !quiz.answered && mesh) {
        const q = quizQuestions[quiz.currentQ]
        if (!q) return
        setSelectedBone(mesh)
        const clickedName = (mesh.name || mesh.parent?.name || '').toLowerCase()
        const correct  = q.target === null || clickedName.includes(q.target)
        const boneName = formatName(mesh.name || mesh.parent?.name)
        applyAnswer(
          correct, q,
          correct ? `Correct! That's the ${q.answer}.` : `Not quite — that's the ${boneName}. The answer was the ${q.answer}.`,
        )
      }
      return
    }

    // Explorer: clicking the already-selected bone deselects it.
    if (mesh && selectedBone && mesh.uuid === selectedBone.uuid) {
      setSelectedBone(null)
      return
    }
    // Selecting a structure closes the floating panels so they never overlap the info panel.
    if (mesh) { setShowDemoPanel(false); setShowCameraPanel(false) }
    setSelectedBone(mesh)
  }

  function handleMultipleChoiceAnswer(option) {
    if (quiz.answered) return
    const q = quizQuestions[quiz.currentQ]
    if (!q) return
    const correct = option.toLowerCase() === q.answer.toLowerCase()
    // The wrong option is itself a bone name → highlight that bone red.
    const rt = correct ? null : resolveBoneTarget(option)
    const wrongTarget = rt && rt !== q.target ? rt : null
    applyAnswer(correct, q, correct ? 'Correct! Well done.' : `Not quite — the answer was ${q.answer}.`, wrongTarget)
  }

  function handleTypeAnswer(input) {
    if (quiz.answered || !input.trim()) return
    const q        = quizQuestions[quiz.currentQ]
    if (!q) return
    const typed    = input.trim().toLowerCase()
    const target   = q.target.toLowerCase()
    const answer   = (q.answer || q.target).toLowerCase()
    const synonyms = (q.synonyms || []).map(s => s.toLowerCase())

    const exact = typed === target || typed === answer || synonyms.includes(typed)
    // Spelling tolerance: accept near-misses within a small edit distance of
    // the target/answer (longer words allow one more typo).
    const dist      = Math.min(levenshtein(typed, target), levenshtein(typed, answer))
    const threshold = answer.length > 6 ? 3 : 2
    const fuzzy     = !exact && dist <= threshold

    if (exact || fuzzy) {
      applyAnswer(true, q, exact
        ? 'Correct! Well done.'
        : `Correct! Just watch the spelling — it's "${q.answer}".`, null)
    } else {
      // If what they typed matches a different known bone, highlight it red.
      const rt = resolveBoneTarget(typed)
      const wrongTarget = rt && rt !== target ? rt : null
      applyAnswer(false, q, `Not quite — the answer was "${q.answer}".`, wrongTarget)
    }
  }

  function startQuiz(config = quizConfig) {
    const qs = buildQuiz(quizConfig.region, quizConfig.level, quizConfig.layer)
    setQuizConfig(config)
    setQuizQuestions(qs)
    setQuiz(initialQuiz)
    setSelectedBone(null)
    setShowQuizSetup(false)
    setQuizFinished(false)
    setQuizStarted(true)
    setModelActivated(true)
    setIsolated(false) // a quiz drives its own region lock
    setFocusToken(t => t + 1)
  }

  function exitToExplorer() {
    setQuizStarted(false)
    setQuizFinished(false)
    setQuiz(initialQuiz)
    setSelectedBone(null)
    setIsolated(false)
    setResetCounter(c => c + 1) // fly the camera back to the default view
    setModelActivated(false)
  }

  // Filters → group selection. Reframe the camera if we're isolated so switching
  // regions keeps the view focused on the new selection.
  function handleSelectBoneGroup(group) {
    setSelectedBone(null)
    setActiveBoneGroup(group)
    if (isolated) setFocusToken(t => t + 1)
  }

  // Filters → Isolate toggle. On: hide everything but the active group and frame
  // it. Off: restore the normal view and fly the camera back to the whole body.
  function handleToggleIsolate() {
    if (isolated) {
      setIsolated(false)
      setResetCounter(c => c + 1)
      setModelActivated(false)
    } else {
      setIsolated(true)
      setModelActivated(true)
      setFocusToken(t => t + 1)
    }
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
    setQuiz(prev => ({ ...prev, currentQ: prev.currentQ + 1, answered: false, result: null, feedback: '', wrongTarget: null }))
  }

  // While a quiz is running the model is locked to the chosen region (only the
  // skeleton layer, other bones hidden) so the user can't stray off-topic.
// Targets visible during quiz for non-skeleton layers
  const quizVisibleTargets = quizStarted && quizConfig.layer !== 'skeleton'? (QUIZ_REGIONS[quizConfig.region]?.[quizConfig.layer] || []).map(b => b.target.toLowerCase()): null
  const quizGroupName = quizConfig.layer === 'skeleton'? (QUIZ_REGIONS[quizConfig.region]?.group || 'All Bones') : 'All Bones'  
  const effBoneGroup  = quizStarted ? quizGroupName : activeBoneGroup
  const effBoneFade   = quizStarted ? (quizConfig.layer === 'skeleton' ? 'hide' : boneFadeMode) : (isolated ? 'hide' : boneFadeMode)
  // Camera region-focus is shared by the quiz and the explorer's Isolate button —
  // one focusToken is bumped by both, so switching modes never refocuses on its own.
  const sceneFocusGroup = quizStarted ? quizGroupName : activeBoneGroup
  const effShowSkeleton = quizStarted ? quizConfig.layer === 'skeleton' : showSkeleton
  const effShowMuscles  = quizStarted ? quizConfig.layer === 'muscles'  : showMuscles
  const effShowJoints   = quizStarted ? quizConfig.layer === 'joints'   : showJoints
  const effShowVascular = quizStarted ? quizConfig.layer === 'vascular' : showVascular
  // Whole-layer fade would make the isolated/quizzed bones transparent too, so
  // it's neutralised while isolating or quizzing (and the toggle is disabled).
  const effSkeletonFaded = (quizStarted || isolated) ? false : skeletonFaded

  if (showMenu) {
    return (
      <div className="main-menu">
        <div className="menu-card panel">
          <div className="menu-eyebrow">University of Waikato</div>
          <div className="menu-title">Anatomy Explorer</div>
          <div className="menu-divider" />
          <div className="menu-subtitle">COMPX241 &mdash; Smoke &amp; Mirrors</div>
          <button onClick={() => setShowMenu(false)}>Enter Explorer</button>
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
        skeletonFaded={effSkeletonFaded}
        musclesFaded={musclesFaded}
        jointsFaded={jointsFaded}
        vascularFaded={vascularFaded}
        onInteract={() => setModelActivated(true)}
        resetCounter={resetCounter}
        focusToken={focusToken}
        focusGroup={sceneFocusGroup}
        regionFocused={isolated || quizStarted}
        quizMode={quizStarted}
        quizGreenTarget={quizGreenTarget}
        quizRedMesh={quizRedMesh}
        quizRedTarget={quizRedTarget}
        quizVisibleTargets={quizVisibleTargets}
      />

      <div id="topbar">
        <div>
          <div className="title-main">Anatomy Explorer</div>
          <div className="title-sub">Human Body · Interactive Model</div>
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
        </div>

        {/* Reset View: a slim one-line button tucked under the top bar, right-
            aligned with the Camera tab. Shown in both explorer and quiz. */}
        {modelActivated && (
          <button
            id="reset-view-btn"
            onClick={() => {
              // When a region is isolated/quizzed, reset re-frames that region;
              // otherwise it flies back to the whole-body default view.
              if (isolated || quizStarted) setFocusToken(t => t + 1)
              else { setResetCounter(c => c + 1); setModelActivated(false) }
            }}
            title="Reset View"
          >
            <ArrowCounterClockwise size={15} weight="bold" />
            <span className="reset-view-label">Reset View</span>
          </button>
        )}

        {/* Top-right controls. Quiz & Demographics are explorer-only, but the
            Camera button is always the right-most item so it keeps the exact
            same position when entering/leaving quiz mode (no horizontal jump). */}
        <div id="topbar-controls">
          {!quizStarted && (
            <button
              className={`preset-btn${showQuizSetup ? ' active' : ''}`}
              onClick={() => setShowQuizSetup(v => !v)}
              title="Quiz Mode"
            >
              <span className="preset-ft"><Exam size={17} /></span>
              <span className="preset-sub">Quiz</span>
            </button>
          )}
          {!quizStarted && (
            <button
              id="demographic-toggle"
              className={`preset-btn${showDemoPanel ? ' active' : ''}`}
              onClick={() => openExclusive('demo')}
              title="Demographic Regression Scaling"
            >
              <span className="preset-ft"><Ruler size={17} /></span>
              <span className="preset-sub">Demographics</span>
            </button>
          )}
          <button
            className={`preset-btn${showCameraPanel ? ' active' : ''}`}
            onClick={() => openExclusive('camera')}
            title="Camera Angles"
          >
            <span className="preset-ft"><VideoCamera size={17} /></span>
            <span className="preset-sub">Camera</span>
          </button>
        </div>
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
        activeBoneGroup={activeBoneGroup}     setActiveBoneGroup={handleSelectBoneGroup}
        boneFadeMode={boneFadeMode}           setBoneFadeMode={setBoneFadeMode}
        isolated={isolated}                   onToggleIsolate={handleToggleIsolate}
        isolateEnabled={activeBoneGroup !== 'All Bones'}
        skeletonFaded={skeletonFaded}         setSkeletonFaded={setSkeletonFaded}
        musclesFaded={musclesFaded}           setMusclesFaded={setMusclesFaded}
        jointsFaded={jointsFaded}             setJointsFaded={setJointsFaded}
        vascularFaded={vascularFaded}         setVascularFaded={setVascularFaded}
        closeToken={dockCloseToken}
        onOpen={() => { setShowDemoPanel(false); setShowCameraPanel(false); setSelectedBone(null) }}
      />
      )}

      {/* Camera angles — available in both explorer and quiz (gated by `visible`).
          During a quiz the presets are relative to the locked region. */}
      <CameraControls onAngleSelect={setCameraPreset} visible={showCameraPanel} onClose={() => setShowCameraPanel(false)} />

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