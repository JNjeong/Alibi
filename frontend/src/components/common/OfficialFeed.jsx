// OfficialFeed 컴포넌트
// 게임 내 공식 기록 피드를 렌더링하는 컴포넌트
// 게임 상태, 공식 기록 항목, 필터 상태, 필터 변경 이벤트 핸들러, 공식 질문 작성 이벤트 핸들러를 props로 받음
const FILTERS = [
  { id: "all", label: "전체" },
  { id: "statement", label: "진술" },
  { id: "question", label: "질문" },
  { id: "answer", label: "답변" },
]

// TYPE_LABEL과 STATUS_LABEL은 공식 기록 항목의 타입과 상태를 한글로 표시하기 위한 매핑 객체
const TYPE_LABEL = {
  statement: "공식 진술",
  question: "공식 질문",
  answer: "공식 답변",
}

const STATUS_LABEL = {
  unchecked: "검사 대기",
  verified: "검사 완료",
  pending: "답변 대기",
  answered: "답변 완료",
  timed_out: "시간 초과",
  contradiction: "모순 감지",
}

// OfficialFeed 컴포넌트
function OfficialFeed({ game, items, filter, onFilterChange, onOpenQA }) {
  const visibleItems = (
    filter === "all" ? items : items.filter((item) => item.type === filter)
  ).slice().reverse()
  const conflictKeys = new Set()
  items.forEach((item) => {
    ;(item.conflicts || []).forEach((conflict) => {
      const participants = [item.id, ...(conflict.relatedRecordIds || []).map(String)]
        .map(String)
        .sort()
      conflictKeys.add(`${conflict.code}:${participants.join(":")}`)
    })
  })
  const contradictionCount = conflictKeys.size
  const findPlayer = (playerId) =>
    game.players.find((player) => player.id === playerId)

  return (
    <aside className="workspace-panel official-feed-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">OFFICIAL RECORD</span>
          <h2>공식 기록 피드</h2>
        </div>
        <div className="feed-heading-counts">
          {contradictionCount > 0 && (
            <span className="conflict-count">모순 {contradictionCount}</span>
          )}
          <span className="record-count">{items.length}</span>
        </div>
      </div>

      <div className="feed-filters" role="tablist" aria-label="공식 기록 필터">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={filter === item.id ? "is-active" : ""}
            onClick={() => onFilterChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="feed-scroll" aria-live="polite">
        {visibleItems.map((item) => {
          const author = findPlayer(item.authorId)
          const target = findPlayer(item.targetId)

          return (
            <article
              key={item.id}
              className={`feed-card type-${item.type} status-${item.status}`}
            >
              {item.status === "contradiction" && (
                <div className="feed-conflict-alert" role="status">
                  <span>!</span>
                  모순 {Math.max(1, item.conflicts?.length || 0)}건 감지 · 다른 공식 기록과 일치하지 않습니다
                </div>
              )}
              <div className="feed-card-meta">
                <span className="feed-type">{TYPE_LABEL[item.type]}</span>
                <time>{item.createdAt}</time>
              </div>

              <div className="feed-author">
                <span
                  className="feed-avatar"
                  style={{ "--feed-color": author?.color ?? "#a9a7ff" }}
                >
                  {author?.nickname?.slice(0, 1) ?? "?"}
                </span>
                <div>
                  <strong>{author?.nickname ?? "알 수 없음"}</strong>
                  <span>
                    {item.type === "question" && target
                      ? `→ ${target.nickname}에게`
                      : author?.character.occupation}
                  </span>
                </div>
              </div>

              {item.timeLabel && <span className="feed-time">{item.timeLabel}</span>}
              <p className="feed-content">{item.content}</p>

              <div className="feed-card-footer">
                <span className={`status-chip status-${item.status}`}>
                  {STATUS_LABEL[item.status] ?? item.status}
                </span>
                <span>ROUND {item.round}</span>
              </div>
            </article>
          )
        })}

        {visibleItems.length === 0 && (
          <div className="empty-state compact">
            <span>기록 없음</span>
            아직 등록된 공식 기록이 없습니다.
          </div>
        )}
      </div>

      <button className="panel-action" type="button" onClick={onOpenQA}>
        공식 질문 작성
        <span>→</span>
      </button>
    </aside>
  )
}

export default OfficialFeed
