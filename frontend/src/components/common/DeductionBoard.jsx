// DeductionBoard 컴포넌트
// 게임 내 개인 추리 보드 기능을 제공하는 컴포넌트
// 게임 상태, 현재 플레이어, 개인 메모, 선택된 셀, 셀 선택 이벤트를 props로 받음
// 시간대별로 각 플레이어의 행적과 공식 기록을 표시하며, 선택된 셀에 대한 상세 정보를 보여줌
// 개인 메모를 작성하고 수정할 수 있는 기능을 제공하며, 선택된 셀의 정보에 따라 표시되는 내용이 달라짐
const STATUS_LABEL = {
  verified: "확인된 진술",
  pending: "검증 대기",
  contradiction: "모순 감지",
}

function DeductionBoard({
  game,
  currentPlayer,
  notes,
  onNoteChange,
  selectedCell,
  onSelectCell,
}) {
  // 선택된 셀에 해당하는 플레이어, 시간대, 공식 기록, 개인 행적, 장소, 도구, 동행자 정보를 계산
  const selectedPlayer = game.players.find(
    (player) => player.id === selectedCell.playerId,
  )
  const selectedTime = game.timeSlots.find(
    (slot) => slot.id === selectedCell.timeId,
  )
  const selectedKey = `${selectedCell.timeId}-${selectedCell.playerId}`
  const selectedEvidence = game.boardEvidence[selectedKey]
  const selectedTimeline = selectedPlayer?.timeline.find(
    (entry) => entry.timeId === selectedCell.timeId,
  )
  // 현재 플레이어가 선택된 셀의 플레이어와 동일한 경우에만 개인 타임라인을 볼 수 있도록 조건부 로직 적용
  const canSeePrivateTimeline = selectedPlayer?.id === currentPlayer.id
  const selectedPlace = game.places.find(
    (place) =>
      place.id ===
      (canSeePrivateTimeline
        ? selectedTimeline?.placeId
        : selectedEvidence?.placeId),
  )
  // 선택된 셀의 도구와 동행자 정보를 계산
  const selectedTool = game.toolPool.find(
    (tool) =>
      tool.id ===
      (canSeePrivateTimeline
        ? selectedTimeline?.toolId
        : selectedEvidence?.toolId),
  )
  // 선택된 셀의 동행자 정보를 계산하며, 현재 플레이어가 개인 타임라인을 볼 수 있는 경우에만 동행자 정보를 표시
  const companions = canSeePrivateTimeline
    ? selectedTimeline?.companionIds
        .map((id) => game.players.find((player) => player.id === id)?.nickname)
        .filter(Boolean)
    : []

  return (
    <section className="tab-page deduction-board-page">
      <div className="tab-page-heading">
        <div>
          <span className="eyebrow">PERSONAL DEDUCTION SPACE</span>
          <h2>개인 추리 보드</h2>
          <p>공식 기록을 시간대별로 배치하고 나만의 메모를 남겨보세요.</p>
        </div>
        <div className="board-legend">
          <span><i className="legend-self" />내 행적</span>
          <span><i className="legend-proof" />공식 기록</span>
          <span><i className="legend-conflict" />모순</span>
          <span><i className="legend-note" />메모</span>
        </div>
      </div>

      <div className="deduction-scroll">
        <div
          className="main-game-deduction-grid"
          style={{
            gridTemplateColumns: `76px repeat(${game.players.length}, minmax(108px, 1fr))`,
          }}
        >
          <div className="grid-corner">TIME</div>
          {game.players.map((player) => (
            <div
              key={player.id}
              className={`grid-player ${player.id === currentPlayer.id ? "is-me" : ""}`}
            >
              <span style={{ "--column-color": player.color }}>
                {player.nickname.slice(0, 1)}
              </span>
              <strong>{player.nickname}</strong>
              <small>{player.character.occupation}</small>
            </div>
          ))}

          {game.timeSlots.flatMap((slot) => [
            <div key={`${slot.id}-time`} className="grid-time">
              {slot.label}
            </div>,
            ...game.players.map((player) => {
              const key = `${slot.id}-${player.id}`
              const evidence = game.boardEvidence[key]
              const timeline = player.timeline.find(
                (entry) => entry.timeId === slot.id,
              )
              const isMine = player.id === currentPlayer.id
              const isSelected = key === selectedKey
              const hasNote = Boolean(notes[key]?.trim())
              const place = isMine
                ? game.places.find((item) => item.id === timeline.placeId)
                : game.places.find((item) => item.id === evidence?.placeId)

              return (
                <button
                  key={key}
                  type="button"
                  className={[
                    "deduction-cell",
                    isMine ? "is-mine" : "",
                    evidence ? "has-evidence" : "",
                    evidence?.status === "contradiction" ? "has-conflict" : "",
                    isSelected ? "is-selected" : "",
                  ].join(" ")}
                  onClick={() =>
                    onSelectCell({ timeId: slot.id, playerId: player.id })
                  }
                >
                  {place ? (
                    <>
                      <strong>{place.shortName}</strong>
                      <span>
                        {isMine ? timeline.activity : "공식 기록"}
                      </span>
                    </>
                  ) : (
                    <span className="unknown-mark">·</span>
                  )}
                  {hasNote && <i className="note-mark" aria-label="메모 있음" />}
                </button>
              )
            }),
          ])}
        </div>
      </div>

      <div className="board-inspector">
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
            <span>{selectedPlayer?.character.occupation}</span>
          </div>
        </div>

        <div className="inspector-evidence">
          {canSeePrivateTimeline ? (
            <>
              <span className="detail-label">나의 실제 행적</span>
              <strong>{selectedPlace?.name}</strong>
              <p>{selectedTimeline?.activity}</p>
              <small>
                동행: {companions.length ? companions.join(", ") : "없음"}
                {selectedTool ? ` · 소지: ${selectedTool.name}` : ""}
              </small>
            </>
          ) : selectedEvidence ? (
            <>
              <span className="detail-label">공개된 공식 기록</span>
              <strong>{selectedPlace?.name}</strong>
              <p>{STATUS_LABEL[selectedEvidence.status]}</p>
              <small>출처: {selectedEvidence.sourceType === "statement" ? "공식 진술" : "공식 답변"}</small>
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
          <span>개인 메모</span>
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
