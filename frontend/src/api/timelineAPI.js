import api from "./axios"

export const getTimeline = async (gameId) => {
    const res = await api.get(`/games/${gameId}/timeline`)
    return res.data
};