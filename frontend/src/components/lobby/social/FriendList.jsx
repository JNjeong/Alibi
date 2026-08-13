import { useEffect, useState } from "react"

import {
  getFriendsList,
  deleteFriend,
} from "../../../api/friend_api"

import useAuthStore from "../../../store/authStore"

import styles from "./UserList.module.css"

function FriendList({
  refreshKey,
  onOpenChat,
  selectedFriendId,
  openingFriendId,
}) {
  const currentUser = useAuthStore(
    (state) => state.user
  )

  const [friendships, setFriendships] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState("")

  const [isOpen, setIsOpen] =
    useState(true)

  const [
    deletingUsername,
    setDeletingUsername,
  ] = useState("")

  // 친구 목록 조회
  const fetchFriends = async () => {
    try {
      setLoading(true)
      setError("")

      const data =
        await getFriendsList()

      setFriendships(
        data.friends || []
      )
    } catch (error) {
      console.error(
        "친구 목록 조회 실패:",
        error
      )

      setError(
        error.response?.data?.message ||
          "친구 목록을 불러오지 못했습니다."
      )
    } finally {
      setLoading(false)
    }
  }

  // 친구 삭제
  const handleDeleteFriend = async (
    friendUsername
  ) => {
    const isConfirmed =
      window.confirm(
        `${friendUsername}님을 친구 목록에서 삭제할까요?`
      )

    if (!isConfirmed) {
      return
    }

    try {
      setDeletingUsername(
        friendUsername
      )

      const data =
        await deleteFriend(
          friendUsername
        )

      await fetchFriends()

      alert(
        data.message ||
          "친구를 삭제했습니다."
      )
    } catch (error) {
      console.error(
        "친구 삭제 실패:",
        error
      )

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
  }, [refreshKey])

  /*
    Friendship의 requester와 receiver 중
    현재 로그인 사용자가 아닌 쪽을 친구로 선택
  */
  const friendUsers = friendships
    .map((friendship) => {
      const requester =
        friendship.requester

      const receiver =
        friendship.receiver

      if (
        !currentUser?._id ||
        !requester ||
        !receiver
      ) {
        return null
      }

      const isCurrentUserRequester =
        String(requester._id) ===
        String(currentUser._id)

      return isCurrentUserRequester
        ? receiver
        : requester
    })
    .filter(Boolean)

  // 친구 카드 클릭
  const handleFriendClick = (friend) => {
    if (
      typeof onOpenChat !== "function"
    ) {
      console.error(
        "onOpenChat 함수가 전달되지 않았습니다."
      )

      return
    }

    onOpenChat(friend)
  }

  return (
    <section
      className={[
        styles["friend-panel"],
        styles["member-panel"],
      ].join(" ")}
    >
      <button
        type="button"
        className={
          styles["member-toggle"]
        }
        onClick={() =>
          setIsOpen((prev) => !prev)
        }
        aria-expanded={isOpen}
      >
        <div
          className={
            styles["member-heading"]
          }
        >
          <p
            className={
              styles["member-label"]
            }
          >
            MY FRIENDS
          </p>

          <h2
            className={
              styles["member-title"]
            }
          >
            친구 목록
          </h2>
        </div>

        <div
          className={
            styles[
              "member-toggle-right"
            ]
          }
        >
          <span
            className={
              styles["member-count"]
            }
          >
            {friendUsers.length}명
          </span>

          <span
            className={[
              styles["member-chevron"],
              isOpen
                ? styles[
                    "member-chevron-open"
                  ]
                : "",
            ].join(" ")}
            aria-hidden="true"
          >
            ▾
          </span>
        </div>
      </button>

      {isOpen && (
        <div
          className={
            styles["member-body"]
          }
        >
          <div
            className={
              styles[
                "member-scroll-area"
              ]
            }
          >
            {loading && (
              <p
                className={
                  styles[
                    "member-message"
                  ]
                }
              >
                친구 목록을 불러오는 중...
              </p>
            )}

            {!loading && error && (
              <p
                className={[
                  styles[
                    "member-message"
                  ],
                  styles[
                    "member-error"
                  ],
                ].join(" ")}
              >
                {error}
              </p>
            )}

            {!loading &&
              !error &&
              friendUsers.length ===
                0 && (
                <p
                  className={
                    styles[
                      "member-message"
                    ]
                  }
                >
                  아직 친구가 없습니다.
                </p>
              )}

            {!loading &&
              !error &&
              friendUsers.length >
                0 && (
                <div
                  className={
                    styles[
                      "member-list"
                    ]
                  }
                >
                  {friendUsers.map(
                    (friend) => {
                      const initial =
                        friend.nickname
                          ?.trim()
                          .charAt(0) ||
                        friend.username
                          ?.trim()
                          .charAt(0) ||
                        "?"

                      const isSelected =
                        String(
                          selectedFriendId
                        ) ===
                        String(friend._id)

                      const isOpening =
                        String(
                          openingFriendId
                        ) ===
                        String(friend._id)

                      return (
                        <article
                          key={
                            friend._id
                          }
                          className={[
                            styles[
                              "member-card"
                            ],
                            styles[
                              "friend-chat-card"
                            ],
                            isSelected
                              ? styles[
                                  "friend-chat-card-selected"
                                ]
                              : "",
                          ].join(" ")}
                          role="button"
                          tabIndex={0}
                          onClick={() =>
                            handleFriendClick(
                              friend
                            )
                          }
                          onKeyDown={(
                            event
                          ) => {
                            if (
                              event.key ===
                                "Enter" ||
                              event.key ===
                                " "
                            ) {
                              event.preventDefault()

                              handleFriendClick(
                                friend
                              )
                            }
                          }}
                        >
                          <div
                            className={
                              styles[
                                "member-profile"
                              ]
                            }
                          >
                            <div
                              className={
                                styles[
                                  "member-avatar"
                                ]
                              }
                            >
                              {initial}
                            </div>
                          </div>

                          <div
                            className={
                              styles[
                                "member-info"
                              ]
                            }
                          >
                            <strong
                              className={
                                styles[
                                  "member-nickname"
                                ]
                              }
                            >
                              {friend.nickname ||
                                "닉네임 없음"}
                            </strong>

                            <span
                              className={
                                styles[
                                  "member-username"
                                ]
                              }
                            >
                              @{friend.username}
                            </span>

                            {isOpening && (
                              <span
                                className={
                                  styles[
                                    "chat-opening"
                                  ]
                                }
                              >
                                채팅방 여는 중...
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            className={
                              styles[
                                "friend-delete-button"
                              ]
                            }
                            onClick={(
                              event
                            ) => {
                              /*
                                삭제 버튼 클릭이
                                친구 카드 클릭으로
                                전달되지 않도록 방지
                              */
                              event.stopPropagation()

                              handleDeleteFriend(
                                friend.username
                              )
                            }}
                            disabled={
                              deletingUsername ===
                                friend.username ||
                              isOpening
                            }
                          >
                            {deletingUsername ===
                            friend.username
                              ? "삭제 중..."
                              : "삭제"}
                          </button>
                        </article>
                      )
                    }
                  )}
                </div>
              )}
          </div>
        </div>
      )}
    </section>
  )
}

export default FriendList