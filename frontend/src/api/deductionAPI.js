import api from "./axios"

export const submitFinalDeduction = async (gameId, data) => {
    const res = await api.post(`/games/${gameId}/deduction`, data)
    return res.data
}