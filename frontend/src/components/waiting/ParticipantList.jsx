import styles from "./ParticipantList.module.css"

function ParticipantList({
  participants = [],
  currentPlayers = 0,
  maxPlayers = 10,
  hostId,
  readyCount = 0,

  // 친구 요청

    currentUserId,
  friendStatusByUserId = {},
  sendingFriendId = "",
  onSendFriendRequest,
}) {
  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <div>
          <p className={styles.label}>PARTICIPANTS</p>
          <h2 className={styles.title}>참가자 목록</h2>
        </div>

        <div className={styles.badges}>
          <span className={styles.count}>
            {currentPlayers}/{maxPlayers}
          </span>
          <span className={styles.readyCount}>
            준비 {readyCount}/{currentPlayers}
          </span>
        </div>
      </header>

      <ul className={styles.list}>
        {participants.map((participant) => {
          const displayName =
            participant.nickname || participant.username || "사용자"

          const initial = displayName.trim().charAt(0).toUpperCase() || "?"

          const isHost =
            participant.isHost ||
            String(participant._id) === String(hostId)

            // 친구 요청
            const participantId = String(participant._id)
const isCurrentUser =
  participantId === String(currentUserId)

const friendStatus =
  friendStatusByUserId[participantId]

const isSending =
  sendingFriendId === participantId

          return (
            <li key={participant._id} className={styles.item}>
              <div className={styles.avatar}>{initial}</div>

              <div className={styles.info}>
                <strong className={styles.name}>{displayName}</strong>
                <span className={styles.username}>
                  @{participant.username}
                </span>
              </div>

              <div className={styles.statusGroup}>
                <span
                  className={[
                    styles.onlineBadge,
                    participant.isOnline
                      ? styles.online
                      : styles.offline,
                  ].join(" ")}
                >
                  {participant.isOnline ? "접속" : "오프라인"}
                </span>

                {isHost ? (
                  <span className={styles.hostBadge}>방장</span>
                ) : (
                  <span
                    className={[
                      styles.readyBadge,
                      participant.isReady
                        ? styles.ready
                        : styles.notReady,
                    ].join(" ")}
                  >
                    {participant.isReady ? "준비" : "대기"}
                  </span>
                )}

                {!isCurrentUser && (
                <button
                  type="button"
                  className={styles.friendButton}
                  onClick={() => onSendFriendRequest?.(participant)}
                  disabled={Boolean(friendStatus) || isSending}
                >
                  {isSending
                    ? "요청 중..."
                    : friendStatus === "friend"
                      ? "이미 친구"
                      : friendStatus === "sent"
                        ? "요청 보냄"
                        : friendStatus === "received"
                          ? "요청 받음"
                          : "+ 친구 추가"}
                </button>
              )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default ParticipantList
