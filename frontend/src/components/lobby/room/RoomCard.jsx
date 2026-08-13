import styles from "./RoomCard.module.css"

function RoomCard({
  room,
  onEnter,
  isJoining = false
}) {
  const currentPlayers =
    room.currentPlayers ??
    room.participants?.length ??
    0

  const maxPlayers = room.maxPlayers ?? 10

  const hostName =
    room.host?.nickname ||
    room.host?.username ||
    "알 수 없음"

  const isFull = currentPlayers >= maxPlayers
  const isPlaying = room.status === "playing"
  const isWaiting = room.status === "waiting"

  // 입장 중이거나, 정원이 찼거나, 대기 상태가 아니면 입장 불가
  const isEnterDisabled =
    isJoining ||
    isFull ||
    !isWaiting

  const statusText = isPlaying
    ? "게임 중"
    : isFull
      ? "정원 마감"
      : "대기 중"

  const statusClassName = [
    styles.statusBadge,
    isPlaying
      ? styles.statusPlaying
      : isFull
        ? styles.statusFull
        : styles.statusWaiting
  ].join(" ")

  const cardClassName = [
    styles.card,
    isPlaying || isFull
      ? styles.cardUnavailable
      : ""
  ].join(" ")

  const createdTime = room.createdAt
    ? new Date(room.createdAt).toLocaleTimeString(
        "ko-KR",
        {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false
        }
      )
    : ""

  const handleEnter = () => {
    if (isEnterDisabled) {
      return
    }

    onEnter?.(room)
  }

  const disabledMessage = isJoining
    ? "방 입장 처리 중"
    : isFull
      ? "방 정원이 가득 찼습니다."
      : isPlaying
        ? "이미 게임이 시작된 방입니다."
        : "현재 입장할 수 없는 방입니다."

  return (
    <article className={cardClassName}>
      <div className={styles.top}>
        <div className={styles.roomInfo}>
          <span
            className={[
              styles.statusDot,
              isWaiting && !isFull
                ? styles.statusDotWaiting
                : styles.statusDotUnavailable
            ].join(" ")}
          />

          <div className={styles.textArea}>
            <h3 className={styles.title}>
              {room.title || "이름 없는 방"}
            </h3>

            <p className={styles.meta}>
              호스트: {hostName}
              {createdTime && ` · ${createdTime}`}
            </p>
          </div>
        </div>

        <div className={styles.actionArea}>
          <span className={styles.playerCount}>
            <span
              className={styles.playerIcon}
              aria-hidden="true"
            >
              ♙
            </span>

            {currentPlayers}/{maxPlayers}
          </span>

          <span className={statusClassName}>
            {statusText}
          </span>

          <button
            type="button"
            className={styles.enterButton}
            onClick={handleEnter}
            disabled={isEnterDisabled}
            aria-label={
              isEnterDisabled
                ? disabledMessage
                : `${room.title || "방"} 입장`
            }
            title={
              isEnterDisabled
                ? disabledMessage
                : "방 입장"
            }
          >
            {isJoining ? "…" : "›"}
          </button>
        </div>
      </div>

      <div
        className={styles.progress}
        aria-label={`현재 인원 ${currentPlayers}명, 최대 인원 ${maxPlayers}명`}
      >
        {Array.from({ length: maxPlayers }).map(
          (_, index) => (
            <span
              key={index}
              className={[
                styles.progressItem,
                index < currentPlayers
                  ? styles.progressItemActive
                  : ""
              ].join(" ")}
            />
          )
        )}
      </div>
    </article>
  )
}

export default RoomCard