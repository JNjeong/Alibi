import { useEffect, useState } from "react"
import { getFriendsList , deleteFriend} from "../../../api/friend_api"
import useAuthStore from "../../../store/authStore"
import styles from "./UserList.module.css"

function FriendList({ refreshKey }) {
  const currentUser = useAuthStore((state) => state.user) // 현재 로그인한 사용자 정보

  const [friendships, setFriendships] = useState([]) 
  const [loading, setLoading] = useState(true) // 친구 목록 로딩 상태
  const [error, setError] = useState("") // 친구 목록 조회 에러 상태
  const [isOpen, setIsOpen] = useState(true) // 친구 목록 패널 열림/닫힘 상태

  const [deletingUsername, setDeletingUsername] = useState("") // 친구 삭제 중인 사용자 아이디 

  // 친구 목록 조회
  const fetchFriends = async () => {
    try {
      setLoading(true)
      setError("")

      const data = await getFriendsList()

      setFriendships(data.friends || [])
    } catch (error) {
      console.error("친구 목록 조회 실패:", error)

      setError(
        error.response?.data?.message ||
          "친구 목록을 불러오지 못했습니다."
      )
    } finally {
      setLoading(false)
    }
  }
  const handleDeleteFriend = async (friendUsername) => {
  const isConfirmed = window.confirm(
    `${friendUsername}님을 친구 목록에서 삭제할까요?`
  )

  if (!isConfirmed) {
    return
  }

  try {
    setDeletingUsername(friendUsername)

    const data = await deleteFriend(friendUsername)

    // 삭제 후 서버에서 친구 목록 다시 조회
    await fetchFriends()

    alert(data.message || "친구를 삭제했습니다.")
  } catch (error) {
    console.error("친구 삭제 실패:", error)

    alert(
      error.response?.data?.message ||
        "친구를 삭제하지 못했습니다."
    )
  } finally {
    setDeletingUsername("")
  }
}

  useEffect(() => {
    fetchFriends()
  }, [refreshKey]) // refreshKey가 변경될 때마다 친구 목록을 새로 조회

  /*
    백엔드 응답은 친구 사용자만 오는 게 아니라
    다음과 같은 Friendship 문서가 배열로 옴.

    {
      requester: 사용자,
      receiver: 사용자,
      status: "accepted"
    }

    따라서 requester와 receiver 중
    현재 로그인 사용자가 아닌 쪽을 친구로 선택
  */
  const friendUsers = friendships
    .map((friendship) => {
      const requester = friendship.requester
      const receiver = friendship.receiver

      if (!currentUser?._id || !requester || !receiver) {
        return null
      }

      const isCurrentUserRequester =
        String(requester._id) === String(currentUser._id)

      return isCurrentUserRequester
        ? receiver
        : requester
    })
    .filter(Boolean)

  return (
    <section
      className={`${styles["friend-panel"]} ${
        styles["member-panel"]
      }`}
    >
      <button
        type="button"
        className={styles["member-toggle"]}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <div className={styles["member-heading"]}>
          <p className={styles["member-label"]}>
            MY FRIENDS
          </p>

          <h2 className={styles["member-title"]}>
            친구 목록
          </h2>
        </div>

        <div className={styles["member-toggle-right"]}>
          <span className={styles["member-count"]}>
            {friendUsers.length}명
          </span>

          <span
            className={[
              styles["member-chevron"],
              isOpen
                ? styles["member-chevron-open"]
                : "",
            ].join(" ")}
            aria-hidden="true"
          >
            ▾
          </span>
        </div>
      </button>

      {isOpen && (
        <div className={styles["member-body"]}>
          <div className={styles["member-scroll-area"]}>
            {loading && (
              <p className={styles["member-message"]}>
                친구 목록을 불러오는 중...
              </p>
            )}

            {!loading && error && (
              <p
                className={`${styles["member-message"]} ${
                  styles["member-error"]
                }`}
              >
                {error}
              </p>
            )}

            {!loading &&
              !error &&
              friendUsers.length === 0 && (
                <p className={styles["member-message"]}>
                  아직 친구가 없습니다.
                </p>
              )}

            {!loading &&
              !error &&
              friendUsers.length > 0 && (
                <div className={styles["member-list"]}>
                  {friendUsers.map((friend) => {
                    const initial =
                      friend.nickname
                        ?.trim()
                        .charAt(0) ||
                      friend.username
                        ?.trim()
                        .charAt(0) ||
                      "?"

                    return (
                      <article
                        key={friend._id}
                        className={styles["member-card"]}
                      >
                        <div
                          className={
                            styles["member-profile"]
                          }
                        >
                          <div
                            className={
                              styles["member-avatar"]
                            }
                          >
                            {initial}
                          </div>
                        </div>

                        <div
                          className={
                            styles["member-info"]
                          }
                        >
                          <strong
                            className={
                              styles["member-nickname"]
                            }
                          >
                            {friend.nickname ||
                              "닉네임 없음"}
                          </strong>

                          <span
                            className={
                              styles["member-username"]
                            }
                          >
                            @{friend.username}
                          </span>
                            <button
                            type="button"
                            className={styles["friend-delete-button"]}
                            onClick={() =>
                              handleDeleteFriend(friend.username)
                            }
                            disabled={
                              deletingUsername === friend.username
                            }
                          >
                            {deletingUsername === friend.username
                              ? "삭제 중..."
                              : "삭제"}
                          </button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
          </div>
        </div>
      )}
    </section>
  )
}

export default FriendList