// 공식 답변 출력
import "./question.css";

function AnswerPanel({
    answer,
    setAnswer,
    history,
    setHistory
}) {

    if (!answer) {
        return (
            <aside className="answer-panel">
                <span className="section-label">ANSWER</span>
                <h2 className="section-title">공식 답변</h2>
                <div className="empty-answer">
                    아직 해야할 답변이 없습니다.
                </div>
            </aside>
        );
    }

    const handleAnswer = (result) => {
        setHistory(
            history.map(item =>
                item.id === answer.id
                    ? { ...item, answer: result }
                    : item
            )
        )
        setAnswer(null)
    }

    return (
        <aside className="answer-panel">
            <span className="section-label">ANSWER</span>
            <h2 className="section-title">공식 답변</h2>
            <div className="answer-card">
                <div className="selected-player">
                    <div className="player-avatar">
                        {answer.player[0]}
                    </div>
                    <span>{answer.player}</span>
                </div>
                <div className="answer-question">
                    {answer.question}
                </div>
                <div className="answer-buttons">
                    <button
                        className="yes-btn"
                        onClick={() => handleAnswer("예")}
                    >
                        예
                    </button>

                    <button
                        className="no-btn"
                        onClick={() => handleAnswer("아니오")}
                    >
                        아니오
                    </button>
                </div>
            </div>
        </aside>
    )
}

export default AnswerPanel