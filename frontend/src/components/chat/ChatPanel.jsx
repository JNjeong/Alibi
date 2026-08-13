import { useEffect, useMemo, useRef, useState } from "react"

import styles from "./ChatPanel.module.css"

const PLAYER_COLORS = [
  "#e6c77a",
  "#8cc7ff",
  "#7ee2b8",
  "#d8a0ff",
  "#ff9d8f",
  "#ffb4d3",
  "#97d5e8",
  "#d0e17a",
  "#ffbd7a",
  "#a9a7ff",
]

function formatMessageTime(value) {
  if (!value) {
    return ""
  }

  return new Date(value).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function ChatPanel({
  players = [],
  currentPlayerId,
  messages = [],
  onSend,
  disabled = false,
  onlineCount,
}) {
  const [draft, setDraft] = useState("")
  const scrollRef = useRef(null)

  const playerMap = useMemo(() => {
    const map = new Map()

    players.forEach((player, index) => {
      map.set(String(player.id), {
        id: String(player.id),
        nickname: player.nickname || player.username || "사용자",
        color: player.color || PLAYER_COLORS[index % PLAYER_COLORS.length],
      })
    })

    return map
  }, [players])

  const normalizedMessages = useMemo(
    () =>
      messages.map((message) => {
        const authorId = String(message.authorId ?? message.senderId)
        const author = playerMap.get(authorId)

        return {
          id: message.id,
          authorId,
          authorName:
            author?.nickname ||
            message.sender?.nickname ||
            message.sender?.username ||
            "사용자",
          authorColor: author?.color || "#e6c77a",
          content: message.content,
          createdAt: formatMessageTime(message.createdAt),
          isMine: authorId === String(currentPlayerId),
        }
      }),
    [currentPlayerId, messages, playerMap]
  )

  useEffect(() => {
    if (!scrollRef.current) {
      return
    }

    window.requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }
    })
  }, [normalizedMessages])

  const handleSubmit = (event) => {
    event.preventDefault()

    const trimmedDraft = draft.trim()

    if (!trimmedDraft || disabled) {
      return
    }

    onSend?.(trimmedDraft)
    setDraft("")
  }

  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <div>
          <p className={styles.label}>CHAT</p>
          <h2 className={styles.title}>자유 채팅</h2>
        </div>

        <span className={styles.onlineCount}>
          {onlineCount ?? players.length}명 접속
        </span>
      </header>

      <div
        className={styles.messages}
        ref={scrollRef}
        aria-live="polite"
      >
        {normalizedMessages.length === 0 ? (
          <p className={styles.empty}>아직 메시지가 없습니다.</p>
        ) : (
          normalizedMessages.map((message) => (
            <div
              key={message.id}
              className={[
                styles.message,
                message.isMine ? styles.messageMine : "",
              ].join(" ")}
            >
              <div className={styles.messageMeta}>
                <strong style={{ color: message.authorColor }}>
                  {message.authorName}
                </strong>
                <time>{message.createdAt}</time>
              </div>
              <p>{message.content}</p>
            </div>
          ))
        )}
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <label htmlFor="waiting-chat-message" className={styles.srOnly}>
          채팅 메시지
        </label>
        <input
          id="waiting-chat-message"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="메시지를 입력하세요"
          maxLength={1000}
          disabled={disabled}
        />
        <button type="submit" disabled={disabled} aria-label="메시지 전송">
          전송
        </button>
      </form>
    </section>
  )
}

export default ChatPanel
