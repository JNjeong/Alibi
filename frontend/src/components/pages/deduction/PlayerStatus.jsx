function PlayerStatus({
    name,
    status,
    isMe = false,
    progress
}) {
    return (
        <div className={`player-status ${isMe ? "me" : ""}`}>

            <div className="player-left">

                <div className="player-avatar">
                    {name[0]}
                </div>

                <div className="player-info">

                    <h4>
                        {name}
                        {isMe && " (나)"}
                    </h4>

                    {isMe ? (
                        <p>모두 제출하면 공개</p>
                    ) : (
                        <p className={status === "제출 완료" ? "complete" : ""}>
                            {status}
                        </p>
                    )}

                </div>

            </div>

            {isMe && (
                <div className="player-progress">
                    {progress}
                </div>
            )}

        </div>
    );
}

export default PlayerStatus;