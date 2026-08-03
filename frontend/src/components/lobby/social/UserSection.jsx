import {
  useEffect,
  useRef,
  useState,
} from "react"

import { useNavigate } from "react-router-dom"
import { joinRoomByCode } from "../../../api/room_api"

import UserList from "./UserList"
import FriendRequestList from "./FriendRequestList"
import FriendList from "./FriendList"

import useAuthStore from "../../../store/authStore"

import {
  openChatRoom,
  getChatMessages,
  sendChatMessage,
} from "../../../api/chat_api"


import socket from "../../../socket/socket"

import styles from "./UserSection.module.css"





function UserSection() {
  const currentUser = useAuthStore(
    (state) => state.user
  )

  const [friendRefreshKey, setFriendRefreshKey] =
    useState(0)

  const [activeChat, setActiveChat] =
    useState(null)

  const [openingFriendId, setOpeningFriendId] =
    useState("")

  const [messages, setMessages] =
    useState([])

  const [content, setContent] =
    useState("")

  const [chatLoading, setChatLoading] =
    useState(false)

  const [chatError, setChatError] =
    useState("")

  const [sending, setSending] =
    useState(false)

  // 채팅창 펼침·접힘 상태
  const [isChatOpen, setIsChatOpen] =
    useState(true)

  // 메시지 영역 스크롤용
  const messageAreaRef = useRef(null)

  const chatRoomId =
    activeChat?.chatRoomId

  const selectedFriend =
    activeChat?.friend

  const currentUserId =
    currentUser?._id ||
    currentUser?.userId

  const navigate = useNavigate()

const handleJoinInvitedRoom = async (
  inviteCode
) => {
  try {
    const data =
      await joinRoomByCode(inviteCode)

    navigate(
      `/waiting-room/${data.roomId}`
    )
  } catch (error) {
    console.error(
      "초대된 방 입장 실패:",
      error
    )

    alert(
      error.response?.data?.message ||
        "방에 입장하지 못했습니다."
    )
  }
}  

  // 친구 요청 수락 후 친구 목록 새로고침
  const handleFriendAccepted = () => {
    setFriendRefreshKey(
      (prev) => prev + 1
    )
  }

  // 친구 클릭 시 채팅방 열기
  const handleOpenChat = async (friend) => {
    if (!friend?._id) {
      return
    }

    try {
      setOpeningFriendId(friend._id)

      const data =
        await openChatRoom(friend._id)

      if (!data?.chatRoom?._id) {
        throw new Error(
          "채팅방 정보를 받지 못했습니다."
        )
      }

      setActiveChat({
        chatRoomId: data.chatRoom._id,
        friend,
      })

      // 다른 친구를 클릭하면 자동으로 펼치기
      setIsChatOpen(true)
    } catch (error) {
      console.error(
        "채팅방 열기 실패:",
        error
      )

      alert(
        error.response?.data?.message ||
          error.message ||
          "채팅방을 열지 못했습니다."
      )
    } finally {
      setOpeningFriendId("")
    }
  }

  // 선택한 채팅방의 메시지 조회
  useEffect(() => {
    if (!chatRoomId) {
      setMessages([])
      setContent("")
      setChatError("")
      setChatLoading(false)

      return
    }

    let cancelled = false

    const fetchMessages = async () => {
      try {
        setChatLoading(true)
        setChatError("")

        const data =
          await getChatMessages(chatRoomId)

        if (!cancelled) {
          setMessages(
            data?.messages || []
          )
        }
      } catch (error) {
        console.error(
          "메시지 목록 조회 실패:",
          error
        )

        if (!cancelled) {
          setChatError(
            error.response?.data?.message ||
              "메시지를 불러오지 못했습니다."
          )
        }
      } finally {
        if (!cancelled) {
          setChatLoading(false)
        }
      }
    }

    fetchMessages()

    return () => {
      cancelled = true
    }
  }, [chatRoomId])

// 현재 채팅방의 Socket.IO room 참가
useEffect(() => {
  if (!chatRoomId) {
    return
  }

  // 소켓 채팅방 입장
  const joinSocketRoom = () => {
    socket.emit(
      "joinChatRoom",
      chatRoomId,
      (response) => {
        if (!response?.success) {
          console.error(
            "소켓 채팅방 입장 실패:",
            response?.message
          )

          return
        }

        console.log(
          "소켓 채팅방 입장 성공:",
          response.roomName ||
            chatRoomId
        )
      }
    )
  }

  // 소켓이 이미 연결돼 있다면 바로 입장
  if (socket.connected) {
    joinSocketRoom()
  }

  // 서버 재시작 등으로 소켓이 재연결되면 다시 입장
  socket.on("connect", joinSocketRoom)

  return () => {
    // connect 이벤트 리스너 제거
    socket.off(
      "connect",
      joinSocketRoom
    )

    // 다른 친구를 선택하거나 채팅창을 닫으면 기존 room 퇴장
    if (socket.connected) {
      socket.emit(
        "leaveChatRoom",
        chatRoomId,
        (response) => {
          if (!response?.success) {
            console.error(
              "소켓 채팅방 퇴장 실패:",
              response?.message
            )

            return
          }

          console.log(
            "소켓 채팅방 퇴장 성공:",
            chatRoomId
          )
        }
      )
    }
  }
}, [chatRoomId])

// Socket.IO로 새 메시지 실시간 수신
useEffect(() => {
  if (!chatRoomId) {
    return
  }

  const handleNewMessage = ({ message }) => {
    if (!message?._id) {
      return
    }

    // 전달받은 메시지의 채팅방 ID 확인
    const receivedChatRoomId =
      typeof message.chatRoom === "string"
        ? message.chatRoom
        : message.chatRoom?._id

    // 현재 열어둔 채팅방 메시지가 아니면 무시
    if (
      receivedChatRoomId &&
      String(receivedChatRoomId) !==
        String(chatRoomId)
    ) {
      return
    }

    setMessages((prev) => {
      // REST API 응답과 소켓 이벤트가
      // 모두 들어왔을 때 중복 표시 방지
      const alreadyExists = prev.some(
        (savedMessage) =>
          String(savedMessage._id) ===
          String(message._id)
      )

      if (alreadyExists) {
        return prev
      }

      return [...prev, message]
    })
  }

  socket.on(
    "newMessage",
    handleNewMessage
  )

  return () => {
    socket.off(
      "newMessage",
      handleNewMessage
    )
  }
}, [chatRoomId])


  // 메시지 추가 또는 채팅창 펼침 시
  // 메시지 영역 내부만 맨 아래로 이동
  useEffect(() => {
    if (
      !isChatOpen ||
      !messageAreaRef.current
    ) {
      return
    }

    const messageArea =
      messageAreaRef.current

    messageArea.scrollTop =
      messageArea.scrollHeight
  }, [messages, isChatOpen])

  // 메시지 전송
  const handleSendMessage = async (
    event
  ) => {
    event.preventDefault()

    const trimmedContent =
      content.trim()

    if (
      !chatRoomId ||
      !trimmedContent ||
      sending
    ) {
      return
    }

    try {
      setSending(true)

      const data =
        await sendChatMessage(
          chatRoomId,
          trimmedContent
        )

      // 백엔드 응답 형태가 달라도 처리
      const sentMessage =
        data?.newMessage ||
        (
          typeof data?.message === "object"
            ? data.message
            : null
        )

      if (sentMessage) {
        setMessages((prev) => {
          const alreadyExists =
            prev.some(
              (message) =>
                String(message._id) ===
                String(sentMessage._id)
            )

          if (alreadyExists) {
            return prev
          }

          return [
            ...prev,
            sentMessage,
          ]
        })
      } else {
        // 저장은 됐지만 메시지 객체가 없는 경우 다시 조회
        const refreshedData =
          await getChatMessages(chatRoomId)

        setMessages(
          refreshedData?.messages || []
        )
      }

      setContent("")
    } catch (error) {
      console.error(
        "메시지 전송 실패:",
        error
      )

      alert(
        error.response?.data?.message ||
          "메시지를 전송하지 못했습니다."
      )
    } finally {
      setSending(false)
    }
  }

  // 채팅방 완전히 닫기
  const handleCloseChat = () => {
    setActiveChat(null)
    setMessages([])
    setContent("")
    setChatError("")
    setChatLoading(false)
    setIsChatOpen(true)
  }

  return (
    <section className={styles.section}>
      {/* 1. 전체 회원 */}
      <div className={styles.userArea}>
        <UserList />
      </div>

      {/* 2. 친구 요청 + 친구 목록 */}
      <div className={styles.friendArea}>
        <FriendRequestList
          onFriendAccepted={
            handleFriendAccepted
          }
        />

        <FriendList
          refreshKey={
            friendRefreshKey
          }
          onOpenChat={
            handleOpenChat
          }
          selectedFriendId={
            selectedFriend?._id
          }
          openingFriendId={
            openingFriendId
          }
        />
      </div>

      {/* 3. 채팅창 */}
      <section
      className={[
        styles.chatPanel,
        activeChat && isChatOpen
          ? styles.chatPanelOpen
          : "",
        activeChat && !isChatOpen
          ? styles.chatPanelCollapsed
          : "",
      ].join(" ")}
    >
        {!activeChat ? (
          <div className={styles.emptyChat}>
            <strong>채팅</strong>

            <p>
              친구 목록에서 대화할
              친구를 선택해주세요.
            </p>
          </div>
        ) : (
          <>
            {/* 채팅창 상단 */}
            <header
              className={
                styles.chatHeader
              }
            >
              <button
                type="button"
                className={
                  styles.chatHeaderToggle
                }
                onClick={() =>
                  setIsChatOpen(
                    (prev) => !prev
                  )
                }
                aria-expanded={
                  isChatOpen
                }
              >
                <div
                  className={
                    styles.chatFriendProfile
                  }
                >
                  <div
                    className={
                      styles.chatAvatar
                    }
                  >
                    {selectedFriend
                      ?.nickname
                      ?.trim()
                      .charAt(0) ||
                      selectedFriend
                        ?.username
                        ?.trim()
                        .charAt(0) ||
                      "?"}
                  </div>

                  <div
                    className={
                      styles.chatFriendInfo
                    }
                  >
                    <strong>
                      {selectedFriend
                        ?.nickname ||
                        selectedFriend
                          ?.username ||
                        "사용자"}
                    </strong>

                    <span>
                      @
                      {selectedFriend
                        ?.username ||
                        ""}
                    </span>
                  </div>
                </div>

                <span
                  className={[
                    styles.chatChevron,
                    isChatOpen
                      ? styles.chatChevronOpen
                      : "",
                  ].join(" ")}
                  aria-hidden="true"
                >
                  ▾
                </span>
              </button>

              <button
                type="button"
                className={
                  styles.closeButton
                }
                onClick={
                  handleCloseChat
                }
                aria-label="채팅창 닫기"
              >
                ×
              </button>
            </header>

            {/* 펼쳐진 경우에만 표시 */}
            {isChatOpen && (
              <>
                <div
                  ref={messageAreaRef}
                  className={
                    styles.messageArea
                  }
                >
                  {chatLoading && (
                    <p
                      className={
                        styles.chatNotice
                      }
                    >
                      메시지를 불러오는 중...
                    </p>
                  )}

                  {!chatLoading &&
                    chatError && (
                      <p
                        className={[
                          styles.chatNotice,
                          styles.chatError,
                        ].join(" ")}
                      >
                        {chatError}
                      </p>
                    )}

                  {!chatLoading &&
                    !chatError &&
                    messages.length ===
                      0 && (
                      <div
                        className={
                          styles.firstMessage
                        }
                      >
                        <strong>
                          {selectedFriend
                            ?.nickname ||
                            selectedFriend
                              ?.username}
                          님과의 채팅
                        </strong>

                        <p>
                          첫 메시지를
                          보내보세요.
                        </p>
                      </div>
                    )}

                  {!chatLoading &&
                    !chatError &&
                    messages.map( 
                      (message) => {
                        const senderId =
                          typeof message.sender ===
                          "string"
                            ? message.sender
                            : message
                                .sender
                                ?._id

                        const isMine =
                          String(
                            senderId
                          ) ===
                          String(
                            currentUserId
                          )

                        return (
                        <div
                          key={message._id}
                          className={[
                            styles.messageRow,
                            isMine
                              ? styles.myMessageRow
                              : styles.friendMessageRow,
                          ].join(" ")}
                        >
                          <div className={styles.messageContent}>
                            {message.type === "room_invite" ? (
                              <article className={styles.roomInviteCard}>
                                <span className={styles.inviteBadge}>
                                  ROOM INVITE
                                </span>

                                <strong className={styles.inviteTitle}>
                                  {message.invitedRoom?.title ||
                                    "게임방 초대"}
                                </strong>

                                <p className={styles.inviteDescription}>
                                  {isMine
                                    ? "게임방 초대를 보냈습니다."
                                    : "게임방에 초대되었습니다."}
                                </p>

                                <div className={styles.inviteCodeBox}>
                                  <span>초대 코드</span>

                                  <code>
                                    {message.inviteCode || "-"}
                                  </code>
                                </div>

                                {!isMine && (
                                  <button
                                    type="button"
                                    className={styles.roomJoinButton}
                                    onClick={() =>
                                      handleJoinInvitedRoom(
                                        message.inviteCode
                                      )
                                    }
                                  >
                                    방 입장하기
                                  </button>
                                )}
                              </article>
                            ) : (
                              <div
                                className={[
                                  styles.messageBubble,
                                  isMine
                                    ? styles.myBubble
                                    : styles.friendBubble,
                                ].join(" ")}
                              >
                                {message.content}
                              </div>
                            )}

                            <time className={styles.messageTime}>
                              {message.createdAt
                                ? new Date(
                                    message.createdAt
                                  ).toLocaleTimeString("ko-KR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : ""}
                            </time>
                          </div>
                        </div>
                      )
                      }
                    )}
                </div>

                <form
                  className={
                    styles.messageForm
                  }
                  onSubmit={
                    handleSendMessage
                  }
                >
                  <input
                    type="text"
                    className={
                      styles.messageInput
                    }
                    value={content}
                    onChange={(event) =>
                      setContent(
                        event.target.value
                      )
                    }
                    placeholder="메시지..."
                    maxLength={1000}
                    disabled={
                      chatLoading ||
                      sending
                    }
                  />

                  <button
                    type="submit"
                    className={
                      styles.sendButton
                    }
                    disabled={
                      sending ||
                      chatLoading ||
                      !content.trim()
                    }
                    aria-label="메시지 전송"
                  >
                    {sending
                      ? "..."
                      : "➤"}
                  </button>
                </form>
              </>
            )}
          </>
        )}
      </section>
    </section>
  )
}

export default UserSection