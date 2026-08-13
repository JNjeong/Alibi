// Header 컴포넌트
// 게임의 헤더 영역을 렌더링하는 컴포넌트
// 게임 제목, 방 코드, 현재 플레이어 정보, 로그아웃 버튼 등을 표시
function Header({ game, currentPlayer, onLogout }) {
  return (
    <header className="alibi-game-header">
      <div className="brand-lockup" aria-label="ALIBI">
        <span className="brand-mark">A</span>
        <div>
          <h1 className="game-logo">ALIBI</h1>
          <p className="brand-caption">TRUST NO ALIBI</p>
        </div>
      </div>

      <div className="case-heading">
        <span className="live-pill">
          <span className="live-dot" />
          GAME IN PROGRESS
        </span>
        <strong>{game?.title ?? "저택 살인사건"}</strong>
        {game?.roomCode && (
          <span className="room-code">ROOM {game.roomCode}</span>
        )}
      </div>

      <div className="player-summary">
        {currentPlayer && (
          <>
            <span
              className="main-game-player-avatar"
              style={{ "--player-color": currentPlayer.color }}
              aria-hidden="true"
            >
              {currentPlayer.nickname.slice(0, 1)}
            </span>
            <div className="player-summary-text">
              <strong>{currentPlayer.nickname}</strong>
              <span>{currentPlayer.character?.occupation}</span>
            </div>
          </>
        )}
        {onLogout && (
          <button className="text-button" type="button" onClick={onLogout}>
            나가기
          </button>
        )}
      </div>
    </header>
  )
}

export default Header
