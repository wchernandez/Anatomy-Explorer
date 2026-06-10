import { useState, useEffect } from 'react'

// In-quiz heads-up panel. Shows progress, live score and the current question's
// answer interface for the active mode. Setup and results live in their own
// full-screen overlays; this panel is only rendered while a quiz is running.
export default function QuizPanel({ quiz, questions, quizLevel, region, onQuit, onNext, onMultipleChoiceAnswer, onTypeAnswer }) {
  const [typeInput, setTypeInput] = useState('')
  useEffect(() => { setTypeInput('') }, [quiz.currentQ])

  const { currentQ, answered, result, feedback, score } = quiz
  const q = questions[currentQ]
  const hasOptions = Array.isArray(q?.options) && q.options.length > 0
  const isLast = currentQ >= questions.length - 1
  // `region` is the filter-group key (e.g. 'All Bones', 'Cranial'), used as-is.
  const regionLabel = region || ''

  return (
    <div id="quiz-panel" className="panel">
      <div className="quiz-hud-top">
        <div className="panel-label" style={{ margin: 0 }}>Quiz · {regionLabel}</div>
        <div className="quiz-score-badge">{score} pt{score === 1 ? '' : 's'}</div>
      </div>

      {/* Progress */}
      <div className="quiz-progress-row">
        <span>Question {currentQ + 1} of {questions.length}</span>
        <span>Level {quizLevel}</span>
      </div>
      <div className="quiz-progress-track">
        <div className="quiz-progress-fill" style={{ width: `${((currentQ + (answered ? 1 : 0)) / questions.length) * 100}%` }} />
      </div>

      <div className="quiz-prompt">{q ? q.prompt : 'No questions available.'}</div>
      <div className="divider" />

      {/* Level 1: multiple choice */}
      {quizLevel === 1 && !answered && hasOptions && (
        <div className="quiz-options">
          {q.options.map(option => (
            <button key={option} className="quiz-option-btn" onClick={() => onMultipleChoiceAnswer(option)}>
              {option}
            </button>
          ))}
        </div>
      )}

      {/* Levels 2 & 3: click the bone on the model */}
      {(quizLevel === 2 || quizLevel === 3) && !answered && (
        <div className="quiz-feedback loading">
          {quizLevel === 3 ? 'Click the matching bone on the skeleton' : 'Click the correct bone on the skeleton'}
        </div>
      )}

      {/* Level 4: type the name */}
      {quizLevel === 4 && !answered && (
        <div className="quiz-options">
          <input
            type="text"
            className="quiz-type-input"
            placeholder="Type the bone name…"
            value={typeInput}
            autoFocus
            onChange={e => setTypeInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onTypeAnswer(typeInput)}
          />
          <button className="quiz-option-btn" onClick={() => onTypeAnswer(typeInput)}>Submit Answer</button>
        </div>
      )}

      {/* Feedback */}
      {answered && <div className={`quiz-feedback ${result}`}>{feedback}</div>}

      <div className="quiz-actions">
        {answered && (
          <button className="quiz-next-btn" onClick={onNext}>
            {isLast ? 'See Results →' : 'Next Question →'}
          </button>
        )}
        <button className="quiz-quit-btn" onClick={onQuit}>Quit Quiz</button>
      </div>
    </div>
  )
}
