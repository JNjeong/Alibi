/**
 * 게임 서브페이지 공통 헤더입니다.
 * 화면마다 달랐던 제목, 설명, 상태 배지의 위치를 한 가지 규칙으로 통일합니다.
 */
function GamePageHeader({ eyebrow, title, description, children }) {
  return (
    <header className="game-page-header">
      <div className="game-page-heading-copy">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>

      {children && (
        <div className="game-page-header-actions" aria-label="현재 화면 상태">
          {children}
        </div>
      )}
    </header>
  )
}

export default GamePageHeader
