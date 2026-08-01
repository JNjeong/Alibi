import GameLog from "../models/GameLog.js"
import Room from "../models/Room.js"

export const getGameLogByRoomId = async (req, res) => {
  try {
    const { roomId } = req.params

    const room = await Room.findById(roomId)

    if (!room) {
      return res.status(404).json({
        message: "존재하지 않는 방입니다.",
      })
    }

    const gameLog = await GameLog.findOne({
      room_code: room.inviteCode,
    }).sort({ createdAt: -1 })

    if (!gameLog) {
      return res.status(404).json({
        message: "게임 결과를 찾을 수 없습니다.",
      })
    }

    return res.status(200).json({
      gameLog,
    })
  } catch (error) {
    console.error("게임 결과 조회 오류:", error)

    return res.status(500).json({
      message: "게임 결과 조회 중 서버 오류가 발생했습니다.",
    })
  }
}
