// Nav 컴포넌트
// 게임 화면의 탭 네비게이션을 렌더링하는 컴포넌트
// 현재 활성화된 탭과 탭 변경 이벤트 핸들러를 props로 받음
export const GAME_TABS = [
  { id: "board", label: "추리 보드", shortCode: "01" },
  { id: "briefing", label: "사건 브리핑", shortCode: "02" },
  { id: "timeline", label: "개인 타임라인", shortCode: "03" },
  { id: "statement", label: "공식 진술", shortCode: "04" },
  { id: "question", label: "공식 Q&A", shortCode: "05" },
  { id: "deduction", label: "최종 추리", shortCode: "06" },
]


function Nav({ activeTab = "board", onTabChange }) {
  return (
    <nav className="main-game-nav" aria-label="게임 화면 탭">
      {GAME_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          className={activeTab === tab.id ? "is-active" : ""}
          onClick={() => onTabChange?.(tab.id)}
        >
          <span>{tab.shortCode}</span>
          {tab.label}
        </button>
      ))}
    </nav>
  )
}

export default Nav
