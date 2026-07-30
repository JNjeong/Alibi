import api from "./axios"

// 친구 요청 보내기

export const sendFriendRequest = async (receiverUserId) => {
  

  const response = await api.post("/friends/request", {
    receiverUserId: receiverUserId,
  })

  return response.data
}

// 친구 요청 수락
export const acceptFriendRequest = async (requesterUsername) => {
  const response = await api.post(`/friends/accept/${requesterUsername}`)
  return response.data
}

// 친구 요청 거절
export const rejectFriendRequest = async (requesterUsername) => {
  const response = await api.post(`/friends/reject/${requesterUsername}`)
  return response.data
}



// 친구 목록 조회
export const getFriendsList = async () => {
  const response = await api.get("/friends/")
  return response.data
}

// 친구 요청 목록 조회
export const getFriendRequests = async () => {
  const response = await api.get("/friends/requests")
  return response.data
}

// 내가 보낸 친구 요청 목록 조회
export const getSentFriendRequests = async () => {
  const response = await api.get("/friends/sent-requests")
  return response.data
}

// 친구 삭제
export const deleteFriend = async (friendUsername) => {
  const response = await api.delete(`/friends/${friendUsername}`)
  return response.data
}