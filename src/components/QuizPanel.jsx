export default function QuizPanel({ quiz, questions, started, onStart, onNext }) {
  const { currentQ, answered, result, feedback } = quiz
  const q = questions[currentQ]

  return (
    <div id="quiz-panel" className="panel">
      <div className="panel-label">Quiz Challenge</div>
      {!started ? (
        <>
          <div className="quiz-intro">
            Ready to test your anatomy skills? Click Start to begin the quiz.
          </div>
          <button onClick={onStart}>Start Quiz</button>
        </>
      ) : (
        <>
          <div className="quiz-prompt">{q.prompt}</div>
          <div className="divider" />
          <div className={`quiz-feedback ${result || 'loading'}`}>
            {feedback}
          </div>
          {answered && (
            <button onClick={onNext}>
              {currentQ < questions.length - 1 ? 'Next Question' : 'Restart Quiz'}
            </button>
          )}
        </>
      )}
    </div>
  )
}
