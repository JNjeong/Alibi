import { useEffect, useState } from "react"
import {
  getFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
} from "../../../api/friend_api"
import styles from "./FriendRequestList.module.css"

function FriendRequestList({ onFriendAccepted }) {
  const [friendRequests, setFriendRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingUsername, setProcessingUsername] =
    useState("")
  const [error, setError] = useState("")

  // 받은 친구 요청 조회
  const fetchFriendRequests = async () => {
    try {
      setLoading(true)
      setError("")

      const data = await getFriendRequests()

      // 백엔드 응답: { friendRequests: [...] }
      setFriendRequests(data.friendRequests || [])
    } catch (error) {
      console.error("받은 친구 요청 조회 실패:", error)

      setError(
        error.response?.data?.message ||
          "친구 요청을 불러오지 못했습니다."
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFriendRequests()
  }, [])

  // 친구 요청 수락
  const handleAccept = async (requesterUsername) => {
    try {
      setProcessingUsername(requesterUsername)

      const data =
        await acceptFriendRequest(requesterUsername)

      // 수락한 요청을 화면에서 제거
      setFriendRequests((prev) =>
        prev.filter(
          (request) =>
            request.requester?.username !==
            requesterUsername
        )
      )

      // 친구 목록 새로고침 요청
      onFriendAccepted?.()

      alert(data.message || "친구 요청을 수락했습니다.")
    } catch (error) {
      console.error("친구 요청 수락 실패:", error)

      alert(
        error.response?.data?.message ||
          "친구 요청을 수락하지 못했습니다."
      )
    } finally {
      setProcessingUsername("")
    }
  }

  // 친구 요청 거절
  const handleReject = async (requesterUsername) => {
    try {
      setProcessingUsername(requesterUsername)

      const data =
        await rejectFriendRequest(requesterUsername)

      // 거절한 요청을 화면에서 제거
      setFriendRequests((prev) =>
        prev.filter(
          (request) =>
            request.requester?.username !==
            requesterUsername
        )
      )

      alert(data.message || "친구 요청을 거절했습니다.")
    } catch (error) {
      console.error("친구 요청 거절 실패:", error)

      alert(
        error.response?.data?.message ||
          "친구 요청을 거절하지 못했습니다."
      )
    } finally {
      setProcessingUsername("")
    }
  }

  if (loading) {
    return (
      <section className={styles["request-panel"]}>
        <p className={styles["request-message"]}>
          친구 요청을 불러오는 중...
        </p>
      </section>
    )
  }

  if (error) {
    return (
      <section className={styles["request-panel"]}>
        <p className={styles["request-error"]}>
          {error}
        </p>
      </section>
    )
  }

  // 요청이 없으면 영역 자체를 숨김
  if (friendRequests.length === 0) {
    return null
  }

  return (
    <section className={styles["request-panel"]}>
      <h3 className={styles["request-title"]}>
        신청 {friendRequests.length}건
      </h3>

      <div className={styles["request-list"]}>
        {friendRequests.map((request) => {
          const requester = request.requester

          if (!requester) {
            return null
          }

          const username = requester.username
          const initial =
            requester.nickname?.trim().charAt(0) ||
            username?.trim().charAt(0) ||
            "?"

          const isProcessing =
            processingUsername === username

          return (
            <article
              key={request._id}
              className={styles["request-card"]}
            >
              <div className={styles["request-user"]}>
                <div className={styles["request-avatar"]}>
                  {initial}
                </div>

                <div className={styles["request-info"]}>
                  <strong>
                    {requester.nickname || username}
                  </strong>

                  <span>@{username}</span>
                </div>
              </div>

              <div className={styles["request-actions"]}>
                <button
                  type="button"
                  className={styles["accept-button"]}
                  disabled={isProcessing}
                  onClick={() =>
                    handleAccept(username)
                  }
                >
                  {isProcessing ? "처리 중" : "수락"}
                </button>

                <button
                  type="button"
                  className={styles["reject-button"]}
                  disabled={isProcessing}
                  onClick={() =>
                    handleReject(username)
                  }
                >
                  거절
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default FriendRequestList