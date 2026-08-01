import express from "express"

import authMiddleware from "../middlewares/auth_middleware.js"
import { getGameLogByRoomId } from "../controllers/gameLog_controller.js"

const router = express.Router()

router.use(authMiddleware)

router.get("/room/:roomId", getGameLogByRoomId)

export default router
