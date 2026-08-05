import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import { getRoom } from "../../api/room_api"
import ChatPanel from "../../components/chat/ChatPanel"
import ParticipantList from "../../components/waiting/ParticipantList"
import { useRoomSocket } from "../../hooks/useRoomSocket"
import useAuthStore from "../../store/authStore"
import styles from "./WaitingRoomPage.module.css"

const MIN_PLAYERS = 9
const MAX_PLAYERS = 10

function getStartGuideMessage({ roomState, isHost, canStart }) {
  if (!roomState) {
    return null
  }

  const count = roomState.currentPlayers ?? 0

  if (count < MIN_PLAYERS) {
    return `게임 시작에는 ${MIN_PLAYERS}~${MAX_PLAYERS}명이 필요합니다. (현재 ${count}명)`
  }

  if (count > MAX_PLAYERS) {
    return `참가자는 최대 ${MAX_PLAYERS}명까지 가능합니다.`
  }

  const hostParticipant = roomState.participants?.find(
    (participant) => participant.isHost
  )

  if (hostParticipant && !hostParticipant.isOnline) {
    return "방장이 대기실에 접속해야 게임을 시작할 수 있습니다."
  }

  const nonHostParticipants =
    roomState.participants?.filter((participant) => !participant.isHost) ?? []
  const notReadyCount = nonHostParticipants.filter(
    (participant) => !participant.isReady
  ).length

  if (notReadyCount > 0) {
    return `모든 참가자가 준비해야 합니다. (준비 ${roomState.readyCount ?? 0}/${count}, 미준비 ${notReadyCount}명)`
  }

  if (isHost && canStart) {
    return "모든 조건이 충족되었습니다. 게임을 시작할 수 있습니다."
  }

  if (!isHost) {
    return "전원 준비 완료. 방장의 시작을 기다리는 중입니다."
  }

  return null
}

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
    onGameStart,
    retryConnection,
    clearSocketError,
  } = useRoomSocket(roomId)

  useEffect(() => {
    return onGameStart(({ gameId }) => {
      if (gameId) {
        navigate(`/game/${gameId}`)
      }
    })
  }, [navigate, onGameStart])

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
  const startGuideMessage = getStartGuideMessage({
    roomState,
    isHost,
    canStart,
  })

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
          <p className={styles.ruleHint}>
            게임 시작: {MIN_PLAYERS}~{MAX_PLAYERS}명 · 전원 준비 후 방장 시작
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

      {startGuideMessage && (
        <div
          className={[
            styles.guideBanner,
            canStart && isHost ? styles.guideBannerReady : "",
          ].join(" ")}
        >
          <p className={styles.guideText}>{startGuideMessage}</p>
        </div>
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
