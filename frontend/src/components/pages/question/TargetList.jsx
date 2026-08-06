// 공식 질문 왼쪽
// 질문할 플레이어 선택
import "./question.css"

function TargetList({
    players,
    selectedPlayer,
    setSelectedPlayer,
    history
}) {
    return (
        <aside className="target-list">
            <span className="section-label">CHOOSE A TARGET</span>
            <h2 className="section-title">질문 대상 선택</h2>

            <div className="player-grid">
                {players.map((player) => (
                    <button
                        key={player.id}
                        className={`player-card ${selectedPlayer.id === player.id ? "active" : ""
                            }`}
                        onClick={() => setSelectedPlayer(player)}
                    >
                        <div className="avatar">{player.character.name[0]}</div>
                        <p className="player-name">{player.character.name}</p>
                        <span className="player-status">
                            {player.statementSubmitted ? "제출 완료" : "질문 가능"}
                        </span>
                    </button>
                ))}
            </div>

            <div className="question-count">
                <span>질문 횟수</span>
                <strong>{history.length} / 2</strong>
            </div>
        </aside>
    )
}

export default TargetList