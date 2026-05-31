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
  const [statureScale,  setStatureScale]  = useState(1)
  const [shoulderScale, setShoulderScale] = useState(1)
  const [hipScale,      setHipScale]      = useState(1)
  const [showDemoPanel, setShowDemoPanel] = useState(false)

  const [quizStarted, setQuizStarted] = useState(false)
  const [quizLevel,   setQuizLevel]   = useState(1)
  const [quiz,        setQuiz]        = useState(initialQuiz)
  const [showMenu,    setShowMenu]    = useState(true)

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
      const { statureScale: sY, shoulderScale: sXZ, hipScale: hXZ } = typeOrObj
      if (sY  !== undefined) setStatureScale(sY)
      if (sXZ !== undefined) setShoulderScale(sXZ)
      if (hXZ !== undefined) setHipScale(hXZ)
    } else {
      // Legacy string form (kept for backward compatibility)
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
        onBoneNamesReady={setSkeletonBoneNames}
      />

      <div id="topbar">
        <div>
          <div className="title-main">Anatomy Explorer</div>
          <div className="title-sub">Human Anatomy · Interactive Model</div>
        </div>

        <div id="topbar-controls">
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
      </div>


      {/* Demographic Regression Panel — separate floating panel */}
      <DemographicPanel
        visible={showDemoPanel}
        onClose={() => setShowDemoPanel(false)}
        onScaleChange={handleScaleChange}
      />

      {/* LayerControls now absorbs BoneControls — all group props passed here */}
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
        onMultipleChoiceAnswer={handleMultipleChoiceAnswer}
        onTypeAnswer={handleTypeAnswer}
      />

      <InfoPanel
        selectedBone={selectedBone}
        formatName={formatName}
      />
    </>
  )
}