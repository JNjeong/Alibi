import { useEffect, useState } from "react"
import styles from "./CreateRoomModal.module.css"
import api from "../../../api/axios"

import {
  openChatRoom,
  sendRoomInvite,
} from "../../../api/chat_api"

const getCurrentUserKeys = () => {
  const keys = new Set()

  // localStorage에 저장된 사용자 정보
  const localStorageKeys = [
    localStorage.getItem("userId"),
    localStorage.getItem("_id"),
    localStorage.getItem("username"),
    localStorage.getItem("id")
  ]

  localStorageKeys
    .filter(Boolean)
    .forEach((value) => keys.add(String(value)))

  // JWT 안에 들어 있는 사용자 정보
  const token = localStorage.getItem("token")

  if (token) {
    try {
      const payloadPart = token.split(".")[1]

      const base64 = payloadPart
        .replace(/-/g, "+")
        .replace(/_/g, "/")

      const paddedBase64 = base64.padEnd(
        Math.ceil(base64.length / 4) * 4,
        "="
      )

      const payload = JSON.parse(atob(paddedBase64))

      const tokenKeys = [
        payload.userId,
        payload._id,
        payload.username,
        payload.id,
        payload.sub
      ]

      tokenKeys
        .filter(Boolean)
        .forEach((value) => keys.add(String(value)))
    } catch (error) {
      console.warn("JWT 사용자 정보 확인 실패:", error)
    }
  }

  return keys
}



function CreateRoomModal({
  open,
  room,
  loading = false,
  error = "",
  onClose,
  onCreate,
  onMoveToWaitingRoom
}) {
  const [title, setTitle] = useState("")
  const [localError, setLocalError] = useState("")
  const [friends, setFriends] = useState([])
  const [friendsLoading, setFriendsLoading] = useState(false)
  const [friendsError,setFriendsError] = useState("")
  const [invitingFriendId, setInvitingFriendId] =
  useState("")

const handleInviteFriend = async (friend) => {
  if (!friend?.userId || !roomId) {
    return
  }

  try {
    setInvitingFriendId(friend.userId)

    // 친구와의 채팅방 조회 또는 생성
    const chatData = await openChatRoom(
      friend.userId
    )

    const chatRoomId =
      chatData?.chatRoom?._id

    if (!chatRoomId) {
      throw new Error(
        "채팅방 정보를 불러오지 못했습니다."
      )
    }

    // 채팅방에 게임방 초대 메시지 전송
    await sendRoomInvite(
      chatRoomId,
      roomId
    )

    alert(
      `${friend.nickname || friend.username}님에게 초대를 보냈습니다.`
    )
  } catch (error) {
    console.error(
      "친구 초대 실패:",
      error
    )

    alert(
      error.response?.data?.message ||
        error.message ||
        "초대를 보내지 못했습니다."
    )
  } finally {
    setInvitingFriendId("")
  }
}


  useEffect(() => {
    if (open) {
      setTitle("")
      setLocalError("")
    }
  }, [open])

 useEffect(() => {
  if (!open || !room) {
    return
  }

  const fetchFriends = async () => {
    try {
      setFriendsLoading(true)
      setFriendsError("")

      const response = await api.get("/friends")

      const friendships =
        response.data?.friends ??
        response.data ??
        []

      if (!Array.isArray(friendships)) {
        setFriends([])
        setFriendsError(
          "친구 목록 응답 형식이 올바르지 않습니다."
        )
        return
      }

      const currentUserKeys = getCurrentUserKeys()

      const normalizedFriends = friendships
        .filter(
          (friendship) =>
            friendship.status === "accepted"
        )
        .map((friendship) => {
          const requester = friendship.requester
          const receiver = friendship.receiver

          const requesterIsMe = [
            requester?._id,
            requester?.username
          ]
            .filter(Boolean)
            .some((value) =>
              currentUserKeys.has(String(value))
            )

          const receiverIsMe = [
            receiver?._id,
            receiver?.username
          ]
            .filter(Boolean)
            .some((value) =>
              currentUserKeys.has(String(value))
            )

          const friendUser = requesterIsMe
            ? receiver
            : receiverIsMe
              ? requester
              : null

          if (!friendUser) {
            console.warn(
              "현재 사용자와 일치하지 않는 친구 관계:",
              friendship
            )
            return null
          }

          return {
            friendshipId: friendship._id,
            userId: friendUser?._id,
            username: friendUser?.username,
            nickname: friendUser?.nickname
          }
        })
        .filter(
          (friend) =>
            friend !== null && friend.userId
        )

      setFriends(normalizedFriends)
    } catch (error) {
      console.error("친구 목록 조회 실패:", error)

      setFriends([])
      setFriendsError(
        error.response?.data?.message ||
          "친구 목록을 불러오지 못했습니다."
      )
    } finally {
      setFriendsLoading(false)
    }
  }

  fetchFriends()
}, [open, room]) 

  if (!open) {
    return null
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    const trimmedTitle = title.trim()

    if (trimmedTitle.length > 30) {
      setLocalError(
        "방 제목은 30자 이하로 입력해주세요."
      )
      return
    }

    setLocalError("")
    onCreate?.(trimmedTitle)
  }

  const handleOverlayClick = (event) => {
    if (
      event.target === event.currentTarget &&
      !loading
    ) {
      onClose?.()
    }
  }

  const roomId = room?.roomId || room?._id

  return (
    <div
      className={styles.overlay}
      onMouseDown={handleOverlayClick}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-room-title"
      >
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          disabled={loading}
          aria-label="모달 닫기"
        >
          ×
        </button>

        {room ? (
          <div className={styles.success}>
            <div
              className={styles.successIcon}
              aria-hidden="true"
            >
              ✓
            </div>

            <h2 className={styles.successTitle}>
              방 생성 완료
            </h2>

            <p className={styles.successDescription}>
              방이 정상적으로 생성되었습니다.
              <br />
              초대 코드를 친구에게 공유해보세요.
            </p>

            <div className={styles.roomResult}>
              <span className={styles.resultLabel}>
                방 제목
              </span>

              <strong className={styles.resultTitle}>
                {room.title}
              </strong>

              <span className={styles.resultLabel}>
                초대 코드
              </span>

              <div className={styles.inviteCode}>
                {room.inviteCode}
              </div>
            </div>
              <div className={styles.friendSection}>
  <div className={styles.friendSectionHeader}>
    <span className={styles.friendSectionTitle}>
      친구 초대
    </span>

    {!friendsLoading && (
      <span className={styles.friendCount}>
        {friends.length}명
      </span>
    )}
  </div>

  {friendsLoading && (
    <p className={styles.friendMessage}>
      친구 목록을 불러오는 중입니다.
    </p>
  )}

  {!friendsLoading && friendsError && (
    <p className={styles.friendError}>
      {friendsError}
    </p>
  )}

  {!friendsLoading &&
    !friendsError &&
    friends.length === 0 && (
      <p className={styles.friendMessage}>
        초대할 수 있는 친구가 없습니다.
      </p>
    )}

  {!friendsLoading &&
    !friendsError &&
    friends.length > 0 && (
      <div className={styles.friendList}>
        <div className={styles.friendList}>
  {friends.map((friend) => {
    const displayName =
      friend.nickname ||
      friend.username

    return (
      <div
        key={friend.friendshipId}
        className={styles.friendItem}
      >
        <div className={styles.friendProfile}>
          <div className={styles.friendAvatar}>
            {displayName
              ?.slice(0, 1)
              .toUpperCase()}
          </div>

          <div className={styles.friendText}>
            <strong className={styles.friendName}>
              {displayName}
            </strong>

            {friend.username && (
              <span className={styles.friendIntro}>
                @{friend.username}
              </span>
            )}
          </div>
        </div>

        <button
  type="button"
  className={styles.inviteLabel}
  onClick={() =>
    handleInviteFriend(friend)
  }
  disabled={
    invitingFriendId === friend.userId
  }
>
  {invitingFriendId === friend.userId
    ? "전송 중..."
    : "초대"}
</button>
      </div>
    )
  })}
</div>
      </div>
    )}
</div>
            <button
              type="button"
              className={styles.moveButton}
              onClick={() => {
                if (roomId) {
                  onMoveToWaitingRoom?.(roomId)
                }
              }}
            >
              대기실로 이동
            </button>
          </div>
        ) : (
          <>
            <header className={styles.header}>
              <p className={styles.eyebrow}>
                CREATE ROOM
              </p>

              <h2
                id="create-room-title"
                className={styles.title}
              >
                새 방 만들기
              </h2>

              <p className={styles.description}>
                제목을 입력하지 않으면 닉네임을
                사용해 자동으로 생성됩니다.
              </p>
            </header>

            <form
              className={styles.form}
              onSubmit={handleSubmit}
            >
              <div className={styles.field}>
                <div className={styles.labelRow}>
                  <label
                    className={styles.label}
                    htmlFor="room-title"
                  >
                    방 제목
                  </label>

                  <span className={styles.count}>
                    {title.length} / 30
                  </span>
                </div>

                <input
                  id="room-title"
                  className={styles.input}
                  type="text"
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value)

                    if (localError) {
                      setLocalError("")
                    }
                  }}
                  placeholder="예) 오늘 밤의 추리방"
                  maxLength={30}
                  disabled={loading}
                  autoFocus
                />
              </div>

              {(localError || error) && (
                <p className={styles.error}>
                  {localError || error}
                </p>
              )}

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={onClose}
                  disabled={loading}
                >
                  취소
                </button>

                <button
                  type="submit"
                  className={styles.createButton}
                  disabled={loading}
                >
                  {loading
                    ? "생성 중..."
                    : "방 만들기"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default CreateRoomModal
