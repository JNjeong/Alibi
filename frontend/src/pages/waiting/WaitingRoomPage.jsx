import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import { getRoom } from "../../api/room_api"
import ChatPanel from "../../components/chat/ChatPanel"
import ParticipantList from "../../components/waiting/ParticipantList"
import { useRoomSocket } from "../../hooks/useRoomSocket"
import useAuthStore from "../../store/authStore"
import styles from "./WaitingRoomPage.module.css"

function WaitingRoomPage() {
  const navigate = useNavigate()
  const { roomId } = useParams()

  const currentUser = useAuthStore((state) => state.user)
  const currentUserId = currentUser?._id || currentUser?.userId

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const {
    connected,
    roomState,
    chatMessages,
    socketError,
    leaveRoom,
    sendChat,
    startGame,
  } = useRoomSocket(roomId)

  useEffect(() => {
    let cancelled = false

    const fetchRoom = async () => {
      try {
        setLoading(true)
        setError("")

        await getRoom(roomId)
      } catch (fetchError) {
        console.error("방 조회 오류:", fetchError)

        if (!cancelled) {
          setError(
            fetchError.response?.data?.message ||
              "방 정보를 불러오지 못했습니다."
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    if (roomId) {
      fetchRoom()
    }

    return () => {
      cancelled = true
    }
  }, [roomId])

  const hostId = roomState?.host?._id || roomState?.host
  const isHost = String(hostId) === String(currentUserId)

  const handleLeave = () => {
    leaveRoom()
    navigate("/lobby")
  }

  const handleStart = () => {
    startGame()
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.message}>대기실 정보를 불러오는 중...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.page}>
        <p className={styles.error}>{error}</p>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => navigate("/lobby")}
        >
          로비로 돌아가기
        </button>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>WAITING ROOM</p>
          <h1 className={styles.title}>
            {roomState?.title || "대기실"}
          </h1>
          <p className={styles.meta}>
            초대 코드: {roomState?.inviteCode || "-"}
          </p>
        </div>

        <div className={styles.headerActions}>
          <span
            className={[
              styles.statusBadge,
              connected ? styles.statusOnline : styles.statusOffline,
            ].join(" ")}
          >
            {connected ? "실시간 연결됨" : "연결 중..."}
          </span>

          {!isHost && (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleLeave}
            >
              나가기
            </button>
          )}

          {isHost && (
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleStart}
              disabled={
                !connected ||
                (roomState?.currentPlayers ?? 0) < 2
              }
            >
              게임 시작
            </button>
          )}
        </div>
      </header>

      {(socketError) && (
        <p className={styles.error}>{socketError}</p>
      )}

      <main className={styles.layout}>
        <ParticipantList
          participants={roomState?.participants ?? []}
          currentPlayers={roomState?.currentPlayers ?? 0}
          maxPlayers={roomState?.maxPlayers ?? 10}
          hostId={hostId}
        />

        <ChatPanel
          players={(roomState?.participants ?? []).map((participant) => ({
            id: participant._id,
            nickname: participant.nickname,
            username: participant.username,
          }))}
          currentPlayerId={currentUserId}
          messages={chatMessages}
          onSend={sendChat}
          disabled={!connected}
          onlineCount={roomState?.currentPlayers ?? 0}
        />
      </main>
    </div>
  )
}

export default WaitingRoomPage
