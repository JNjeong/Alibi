/**
 * ResultPage.jsx
 * -----------------------------------------------------------------------------
 * 역할
 * - URL의 gameId로 종료된 한 판 결과를 조회합니다.
 * - 정답 4개, 일반인 정답자 수, 범인 승패, 참가자별 개인 승패를 표시합니다.
 * - Room 문서나 Mock 데이터에 의존하지 않으므로 종료된 방이 정리돼도 열립니다.
 */

import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { getGameResult } from "../../api/game_api"
import styles from "./ResultPage.module.css"

function formatResultDate(value) {
  if (!value) return "-"
  return new Date(value).toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const FIELD_LABELS = {
  criminal: "범인",
  time: "시간",
  place: "장소",
  item: "도구",
}

function ResultPage() {
  const navigate = useNavigate()
  const { gameId } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [result, setResult] = useState(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setLoading(true)
        setError("")
        const response = await getGameResult(gameId)
        if (!cancelled) setResult(response.result)
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError.response?.data?.message ||
            "게임 결과를 불러오지 못했습니다."
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (gameId) load()
    return () => {
      cancelled = true
    }
  }, [gameId, retryKey])

  if (loading) {
    return <div className={styles.page}><p className={styles.message}>게임 결과를 집계하는 중...</p></div>
  }

  if (error || !result) {
    return (
      <div className={styles.page}>
        <p className={styles.error}>{error || "게임 결과가 없습니다."}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.primaryButton} onClick={() => setRetryKey(key => key + 1)}>다시 시도</button>
          <button type="button" className={styles.secondaryButton} onClick={() => navigate("/lobby")}>로비로 돌아가기</button>
        </div>
      </div>
    )
  }

  const viewer = result.viewerResult
  const personalSummary = viewer?.isKiller
    ? `일반인 완전 정답자는 ${result.citizenWinnerCount}명입니다. 범인인 당신은 ${viewer.win ? "승리" : "패배"}했습니다.`
    : viewer?.win
      ? "범인·시간·장소·도구 네 가지를 모두 맞혀 승리했습니다."
      : "네 가지 정답을 모두 맞히지 못해 패배했습니다."

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>GAME RESULT · TRUST NO ALIBI</p>
        <h1 className={styles.title}>{result.roomTitle}</h1>
        <p className={styles.meta}>방 코드: {result.roomCode}</p>
        <p className={styles.meta}>종료 시각: {formatResultDate(result.finishedAt)}</p>
      </header>

      <section className={styles.summaryCard}>
        <p className={styles.summaryLabel}>MY RESULT</p>
        <h2 className={styles.summaryTitle}>
          {viewer?.win ? "승리" : "패배"} · {viewer?.nickname}
        </h2>
        <p className={styles.meta}>{personalSummary}</p>
        <div className={styles.summaryStats}>
          <div><span className={styles.statValue}>{result.players.length}</span><span className={styles.statLabel}>참가자</span></div>
          <div><span className={styles.statValue}>{result.citizenWinnerCount}</span><span className={styles.statLabel}>승리한 일반인</span></div>
          <div><span className={styles.statValue}>{result.killerWon ? "승" : "패"}</span><span className={styles.statLabel}>범인 결과</span></div>
        </div>
      </section>

      <section className={styles.solutionCard}>
        <p className={styles.summaryLabel}>CASE SOLUTION</p>
        <div className={styles.solutionGrid}>
          <div><span>범인</span><strong>{result.solution.criminalNickname} <small>({result.solution.criminalCharacterName})</small></strong></div>
          <div><span>범행 시간</span><strong>{result.solution.crimeTimeLabel}</strong></div>
          <div><span>범행 장소</span><strong>{result.solution.crimePlaceName}</strong></div>
          <div><span>범행 도구</span><strong>{result.solution.crimeItemName}</strong></div>
        </div>
      </section>

      <main className={styles.playerGrid}>
        {result.players.map(player => (
          <article
            key={player.userId}
            className={`${styles.playerCard} ${player.win ? styles.memberWinner : styles.memberLoser}`}
          >
            <div className={styles.playerHeader}>
              <div>
                <h2>{player.nickname}</h2>
                <p>{player.isKiller ? "범인" : "일반인"} · {player.characterName}</p>
              </div>
              <span className={player.win ? styles.memberBadge : styles.memberBadgeLose}>
                {player.win ? "승리" : "패배"}
              </span>
            </div>
            <div className={styles.fieldResults}>
              {Object.entries(FIELD_LABELS).map(([key, label]) => (
                <span key={key} className={player.correctFields?.[key] ? styles.fieldCorrect : styles.fieldWrong}>
                  {label} {player.correctFields?.[key] ? "✓" : "✕"}
                </span>
              ))}
            </div>
            {player.isKiller && (
              <p className={styles.meta}>범인 승패는 일반인 완전 정답자 5명 기준으로 판정됩니다.</p>
            )}
          </article>
        ))}
      </main>

      <div className={styles.actions}>
        <button type="button" className={styles.primaryButton} onClick={() => navigate("/lobby")}>로비로 돌아가기</button>
      </div>
    </div>
  )
}

export default ResultPage
