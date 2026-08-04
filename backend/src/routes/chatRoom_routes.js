import express from "express"

import authMiddleware from "../middlewares/auth_middleware.js"

import {
  openChatRoom,
  getMyChatRooms,
  getChatRoomById
} from "../controllers/chatRoom_controller.js"


import {
  getMessages,
  sendMessage,
} from "../controllers/message_controller.js"

const router = express.Router()

// 친구 클릭 시 기존 채팅방 조회 또는 생성
router.post(
  "/open",
  authMiddleware,
  openChatRoom
)

// 내가 참여한 채팅방 목록
router.get(
  "/",
  authMiddleware,
  getMyChatRooms
)




// 특정 채팅방 메시지 목록 
router.get(
  "/:chatRoomId/messages",
  authMiddleware,
  getMessages
)

// 특정 채팅방에 메시지 전송 
router.post(
  "/:chatRoomId/messages",
  authMiddleware,
  sendMessage
)

// 특정 채팅방 조회
router.get(
  "/:chatRoomId",
  authMiddleware,
  getChatRoomById
)


export default router