import PlayerStatus from "./PlayerStatus";

function SubmissionStatus({ game }) {
    const players = game.players ?? []
    const submittedCount = game.deductionStatus?.filter(player => player.submitted).length ?? 0

    return (
        <aside className="submission-status">
            <div className="submission-header">
                <div>
                    <span className="section-label">SUBMISSION STATUS</span>
                    <h2>제출 현황</h2>
                </div>
                <strong>{submittedCount} / {players.length}</strong>
            </div>

            <div className="status-list">
                {players.map((player) => {
                    const status = game.deductionStatus?.find(
                        p => p.userId === player.userId
                    )
                    const isMe = player.userId === game.viewer?.userId
                    return (
                        <PlayerStatus
                            key={player.userId}
                            name={player.nickname}
                            status={
                                status?.submitted
                                    ? "제출 완료"
                                    : "추리 중"
                            }
                            isMe={isMe}
                            progress={
                                isMe
                                    ? `${submittedCount} / ${players.length}`
                                    : undefined
                            }
                        />
                    );
                })}
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
