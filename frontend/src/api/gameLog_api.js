import api from "./axios"

export const getGameLogByRoomId = async (roomId) => {
  const response = await api.get(`/game-logs/room/${roomId}`)
  return response.data
}
