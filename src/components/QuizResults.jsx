import { QUIZ_MODES, QUIZ_REGIONS } from '../data/quizData.js'

// Full-screen results screen shown when a quiz finishes. Celebrates the score
// and reviews every question the user got wrong with the correct answer.
export default function QuizResults({ score, total, wrong, config, onRetry, onClose }) {
  const pct  = total ? Math.round((score / total) * 100) : 0
  const mode = QUIZ_MODES.find(m => m.level === config.level)
  const region = QUIZ_REGIONS[config.region]

  let verdict
  if (pct === 100)     verdict = { title: 'Flawless!', cls: 'gold' }
  else if (pct >= 80)  verdict = { title: 'Excellent work!', cls: 'great' }
  else if (pct >= 50)  verdict = { title: 'Good effort', cls: 'good' }
  else                 verdict = { title: 'Keep studying', cls: 'low' }

  return (
    <div className="quiz-overlay">
      <div className="quiz-results">
        <div className={`quiz-results-verdict ${verdict.cls}`}>{verdict.title}</div>

        <div className="quiz-score-ring">
          <div className="quiz-score-pct">{pct}%</div>
          <div className="quiz-score-frac">{score} / {total} correct</div>
        </div>

        <div className="quiz-results-meta">
          {region?.label} · {mode?.label}
        </div>

        {wrong.length > 0 ? (
          <div className="quiz-review">
            <div className="quiz-review-head">Review — {wrong.length} to revisit</div>
            <div className="quiz-review-list">
              {wrong.map((w, i) => (
                <div className="quiz-review-item" key={i}>
                  <div className="quiz-review-q">{w.prompt}</div>
                  <div className="quiz-review-a">
                    <span className="quiz-review-label">Answer</span> {w.answer}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="quiz-review-perfect">You didn't miss a single one — well done!</div>
        )}

        <div className="quiz-results-actions">
          <button className="quiz-start-btn" onClick={onRetry}>Try Again ↻</button>
          <button className="quiz-secondary-btn" onClick={onClose}>Back to Explorer</button>
        </div>
      </div>
    </div>
  )
}
