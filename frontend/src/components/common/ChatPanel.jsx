import { useEffect, useRef } from "react"

// ChatPanel 컴포넌트
// 게임 내 자유 채팅 기능을 제공하는 패널
// 게임 상태, 메시지 목록, 입력 중인 메시지 초안, 입력 변경 및 제출 이벤트를 props로 받음
// 메시지 목록을 스크롤 가능한 영역에 렌더링하며, 새로운 메시지가 추가될 때 자동으로 스크롤
// 각 메시지는 작성자 정보와 작성 시간과 함께 표시되며, 현재 플레이어의 메시지는 별도로 스타일링
function ChatPanel({
  game,
  messages,
  draft,
  onDraftChange,
  onSubmit,
}) {
  const scrollRef = useRef(null)
  const findPlayer = (playerId) =>
    game.players.find((player) => player.id === playerId)

  // useEffect를 사용하여 messages가 변경될 때마다 스크롤을 최하단으로 이동
  // requestAnimationFrame을 사용하여 브라우저의 렌더링 사이클에 맞춰 스크롤 위치를 업데이트
  // 스크롤 영역이 존재할 경우에만 스크롤 위치를 업데이트
  useEffect(() => {
    if (scrollRef.current) {
      window.requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
      })
    }
  }, [messages])

  return (
    <section className="chat-panel">
      <div className="section-title-row chat-title">
        <div>
          <h3>자유 채팅</h3>
          <span className="online-count">
            <i />
            10명 접속
          </span>
        </div>
        <span>실시간</span>
      </div>

      <div className="chat-messages" ref={scrollRef} aria-live="polite">
        {messages.map((message) => {
          const author = findPlayer(message.authorId)
          const isMine = message.authorId === game.currentPlayerId

          return (
            <div
              key={message.id}
              className={`chat-message ${isMine ? "is-mine" : ""}`}
            >
              <div className="chat-message-meta">
                <strong style={{ color: author?.color }}>{author?.nickname}</strong>
                <time>{message.createdAt}</time>
              </div>
              <p>{message.content}</p>
            </div>
          )
        })}
      </div>

      <form className="chat-form" onSubmit={onSubmit}>
        <label htmlFor="chat-message" className="sr-only">
          채팅 메시지
        </label>
        <input
          id="chat-message"
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder="메시지를 입력하세요"
          maxLength={200}
        />
        <button type="submit" aria-label="메시지 전송">
          ↑
        </button>
      </form>
    </section>
  )
}

export default ChatPanel
