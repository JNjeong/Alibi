import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import { getGameLogByRoomId } from "../../api/gameLog_api"
import styles from "./ResultPage.module.css"

function ResultPage() {
  const navigate = useNavigate()
  const { roomId } = useParams()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [gameLog, setGameLog] = useState(null)

  useEffect(() => {
    let cancelled = false

    const fetchGameLog = async () => {
      try {
        setLoading(true)
        setError("")

        const data = await getGameLogByRoomId(roomId)

        if (!cancelled) {
          setGameLog(data.gameLog)
        }
      } catch (fetchError) {
        console.error("게임 결과 조회 오류:", fetchError)

        if (!cancelled) {
          setError(
            fetchError.response?.data?.message ||
              "게임 결과를 불러오지 못했습니다."
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    if (roomId) {
      fetchGameLog()
    }

    return () => {
      cancelled = true
    }
  }, [roomId])

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.message}>게임 결과를 불러오는 중...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.page}>
        <p className={styles.error}>{error}</p>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => navigate("/lobby")}
        >
          로비로 돌아가기
        </button>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>GAME RESULT</p>
        <h1 className={styles.title}>게임 결과</h1>
        <p className={styles.meta}>
          방 코드: {gameLog?.room_code || "-"}
        </p>
      </header>

      <main className={styles.grid}>
        <section className={styles.card}>
          <h2>참가자</h2>
          <ul>
            {(gameLog?.room_members ?? []).map((member) => (
              <li key={member}>{member}</li>
            ))}
          </ul>
        </section>

        <section className={styles.card}>
          <h2>승리</h2>
          <ul>
            {(gameLog?.room_winner ?? []).length > 0 ? (
              gameLog.room_winner.map((winner) => (
                <li key={winner} className={styles.winner}>
                  {winner}
                </li>
              ))
            ) : (
              <li className={styles.empty}>기록 없음</li>
            )}
          </ul>
        </section>

        <section className={styles.card}>
          <h2>패배</h2>
          <ul>
            {(gameLog?.room_loser ?? []).length > 0 ? (
              gameLog.room_loser.map((loser) => (
                <li key={loser} className={styles.loser}>
                  {loser}
                </li>
              ))
            ) : (
              <li className={styles.empty}>기록 없음</li>
            )}
          </ul>
        </section>
      </main>

      <button
        type="button"
        className={styles.primaryButton}
        onClick={() => navigate("/lobby")}
      >
        로비로 돌아가기
      </button>
    </div>
  )
}

export default ResultPage
