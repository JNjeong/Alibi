import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"

import { getGameLogByRoomId } from "../../api/gameLog_api"
import { getMockGameLog } from "../../data/mockGameResult"
import styles from "./ResultPage.module.css"

function formatResultDate(value) {
  if (!value) {
    return "-"
  }

  return new Date(value).toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function ResultPage() {
  const navigate = useNavigate()
  const { roomId } = useParams()
  const [searchParams] = useSearchParams()

  const forceMock = searchParams.get("mock") === "1"

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [gameLog, setGameLog] = useState(null)
  const [isMockPreview, setIsMockPreview] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    const fetchGameLog = async () => {
      if (forceMock) {
        setGameLog(getMockGameLog(roomId))
        setIsMockPreview(true)
        setError("")
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError("")
        setIsMockPreview(false)

        const data = await getGameLogByRoomId(roomId)

        if (!cancelled) {
          setGameLog(data.gameLog)
        }
      } catch (fetchError) {
        console.error("게임 결과 조회 오류:", fetchError)

        if (!cancelled) {
          if (fetchError.response?.status === 404) {
            setGameLog(getMockGameLog(roomId))
            setIsMockPreview(true)
            setError("")
          } else {
            setError(
              fetchError.response?.data?.message ||
                "게임 결과를 불러오지 못했습니다."
            )
          }
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
  }, [forceMock, roomId, retryKey])

  const handleRetry = () => {
    setRetryKey((previous) => previous + 1)
  }

  const winners = gameLog?.room_winner ?? []
  const losers = gameLog?.room_loser ?? []
  const members = gameLog?.room_members ?? []

  const summary = useMemo(() => {
    if (winners.length === 0 && losers.length === 0) {
      return "게임 결과가 집계되었습니다."
    }

    if (winners.length === 1) {
      return `${winners[0]}님이 사건을 해결했습니다.`
    }

    return `${winners.join(", ")}님이 사건을 해결했습니다.`
  }, [losers.length, winners])

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
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleRetry}
          >
            다시 시도
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => navigate("/lobby")}
          >
            로비로 돌아가기
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => navigate(`/result/${roomId}?mock=1`)}
          >
            Mock 결과 미리보기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {isMockPreview && (
        <div className={styles.previewBanner}>
          준홍 GameLog 연동 전 · Mock 결과 미리보기
        </div>
      )}

      <header className={styles.header}>
        <p className={styles.eyebrow}>GAME RESULT</p>
        <h1 className={styles.title}>게임 결과</h1>
        <p className={styles.meta}>
          방 코드: {gameLog?.room_code || "-"}
        </p>
        <p className={styles.meta}>
          종료 시각: {formatResultDate(gameLog?.createdAt)}
        </p>
      </header>

      <section className={styles.summaryCard}>
        <p className={styles.summaryLabel}>RESULT SUMMARY</p>
        <h2 className={styles.summaryTitle}>{summary}</h2>
        <div className={styles.summaryStats}>
          <div>
            <span className={styles.statValue}>{members.length}</span>
            <span className={styles.statLabel}>참가자</span>
          </div>
          <div>
            <span className={styles.statValue}>{winners.length}</span>
            <span className={styles.statLabel}>승리</span>
          </div>
          <div>
            <span className={styles.statValue}>{losers.length}</span>
            <span className={styles.statLabel}>패배</span>
          </div>
        </div>
      </section>

      <main className={styles.grid}>
        <section className={styles.card}>
          <h2>참가자</h2>
          <ul className={styles.memberList}>
            {members.length > 0 ? (
              members.map((member) => {
                const isWinner = winners.includes(member)
                const isLoser = losers.includes(member)

                return (
                  <li
                    key={member}
                    className={[
                      styles.memberItem,
                      isWinner ? styles.memberWinner : "",
                      isLoser ? styles.memberLoser : "",
                    ].join(" ")}
                  >
                    <span className={styles.memberName}>{member}</span>
                    {isWinner && (
                      <span className={styles.memberBadge}>승리</span>
                    )}
                    {isLoser && (
                      <span className={styles.memberBadgeLose}>패배</span>
                    )}
                  </li>
                )
              })
            ) : (
              <li className={styles.empty}>기록 없음</li>
            )}
          </ul>
        </section>

        <section className={styles.card}>
          <h2>승리</h2>
          <ul className={styles.resultList}>
            {winners.length > 0 ? (
              winners.map((winner) => (
                <li key={winner} className={styles.winnerItem}>
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
          <ul className={styles.resultList}>
            {losers.length > 0 ? (
              losers.map((loser) => (
                <li key={loser} className={styles.loserItem}>
                  {loser}
                </li>
              ))
            ) : (
              <li className={styles.empty}>기록 없음</li>
            )}
          </ul>
        </section>
      </main>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={() => navigate("/lobby")}
        >
          로비로 돌아가기
        </button>
      </div>
    </div>
  )
}

export default ResultPage
