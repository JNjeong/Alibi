import api from "./axios"

export const getQuestions = async (gameId) => {
    const res = await api.get(`/games/${gameId}/questions`)
    return res.data
}

export const submitQuestion = async (gameId, data) => {
    const res = await api.post(`/games/${gameId}/questions`, data)
    return res.data
}

export const submitAnswer = async (gameId, data) => {
    const res = await api.post(`/games/${gameId}/answer`, data)
    return res.data
}