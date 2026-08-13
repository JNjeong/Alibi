/** 서버에 저장된 전체 공식 질문·답변 기록입니다. */
import "./question.css"

function HistoryPanel({ game, history }) {
    const playerName = id => game.players.find(player => player.userId === id)?.nickname || "알 수 없음"

    return (
        <section className="history-panel">
            <div className="subpage-card-heading">
                <div>
                    <span className="section-label">HISTORY</span>
                    <h2 className="section-title">공식 질문 기록</h2>
                </div>
                <span className="history-count">{history.length}건</span>
            </div>

            {history.length === 0 ? (
                <div className="empty-history">아직 질문 기록이 없습니다.</div>
            ) : (
                <div className="history-list">
                    {history.map(item => (
                        <div key={item.id} className="history-card">
                            <div className="history-player">
                                <strong>{playerName(item.authorId)}</strong>
                                <span>→</span>
                                <strong>{playerName(item.targetId)}</strong>
                            </div>
                            <div className="history-question-row">
                                <span className="history-question">Q. {item.content}</span>
                                <span className={`history-answer ${item.lifecycleStatus === "timed_out" ? "pass" : item.answer?.answer ? "yes" : item.answer ? "no" : "pass"}`}>
                                    {item.lifecycleStatus === "timed_out"
                                        ? "시간 초과"
                                        : item.answer
                                            ? (item.answer.answer ? "예" : "아니오")
                                            : "대기"}
                                </span>
                            </div>
                            {item.answer?.status === "contradiction" && (
                                <div className="history-conflict" role="status">
                                    모순 감지 · 다른 공개 공식 기록과 동시에 성립할 수 없습니다.
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </section>
    )
}

export default HistoryPanel
