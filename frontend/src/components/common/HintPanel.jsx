//  HintPanel 컴포넌트
//  게임 내 공식 힌트 패널을 렌더링하는 컴포넌트
//  게임 상태를 props로 받아서 공식 힌트의 상태를 표시하고, 각 힌트의 제목, 내용, 관련 값들을 보여줌
function HintPanel({ game }) {
  const revealedCount = game.hints.filter(
    (hint) => hint.status === "revealed",
  ).length

  // getValueLabel 함수는 valueId를 받아서 해당 값의 레이블을 반환
  // valueId가 장소, 시간대, 도구 중 어느 것에 해당하는지 확인하고, 해당 객체의 레이블을 반환
  // 만약 해당 valueId에 대한 객체가 존재하지 않으면 valueId 자체를 반환
  const getValueLabel = (valueId) => {
    const place = game.places.find((item) => item.id === valueId)
    const time = game.timeSlots.find((item) => item.id === valueId)
    const tool = game.toolPool.find((item) => item.id === valueId)
    return place?.shortName ?? time?.label ?? tool?.name ?? valueId
  }

  return (
    <section className="official-hints-panel">
      <div className="section-title-row hints-title">
        <div>
          <span className="eyebrow">OFFICIAL CLUES</span>
          <h3>공식 힌트</h3>
        </div>
        <span>
          {revealedCount}/{game.hints.length}
        </span>
      </div>

      <div className="official-hints-scroll">
        {game.hints.map((hint) => (
          <article key={hint.id} className={`compact-hint is-${hint.status}`}>
            <span className="hint-round">R{hint.round}</span>
            <div>
              <strong>{hint.title}</strong>
              <p>{hint.content}</p>
              {hint.status === "revealed" && (
                <div className="hint-values">
                  {hint.valueIds.map((valueId) => (
                    <span key={valueId}>{getValueLabel(valueId)}</span>
                  ))}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default HintPanel
