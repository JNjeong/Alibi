import mongoose from "mongoose"

import ChatRoom from "../models/ChatRoom.js"

export const registerChatHandlers = (io) => {
  io.on("connection", (socket) => {
    console.log(`채팅 소켓 연결: ${socket.userId}`)

    socket.on("joinChatRoom", async (chatRoomId, callback) => {
      try {
        if (!mongoose.Types.ObjectId.isValid(chatRoomId)) {
          return callback?.({
            success: false,
            message: "올바르지 않은 채팅방 ID입니다.",
          })
        }

        const chatRoom = await ChatRoom.findOne({
          _id: chatRoomId,
          participants: socket.userId,
        }).select("_id")

        if (!chatRoom) {
          return callback?.({
            success: false,
            message: "참여하지 않은 채팅방입니다.",
          })
        }

        const socketRoomName = `chatRoom:${chatRoomId}`

        await socket.join(socketRoomName)

        console.log(
          `사용자 ${socket.userId}가 채팅방 ${chatRoomId}에 참가했습니다.`
        )

        return callback?.({
          success: true,
          message: "채팅방 참여 성공",
          roomName: socketRoomName,
        })
      } catch (error) {
        console.error("채팅방 참여 실패:", error)

        return callback?.({
          success: false,
          message: "채팅방 참여 중 오류가 발생했습니다.",
        })
      }
    })

    socket.on("leaveChatRoom", async (chatRoomId, callback) => {
      try {
        if (!mongoose.Types.ObjectId.isValid(chatRoomId)) {
          return callback?.({
            success: false,
            message: "올바르지 않은 채팅방 ID입니다.",
          })
        }

        const socketRoomName = `chatRoom:${chatRoomId}`

        await socket.leave(socketRoomName)

        console.log(
          `사용자 ${socket.userId}가 채팅방 ${chatRoomId}에서 퇴장했습니다.`
        )

        return callback?.({
          success: true,
          message: "채팅방 퇴장 성공",
          roomName: socketRoomName,
        })
      } catch (error) {
        console.error("채팅방 퇴장 실패:", error)

        return callback?.({
          success: false,
          message: "채팅방 퇴장 중 오류가 발생했습니다.",
        })
      }
    })
  })
}