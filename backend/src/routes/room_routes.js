import express from "express"
import authMiddleware from "../middlewares/auth_middleware.js"
import {
  createRoom,
  deleteRoom,
  getRooms,
  getRoom,
  joinRoom,
  joinRoomByCode
} from "../controllers/room_controller.js"

const router = express.Router()

router.use(authMiddleware)

router.get("/", getRooms)
router.post("/", createRoom)
router.post("/join-by-code", joinRoomByCode)
router.get("/:roomId", getRoom)
router.post("/:roomId/join", joinRoom)
router.delete("/:roomId", deleteRoom)

export default router
