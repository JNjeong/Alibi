import mockGame from "../../../data/mockgame"

function StatementSidebar() {
    const rounds = mockGame.rounds
    const statusLabel = {
        completed: "완료",
        current: "진행 중",
        locked: "대기",
    }

    return (
        <aside className="statement-sidebar">
            <div className="sidebar-header">
                <span className="sidebar-round">
                    ROUND {mockGame.currentRound} / {rounds.length}
                </span>
                <h2>진술 진행</h2>
            </div>

            <div className="round-list">
                {rounds.map((round) => (
                    <div
                        key={round.number}
                        className={`round-card ${round.status === "current" ? "active" : ""}`}
                    >
                        <span className="round-title">
                            ROUND {round.number}
                        </span>
                        <span className="round-time">
                            {round.title}
                        </span>
                        <span className="round-status">
                            {statusLabel[round.status]}
                        </span>
                    </div>
                ))}
            </div>

            <div className="public-time">
                <span>공개 구간</span>
                <h3>15:00 ~ 16:00</h3>
                <p>60분 구간</p>
            </div>
        </aside>
    )
}

export default StatementSidebar