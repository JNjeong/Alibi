/**
 * game_controller.js
 * -----------------------------------------------------------------------------
 * 역할
 * - 게임 REST 요청에서 URL parameter와 JSON body를 받습니다.
 * - 인증 미들웨어가 넣은 req.user.userId를 작성자 ID로 사용합니다.
 * - 실제 게임 로직은 game_service.js에 위임합니다.
 * - 저장 성공 후 같은 gameId Socket 방에 공개 가능한 변경 이벤트를 방송합니다.
 *
 * 이 파일에 넣지 않는 것
 * - 사건 생성·모순 판정·최종 승패 알고리즘(모두 service/다른 모듈에 둡니다.)
 */

import {
  answerOfficialQuestion,
  createOfficialQuestion,
  createOfficialStatement,
  getGameForUser,
  getGameResultForUser,
  makePublicGameError,
  submitFinalDeduction,
  forceEndGame,
  skipGameStage,
  getAllGames ,
} from "../services/game_service.js"
import mongoose from "mongoose"

// service 오류의 status/code를 유지하면서 일관된 JSON 오류 응답을 만듭니다.
const sendError = (res, error, fallbackMessage) => {
  console.error(fallbackMessage, error)
  const publicError = makePublicGameError(error, fallbackMessage)

  return res.status(publicError.status).json({
    message: publicError.message,
    code: publicError.code,
  })
}

// 서버에 등록된 공용 Socket.IO 인스턴스를 안전하게 가져옵니다.
const getIo = (req) => req.app.get("io")

// Game의 공식 기록이 추가되었음을 같은 게임 참가자에게 알립니다.
const emitRecordCreated = async (req, gameId, result) => {
  const io = getIo(req)

  if (!io) {
    return
  }

  io.to(`game:${gameId}`).emit("game:record:created", {
    gameId,
    record: result.record,
    revision: result.revision,
  })

  io.to(`game:${gameId}`).emit("game:submission:updated", {
    gameId,
    submissionStatus: result.submissionStatus,
    revision: result.revision,
  })

  // 마지막 진술/답변으로 서버가 즉시 단계를 진행한 경우 검사·힌트·단계 이벤트도 방송합니다.
  ;(result.events || []).forEach(({ type, payload }) => {
    io.to(`game:${gameId}`).emit(type, {
      gameId,
      ...payload,
      revision: result.revision,
    })
  })

  if (result.events?.length) {
    io.to(`game:${gameId}`).emit("game:state:changed", {
      gameId,
      revision: result.revision,
    })
    await io.gameTimer?.schedule(gameId)
  }
}

// GET /api/games/:gameId
// 최초 게임 진입과 새로고침 복원에 사용하는 사용자별 안전한 상태 조회입니다.
export const getGame = async (req, res) => {
  try {
    if (mongoose.isValidObjectId(req.params.gameId)) {
      await req.app.get("gameTimer")?.catchUp(req.params.gameId)
    }

    const result = await getGameForUser({
      gameId: req.params.gameId,
      userId: req.user.userId,
    })

    return res.status(200).json(result)
  } catch (error) {
    return sendError(res, error, "게임 상태 조회 중 오류가 발생했습니다.")
  }
}

// GET /api/games
// 관리자 게임관리에서 전체 게임 목록을 조회합니다.
export const getGames = async (req, res) => {
  try {
    const games = await getAllGames()

    return res.status(200).json({
      games,
    })
  } catch (error) {
    return sendError(
      res,
      error,
      "게임 목록 조회 중 오류가 발생했습니다."
    )
  }
}

// GET /api/games/:gameId/result
// 종료 후 Room 존재 여부와 무관하게 해당 판의 정답·개인별 승패를 조회합니다.
export const getGameResult = async (req, res) => {
  try {
    const result = await getGameResultForUser({
      gameId: req.params.gameId,
      userId: req.user.userId,
    })

    return res.status(200).json(result)
  } catch (error) {
    return sendError(res, error, "게임 결과 조회 중 오류가 발생했습니다.")
  }
}

// POST /api/games/:gameId/statements
// 라운드당 사용자 1개의 공식 진술 JSON을 저장합니다.
export const postStatement = async (req, res) => {
  try {
    const result = await createOfficialStatement({
      gameId: req.params.gameId,
      userId: req.user.userId,
      payload: req.body,
    })

    await emitRecordCreated(req, req.params.gameId, result)

    return res.status(201).json({
      message: "공식 진술이 저장되었습니다.",
      ...result,
    })
  } catch (error) {
    return sendError(res, error, "공식 진술 저장 중 오류가 발생했습니다.")
  }
}

// POST /api/games/:gameId/questions
// 라운드당 1개, 게임 전체에서 사용자당 최대 5개의 공식 질문을 저장합니다.
export const postQuestion = async (req, res) => {
  try {
    const result = await createOfficialQuestion({
      gameId: req.params.gameId,
      userId: req.user.userId,
      payload: req.body,
    })

    await emitRecordCreated(req, req.params.gameId, result)

    return res.status(201).json({
      message: "공식 질문이 저장되었습니다.",
      ...result,
    })
  } catch (error) {
    return sendError(res, error, "공식 질문 저장 중 오류가 발생했습니다.")
  }
}

// POST /api/games/:gameId/questions/:questionId/answer
// 질문 대상자만 boolean YES/NO 답변을 저장합니다.
export const postQuestionAnswer = async (req, res) => {
  try {
    const result = await answerOfficialQuestion({
      gameId: req.params.gameId,
      questionId: req.params.questionId,
      userId: req.user.userId,
      payload: req.body,
    })

    await emitRecordCreated(req, req.params.gameId, result)

    return res.status(201).json({
      message: "공식 답변이 저장되었습니다.",
      ...result,
    })
  } catch (error) {
    return sendError(res, error, "공식 답변 저장 중 오류가 발생했습니다.")
  }
}

// POST /api/games/:gameId/deductions
// 사용자 한 명의 최종 추리를 저장하고 전체 제출 완료 여부를 방송합니다.
export const postDeduction = async (req, res) => {
  try {
    const result = await submitFinalDeduction({
      gameId: req.params.gameId,
      userId: req.user.userId,
      payload: req.body,
    })
    const io = getIo(req)

    if (io) {
      io.to(`game:${req.params.gameId}`).emit("game:deduction:updated", {
        gameId: req.params.gameId,
        deductionStatus: result.deductionStatus,
        revision: result.revision,
      })

      // 마지막 추리가 제출되어 판정이 끝나면 모든 참가자를 같은 gameId 결과로 이동시킵니다.
      if (result.finished) {
        io.to(`game:${req.params.gameId}`).emit("game:finished", {
          gameId: req.params.gameId,
          resultPath: result.resultPath,
          revision: result.revision,
        })
      }
    }

    return res.status(201).json({
      message: "최종 추리가 저장되었습니다.",
      ...result,
    })
  } catch (error) {
    return sendError(res, error, "최종 추리 저장 중 오류가 발생했습니다.")
  }
}

// 관리자페이지 게임 강제종료
export const forceEndGameController = async (req, res) => {
  try {
    const result = await forceEndGame(req.params.gameId, req.user.userId)

    return res.status(200).json({
      message: "게임이 강제종료되었습니다.",
      ...result,
    })
  } catch (error) {
    return sendError(res, error, "게임 강제종료 중 오류가 발생했습니다.")
  }
}

// 타이머 스킵 컨트롤러
export const skipGameStageController = async (req, res) => {
  try {
    const { gameId } = req.params

    const result = await skipGameStage({
      gameId,
      userId: req.user._id,
    })

    return res.status(200).json(result)
  } catch (error) {
    console.error("게임 시간 스킵 오류:", error)

    return res.status(error.statusCode || 500).json({
      message: error.message || "게임 시간 스킵 중 오류가 발생했습니다.",
    })
  }
}