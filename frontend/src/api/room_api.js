import api from "./axios"


// 방 목록 조회
export const getRooms = async () => {
  const response = await api.get("/rooms")
  return response.data
}

// 방 상세 조회
export const getRoom = async (roomId) => {
  const response = await api.get(`/rooms/${roomId}`)
  return response.data
}

// 방 생성 
export const createRoom = async (title) => {
  const response = await api.post("/rooms", { title })
  return response.data
}

export const joinRoom = async (roomId) => {
  const response = await api.post(`/rooms/${roomId}/join`)
  return response.data
}

export const joinRoomByCode = async (inviteCode) => {
  const response = await api.post("/rooms/join-by-code", { inviteCode })
  return response.data
}

// 게임 강제종료
export const forceEndGame = async (gameId) => {
    const response = await api.post(`/games/${gameId}/force-end`)
    return response.data
}

// 게임 목록 조회
export const getGames = async () => {
  const response = await api.get("/games")
  return response.data
}