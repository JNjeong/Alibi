import "./question.css";

function HistoryPanel({ history }) {
    return (
        <section className="history-panel">
            <span className="section-label">HISTORY</span>
            <h2 className="section-title">질문 기록</h2>

            {history.length === 0 ? (
                <div className="empty-history">
                    아직 질문 기록이 없습니다.
                </div>
            ) : (
                <div className="history-list">
                    {history.map((item) => (
                        <div
                            key={item.id}
                            className="history-card"
                        >
                            <div className="history-player">{item.player}</div>

                            <div className="history-question-row">
                                <span className="history-question">Q. {item.question}</span>
                                <span
                                    className={`history-answer ${item.answer === "예" ? "yes" : "no"
                                        }`}
                                >
                                    {item.answer === "예" ? "예" : "아니오"}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

export default HistoryPanel;