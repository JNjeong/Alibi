import { useEffect, useMemo, useState } from "react"
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
import mockGame from "../../data/mockgame"
import useAuthStore from "../../store/authStore"
import "./MainGamePage.css"

// 임시로 생성한 ID와 시간 포맷 함수
const createId = (prefix) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`


// 임시로 생성한 시간 포맷 함수
// 현재 시간을 "HH:MM" 형식으로 반환
const getCurrentTime = () =>
  new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date())


// MainGamePage 컴포넌트
// 게임의 메인 페이지를 렌더링하며, 게임 상태와 사용자 인터랙션을 관리
// 게임의 다양한 탭(보드, 브리핑, 타임라인 등)을 전환하고, 채팅 및 노트 기능을 제공
// 게임 진행 상황에 따라 남은 시간과 메시지 상태를 업데이트
// 게임 상태를 기반으로 현재 플레이어 정보를 가져오고, 로그아웃 기능을 제공
// 게임 보드의 노트 변경 및 채팅 메시지 제출을 처리
// 게임의 다양한 하위 컴포넌트를 렌더링하여 사용자에게 게임 인터페이스를 제공
  function MainGamePage() {
  const navigate = useNavigate()
  const authUser = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  // 게임 상태 및 사용자 인터랙션을 관리하기 위한 상태 변수들
  // activeTab: 현재 활성화된 탭(보드, 브리핑, 타임라인 등)
  // feedFilter: 공식 피드의 필터 상태
  // remainingSeconds: 남은 시간(초)
  // boardNotes: 보드에 작성된 노트
  // selectedCell: 현재 선택된 셀 정보
  // messages: 채팅 메시지 목록
  // chatDraft: 채팅 입력 중인 내용
  const [activeTab, setActiveTab] = useState("board")
  const [feedFilter, setFeedFilter] = useState("all")
  const [remainingSeconds, setRemainingSeconds] = useState(
    mockGame.roundEndsInSeconds,
  )
  const [boardNotes, setBoardNotes] = useState(mockGame.boardNotes)
  const [selectedCell, setSelectedCell] = useState({
    timeId: "time_1920",
    playerId: mockGame.currentPlayerId,
  })
  const [messages, setMessages] = useState(mockGame.chatMessages)
  const [chatDraft, setChatDraft] = useState("")

  // 남은 시간을 1초마다 감소시키는 타이머 설정
  // 컴포넌트가 언마운트될 때 타이머를 정리하여 메모리 누수를 방지
  useEffect(() => {
    const timerId = window.setInterval(() => {
      setRemainingSeconds((seconds) => Math.max(0, seconds - 1))
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [])

  // 게임 상태를 기반으로 현재 플레이어 정보를 가져오기 위해 useMemo 사용
  // authUser와 messages가 변경될 때만 game 객체를 재계산
  // 현재 플레이어 정보는 game 객체에서 currentPlayerId를 기준으로 찾음
  const game = useMemo(() => {
    const players = mockGame.players.map((player) =>
      player.id === mockGame.currentPlayerId && authUser?.nickname
        ? { ...player, nickname: authUser.nickname }
        : player,
    )

    return {
      ...mockGame,
      players,
      chatMessages: messages,
    }
  }, [authUser, messages])

  // 현재 플레이어 정보를 game 객체에서 currentPlayerId를 기준으로 찾음
  const currentPlayer = game.players.find(
    (player) => player.id === game.currentPlayerId,
  )

  // 로그아웃 처리 함수
  const handleLogout = () => {
    logout()
    navigate("/")
  }

  // 보드 노트 변경 처리 함수
  const handleNoteChange = (key, value) => {
    setBoardNotes((previous) => ({ ...previous, [key]: value }))
  }

  // 채팅 메시지 제출 처리 함수
  // 비어있지 않으면 메시지 목록에 추가
  const handleChatSubmit = (event) => {
    event.preventDefault()
    const content = chatDraft.trim()
    if (!content) return

    // 새로운 메시지를 messages 상태에 추가
    // 메시지 ID는 createId 함수를 사용하여 생성
    setMessages((previous) => [
      ...previous,
      {
        id: createId("chat"),
        authorId: currentPlayer.id,
        content,
        createdAt: getCurrentTime(),
      },
    ])
    setChatDraft("")
  }

  return (
    // 게임의 메인 페이지를 렌더링
    // Header, Timer, Nav, OfficialFeed, DeductionBoard, HintPanel, ChatPanel 등 다양한 하위 컴포넌트를 포함
    // activeTab 상태에 따라 각 탭의 콘텐츠를 조건부로 렌더링
    <div className="alibi-game-root">
      <Header
        game={game}
        currentPlayer={currentPlayer}
        onLogout={handleLogout}
      />

      {/* 게임 툴바를 렌더링하며, Timer와 Nav 컴포넌트를 포함 */}
      {/* Timer는 남은 시간을 표시하고, Nav는 탭 전환 기능을 제공 */}
      {/* Nav 컴포넌트의 onTabChange 이벤트를 통해 activeTab 상태를 업데이트 */}
      <div className="game-toolbar">
        <Timer game={game} remainingSeconds={remainingSeconds} />
        <Nav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* 게임의 메인 콘텐츠 영역을 렌더링 */}
      {/* activeTab 상태에 따라 각 탭의 콘텐츠를 조건부로 렌더링 */}
      {/* "board" 탭에서는 OfficialFeed, DeductionBoard, HintPanel, ChatPanel을 포함 */}
      {/* "briefing", "timeline", "statement", "question", "deduction" 탭에서는 각각의 컴포넌트를 렌더링 */}
      {/* 각 탭의 콘텐츠는 hidden 속성을 사용하여 활성화된 탭만 표시되도록 함 */}
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
                messages={messages}
                draft={chatDraft}
                onDraftChange={setChatDraft}
                onSubmit={handleChatSubmit}
              />
            </aside>
          </div>
        </div>

        
        {/* 각 탭의 콘텐츠를 조건부로 렌더링 */}
        {/* activeTab 상태에 따라 해당 탭의 콘텐츠만 표시 */}
        {/* "briefing" 탭에서는 CaseBriefing 컴포넌트를 렌더링 */}
        {/* "timeline" 탭에서는 PrivateTimeline 컴포넌트를 렌더링 */}
        {/* "statement" 탭에서는 OfficialStatement 컴포넌트를 렌더링 */}
        {/* "question" 탭에서는 OfficialQuestion 컴포넌트를 렌더링 */}
        {/* "deduction" 탭에서는 FinalDeduction 컴포넌트를 렌더링 */}
        <div
          className="main-game-tab-stage main-game-subpage-stage"
          hidden={activeTab !== "briefing"}
        >
          <CaseBriefing />
        </div>

        <div
          className="main-game-tab-stage main-game-subpage-stage"
          hidden={activeTab !== "timeline"}
        >
          <PrivateTimeline />
        </div>

        <div
          className="main-game-tab-stage main-game-subpage-stage"
          hidden={activeTab !== "statement"}
        >
          <OfficialStatement />
        </div>

        <div
          className="main-game-tab-stage main-game-subpage-stage"
          hidden={activeTab !== "question"}
        >
          <OfficialQuestion />
        </div>

        <div
          className="main-game-tab-stage main-game-subpage-stage"
          hidden={activeTab !== "deduction"}
        >
          <FinalDeduction />
        </div>
      </main>
    </div>
  )
}

export default MainGamePage
