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
    reconnecting,
    roomState,
    chatMessages,
    socketError,
    leaveRoom,
    sendChat,
    setReady,
    startGame,
    retryConnection,
    clearSocketError,
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

  const currentParticipant = roomState?.participants?.find(
    (participant) => String(participant._id) === String(currentUserId)
  )

  const isReady = currentParticipant?.isReady ?? false
  const canStart = roomState?.canStart ?? false

  const handleLeave = () => {
    leaveRoom()
    navigate("/lobby")
  }

  const handleRetryFetch = () => {
    setError("")
    setLoading(true)

    getRoom(roomId)
      .catch((fetchError) => {
        setError(
          fetchError.response?.data?.message ||
            "방 정보를 불러오지 못했습니다."
        )
      })
      .finally(() => {
        setLoading(false)
      })
  }

  const handleStart = () => {
    startGame()
  }

  const handleToggleReady = () => {
    setReady(!isReady)
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
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleRetryFetch}
          >
            다시 시도
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => navigate("/lobby")}
          >
            로비로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  const connectionLabel = connected
    ? "실시간 연결됨"
    : reconnecting
      ? "재연결 중..."
      : "연결 끊김"

  const showRoomSync = connected && !roomState

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
              connected
                ? styles.statusOnline
                : reconnecting
                  ? styles.statusReconnecting
                  : styles.statusOffline,
            ].join(" ")}
          >
            {connectionLabel}
          </span>

          {!isHost && (
            <>
              <button
                type="button"
                className={
                  isReady
                    ? styles.secondaryButton
                    : styles.primaryButton
                }
                onClick={handleToggleReady}
                disabled={!connected}
              >
                {isReady ? "준비 취소" : "준비"}
              </button>

              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleLeave}
              >
                나가기
              </button>
            </>
          )}

          {isHost && (
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleStart}
              disabled={!connected || !canStart}
            >
              게임 시작
            </button>
          )}
        </div>
      </header>

      {showRoomSync && (
        <p className={styles.message}>대기실 정보를 동기화하는 중...</p>
      )}

      {socketError && (
        <div className={styles.errorBanner}>
          <p className={styles.error}>{socketError}</p>
          <div className={styles.errorActions}>
            {!connected && (
              <button
                type="button"
                className={styles.primaryButton}
                onClick={retryConnection}
              >
                다시 연결
              </button>
            )}
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={clearSocketError}
            >
              닫기
            </button>
            {socketError.includes("정리") && (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => navigate("/lobby")}
              >
                로비로 돌아가기
              </button>
            )}
          </div>
        </div>
      )}

      <main className={styles.layout}>
        <ParticipantList
          participants={roomState?.participants ?? []}
          currentPlayers={roomState?.currentPlayers ?? 0}
          maxPlayers={roomState?.maxPlayers ?? 10}
          hostId={hostId}
          readyCount={roomState?.readyCount ?? 0}
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
