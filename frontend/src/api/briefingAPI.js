import api from "./axios"

export const getBriefing = async (gameId) => {
    const res = await api.get(`/games/${gameId}/briefing`)
    return res.data
}