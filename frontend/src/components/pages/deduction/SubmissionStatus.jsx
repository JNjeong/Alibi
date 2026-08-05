import PlayerStatus from "./PlayerStatus";
import mockGame from "../../../data/mockgame";

function SubmissionStatus() {
    const players = mockGame.players;

    return (
        <aside className="submission-status">
            <div className="submission-header">
                <span className="section-label">
                    SUBMISSION STATUS
                </span>
                <h2>
                    제출 현황
                </h2>
            </div>

            <div className="status-list">
                {players.map((player) => (
                    <PlayerStatus
                        key={player.id}
                        name={player.character.name}
                        status={
                            player.statusmentSubmitted
                                ? "제출 완료" : "추리 중"
                        }
                        isMe={player.isMe}
                        progress={
                            player.isMe
                                ? `${mockGame.rounds[mockGame.currentRound - 1].submitted} / ${mockGame.rounds[mockGame.currentRound - 1].total}`
                                : undefined
                        }
                    />
                ))}
            </div>
            <div className="submission-notice">
                <h4>Tip</h4>
                <p>
                    팀원의 제출 상태를 확인하면서
                    자신의 추리를 다시 검토해 보세요.
                </p>
            </div>
        </aside>
    )
}

export default SubmissionStatus