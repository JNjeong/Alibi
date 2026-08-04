// bootstrap, active game, result REST 응답
import { getBootstrap, getActiveGameByRoom, getResult } from "../services/game_service.js"

// Rest API 요청에 대한 응답을 처리하는 컨트롤러
// 실제 조회 규칙과 참가자 권한 검사는 service에서 수행


const handleControllerError = (res, error, label) => {
  console.error(`Error in ${label}:`, error)

  return res.status(500).json({
    message: `${label} 중 서버 오류가 발생했습니다.`,
  })
}


export const getActiveGame = async (req, res) => {
    try {
        const data = await getActiveGameByRoom({
            roomId: req.params.roomId,
            userId: req.user.userId,
        })
        return res.status(200).json(data)
    }catch (error) {
        return handleControllerError(res, error, "Active game 조회 중 에러 발생")
    }

 }


 export const getGameBootstrap = async (req, res) => {
    try {
        const data = await getBootstrap({
            gameId : req.params.gameId,
            userId : req.user.userId,
        })
        return res.status(200).json(data)
    }catch (error) {
        return handleControllerError(res, error, "Bootstrap 조회 중 에러 발생")
    }
}

export const getGameResult = async (req, res) => {
    try { 
        const data = await getResult({
            gameId : req.params.gameId,
            userId : req.user.userId,
        })
        return res.status(200).json(data)
    }catch (error) {
        return handleControllerError(res, error, "Result 조회 중 에러 발생")
    }
}


