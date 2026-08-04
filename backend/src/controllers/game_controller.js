/**
 * game_controller.js
 * -----------------------------------------------------------------------------
 * 역할
 * - 게임 REST 요청에서 URL parameter와 JSON body를 받습니다.
 * - 인증 미들웨어가 넣은 req.user.userId를 작성자 ID로 사용합니다.
 * - 실제 게임 로직은 game_service.js에 위임합니다.
 * - 저장 성공 후 같은 gameId Socket 방에 공개 가능한 변경 이벤트를 방송합니다.
 *
 * 이 파일에 넣지 않는 것 (준홍님 구현 필요)
 * - 사건 생성 알고리즘
 * - 모순 판정 알고리즘
 * - 최종 정답 판정 알고리즘
 */

import {
  answerOfficialQuestion,
  createOfficialQuestion,
  createOfficialStatement,
  getGameForUser,
  submitFinalDeduction,
} from "../services/game_service.js"

// service 오류의 status/code를 유지하면서 일관된 JSON 오류 응답을 만듭니다.
const sendError = (res, error, fallbackMessage) => {
  console.error(fallbackMessage, error)

  return res.status(error.status || 500).json({
    message: error.message || fallbackMessage,
    code: error.code || "GAME_API_ERROR",
  })
}

// 서버에 등록된 공용 Socket.IO 인스턴스를 안전하게 가져옵니다.
const getIo = (req) => req.app.get("io")

// Game의 공식 기록이 추가되었음을 같은 게임 참가자에게 알립니다.
const emitRecordCreated = (req, gameId, result) => {
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
}

// GET /api/games/:gameId
// 최초 게임 진입과 새로고침 복원에 사용하는 사용자별 안전한 상태 조회입니다.
export const getGame = async (req, res) => {
  try {
    const result = await getGameForUser({
      gameId: req.params.gameId,
      userId: req.user.userId,
    })

    return res.status(200).json(result)
  } catch (error) {
    return sendError(res, error, "게임 상태 조회 중 오류가 발생했습니다.")
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

    emitRecordCreated(req, req.params.gameId, result)

    return res.status(201).json({
      message: "공식 진술이 저장되었습니다.",
      ...result,
    })
  } catch (error) {
    return sendError(res, error, "공식 진술 저장 중 오류가 발생했습니다.")
  }
}

// POST /api/games/:gameId/questions
// 게임 전체에서 사용자당 최대 2개의 공식 질문을 저장합니다.
export const postQuestion = async (req, res) => {
  try {
    const result = await createOfficialQuestion({
      gameId: req.params.gameId,
      userId: req.user.userId,
      payload: req.body,
    })

    emitRecordCreated(req, req.params.gameId, result)

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

    emitRecordCreated(req, req.params.gameId, result)

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

      // 준홍님의 최종 판정 함수 구현 후 finished가 true이면 결과 화면 이동 이벤트를 보냅니다.
      if (result.finished) {
        io.to(`game:${req.params.gameId}`).emit("game:finished", {
          gameId: req.params.gameId,
          resultPath: result.resultPath,
          revision: result.revision,
        })
      }
    }

    return res.status(201).json({
      message: result.requiresJunhongImplementation
        ? "최종 추리는 저장되었으며 정답 판정 함수 구현을 기다리고 있습니다."
        : "최종 추리가 저장되었습니다.",
      ...result,
    })
  } catch (error) {
    return sendError(res, error, "최종 추리 저장 중 오류가 발생했습니다.")
  }
}
