// URL의 gameId를 가져와서 게임 상태 조회 / 새로고침 상태 복원
// gameAdapter 로 백엔드 응답 현재 UI 형식으로 변환
// game:join 등 게임 socket 이벤트 등
// 진술·질문·답변·최종 추리 REST 함수를 화면 컴포넌트에 제공
// 공식 진술 전원 제출 + 미답변 질문 0건이면 game:round:check를 호출
// 서버 roundEndsAt 기준으로 남은 시간 계산
// 기존 room:chat 이벤트 사용해 게임 중 자유 채팅 실시간 유지


// context : 게임 상태, 플레이어 정보, 채팅 메시지, 보드 노트 등 게임 관련 데이터를 전역으로 관리
// usestate는 화면용 캐시, 원본은 서버의 mongoDB Game
// GET /api/games/:gameId 로 게임 상태 조회 및 복원

import { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { answerGameQuestion, createClientRequestId, createGameDeduction, createGameQuestion, createGameStatement, getGame } from "../api/game_api"
import { getRoomSocket } from "../api/socket";
import adaptGameResponse from "./gameAdapter"


// Provider 밖에서 useGame()을 호출했는지 구분하기 위해 기본값을 null로 둡니다.
const GameContext = createContext(null)

// Axios/Socket 오류에서 사용자에게 보여줄 메시지를 일관되게 꺼냅니다.
const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback

// 서버 revision이 더 최신일 때만 상태를 교체해 늦게 도착한 응답의 덮어쓰기를 막습니다.
const chooseNewerResponse = (previous, incoming) => {
  if (!previous?.game) {
    return incoming
  }

  if (!incoming?.game) {
    return previous
  }

  const previousRevision = Number(previous.game.revision || 0)
  const incomingRevision = Number(incoming.game.revision || 0)

  return incomingRevision >= previousRevision ? incoming : previous
}

// room:chat 메시지를 현재 게임 ChatPanel 형식으로 정규화합니다.
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

  // 서버에서 받은 원본 API 응답입니다. 화면 컴포넌트는 직접 사용하지 않습니다.
  const [rawResponse, setRawResponse] = useState(null)

  // 최초 조회 상태와 화면에 표시할 오류 상태입니다.
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Socket 연결 여부와 라운드 검사 요청 상태를 분리해 버튼/안내 문구에 사용합니다.
  const socket = getRoomSocket()
  const [connected, setConnected] = useState(socket.connected)
  const [roundCheckStatus, setRoundCheckStatus] = useState("idle")

  // 요구사항대로 제출 현황과 미답변 수는 Context useState에 유지합니다.
  const [submissionStatus, setSubmissionStatus] = useState(null)
  const [pendingQuestionCount, setPendingQuestionCount] = useState(0)

  // 자유 채팅은 공식 Game DB와 별개이며 현재 서버 roomChats 메모리 이벤트를 사용합니다.
  const [chatMessages, setChatMessages] = useState([])

  // 서버 roundEndsAt을 기준으로 매초 다시 계산한 남은 초입니다.
  const [remainingSeconds, setRemainingSeconds] = useState(0)

  // 같은 브라우저가 같은 라운드 검사 이벤트를 반복 전송하지 않도록 기억합니다.
  const requestedRoundChecksRef = useRef(new Set())

  // 백엔드 응답을 기존 MainGamePage UI 형식으로 변환합니다.
  const game = useMemo(() => adaptGameResponse(rawResponse), [rawResponse])

  // 현재 로그인 사용자의 플레이어 UI 객체를 빠르게 찾습니다.
  const currentPlayer = useMemo(
    () =>
      game?.players?.find(
        (player) => player.id === game.currentPlayerId
      ) || null,
    [game]
  )

  // GET 요청 결과를 revision 비교 후 상태에 반영합니다.
  const refreshGame = useCallback(
    async ({ silent = false } = {}) => {
      if (!gameId) {
        return null
      }

      try {
        if (!silent) {
          setLoading(true)
        }

        const response = await getGame(gameId)

        setRawResponse((previous) => chooseNewerResponse(previous, response))
        setSubmissionStatus(response.game.submissionStatus)
        setPendingQuestionCount(
          response.game.submissionStatus?.pendingQuestionCount || 0
        )
        setError("")

        return response
      } catch (requestError) {
        setError(
          getErrorMessage(
            requestError,
            "게임 상태를 불러오지 못했습니다."
          )
        )
        throw requestError
      } finally {
        if (!silent) {
          setLoading(false)
        }
      }
    },
    [gameId]
  )

  // gameId가 바뀌면 이전 판의 캐시를 비우고 새 판을 REST로 복원합니다.
  useEffect(() => {
    setRawResponse(null)
    setSubmissionStatus(null)
    setPendingQuestionCount(0)
    setChatMessages([])
    setRoundCheckStatus("idle")
    setError("")
    requestedRoundChecksRef.current.clear()

    refreshGame().catch(() => {
      // 오류 메시지는 refreshGame 내부에서 이미 상태에 저장했습니다.
    })
  }, [gameId, refreshGame])

  // Socket 이벤트를 등록하고 현재 gameId 실시간 방에 입장합니다.
  useEffect(() => {
    if (!gameId) {
      return undefined
    }

    const handleConnect = () => {
      setConnected(true)
      setError("")
      socket.emit("game:join", { gameId })
    }

    const handleDisconnect = () => {
      setConnected(false)
    }

    // game:state는 본인 역할/타임라인을 포함한 사용자별 전체 상태입니다.
    const handleGameState = (response) => {
      setRawResponse((previous) => chooseNewerResponse(previous, response))
      setSubmissionStatus(response.game.submissionStatus)
      setPendingQuestionCount(
        response.game.submissionStatus?.pendingQuestionCount || 0
      )
      setLoading(false)
    }

    // 공식 기록이 추가되면 전체 상태를 다시 조회해 adapter 파생값도 함께 갱신합니다.
    const handleRecordCreated = () => {
      refreshGame({ silent: true }).catch(() => {})
    }

    // 제출 현황은 자주 바뀌므로 전체 조회 전에도 useState에 즉시 반영합니다.
    const handleSubmissionUpdated = ({ submissionStatus: nextStatus }) => {
      setSubmissionStatus(nextStatus)
      setPendingQuestionCount(nextStatus?.pendingQuestionCount || 0)

      setRawResponse((previous) =>
        previous?.game
          ? {
              ...previous,
              game: {
                ...previous.game,
                submissionStatus: nextStatus,
              },
            }
          : previous
      )
    }

    // 라운드 검사가 끝나면 새 힌트·다음 라운드를 REST로 안전하게 복원합니다.
    const handleRoundChecked = () => {
      setRoundCheckStatus("completed")
      refreshGame({ silent: true }).catch(() => {})
    }

    // 다른 플레이어의 최종 추리 제출 현황도 전체 상태로 갱신합니다.
    const handleDeductionUpdated = () => {
      refreshGame({ silent: true }).catch(() => {})
    }

    // 게임 종료 이벤트의 gameId를 사용해 해당 판 결과 화면으로 이동합니다.
    const handleGameFinished = (payload) => {
      navigate(payload.resultPath || `/result/${payload.gameId || gameId}`)
    }

    // 기존 room:chat 메시지를 현재 게임 자유 채팅 목록에 중복 없이 추가합니다.
    const handleRoomChat = ({ message }) => {
      const normalized = normalizeChatMessage(message)

      setChatMessages((previous) => {
        const alreadyExists = previous.some(
          (item) => item.id === normalized.id
        )

        return alreadyExists ? previous : [...previous, normalized]
      })
    }

    // 검사 경쟁 409는 정상일 수 있으므로 일반 오류로 크게 표시하지 않습니다.
    const handleGameError = (payload) => {
      if (payload.status === 409) {
        setRoundCheckStatus("waiting")
        return
      }

      setRoundCheckStatus("error")
      setError(payload.message || "게임 실시간 처리 중 오류가 발생했습니다.")
    }

    socket.on("connect", handleConnect)
    socket.on("disconnect", handleDisconnect)
    socket.on("game:state", handleGameState)
    socket.on("game:record:created", handleRecordCreated)
    socket.on("game:submission:updated", handleSubmissionUpdated)
    socket.on("game:round:checked", handleRoundChecked)
    socket.on("game:deduction:updated", handleDeductionUpdated)
    socket.on("game:finished", handleGameFinished)
    socket.on("room:chat", handleRoomChat)
    socket.on("game:error", handleGameError)

    // App.jsx가 이미 연결했다면 바로 game:join만 보내고, 아니면 JWT를 넣어 연결합니다.
    if (socket.connected) {
      handleConnect()
    } else {
      socket.auth = {
        token: localStorage.getItem("token"),
      }
      socket.connect()
    }

    return () => {
      socket.off("connect", handleConnect)
      socket.off("disconnect", handleDisconnect)
      socket.off("game:state", handleGameState)
      socket.off("game:record:created", handleRecordCreated)
      socket.off("game:submission:updated", handleSubmissionUpdated)
      socket.off("game:round:checked", handleRoundChecked)
      socket.off("game:deduction:updated", handleDeductionUpdated)
      socket.off("game:finished", handleGameFinished)
      socket.off("room:chat", handleRoomChat)
      socket.off("game:error", handleGameError)
    }
  }, [gameId, navigate, refreshGame])

  // 서버 roundEndsAt이 바뀔 때마다 남은 시간을 다시 계산하는 타이머를 등록합니다.
  useEffect(() => {
    const roundEndsAt = game?.roundEndsAt

    if (!roundEndsAt) {
      setRemainingSeconds(0)
      return undefined
    }

    const updateRemainingSeconds = () => {
      const milliseconds = new Date(roundEndsAt).getTime() - Date.now()
      setRemainingSeconds(Math.max(0, Math.ceil(milliseconds / 1000)))
    }

    updateRemainingSeconds()
    const intervalId = window.setInterval(updateRemainingSeconds, 1000)

    return () => window.clearInterval(intervalId)
  }, [game?.roundEndsAt])

  // 전원 진술 제출 및 미답변 0건이 되면 모든 클라이언트가 검사 요청을 시도할 수 있습니다.
  // 서버의 active → checking 원자적 선점 때문에 실제 검사는 한 번만 실행됩니다.
  useEffect(() => {
    if (
      !game ||
      !connected ||
      game.phase !== "active" ||
      !submissionStatus?.allReady ||
      pendingQuestionCount !== 0
    ) {
      return
    }

    const requestKey = `${game.id}:round:${game.currentRound}`

    if (requestedRoundChecksRef.current.has(requestKey)) {
      return
    }

    requestedRoundChecksRef.current.add(requestKey)
    setRoundCheckStatus("requested")

    socket.emit("game:round:check", {
      gameId: game.id,
      round: game.currentRound,
      clientRequestId: createClientRequestId(
        `round_check_r${game.currentRound}`
      ),
    })
  }, [
    connected,
    game,
    pendingQuestionCount,
    submissionStatus,
  ])

  // 공식 진술 폼에서 받은 값에 중복 방지 ID를 붙여 REST로 저장합니다.
  const submitStatement = useCallback(
    async (statement) => {
      const response = await createGameStatement(gameId, {
        ...statement,
        round: game.currentRound,
        clientRequestId:
          statement.clientRequestId ||
          createClientRequestId(`statement_r${game.currentRound}`),
      })

      await refreshGame({ silent: true })
      return response
    },
    [game?.currentRound, gameId, refreshGame]
  )

  // 공식 질문 폼의 구조화된 조건을 REST로 저장합니다.
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

  // 공식 답변은 true/false만 받아 JSON으로 저장합니다.
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

  // 최종 추리 4개 값을 REST로 저장합니다.
  const submitDeduction = useCallback(
    async (deduction) => {
      const response = await createGameDeduction(gameId, {
        ...deduction,
        clientRequestId:
          deduction.clientRequestId ||
          createClientRequestId("deduction"),
      })

      await refreshGame({ silent: true })
      return response
    },
    [gameId, refreshGame]
  )

  // 게임 중 자유 채팅은 기존 room:chat Socket 이벤트를 그대로 재사용합니다.
  const sendChat = useCallback(
    (content) => {
      const trimmedContent = content?.trim()

      if (!trimmedContent || !game?.roomId) {
        return
      }

      socket.emit("room:chat", {
        roomId: game.roomId,
        content: trimmedContent,
      })
    },
    [game?.roomId]
  )

  // 하위 컴포넌트에 제공할 값을 useMemo로 묶어 불필요한 렌더를 줄입니다.
  const contextValue = useMemo(
    () => ({
      game,
      currentPlayer,
      loading,
      error,
      connected,
      remainingSeconds,
      submissionStatus,
      pendingQuestionCount,
      roundCheckStatus,
      chatMessages,
      refreshGame,
      submitStatement,
      submitQuestion,
      submitAnswer,
      submitDeduction,
      sendChat,
    }),
    [
      game,
      currentPlayer,
      loading,
      error,
      connected,
      remainingSeconds,
      submissionStatus,
      pendingQuestionCount,
      roundCheckStatus,
      chatMessages,
      refreshGame,
      submitStatement,
      submitQuestion,
      submitAnswer,
      submitDeduction,
      sendChat,
    ]
  )

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  )
}

// 게임 컴포넌트가 Context 값을 가져오는 전용 hook입니다.
export const useGame = () => {
  const context = useContext(GameContext)

  if (!context) {
    throw new Error("useGame()은 반드시 <GameProvider> 안에서 사용해야 합니다.")
  }

  return context
}

export default GameContext
