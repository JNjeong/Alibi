import express from "express"
import { sendFriendRequest, 
  acceptFriendRequest,
   getFriendRequests
  , getFriends,
  getSentFriendRequests,
  rejectFriendRequest,
  deleteFriend
 } from "../controllers/friend_controller.js"
import authMiddleware from "../middlewares/auth_middleware.js"

const router = express.Router()

// 친구 요청 보내기 
router.post("/request", authMiddleware, sendFriendRequest)

// 친구 요청 수락
router.post(
  "/accept/:requesterUsername",
  authMiddleware,
  acceptFriendRequest
)

// 나에게 온 친구 요청 목록 조회
router.get("/requests", authMiddleware, getFriendRequests)


// 친구 목록 조회
router.get("/", authMiddleware, getFriends)

// 내가 보낸 친구 요청 목록 조회
router.get("/sent-requests", authMiddleware, getSentFriendRequests)


// 친구 요청 거절
router.delete(
  "/reject/:requesterUsername",
  authMiddleware,
  rejectFriendRequest
)

// 친구 삭제
router.delete("/:friendUsername", authMiddleware, deleteFriend)

export default router