import { useEffect, useState } from "react"
import api from "../../../api/axios"
import styles from "./UserList.module.css"

function UserList() {
  const [users, setUsers] = useState([])
  const [searchKeyword, setSearchKeyword] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isSearchResult, setIsSearchResult] = useState(false)

  const [isOpen, setIsOpen] = useState(true)

  // 백엔드 응답이 배열이거나 { users: [] }인 경우 모두 처리
  const getUserArray = (data) => {
    if (Array.isArray(data)) {
      return data
    }

    return data.users || []
  }

  // 전체 회원 조회
  const fetchAllUsers = async () => {
    try {
      setLoading(true)
      setError("")

      const response = await api.get("/auth/all")

      setUsers(getUserArray(response.data))
      setIsSearchResult(false)
    } catch (error) {
      console.error("전체 회원 조회 실패:", error)
      setError("회원 목록을 불러오지 못했습니다.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllUsers()
  }, [])

  // 사용자 검색
  const handleSearch = async (event) => {
    event.preventDefault()

    const query = searchKeyword.trim()

    // 검색어가 비어 있으면 전체 회원을 다시 조회
    if (!query) {
      fetchAllUsers()
      return
    }

    try {
      setLoading(true)
      setError("")

      const response = await api.get("/auth/search", {
        params: {
          userId: query,
        },
      })

      setUsers(getUserArray(response.data))
      setIsSearchResult(true)
    } catch (error) {
      console.error("사용자 검색 실패:", error)

      setError(
        error.response?.data?.message ||
          "사용자 검색 중 오류가 발생했습니다."
      )
    } finally {
      setLoading(false)
    }
  }

  // 검색 초기화
  const handleReset = () => {
    setSearchKeyword("")
    fetchAllUsers()
  }

 return (
  <section className={styles["member-panel"]}>
    <button
      type="button"
      className={styles["member-toggle"]}
      onClick={() => setIsOpen((prev) => !prev)}
      aria-expanded={isOpen}
    >
      <div className={styles["member-heading"]}>
        <p className={styles["member-label"]}>
          LOBBY MEMBERS
        </p>

        <h2 className={styles["member-title"]}>
          전체 회원
        </h2>
      </div>

      <div className={styles["member-toggle-right"]}>
        <span className={styles["member-count"]}>
          {users.length}명
        </span>

        <span
          className={[
            styles["member-chevron"],
            isOpen ? styles["member-chevron-open"] : ""
          ].join(" ")}
          aria-hidden="true"
        >
          ▾
        </span>
      </div>
    </button>

    {isOpen && (
      <div className={styles["member-body"]}>
        <form
          className={styles["member-search"]}
          onSubmit={handleSearch}
        >
          <div
            className={styles["member-search-input-wrap"]}
          >
            <span
              className={styles["member-search-icon"]}
              aria-hidden="true"
            >
              ⌕
            </span>

            <input
              type="text"
              value={searchKeyword}
              onChange={(event) =>
                setSearchKeyword(event.target.value)
              }
              placeholder="아이디를 입력해주세요"
              className={styles["member-search-input"]}
            />
          </div>

          <button
            type="submit"
            className={styles["member-search-button"]}
          >
            검색
          </button>
        </form>

        <div className={styles["member-scroll-area"]}>
          {loading && (
            <p className={styles["member-message"]}>
              회원 목록을 불러오는 중...
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

          {!loading && !error && users.length === 0 && (
            <p className={styles["member-message"]}>
              {isSearchResult
                ? "검색된 사용자가 없습니다."
                : "다른 회원이 없습니다."}
            </p>
          )}

          {!loading && !error && users.length > 0 && (
            <div className={styles["member-list"]}>
              {users.map((user) => {
                const initial =
                  user.nickname?.trim().charAt(0) ||
                  user.username?.trim().charAt(0) ||
                  "?"

                return (
                  <article
                    className={styles["member-card"]}
                    key={user._id}
                  >
                    <div
                      className={styles["member-profile"]}
                    >
                      <div
                        className={styles["member-avatar"]}
                      >
                        {initial}
                      </div>
                    </div>

                    <div className={styles["member-info"]}>
                      <strong
                        className={
                          styles["member-nickname"]
                        }
                      >
                        {user.nickname || "닉네임 없음"}
                      </strong>

                      <span
                        className={
                          styles["member-username"]
                        }
                      >
                        @{user.username}
                      </span>
                    </div>

                    <button
                      type="button"
                      className={
                        styles["member-friend-button"]
                      }
                      onClick={() => {
                        console.log(
                          "친구 추가 대상:",
                          user._id
                        )
                      }}
                    >
                      + 친구 추가
                    </button>
                  </article>
                )
              })}
            </div>
          )}
        </div>

        {isSearchResult && (
          <button
            type="button"
            className={styles["member-reset-button"]}
            onClick={handleReset}
          >
            전체 회원 다시 보기
          </button>
        )}
      </div>
    )}
  </section>
)
}

export default UserList