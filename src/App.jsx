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
  const [quiz, setQuiz] = useState(initialQuiz)

  function handleBoneSelect(mesh) {
    setSelectedBone(mesh)
    if (quiz.answered || !mesh) return

    const q = questions[quiz.currentQ]
    const clickedName = (mesh.name || mesh.parent?.name || '').toLowerCase()
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

  function handleNextQuestion() {
    setSelectedBone(null)
    setQuiz(prev => ({
      ...initialQuiz,
      currentQ: (prev.currentQ + 1) % questions.length,
    }))
  }

  return (
    <>
      <Scene selectedBone={selectedBone} onSelect={handleBoneSelect} />

      <div id="topbar">
        <div>
          <div className="title-main">Skeletal Atlas</div>
          <div className="title-sub">Human Anatomy · Interactive Model</div>
        </div>
      </div>

      <QuizPanel quiz={quiz} questions={questions} onNext={handleNextQuestion} />
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
