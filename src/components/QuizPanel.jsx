import { useState, useEffect } from 'react'

export default function QuizPanel({ quiz, questions, started, quizLevel, onLevelChange, onStart, onEnd, onNext, onAnswer, onTypeAnswer }) {
  useEffect(() => {
    setTypeInput('')
  }, [quiz.currentQ])
  const { currentQ, answered, result, feedback } = quiz
  const q = questions[currentQ]
  const hasOptions = Array.isArray(q?.options) && q.options.length > 0
  const [typeInput, setTypeInput] = useState('')

  return (
    <div id="quiz-panel" className="panel">
      <div className="panel-label">Quiz Challenge</div>

      {!started ? (
        <>
          <div className="quiz-intro" style={{ marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>
            Ready to test your anatomy knowledge?
          </div>

          {/* Level selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            {[
              { level: 1, label: 'Level 1', desc: 'Multiple choice' },
              { level: 2, label: 'Level 2', desc: 'Spot test' },
              { level: 3, label: 'Level 3', desc: 'Description' },
              { level: 4, label: 'Level 4', desc: 'Type the name' },
            ].map(({ level, label, desc }) => (
              <div
                key={level}
                onClick={() => onLevelChange(level)}
                style={{
                  padding: '0.6rem 0.8rem',
                  borderRadius: '8px',
                  border: `2px solid ${quizLevel === level ? '#0066ff' : 'rgba(255,255,255,0.1)'}`,
                  background: quizLevel === level ? 'rgba(0,102,255,0.15)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-bright)' }}>{label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{desc}</div>
              </div>
            ))}
          </div>

          <button onClick={onStart}>Start Quiz</button>
        </>
      ) : (
        <>
          {/* Question counter */}
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>
            Question {currentQ + 1} of {questions.length} · Level {quizLevel}
          </div>

          <div className="quiz-prompt">{q ? q.prompt : 'No questions available for this level.'}</div>
          <div className="divider" />

          {/* Level 1: multiple choice buttons */}
          {quizLevel === 1 && !answered && hasOptions && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', margin: '0.5rem 0' }}>
              {q.options.map(option => (
                <button
                  key={option}
                  onClick={() => onAnswer(option)}
                  style={{ margin: 0 }}
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          {quizLevel === 1 && !answered && !hasOptions && (
            <div className="quiz-feedback loading">
              This question needs answer options in questions.json
            </div>
          )}

          {/* Level 2 and Level 3: prompt user to click the correct bone on the model */}
          {(quizLevel === 2 || quizLevel === 3) && !answered && (
            <div className="quiz-feedback loading">
              Click the correct bone on the skeleton
            </div>
          )}
          {/* Level 4: user types the name of the bone - for simplicity we just check if the answer includes the target keyword */}
          {quizLevel === 4 && !answered && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: '0.5rem 0' }}>
              <input
                type="text"
                placeholder="Type the bone name..."
                value={typeInput}
                onChange={e => setTypeInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && onTypeAnswer(typeInput)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '2px solid rgba(0,102,255,0.4)',
                  borderRadius: '8px',
                  padding: '0.7rem 1rem',
                  color: 'var(--text-bright)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  width: '100%',
                }}
              />
              <button onClick={() => onTypeAnswer(typeInput)}>
                Submit Answer
              </button>
            </div>
          )}
          {/* Feedback after answering */}
          {answered && (
            <div className={`quiz-feedback ${result}`}>
              {feedback}
            </div>
          )}

          <div className="quiz-actions" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
            {answered && (
              <button onClick={onNext}>
                {currentQ < questions.length - 1 ? 'Next Question' : 'Restart Quiz'}
              </button>
            )}
            <button
              onClick={onEnd}
              style={{
                background: 'rgba(255,0,85,0.2)',
                border: '2px solid rgba(255,0,85,0.5)',
                boxShadow: 'none',
                fontSize: '0.75rem',
              }}
            >
              End Quiz
            </button>
          </div>
        </>
      )}
    </div>
  )
}
