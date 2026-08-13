/**
 * game_routes.js
 * -----------------------------------------------------------------------------
 * 역할
 * - 게임 진행에 필요한 REST URL과 game_controller 함수를 연결합니다.
 * - 모든 경로에 JWT 인증 미들웨어를 공통 적용합니다.
 * - JSON 안의 authorId는 신뢰하지 않고 인증 토큰의 사용자 ID만 사용합니다.
 */

import express from "express"

import {
  getGame,
  getGameResult,
  postDeduction,
  postQuestion,
  postQuestionAnswer,
  postStatement,
  forceEndGameController,
  skipGameStageController,
  getGames,

} from "../controllers/game_controller.js"
import authMiddleware from "../middlewares/auth_middleware.js"
import adminMiddleware from "../middlewares/admin_middleware.js"

// 이 Router는 app.js에서 /api/games 아래에 등록됩니다.
const router = express.Router()

// 아래 모든 게임 API는 로그인한 사용자만 접근할 수 있습니다.
router.use(authMiddleware)

// 최초 진입·새로고침 복원용 게임 상태 조회입니다.
router.get("/:gameId", getGame)

// 종료된 한 판의 정답과 참가자별 승패를 조회합니다.
router.get("/:gameId/result", getGameResult)

// 공식 진술 한 건을 JSON으로 저장합니다.
router.post("/:gameId/statements", postStatement)

// 공식 질문 한 건을 JSON으로 저장합니다.
router.post("/:gameId/questions", postQuestion)

// 특정 공식 질문에 YES/NO 답변을 저장합니다.
router.post("/:gameId/questions/:questionId/answer", postQuestionAnswer)

// 최종 범인·시간·장소·도구 추리를 저장합니다.
router.post("/:gameId/deductions", postDeduction)


// 관리자용 게임 강제 종료
router.post(
  "/:gameId/force-end",
  adminMiddleware,
  forceEndGameController
)
export default router

// 게임 타이머 스킵
router.post(
  "/:gameId/skip-stage",
  authMiddleware,
  skipGameStageController
)

// 게임 목록 불러오기
router.get("/", adminMiddleware, getGames)