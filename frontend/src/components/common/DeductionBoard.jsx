import GamePageHeader from "./GamePageHeader"

const STATUS_LABEL = {
  verified: "확인된 진술",
  pending: "검증 대기",
  answered: "답변 완료",
  contradiction: "모순 감지",
}

/**
 * 개인 추리 보드
 * - 18개 슬롯을 6개 시간 카드로 묶어 개인 타임라인과 같은 읽기 흐름을 만듭니다.
 * - 공식 정보와 자기 실제 행적은 구분하되 모든 참가자를 같은 시간축에서 비교합니다.
 * - 메모는 게임·사용자별 브라우저 저장소에 남고 공식 기록에는 전송되지 않습니다.
 */
function DeductionBoard({
  game,
  currentPlayer,
  notes,
  onNoteChange,
  selectedCell,
  onSelectCell,
}) {
  const boardEvidence = game.boardEvidence || {}
  const evidenceList = Object.values(boardEvidence)
  const conflictKeys = new Set()
  ;(game.officialFeed || []).forEach((item) => {
    ;(item.conflicts || []).forEach((conflict) => {
      const participants = [item.id, ...(conflict.relatedRecordIds || []).map(String)]
        .map(String)
        .sort()
      conflictKeys.add(`${conflict.code}:${participants.join(":")}`)
    })
  })
  const conflictCount = conflictKeys.size
  const noteCount = Object.values(notes).filter((note) => note?.trim()).length

  const selectedPlayer = game.players.find(
    (player) => player.id === selectedCell.playerId,
  )
  const selectedTime = game.timeSlots.find(
    (slot) => slot.id === selectedCell.timeId,
  )
  const selectedKey = `${selectedCell.timeId}-${selectedCell.playerId}`
  const selectedEvidence = boardEvidence[selectedKey]
  const selectedTimeline = selectedPlayer?.timeline.find(
    (entry) => entry.timeId === selectedCell.timeId,
  )
  const canSeePrivateTimeline = selectedPlayer?.id === currentPlayer.id
  const selectedPlace = game.places.find(
    (place) =>
      place.id ===
      (canSeePrivateTimeline
        ? selectedTimeline?.placeId
        : selectedEvidence?.placeIds?.length === 1
          ? selectedEvidence.placeIds[0]
          : selectedEvidence?.placeId),
  )
  const selectedTool = game.toolPool.find(
    (tool) =>
      tool.id ===
      (canSeePrivateTimeline
        ? selectedTimeline?.toolId
        : selectedEvidence?.toolId),
  )
  const companions = canSeePrivateTimeline
    ? (selectedTimeline?.companionIds || [])
        .map((id) => game.players.find((player) => player.id === id)?.nickname)
        .filter(Boolean)
    : []

  const hourGroups = game.timeSlots.reduce((groups, slot) => {
    const hourKey = String(slot.time)
    const existing = groups.find((group) => group.hourKey === hourKey)

    if (existing) {
      existing.slots.push(slot)
    } else {
      groups.push({
        hourKey,
        label: `${String(slot.time).padStart(2, "0")}:00`,
        slots: [slot],
      })
    }

    return groups
  }, [])

  return (
    <section className="tab-page deduction-board-page">
      <GamePageHeader
        eyebrow="PERSONAL DEDUCTION SPACE"
        title="개인 추리 보드"
        description="칸을 선택하면 화면 아래 메모 입력창이 열립니다. 메모는 이 브라우저에 자동 저장됩니다."
      >
        <div className="board-legend" aria-label="추리 보드 범례">
          <span><i className="legend-self" />내 행적</span>
          <span><i className="legend-proof" />공식 기록</span>
          <span><i className="legend-conflict" />모순</span>
          <span><i className="legend-note" />메모</span>
        </div>
      </GamePageHeader>

      <div className="board-summary-strip" aria-label="추리 보드 요약">
        <article>
          <span>공개된 기록</span>
          <strong>{evidenceList.length}</strong>
          <small>진술 기반</small>
        </article>
        <article className={conflictCount ? "has-danger" : ""}>
          <span>감지된 모순</span>
          <strong>{conflictCount}</strong>
          <small>{conflictCount ? "확인 필요" : "현재 없음"}</small>
        </article>
        <article>
          <span>개인 메모</span>
          <strong>{noteCount}</strong>
          <small>나에게만 표시</small>
        </article>
        <article>
          <span>분석 범위</span>
          <strong>{game.timeSlots.length}</strong>
          <small>20분 단위 슬롯</small>
        </article>
      </div>

      <div className="deduction-scroll">
        <div className="board-hour-list">
          {hourGroups.map((group) => (
            <article className="board-hour-card" key={group.hourKey}>
              <header className="board-hour-heading">
                <strong>{group.label}</strong>
                <span>20분 단위 {group.slots.length}개 기록</span>
              </header>

              <div
                className="board-hour-grid"
                style={{
                  gridTemplateColumns: `84px repeat(${game.players.length}, minmax(132px, 1fr))`,
                }}
              >
                <div className="grid-corner">시간</div>
                {game.players.map((player) => (
                  <div
                    key={`${group.hourKey}-${player.id}`}
                    className={`grid-player ${player.id === currentPlayer.id ? "is-me" : ""}`}
                  >
                    <span style={{ "--column-color": player.color }}>
                      {player.nickname.slice(0, 1)}
                    </span>
                    <strong>{player.nickname}</strong>
                    <small>{player.character.name || player.character.occupation}</small>
                  </div>
                ))}

                {group.slots.flatMap((slot) => [
                  <div key={`${slot.id}-time`} className="grid-time">
                    {slot.label}
                  </div>,
                  ...game.players.map((player) => {
                    const key = `${slot.id}-${player.id}`
                    const evidence = boardEvidence[key]
                    const timeline = player.timeline.find(
                      (entry) => entry.timeId === slot.id,
                    )
                    const isMine = player.id === currentPlayer.id
                    const isSelected = key === selectedKey
                    const hasNote = Boolean(notes[key]?.trim())
                    const hasConflict = evidence?.status === "contradiction"
                    const hasMultiplePlaces =
                      !isMine && (evidence?.placeIds?.length || 0) > 1
                    const placeId = isMine
                      ? timeline?.placeId
                      : hasMultiplePlaces
                        ? null
                        : evidence?.placeIds?.[0] || evidence?.placeId
                    const place = game.places.find((item) => item.id === placeId)

                    return (
                      <button
                        key={key}
                        type="button"
                        className={[
                          "deduction-cell",
                          isMine ? "is-mine" : "",
                          evidence ? "has-evidence" : "",
                          hasConflict ? "has-conflict" : "",
                          isSelected ? "is-selected" : "",
                        ].join(" ")}
                        onClick={() =>
                          onSelectCell({ timeId: slot.id, playerId: player.id })
                        }
                      >
                        <span className="cell-status-row">
                          {hasConflict ? (
                            <em className="cell-state is-conflict">모순</em>
                          ) : evidence ? (
                            <em className="cell-state is-evidence">공식 기록</em>
                          ) : isMine ? (
                            <em className="cell-state is-private">내 행적</em>
                          ) : (
                            <em className="cell-state is-empty">미확인</em>
                          )}
                          {hasNote && <i className="note-mark" aria-label="메모 있음" />}
                        </span>

                        {place || hasMultiplePlaces ? (
                          <>
                            <strong>{hasMultiplePlaces ? "복수 장소 진술" : place.shortName || place.name}</strong>
                            <span>
                              {isMine
                                ? timeline?.activity || "행동 기록"
                                : `${STATUS_LABEL[evidence?.status] || "공식 기록"}${evidence?.recordCount > 1 ? ` · ${evidence.recordCount}건` : ""}`}
                            </span>
                          </>
                        ) : (
                          <span className="unknown-mark">공개 정보 없음</span>
                        )}
                      </button>
                    )
                  }),
                ])}
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className={`board-inspector ${selectedEvidence?.status === "contradiction" ? "has-conflict" : ""}`}>
        <div className="inspector-summary">
          <span className="inspector-time">{selectedTime?.label}</span>
          <span
            className="inspector-avatar"
            style={{ "--inspector-color": selectedPlayer?.color }}
          >
            {selectedPlayer?.nickname.slice(0, 1)}
          </span>
          <div>
            <strong>{selectedPlayer?.nickname}</strong>
            <span>{selectedPlayer?.character.name || selectedPlayer?.character.occupation}</span>
          </div>
        </div>

        <div className="inspector-evidence">
          {canSeePrivateTimeline ? (
            <>
              <span className="detail-label">나의 실제 행적</span>
              <strong>{selectedPlace?.name || "장소 정보 없음"}</strong>
              <p>{selectedTimeline?.activity || "행동 기록이 없습니다."}</p>
              <small>
                동행: {companions.length ? companions.join(", ") : "없음"}
                {selectedTool ? ` · 소지: ${selectedTool.name}` : ""}
              </small>
            </>
          ) : selectedEvidence ? (
            <>
              <span className="detail-label">공개된 공식 기록</span>
              <strong>
                {selectedEvidence.placeIds?.length > 1
                  ? selectedEvidence.placeIds
                      .map((id) => game.places.find((place) => place.id === id)?.name || id)
                      .join(" ↔ ")
                  : selectedPlace?.name || "장소 정보 없음"}
              </strong>
              <p className={selectedEvidence.status === "contradiction" ? "is-danger-text" : ""}>
                {STATUS_LABEL[selectedEvidence.status] || selectedEvidence.status}
              </p>
              <small>
                출처: 공식 진술 {selectedEvidence.recordCount || 1}건
              </small>
            </>
          ) : (
            <>
              <span className="detail-label">공개 정보 없음</span>
              <strong>아직 확인되지 않은 시간대</strong>
              <p>진술 또는 답변이 등록되면 이 칸에 표시됩니다.</p>
            </>
          )}
        </div>

        <label className="cell-note-editor">
          <span>개인 메모 <small>{(notes[selectedKey] || "").length}/300</small></span>
          <textarea
            value={notes[selectedKey] ?? ""}
            onChange={(event) => onNoteChange(selectedKey, event.target.value)}
            placeholder="의심되는 점이나 연결할 단서를 기록하세요."
            maxLength={300}
          />
        </label>
      </div>
    </section>
  )
}

export default DeductionBoard
