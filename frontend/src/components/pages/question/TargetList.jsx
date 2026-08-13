/** 공식 질문을 받을 다른 참가자를 고르는 목록입니다. */
import "./question.css"

function TargetList({
    players,
    selectedPlayer,
    setSelectedPlayer,
    questionCount,
    maxQuestions,
}) {
    return (
        <aside className="target-list">
            <div className="subpage-card-heading">
                <div>
                    <span className="section-label">CHOOSE A TARGET</span>
                    <h2 className="section-title">질문 대상</h2>
                </div>
                <span className="target-count">{players.length}명</span>
            </div>

            <div className="player-grid">
                {players.map((player) => (
                    <button
                        type="button"
                        key={player.userId}
                        className={`player-card ${selectedPlayer?.userId === player.userId ? "active" : ""}`}
                        onClick={() => setSelectedPlayer(player)}
                    >
                        <div className="avatar" style={{ "--target-color": player.color }}>
                            {player.nickname.slice(0, 1)}
                        </div>
                        <div className="target-player-copy">
                            <p className="player-name">{player.nickname}</p>
                            <span className="player-status">{player.character.name}</span>
                        </div>
                    </button>
                ))}
            </div>

            <div className="question-count">
                <span>게임 전체 질문 횟수</span>
                <strong>{questionCount} / {maxQuestions}</strong>
            </div>
        </aside>
    )
}

export default TargetList
