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

function MainGamePage() {
  const navigate = useNavigate()
  const logout = useAuthStore((state) => state.logout)

  // 서버 게임 상태와 제출 함수는 GameProvider 한곳에서 가져옵니다.
  const {
    game,
    currentPlayer,
    loading,
    error,
    remainingSeconds,
    submissionStatus,
    pendingQuestionCount,
    roundCheckStatus,
    chatMessages,
    submitStatement,
    submitQuestion,
    submitAnswer,
    submitDeduction,
    sendChat,
  } = useGame()

  // 아래 값들은 DB 원본이 아니라 이 화면에서만 필요한 UI 상태입니다.
  const [activeTab, setActiveTab] = useState("board")
  const [feedFilter, setFeedFilter] = useState("all")
  const [boardNotes, setBoardNotes] = useState({})
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

  // 로그아웃 시 인증 정보를 지우고 로그인 화면으로 이동합니다.
  const handleLogout = () => {
    logout()
    navigate("/")
  }

  // 추리 보드 개인 메모는 공식 기록이 아니므로 현재 브라우저 state에만 둡니다.
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

  return (
    <div className="alibi-game-root">
      <Header
        game={game}
        currentPlayer={currentPlayer}
        onLogout={handleLogout}
      />

      <div className="game-toolbar">
        <Timer game={game} remainingSeconds={remainingSeconds} />
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
                messages={chatMessages}
                draft={chatDraft}
                onDraftChange={setChatDraft}
                onSubmit={handleChatSubmit}
              />
            </aside>
          </div>
        </div>

        <div
          className="main-game-tab-stage main-game-subpage-stage"
          hidden={activeTab !== "briefing"}
        >
          <CaseBriefing game={game} />
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
            roundCheckStatus={roundCheckStatus}
            onSubmit={submitStatement}
          />
        </div>

        <div
          className="main-game-tab-stage main-game-subpage-stage"
          hidden={activeTab !== "question"}
        >
          <OfficialQuestion
            game={game}
            currentPlayer={currentPlayer}
            pendingQuestionCount={pendingQuestionCount}
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
          />
        </div>
      </main>
    </div>
  )
}

export default MainGamePage