// Timer 컴포넌트
// 게임의 남은 시간을 표시하고, 현재 라운드 진행 상황을 보여주는 컴포넌트
// game 객체와 남은 시간을 props로 받아서 렌더링
function Timer({ game, remainingSeconds = 0 }) {
  const currentRound = game?.rounds?.find(
    (round) => round.number === game.currentRound,
  )
  // 남은 시간을 분과 초로 변환하고, 2자리 문자열로 포맷
  const minutes = String(Math.floor(remainingSeconds / 60)).padStart(2, "0")
  const seconds = String(remainingSeconds % 60).padStart(2, "0")
  // 현재 라운드의 제출된 공식 기록   수와 전체 공식 기록 수를 계산하고, 진행률을 백분율로 계산
  const submitted = currentRound?.submitted ?? 0
  const total = currentRound?.total ?? 0
  const progress = total ? (submitted / total) * 100 : 0

  return (
    <>
      <section className="toolbar-timer" aria-label="라운드 남은 시간">
        <div>
          <span>ROUND {currentRound?.number ?? "-"}</span>
          <small>라운드 종료까지</small>
        </div>
        <time dateTime={`PT${remainingSeconds}S`}>
          {minutes}
          <i>:</i>
          {seconds}
        </time>
      </section>

      <section className="toolbar-progress" aria-label="현재 진행 상황">
        <div className="toolbar-progress-heading">
          <div>
            <span>현재 진행 상황</span>
            <strong>{currentRound?.title ?? "게임 준비 중"}</strong>
          </div>
          <b>
            {submitted}/{total}
          </b>
        </div>
        <div className="toolbar-progress-track">
          <span style={{ width: `${progress}%` }} />
        </div>
        <ol className="toolbar-round-dots" aria-label="전체 5라운드">
          {game?.rounds?.map((round) => (
            <li
              key={round.number}
              className={`is-${round.status}`}
              title={`${round.number}라운드 ${round.title}`}
            >
              {round.number}
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}

export default Timer
