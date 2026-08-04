// 게임 관련 라우트 정의
import express from 'express'
import authMiddleware from '../middlewares/auth_middleware.js'
import { getActiveGame, getGameBootstrap, getGameResult } from '../controllers/game_controller.js'

const router = express.Router()

// 모든 게임에 authMiddleware 적용
router.use(authMiddleware)

// 활성화된 게임 조회
router.get('/active/:roomId/active', getActiveGame)

// 게임 부트스트랩 조회
router.get('/:gameId/bootstrap', getGameBootstrap)

// 게임 결과 조회
router.get('/:gameId/result', getGameResult)

export default router