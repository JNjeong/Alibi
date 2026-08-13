/** 현재 5라운드 진행과 전원 제출 상태를 보여주는 사이드바입니다. */
import "./statement.css"

function StatementSidebar({ game, submissionStatus }) {
    const statusLabel = {
        completed: "완료",
        current: "진행 중",
        locked: "대기",
    }
    const appliedHint = game.hints.find(
        hint => hint.appliesToRound === game.currentRound && hint.status === "revealed"
    )

    return (
        <aside className="statement-sidebar">
            <div className="sidebar-header">
                <span className="sidebar-round">
                    ROUND {game.currentRound} / {game.rounds.length}
                </span>
                <h2>라운드 진행</h2>
                <p>현재 라운드와 제출 현황을 확인하세요.</p>
            </div>

            <div className="round-list">
                {game.rounds.map((round) => (
                    <div
                        key={round.number}
                        className={`round-card ${round.status === "current" ? "active" : ""}`}
                    >
                        <span className="round-title">ROUND {round.number}</span>
                        <span className="round-time">{round.title}</span>
                        <span className="round-status">{statusLabel[round.status]}</span>
                    </div>
                ))}
            </div>

            <div className="public-time">
                <span>현재 제출</span>
                <h3>
                    {submissionStatus?.submittedCount ?? 0} / {submissionStatus?.totalCount ?? game.players.length}
                </h3>
                <div className="statement-progress-track" aria-hidden="true">
                    <span style={{
                        width: `${Math.min(100, ((submissionStatus?.submittedCount ?? 0) / Math.max(1, submissionStatus?.totalCount ?? game.players.length)) * 100)}%`
                    }} />
                </div>
                <p>
                    {appliedHint?.title || "전원 제출 후 서버가 자동으로 모순을 검사합니다."}
                </p>
            </div>
        </aside>
    )
}

export default StatementSidebar
