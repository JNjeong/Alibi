import api from "./axios"

// 친구와 채팅방 열기
export const openChatRoom = async (friendId) => {
  const response = await api.post("/chat-rooms/open", {
    friendId,
  })

  return response.data
}

// 내 채팅방 목록
export const getChatRooms = async () => {
  const response = await api.get("/chat-rooms")

  return response.data
}

// 채팅방 정보
export const getChatRoom = async (chatRoomId) => {
  const response = await api.get(
    `/chat-rooms/${chatRoomId}`
  )

  return response.data
}

// 메시지 목록
export const getChatMessages = async (chatRoomId) => {
  const response = await api.get(
    `/chat-rooms/${chatRoomId}/messages`
  )

  return response.data
}

// 메시지 전송
export const sendChatMessage = async (
  chatRoomId,
  content
) => {
  const response = await api.post(
    `/chat-rooms/${chatRoomId}/messages`,
    {
      content,
    }
  )

  return response.data
}