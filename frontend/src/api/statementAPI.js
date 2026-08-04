import api from "./axios"

export const getStatement = async (gameId) => {
    const res = await api.get(`/games/${gameId}/statement`)
    return res.data
}

export const submitStatement = async (gameId, data) => {
    const res = await api.post(`/games/${gameId}/statement`, data)
    return res.data
}