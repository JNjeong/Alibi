import PlayerStatus from "./PlayerStatus";

function SubmissionStatus() {

    const players = [
        { name: "윤서진", status: "제출 완료", me: true, progress: "7 / 10" },
        { name: "한도윤", status: "제출 완료" },
        { name: "박정원", status: "제출 완료" },
        { name: "최유진", status: "제출 완료" },
        { name: "차은별", status: "제출 완료" },
        { name: "강민석", status: "제출 완료" },
        { name: "김하린", status: "제출 완료" },
        { name: "서지훈", status: "제출 완료" },
        { name: "문태성", status: "추리 중" },
        { name: "이준호", status: "추리 중" }
    ];

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
                        key={player.name}
                        name={player.name}
                        status={player.status}
                        isMe={player.me}
                        progress={player.progress}
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
    );
}

export default SubmissionStatus;