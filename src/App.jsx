import { useState } from 'react'
import Scene from './components/Scene.jsx'
import QuizPanel from './components/QuizPanel.jsx'
import InfoPanel from './components/InfoPanel.jsx'
import questions from './data/questions.json'

function formatName(raw) {
  if (!raw) return 'Unknown Structure'
  return raw.replace(/\.g$/, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim()
}

const initialQuiz = { currentQ: 0, answered: false, result: null, feedback: 'Waiting for selection…' }

export default function App() {
  const [selectedBone, setSelectedBone] = useState(null)
  const [quizStarted, setQuizStarted] = useState(false)
  const [quizLevel, setQuizLevel] = useState(1)
  const [quiz, setQuiz] = useState(initialQuiz)
  const [showMenu, setShowMenu] = useState(true)

  const levelQuestions = questions.filter(q => q.level === quizLevel)
  const q = levelQuestions[quiz.currentQ]


  // Level 2 and 3 the model is clickable, user clicks the correct bone
  const modelClickable = quizLevel === 2 || quizLevel === 3 || !quizStarted

  // Level 1 and 4 highlights a bone for the user to identify
  const highlightBone = quizStarted && (quizLevel === 1 || quizLevel === 4) && !quiz.answered && q ? q.target : null


  function handleBoneSelect(mesh) {
    setSelectedBone(mesh)
    console.log('clicked:', mesh.name, '| parent:', mesh.parent?.name) // add this
    // Level 2 and Level 3 use model clicks during a quiz
    if (!quizStarted || (quizLevel !== 2 && quizLevel !== 3) || quiz.answered || !mesh) return


    const q = levelQuestions[quiz.currentQ]
    const clickedName = (mesh.name || mesh.parent?.name || '').toLowerCase()
    if (!q) return

    const correct = q.target === null || clickedName.includes(q.target)
    const boneName = formatName(mesh.name || mesh.parent?.name)

    setQuiz(prev => ({
      ...prev,
      answered: true,
      result: correct ? 'correct' : 'wrong',
      feedback: correct
        ? (q.target === null ? `Good job! That's the ${boneName}.` : 'Correct! Well done.')
        : `Not quite — that's the ${boneName}.`,
    }))
  }

  // Level 1: user clicks one of the multiple choice buttons
  function handleMultipleChoiceAnswer(option) {
    if (quiz.answered) return
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

  function handleStartQuiz() {
    setSelectedBone(null)
    setQuiz(initialQuiz)
    setQuizStarted(true)
  }

  function handleEndQuiz() {
    setSelectedBone(null)
    setQuiz(initialQuiz)
    setQuizStarted(false)
  }

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
        highlightBone={highlightBone}
        clickable={modelClickable}
      />

      <div id="topbar">
        <div>
          <div className="title-main">Skeletal Atlas</div>
          <div className="title-sub">Human Anatomy · Interactive Model</div>
        </div>
      </div>

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
