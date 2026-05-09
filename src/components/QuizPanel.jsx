export default function QuizPanel({ quiz, questions, onNext }) {
  const { currentQ, answered, feedback } = quiz
  const q = questions[currentQ]

  return (
    <div id="quiz-panel" className="panel">
      <div className="panel-label">Quiz</div>
      <div>{q.prompt}</div>
      <div className="divider" />
      <div>{feedback}</div>
      {answered && (
        <button onClick={onNext}>
          {currentQ < questions.length - 1 ? 'Next' : 'Restart'}
        </button>
      )}
    </div>
  )
}
