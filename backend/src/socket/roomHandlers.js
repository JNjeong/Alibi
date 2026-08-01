import mongoose from "mongoose"
import jwt from "jsonwebtoken"

import Room from "../models/Room.js"

const roomChats = new Map()

const populateRoom = (query) =>
  query
    .populate("host", "username nickname")
    .populate("participants", "username nickname")

const formatParticipant = (participant, hostId) => ({
  _id: participant._id,
  username: participant.username,
  nickname: participant.nickname,
  isHost: String(participant._id) === String(hostId),
})

const getRoomChatMessages = (roomId) => {
  if (!roomChats.has(roomId)) {
    roomChats.set(roomId, [])
  }

  return roomChats.get(roomId)
}

const emitParticipantsUpdated = async (io, roomId) => {
  const room = await populateRoom(Room.findById(roomId))

  if (!room) {
    return null
  }

  const payload = {
    roomId: room._id,
    title: room.title,
    inviteCode: room.inviteCode,
    host: room.host,
    participants: room.participants.map((participant) =>
      formatParticipant(participant, room.host._id)
    ),
    currentPlayers: room.participants.length,
    maxPlayers: room.maxPlayers,
    status: room.status,
  }

  io.to(`room:${roomId}`).emit("room:participantsUpdated", payload)

  return payload
}

const verifyRoomParticipant = async (roomId, userId) => {
  if (!mongoose.isValidObjectId(roomId)) {
    return { error: "올바른 방 ID가 아닙니다." }
  }

  const room = await Room.findById(roomId)

  if (!room) {
    return { error: "존재하지 않는 방입니다." }
  }

  const isParticipant = room.participants.some(
    (participantId) =>
      String(participantId) === String(userId)
  )

  if (!isParticipant) {
    return { error: "방 참가자만 접근할 수 있습니다." }
  }

  return { room }
}

export const registerRoomHandlers = (io) => {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token

      if (!token) {
        return next(new Error("인증 토큰이 없습니다."))
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      socket.userId = decoded.userId
      socket.username = decoded.username
      socket.nickname = decoded.nickname

      next()
    } catch (error) {
      next(new Error("유효하지 않은 토큰입니다."))
    }
  })

  io.on("connection", (socket) => {
    socket.on("room:join", async ({ roomId }) => {
      try {
        const result = await verifyRoomParticipant(roomId, socket.userId)

        if (result.error) {
          socket.emit("room:error", { message: result.error })
          return
        }

        const { room } = result

        if (room.status === "finished") {
          socket.emit("room:error", {
            message: "이미 종료된 방입니다.",
          })
          return
        }

        socket.join(`room:${roomId}`)
        socket.data.roomId = roomId

        const roomPayload = await emitParticipantsUpdated(io, roomId)

        socket.emit("room:joined", {
          room: roomPayload,
          chatMessages: getRoomChatMessages(String(roomId)),
        })

        if (room.status === "playing") {
          socket.emit("room:start", {
            roomId: room._id,
            inviteCode: room.inviteCode,
            title: room.title,
          })
        }
      } catch (error) {
        console.error("room:join 오류:", error)
        socket.emit("room:error", {
          message: "방 입장 중 오류가 발생했습니다.",
        })
      }
    })

    socket.on("room:leave", async ({ roomId }) => {
      try {
        const result = await verifyRoomParticipant(roomId, socket.userId)

        if (result.error) {
          socket.emit("room:error", { message: result.error })
          return
        }

        const { room } = result

        if (String(room.host) === String(socket.userId)) {
          socket.emit("room:error", {
            message: "방장은 대기실을 나갈 수 없습니다.",
          })
          return
        }

        await Room.findByIdAndUpdate(roomId, {
          $pull: {
            participants: socket.userId,
          },
        })

        socket.leave(`room:${roomId}`)
        socket.data.roomId = null

        await emitParticipantsUpdated(io, roomId)
        socket.emit("room:left", { roomId })
      } catch (error) {
        console.error("room:leave 오류:", error)
        socket.emit("room:error", {
          message: "방 퇴장 중 오류가 발생했습니다.",
        })
      }
    })

    socket.on("room:chat", async ({ roomId, content }) => {
      try {
        const trimmedContent = content?.trim()

        if (!trimmedContent) {
          socket.emit("room:error", {
            message: "메시지 내용을 입력해주세요.",
          })
          return
        }

        if (trimmedContent.length > 1000) {
          socket.emit("room:error", {
            message: "메시지는 1000자 이하로 입력해주세요.",
          })
          return
        }

        const result = await verifyRoomParticipant(roomId, socket.userId)

        if (result.error) {
          socket.emit("room:error", { message: result.error })
          return
        }

        const message = {
          id: `room_chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          roomId: String(roomId),
          senderId: String(socket.userId),
          sender: {
            _id: socket.userId,
            username: socket.username,
            nickname: socket.nickname,
          },
          content: trimmedContent,
          createdAt: new Date().toISOString(),
        }

        const messages = getRoomChatMessages(String(roomId))
        messages.push(message)

        io.to(`room:${roomId}`).emit("room:chat", { message })
      } catch (error) {
        console.error("room:chat 오류:", error)
        socket.emit("room:error", {
          message: "메시지 전송 중 오류가 발생했습니다.",
        })
      }
    })

    socket.on("room:start", async ({ roomId }) => {
      try {
        const result = await verifyRoomParticipant(roomId, socket.userId)

        if (result.error) {
          socket.emit("room:error", { message: result.error })
          return
        }

        const { room } = result

        if (String(room.host) !== String(socket.userId)) {
          socket.emit("room:error", {
            message: "방장만 게임을 시작할 수 있습니다.",
          })
          return
        }

        if (room.status !== "waiting") {
          socket.emit("room:error", {
            message: "현재 게임을 시작할 수 없는 방입니다.",
          })
          return
        }

        if (room.participants.length < 2) {
          socket.emit("room:error", {
            message: "게임 시작에는 최소 2명의 참가자가 필요합니다.",
          })
          return
        }

        room.status = "playing"
        await room.save()

        io.to(`room:${roomId}`).emit("room:start", {
          roomId: room._id,
          inviteCode: room.inviteCode,
          title: room.title,
        })

        await emitParticipantsUpdated(io, roomId)
      } catch (error) {
        console.error("room:start 오류:", error)
        socket.emit("room:error", {
          message: "게임 시작 중 오류가 발생했습니다.",
        })
      }
    })

    socket.on("disconnect", () => {
      socket.data.roomId = null
    })
  })
}
