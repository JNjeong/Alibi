import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import ChatPanel from "../../components/common/ChatPanel"
import DeductionBoard from "../../components/common/DeductionBoard"
import Header from "../../components/common/Header"
import HintPanel from "../../components/common/HintPanel"
import Nav from "../../components/common/Nav"
import OfficialFeed from "../../components/common/OfficialFeed"
import Timer from "../../components/common/Timer"
import CaseBriefing from "../../components/pages/briefing/CaseBriefing"
import FinalDeduction from "../../components/pages/deduction/FinalDeduction"
import OfficialQuestion from "../../components/pages/question/OfficialQuestion"
import OfficialStatement from "../../components/pages/statement/OfficialStatement"
import PrivateTimeline from "../../components/pages/timeline/PrivateTimeline"
import { useGame } from "../../game/GameContext"
import useAuthStore from "../../store/authStore"
import "./MainGamePage.css"
import "./GameUiRefresh.css"

const ROUND_STAGES = [
  { id: "statement", label: "공식 진술" },
  { id: "discussion", label: "자유 추리" },
  { id: "question", label: "공식 질문" },
  { id: "answer", label: "공식 답변" },
  { id: "hint", label: "힌트 공개" },
]

function MainGamePage() {
  const navigate = useNavigate()
  const logout = useAuthStore((state) => state.logout)

  // 서버 게임 상태와 제출 함수는 GameProvider 한곳에서 가져옵니다.
  const {
    game,
    currentPlayer,
    loading,
    error,
    connected,
    remainingSeconds,
    submissionStatus,
    pendingQuestionCount,
    gameNotice,
    chatMessages,
    submitStatement,
    submitQuestion,
    submitAnswer,
    submitDeduction,
    sendChat,
    dismissGameNotice,
    isHost,
    skipGameStage,
  } = useGame()

  // 아래 값들은 DB 원본이 아니라 이 화면에서만 필요한 UI 상태입니다.
  const [activeTab, setActiveTab] = useState("board")
  const [feedFilter, setFeedFilter] = useState("all")
  const [boardNotes, setBoardNotes] = useState({})
  const [notesStorageKey, setNotesStorageKey] = useState("")
  const [selectedCell, setSelectedCell] = useState(null)
  const [chatDraft, setChatDraft] = useState("")

  // 서버 게임을 처음 받은 뒤 현재 플레이어의 첫 타임 슬롯을 기본 선택합니다.
  useEffect(() => {
    if (!selectedCell && game?.timeSlots?.length && game?.currentPlayerId) {
      setSelectedCell({
        timeId: game.timeSlots[0].id,
        playerId: game.currentPlayerId,
      })
    }
  }, [game, selectedCell])

  // 서버 단계와 화면 탭을 연결해 제출·자유 추리·질문·힌트 흐름이 바로 보이게 합니다.
  useEffect(() => {
    const tabByStage = {
      statement: "statement",
      discussion: "board",
      question: "question",
      answer: "question",
      hint: "board",
      deduction: "deduction",
    }

    if (game?.stage && tabByStage[game.stage]) {
      setActiveTab(tabByStage[game.stage])
    }
  }, [game?.currentRound, game?.stage])

  // 개인 메모는 서버의 공식 기록과 섞지 않고 게임·사용자별 브라우저 저장소에 보존합니다.
  useEffect(() => {
    if (!game?.id || !currentPlayer?.id) return

    const storageKey = `alibi:deduction-notes:${game.id}:${currentPlayer.id}`
    const savedNotes = (() => {
      try {
        return JSON.parse(localStorage.getItem(storageKey) || "{}")
      } catch {
        return {}
      }
    })()

    setBoardNotes(savedNotes)
    setNotesStorageKey(storageKey)
  }, [currentPlayer?.id, game?.id])

  useEffect(() => {
    if (!notesStorageKey) return
    localStorage.setItem(notesStorageKey, JSON.stringify(boardNotes))
  }, [boardNotes, notesStorageKey])

  // 로그아웃 시 인증 정보를 지우고 로그인 화면으로 이동합니다.
  const handleLogout = () => {
    logout()
    navigate("/")
  }

  // 선택한 시간×참가자 칸의 메모를 최대 300자로 저장합니다.
  const handleNoteChange = (key, value) => {
    setBoardNotes((previous) => ({
      ...previous,
      [key]: value,
    }))
  }

  // 자유 채팅 문자열을 기존 room:chat Socket 이벤트로 전송합니다.
  const handleChatSubmit = (event) => {
    event.preventDefault()

    const content = chatDraft.trim()

    if (!content) {
      return
    }

    sendChat(content)
    setChatDraft("")
  }

  // 시간 스킵
  const handleSkipStage = () => {
    skipGameStage()
  }

  // GET /api/games/:gameId가 끝나기 전에는 게임 UI를 렌더링하지 않습니다.
  if (loading) {
    return (
      <div className="alibi-game-root">
        <p>게임 상태를 불러오는 중...</p>
      </div>
    )
  }

  // 필수 게임 데이터가 없으면 하위 컴포넌트의 undefined 오류를 막습니다.
  if (error || !game || !currentPlayer || !selectedCell) {
    return (
      <div className="alibi-game-root">
        <p>{error || "게임 상태를 표시할 수 없습니다."}</p>
        <button type="button" onClick={() => navigate("/lobby")}>로비로 이동</button>
      </div>
    )
  }

  const currentStageIndex = ROUND_STAGES.findIndex(
    (item) => item.id === game.stage,
  )
  const stageFlowIndex = currentStageIndex >= 0
    ? currentStageIndex
    : game.stage === "deduction" || game.stage === "finished"
      ? ROUND_STAGES.length
      : 0

  return (
    <div className="alibi-game-root">
      <Header
        game={game}
        currentPlayer={currentPlayer}
        onLogout={handleLogout}
      />

      <section className={`game-stage-strip is-${game.stage}`} aria-live="polite">
        <div className="game-stage-summary">
          <span>ROUND {game.currentRound}</span>
          <strong>{game.stageLabel}</strong>
          <p>
            {game.stage === "discussion"
              ? "공식 진술을 바탕으로 자유 채팅하며 추리하세요."
              : game.stage === "question"
                ? `공식 질문 ${submissionStatus?.questionSubmittedCount || 0}/${game.players.length}명 제출 · 전원 제출 시 즉시 답변 단계로 이동`
              : game.stage === "answer"
                ? `미답변 ${pendingQuestionCount}건 · 시간 종료 시 시간 초과 처리`
                : game.stage === "hint"
                  ? "새 공식 힌트가 공개되었습니다. 추리 보드에서 확인하세요."
                  : "서버 시간이 끝나면 다음 단계로 자동 전환됩니다."}
          </p>
        </div>

        <ol className="game-stage-flow" aria-label="현재 라운드 진행 단계">
          {ROUND_STAGES.map((stage, index) => {
            const state = index < stageFlowIndex
              ? "completed"
              : index === stageFlowIndex
                ? "current"
                : "upcoming"

            return (
              <li key={stage.id} className={`is-${state}`}>
                <span>{index + 1}</span>
                <strong>{stage.label}</strong>
              </li>
            )
          })}
        </ol>
      </section>

      <div className="game-toolbar">
        <Timer game={game} remainingSeconds={remainingSeconds} />
        {isHost === true && (
          <button type="button" onClick={handleSkipStage}>
            시간 스킵
          </button>
        )}
        
        <Nav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      <main className="alibi-game-content">
        <div
          className="main-game-tab-stage main-game-board-stage"
          hidden={activeTab !== "board"}
        >
          <div className="game-workspace">
            <OfficialFeed
              game={game}
              items={game.officialFeed}
              filter={feedFilter}
              onFilterChange={setFeedFilter}
              onOpenQA={() => setActiveTab("question")}
            />

            <section className="workspace-panel center-panel">
              <DeductionBoard
                game={game}
                currentPlayer={currentPlayer}
                notes={boardNotes}
                onNoteChange={handleNoteChange}
                selectedCell={selectedCell}
                onSelectCell={setSelectedCell}
              />
            </section>

            <aside className="workspace-panel main-game-right-panel">
              <HintPanel game={game} />
              <ChatPanel
                game={game}
                connected={connected}
                messages={chatMessages}
                draft={chatDraft}
                onDraftChange={setChatDraft}
                onSubmit={handleChatSubmit}
                activeTab={activeTab}

              />
            </aside>
          </div>
        </div>

        <div
          className="main-game-tab-stage main-game-subpage-stage"
          hidden={activeTab !== "briefing"}
        >
          <CaseBriefing game={game} onTabChange={setActiveTab} />
        </div>

        <div
          className="main-game-tab-stage main-game-subpage-stage"
          hidden={activeTab !== "timeline"}
        >
          <PrivateTimeline
            game={game}
            currentPlayer={currentPlayer}
          />
        </div>

        <div
          className="main-game-tab-stage main-game-subpage-stage"
          hidden={activeTab !== "statement"}
        >
          <OfficialStatement
            game={game}
            currentPlayer={currentPlayer}
            submissionStatus={submissionStatus}
            onSubmit={submitStatement}
          />
        </div>

        <div
          className="main-game-tab-stage main-game-subpage-stage"
          hidden={activeTab !== "question"}
        >
          <OfficialQuestion
            game={game}
            onSubmitQuestion={submitQuestion}
            onSubmitAnswer={submitAnswer}
          />
        </div>

        <div
          className="main-game-tab-stage main-game-subpage-stage"
          hidden={activeTab !== "deduction"}
        >
          <FinalDeduction
            game={game}
            currentPlayer={currentPlayer}
            onSubmit={submitDeduction}
            onTabChange={setActiveTab}
          />
        </div>
      </main>

      {gameNotice && (
        <aside className={`game-toast is-${gameNotice.kind}`} role="alert">
          <div>
            <span>{gameNotice.title}</span>
            <strong>{gameNotice.message}</strong>
          </div>
          <button type="button" onClick={dismissGameNotice} aria-label="알림 닫기">×</button>
        </aside>
      )}
    </div>
  )
}

export default MainGamePage
