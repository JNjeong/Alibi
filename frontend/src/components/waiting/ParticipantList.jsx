import styles from "./ParticipantList.module.css"

function ParticipantList({
  participants = [],
  currentPlayers = 0,
  maxPlayers = 10,
  hostId,
}) {
  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <div>
          <p className={styles.label}>PARTICIPANTS</p>
          <h2 className={styles.title}>참가자 목록</h2>
        </div>

        <span className={styles.count}>
          {currentPlayers}/{maxPlayers}
        </span>
      </header>

      <ul className={styles.list}>
        {participants.map((participant) => {
          const displayName =
            participant.nickname || participant.username || "사용자"

          const initial = displayName.trim().charAt(0).toUpperCase() || "?"

          const isHost =
            participant.isHost ||
            String(participant._id) === String(hostId)

          return (
            <li key={participant._id} className={styles.item}>
              <div className={styles.avatar}>{initial}</div>

              <div className={styles.info}>
                <strong className={styles.name}>{displayName}</strong>
                <span className={styles.username}>
                  @{participant.username}
                </span>
              </div>

              {isHost && (
                <span className={styles.hostBadge}>방장</span>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default ParticipantList
