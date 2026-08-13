// GameContext v6
// -----------------------------------------------------------------------------
// - MongoDB Game 상태는 GET /api/games/:gameId가 원본입니다.
// - Socket은 변경 알림/채팅에 사용하고, 상세 이벤트마다 중복 GET을 발생시키지 않습니다.
// - stageEndsAt은 서버 시각(serverNow)과의 offset으로 계산해 플레이어 PC 시계 차이를 제거합니다.
// - 공식 진술/Q&A 모순검사는 서버가 GameSetter 기준으로 자동 실행합니다.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  answerGameQuestion,
  createClientRequestId,
  createGameDeduction,
  createGameQuestion,
  createGameStatement,
  getGame,
} from "../api/game_api"
import { getRoomSocket } from "../api/socket"
import adaptGameResponse from "./gameAdapter"

import { getRoom } from "../api/room_api"

// JWT에서 userId 가져오기
const getCurrentUserId = () => {
  const token = localStorage.getItem("token")

  if (!token) return null

  try {
    const payload = JSON.parse(atob(token.split(".")[1]))
    return payload.userId || null
  } catch {
    return null
  }
}

const GameContext = createContext(null)

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback

const chooseNewerResponse = (previous, incoming) => {
  if (!previous?.game) return incoming
  if (!incoming?.game) return previous

  const previousRevision = Number(previous.game.revision || 0)
  const incomingRevision = Number(incoming.game.revision || 0)
  return incomingRevision >= previousRevision ? incoming : previous
}

const normalizeChatMessage = (message) => ({
  id: String(message.id),
  authorId: String(message.senderId || message.authorId),
  content: message.content,
  createdAt: new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(message.createdAt)),
})

export function GameProvider({ children }) {
  
  const navigate = useNavigate()
  const { gameId } = useParams()
  const socket = getRoomSocket()
  const [rawResponse, setRawResponse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [connected, setConnected] = useState(socket.connected)
  const [gameNotice, setGameNotice] = useState(null)
  const [chatMessages, setChatMessages] = useState([])
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [serverTimeOffsetMs, setServerTimeOffsetMs] = useState(0)

  const game = useMemo(() => adaptGameResponse(rawResponse), [rawResponse])
  
  // 방 정보의 host를 기준으로 시간 스킵 권한을 표시합니다.
  const [room, setRoom] = useState(null)
  useEffect(() => {
  if (!game?.roomId) return

  const loadRoom = async () => {
    try {
      const response = await getRoom(game.roomId)
      setRoom(response.room)
    } catch (error) {
      console.error("방 정보 조회 실패:", error)
    }
  }
  loadRoom()
}, [game?.roomId])

  // 현재 사용자가 방장인지 확인합니다.
  const currentUserId = getCurrentUserId()
  const isHost =
  Boolean(room?.host?._id) &&
  String(room.host._id) === String(currentUserId)

  const currentPlayer = useMemo(
    () => game?.players?.find((player) => player.id === game.currentPlayerId) || null,
    [game]
  )

  // 같은 값을 Context state로 두 번 복사하지 않고 서버 game에서 파생합니다.
  const submissionStatus = game?.submissionStatus || null
  const pendingQuestionCount = submissionStatus?.pendingQuestionCount || 0
  const syncServerClock = useCallback((response, clientReferenceMs = Date.now()) => {
    const serverNow = response?.game?.serverNow
    if (!serverNow) return
    const serverMs = new Date(serverNow).getTime()
    if (Number.isFinite(serverMs)) {
      setServerTimeOffsetMs(serverMs - clientReferenceMs)
    }
  }, [])

  const refreshGame = useCallback(
    async ({ silent = false } = {}) => {
      if (!gameId) return null

      try {
        if (!silent) setLoading(true)
        const requestStartedAt = Date.now()
        const response = await getGame(gameId)
        const responseReceivedAt = Date.now()
        // 왕복 지연의 절반을 보정해 서로 다른 PC의 로컬 시계 차이를 최소화합니다.
        syncServerClock(
          response,
          requestStartedAt + (responseReceivedAt - requestStartedAt) / 2
        )
        setRawResponse((previous) => chooseNewerResponse(previous, response))
        setError("")
        return response
      } catch (requestError) {
        setError(getErrorMessage(requestError, "게임 상태를 불러오지 못했습니다."))
        // 화면에 오류를 남기고 null을 반환해 effect/Socket 갱신에서 미처리 Promise가 생기지 않게 합니다.
        return null
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [gameId, syncServerClock]
  )

  useEffect(() => {
    setRawResponse(null)
    setChatMessages([])
    setGameNotice(null)
    setError("")
    setServerTimeOffsetMs(0)
    void refreshGame()
  }, [gameId, refreshGame])

  useEffect(() => {
    if (!gameId) return undefined

    const handleConnect = () => {
      setConnected(true)
      setError("")
      socket.emit("game:join", { gameId })
    }

    const handleDisconnect = () => setConnected(false)

    const handleGameState = (response) => {
      syncServerClock(response)
      setRawResponse((previous) => chooseNewerResponse(previous, response))
      setLoading(false)
    }

    // 일반 공식 기록 저장은 GET 없이 payload를 로컬 캐시에 추가합니다.
    const handleRecordCreated = ({ record, revision }) => {
      if (!record) return
      setRawResponse((previous) => {
        if (!previous?.game) return previous
        if (Number(revision || 0) < Number(previous.game.revision || 0)) return previous

        const current = previous.game.officialRecords || []
        const recordId = String(record._id || record.id)
        const exists = current.some((item) => String(item._id || item.id) === recordId)
        let nextRecords = exists ? current : [...current, record]

        // 답변 record가 오면 질문 lifecycle도 서버와 동일하게 answered로 맞춥니다.
        // 마지막 답변/타임아웃처럼 단계가 바뀌는 경우에는 뒤이은 state:changed GET이 최종 상태를 복원합니다.
        if (record.recordType === "answer" && record.questionId) {
          const questionId = String(record.questionId)
          nextRecords = nextRecords.map((item) =>
            String(item._id || item.id) === questionId
              ? { ...item, status: "answered" }
              : item
          )
        }

        return {
          ...previous,
          game: {
            ...previous.game,
            revision: Math.max(Number(previous.game.revision || 0), Number(revision || 0)),
            officialRecords: nextRecords,
          },
        }
      })
    }

    const handleSubmissionUpdated = ({ submissionStatus: nextStatus, revision }) => {
      setRawResponse((previous) =>
        previous?.game
          ? {
              ...previous,
              game: {
                ...previous.game,
                revision: Math.max(Number(previous.game.revision || 0), Number(revision || 0)),
                submissionStatus: nextStatus,
              },
            }
          : previous
      )
    }

    const handleStatementsChecked = (payload) => {
      setGameNotice({
        id: `statement-check-${payload.checkedRound}-${payload.revision}`,
        kind: "check",
        title: "공식 진술 모순 검사 완료",
        message: payload.result?.valid
          ? "현재까지 공개된 공식 기록에서 모순이 발견되지 않았습니다."
          : `모순 ${payload.result?.summary?.contradictions || 0}건이 감지되었습니다.`,
      })
    }

    const handleRoundChecked = (payload) => {
      setGameNotice({
        id: `round-check-${payload.checkedRound}-${payload.revision}`,
        kind: "check",
        title: `${payload.checkedRound}라운드 최종 검사 완료`,
        message: payload.result?.valid
          ? "현재까지 공개된 공식 기록에서 모순이 발견되지 않았습니다."
          : `모순 ${payload.result?.summary?.contradictions || 0}건이 감지되었습니다.`,
      })
    }

    const handleStageChanged = (payload) => {
      const hasDedicatedNotice =
        payload.stage === "hint" ||
        (payload.previousStage === "hint" && ["statement", "deduction"].includes(payload.stage))

      if (!hasDedicatedNotice) {
        setGameNotice({
          id: `${payload.round}-${payload.stage}-${payload.revision}`,
          kind: "stage",
          title: "단계 전환",
          message: `${payload.round}라운드 · ${payload.stageLabel}`,
        })
      }
    }

    // 시간 스킵
    const handleStageSkipped = (payload) => {
      const stageChangedEvent = payload.events?.find(
        (event) => event.type === "game:stage:changed"
      )

      const stageInfo = stageChangedEvent?.payload

      setGameNotice({
        id: `skipped-${payload.revision}`,
        kind: "stage",
        title: "시간 스킵",
        message: `${stageInfo?.round}라운드 · ${stageInfo?.stageLabel}`,
      })
    }
    const handleRoundChanged = (payload) => {
      setGameNotice({
        id: `round-${payload.currentRound}-${payload.revision}`,
        kind: "round",
        title: `ROUND ${payload.currentRound} 시작`,
        message: "공식 진술 제출 단계가 시작되었습니다.",
      })
    }

    const handleHintRevealed = (payload) => {
      setGameNotice({
        id: `hint-${payload.round}-${payload.revision}`,
        kind: "hint",
        title: "새 공식 힌트 공개",
        message: payload.hint?.title || `${payload.round}라운드 힌트가 공개되었습니다.`,
      })
    }

    // 서버 timer/즉시 진행이 여러 상세 이벤트를 보낸 뒤 이 이벤트를 한 번 보내므로 GET도 한 번만 실행합니다.
    const handleStateChanged = () => {
      void refreshGame({ silent: true })
    }

    const handleDeductionUpdated = () => {
      void refreshGame({ silent: true })
    }

    const handleGameFinished = (payload) => {
      navigate(payload.resultPath || `/result/${payload.gameId || gameId}`)
    }

    const handleGameAborted = (payload) => {
      setError(payload.message || "관리자에 의해 게임이 종료되었습니다.")
      navigate("/lobby", { replace: true })
    }

    const handleRoomChat = ({ message }) => {
      const normalized = normalizeChatMessage(message)
      setChatMessages((previous) =>
        previous.some((item) => item.id === normalized.id)
          ? previous
          : [...previous, normalized]
      )
    }

    const handleChatHistory = ({ messages = [] }) => {
      setChatMessages(messages.map(normalizeChatMessage))
    }

    const handleRoomError = (payload) => {
      setGameNotice({
        id: `chat-error-${Date.now()}`,
        kind: "error",
        title: "자유 채팅 오류",
        message: payload?.message || "채팅 메시지를 처리하지 못했습니다.",
      })
    }

    const handleGameError = (payload) => {
      setError(payload.message || "게임 실시간 처리 중 오류가 발생했습니다.")
    }

    socket.on("connect", handleConnect)
    socket.on("disconnect", handleDisconnect)
    socket.on("game:state", handleGameState)
    socket.on("game:record:created", handleRecordCreated)
    socket.on("game:submission:updated", handleSubmissionUpdated)
    socket.on("game:statements:checked", handleStatementsChecked)
    socket.on("game:round:checked", handleRoundChecked)
    socket.on("game:stage:changed", handleStageChanged)
    socket.on("game:stage:skipped", handleStageSkipped)
    socket.on("game:round:changed", handleRoundChanged)
    socket.on("game:hint:revealed", handleHintRevealed)
    socket.on("game:state:changed", handleStateChanged)
    socket.on("game:deduction:updated", handleDeductionUpdated)
    socket.on("game:finished", handleGameFinished)
    socket.on("game:aborted", handleGameAborted)
    socket.on("room:chat", handleRoomChat)
    socket.on("game:chat:history", handleChatHistory)
    socket.on("room:error", handleRoomError)
    socket.on("game:error", handleGameError)

    if (socket.connected) {
      handleConnect()
    } else {
      socket.auth = { token: localStorage.getItem("token") }
      socket.connect()
    }

    return () => {
      socket.emit("game:leave", { gameId })
      socket.off("connect", handleConnect)
      socket.off("disconnect", handleDisconnect)
      socket.off("game:state", handleGameState)
      socket.off("game:record:created", handleRecordCreated)
      socket.off("game:submission:updated", handleSubmissionUpdated)
      socket.off("game:statements:checked", handleStatementsChecked)
      socket.off("game:round:checked", handleRoundChecked)
      socket.off("game:stage:changed", handleStageChanged)
      socket.off("game:round:changed", handleRoundChanged)
      socket.off("game:hint:revealed", handleHintRevealed)
      socket.off("game:state:changed", handleStateChanged)
      socket.off("game:deduction:updated", handleDeductionUpdated)
      socket.off("game:finished", handleGameFinished)
      socket.off("game:aborted", handleGameAborted)
      socket.off("room:chat", handleRoomChat)
      socket.off("game:chat:history", handleChatHistory)
      socket.off("room:error", handleRoomError)
      socket.off("game:error", handleGameError)
    }
  }, [gameId, navigate, refreshGame, socket, syncServerClock])

  useEffect(() => {
    const stageEndsAt = game?.stageEndsAt
    if (!stageEndsAt) {
      setRemainingSeconds(0)
      return undefined
    }

    const updateRemainingSeconds = () => {
      const serverAdjustedNow = Date.now() + serverTimeOffsetMs
      const milliseconds = new Date(stageEndsAt).getTime() - serverAdjustedNow
      setRemainingSeconds(Math.max(0, Math.ceil(milliseconds / 1000)))
    }

    updateRemainingSeconds()
    const intervalId = window.setInterval(updateRemainingSeconds, 1000)
    return () => window.clearInterval(intervalId)
  }, [game?.stageEndsAt, serverTimeOffsetMs])

  useEffect(() => {
    if (!gameNotice) return undefined
    const timeoutId = window.setTimeout(() => setGameNotice(null), 6000)
    return () => window.clearTimeout(timeoutId)
  }, [gameNotice])

  useEffect(() => {
    if (game?.status === "finished") {
      navigate(`/result/${game.id}`, { replace: true })
    } else if (game?.status === "aborted") {
      navigate("/lobby", { replace: true })
    }
  }, [game?.id, game?.status, navigate])

  const submitStatement = useCallback(
    async (statement) => {
      const response = await createGameStatement(gameId, {
        ...statement,
        round: game.currentRound,
        clientRequestId:
          statement.clientRequestId ||
          createClientRequestId(`statement_r${game.currentRound}`),
      })
      // 저장 응답보다 서버의 즉시 검사/단계 전환 결과가 더 최신일 수 있으므로 한 번 복원합니다.
      await refreshGame({ silent: true })
      return response
    },
    [game?.currentRound, gameId, refreshGame]
  )

  const submitQuestion = useCallback(
    async (question) => {
      const response = await createGameQuestion(gameId, {
        ...question,
        round: game.currentRound,
        clientRequestId:
          question.clientRequestId ||
          createClientRequestId(`question_r${game.currentRound}`),
      })
      await refreshGame({ silent: true })
      return response
    },
    [game?.currentRound, gameId, refreshGame]
  )

  const submitAnswer = useCallback(
    async (questionId, answer) => {
      const response = await answerGameQuestion(gameId, questionId, {
        clientRequestId: createClientRequestId("answer"),
        answer: Boolean(answer),
      })
      await refreshGame({ silent: true })
      return response
    },
    [gameId, refreshGame]
  )

  const submitDeduction = useCallback(
    async (deduction) => {
      const response = await createGameDeduction(gameId, {
        ...deduction,
        clientRequestId:
          deduction.clientRequestId || createClientRequestId("deduction"),
      })

      if (response.finished) {
        navigate(response.resultPath || `/result/${gameId}`, { replace: true })
      } else {
        await refreshGame({ silent: true })
      }
      return response
    },
    [gameId, navigate, refreshGame]
  )

  const sendChat = useCallback(
    (content) => {
      const trimmedContent = content?.trim()
      if (!trimmedContent || !game?.roomId) return
      socket.emit("room:chat", { roomId: game.roomId, content: trimmedContent })
    },
    [game?.roomId, socket]
  )

  // 시간 스킵
  const skipGameStage = useCallback(() => {
    if (!gameId) return

    socket.emit("game:skip-stage", {
      gameId,
    })
  }, [gameId, socket])

  const contextValue = useMemo(
    () => ({
      game,
      currentPlayer,
      isHost,
      skipGameStage,
      loading,
      error,
      connected,
      remainingSeconds,
      submissionStatus,
      pendingQuestionCount,
      gameNotice,
      chatMessages,
      refreshGame,
      submitStatement,
      submitQuestion,
      submitAnswer,
      submitDeduction,
      sendChat,
      dismissGameNotice: () => setGameNotice(null),
    }),
    [
      game,
      currentPlayer,
      isHost,
      skipGameStage,
      loading,
      error,
      connected,
      remainingSeconds,
      submissionStatus,
      pendingQuestionCount,
      gameNotice,
      chatMessages,
      refreshGame,
      submitStatement,
      submitQuestion,
      submitAnswer,
      submitDeduction,
      sendChat,
    ]
  )

  return <GameContext.Provider value={contextValue}>{children}</GameContext.Provider>
}

export const useGame = () => {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error("useGame()은 반드시 <GameProvider> 안에서 사용해야 합니다.")
  }
  return context
}

export default GameContext
