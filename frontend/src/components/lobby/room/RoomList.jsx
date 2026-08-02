import RoomCard from "./RoomCard"
import styles from "./RoomList.module.css"

function RoomList({
  rooms = [],
  onEnter,
  joiningRoomId = null,
  loading = false,
  error = ""
}) {
  if (loading) {
    return (
      <div className={styles.messageBox}>
        방 목록을 불러오는 중...
      </div>
    )
  }

  if (error) {
    return (
      <div
        className={`${styles.messageBox} ${styles.errorMessage}`}
      >
        {error}
      </div>
    )
  }

  if (rooms.length === 0) {
    return (
      <div className={styles.emptyBox}>
        <strong>생성된 방이 없습니다.</strong>
        <span>새로운 방을 만들어 게임을 시작해보세요.</span>
      </div>
    )
  }

  return (
    <div className={styles.roomList}>
      {rooms.map((room) => {
        const roomId =
          room.roomId ??
          room._id

        return (
          <RoomCard
            key={roomId}
            room={room}
            onEnter={onEnter}
            isJoining={
              joiningRoomId?.toString() ===
              roomId?.toString()
            }
          />
        )
      })}
    </div>
  )
}

export default RoomList