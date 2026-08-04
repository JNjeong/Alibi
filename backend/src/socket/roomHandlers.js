import mongoose from "mongoose"
import jwt from "jsonwebtoken"

import Room from "../models/Room.js"
import RoomMessage from "../models/RoomMessage.js"

const MIN_PLAYERS_TO_START = 2
const MAX_CHAT_HISTORY = 200
const LOG_PREFIX = "[room:socket]"

const roomReadyUsers = new Map()

const logRoomError = (event, error) => {
  const detail = error instanceof Error ? error.message : error

  console.error(`${LOG_PREFIX} ${event} failed:`, detail)
}

const logRoomDebug = (event, meta = {}) => {
  if (process.env.ROOM_SOCKET_DEBUG === "true") {
    console.log(`${LOG_PREFIX} ${event}`, meta)
  }
}

const populateRoom = (query) =>
  query
    .populate("host", "username nickname")
    .populate("participants", "username nickname")

const getReadySet = (roomId) => {
  const key = String(roomId)

  if (!roomReadyUsers.has(key)) {
    roomReadyUsers.set(key, new Set())
  }

  return roomReadyUsers.get(key)
}

const getOnlineUserIds = (io, roomId) => {
  const socketRoom = io.sockets.adapter.rooms.get(`room:${roomId}`)

  if (!socketRoom) {
    return new Set()
  }

  const onlineIds = new Set()

  for (const socketId of socketRoom) {
    const connectedSocket = io.sockets.sockets.get(socketId)

    if (connectedSocket?.userId) {
      onlineIds.add(String(connectedSocket.userId))
    }
  }

  return onlineIds
}

const formatParticipant = (
  participant,
  hostId,
  onlineIds,
  readySet
) => {
  const participantId = String(participant._id)
  const isHost = participantId === String(hostId)

  return {
    _id: participant._id,
    username: participant.username,
    nickname: participant.nickname,
    isHost,
    isOnline: onlineIds.has(participantId),
    isReady: isHost || readySet.has(participantId),
  }
}

const buildRoomPayload = (room, onlineIds, readySet) => {
  const hostId = room.host._id || room.host
  const participants = room.participants.map((participant) =>
    formatParticipant(participant, hostId, onlineIds, readySet)
  )

  const nonHostParticipants = participants.filter(
    (participant) => !participant.isHost
  )

  const readyCount = participants.filter(
    (participant) => participant.isReady
  ).length

  const allNonHostReady =
    nonHostParticipants.length === 0 ||
    nonHostParticipants.every((participant) => participant.isReady)

  const hostOnline = onlineIds.has(String(hostId))

  return {
    roomId: room._id,
    title: room.title,
    inviteCode: room.inviteCode,
    host: room.host,
    participants,
    currentPlayers: room.participants.length,
    maxPlayers: room.maxPlayers,
    status: room.status,
    readyCount,
    canStart:
      hostOnline &&
      participants.length >= MIN_PLAYERS_TO_START &&
      allNonHostReady,
  }
}

const emitParticipantsUpdated = async (io, roomId) => {
  const room = await populateRoom(Room.findById(roomId))

  if (!room) {
    return null
  }

  const onlineIds = getOnlineUserIds(io, roomId)
  const readySet = getReadySet(roomId)
  const payload = buildRoomPayload(room, onlineIds, readySet)

  io.to(`room:${roomId}`).emit("room:participantsUpdated", payload)

  return payload
}

const formatRoomMessage = (messageDoc) => ({
  id: String(messageDoc._id),
  roomId: String(messageDoc.room),
  senderId: String(messageDoc.sender._id),
  sender: {
    _id: messageDoc.sender._id,
    username: messageDoc.sender.username,
    nickname: messageDoc.sender.nickname,
  },
  content: messageDoc.content,
  createdAt: messageDoc.createdAt.toISOString(),
})

const loadRoomChatMessages = async (roomId) => {
  const messages = await RoomMessage.find({ room: roomId })
    .populate("sender", "username nickname")
    .sort({ createdAt: 1 })
    .limit(MAX_CHAT_HISTORY)

  return messages.map(formatRoomMessage)
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
    (participantId) => String(participantId) === String(userId)
  )

  if (!isParticipant) {
    return { error: "방 참가자만 접근할 수 있습니다." }
  }

  return { room }
}

const cleanupFinishedRoomIfEmpty = async (io, roomId) => {
  const room = await Room.findById(roomId)

  if (!room || room.status !== "finished") {
    return false
  }

  const onlineIds = getOnlineUserIds(io, roomId)

  if (onlineIds.size > 0) {
    return false
  }

  await RoomMessage.deleteMany({ room: roomId })
  await Room.findByIdAndDelete(roomId)
  roomReadyUsers.delete(String(roomId))

  logRoomDebug("room:cleanup", { roomId: String(roomId) })

  io.to(`room:${roomId}`).emit("room:closed", {
    roomId,
    message: "종료된 방이 정리되었습니다.",
  })

  return true
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

        if (socket.data.roomId && socket.data.roomId !== String(roomId)) {
          socket.leave(`room:${socket.data.roomId}`)
        }

        socket.join(`room:${roomId}`)
        socket.data.roomId = String(roomId)

        const chatMessages = await loadRoomChatMessages(roomId)
        const roomPayload = await emitParticipantsUpdated(io, roomId)

        socket.emit("room:joined", {
          room: roomPayload,
          chatMessages,
        })

        if (room.status === "playing") {
          socket.emit("room:start", {
            roomId: room._id,
            inviteCode: room.inviteCode,
            title: room.title,
          })
        }

        logRoomDebug("room:join", {
          roomId: String(roomId),
          userId: String(socket.userId),
        })
      } catch (error) {
        logRoomError("room:join", error)
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

        getReadySet(roomId).delete(String(socket.userId))

        socket.leave(`room:${roomId}`)
        socket.data.roomId = null

        await emitParticipantsUpdated(io, roomId)
        socket.emit("room:left", { roomId })

        logRoomDebug("room:leave", {
          roomId: String(roomId),
          userId: String(socket.userId),
        })

        await cleanupFinishedRoomIfEmpty(io, roomId)
      } catch (error) {
        logRoomError("room:leave", error)
        socket.emit("room:error", {
          message: "방 퇴장 중 오류가 발생했습니다.",
        })
      }
    })

    socket.on("room:ready", async ({ roomId, ready = true }) => {
      try {
        const result = await verifyRoomParticipant(roomId, socket.userId)

        if (result.error) {
          socket.emit("room:error", { message: result.error })
          return
        }

        const { room } = result

        if (String(room.host) === String(socket.userId)) {
          socket.emit("room:error", {
            message: "방장은 준비 상태를 변경할 수 없습니다.",
          })
          return
        }

        if (room.status !== "waiting") {
          socket.emit("room:error", {
            message: "대기 중인 방에서만 준비할 수 있습니다.",
          })
          return
        }

        const readySet = getReadySet(roomId)
        const userId = String(socket.userId)

        if (ready) {
          readySet.add(userId)
        } else {
          readySet.delete(userId)
        }

        await emitParticipantsUpdated(io, roomId)
      } catch (error) {
        logRoomError("room:ready", error)
        socket.emit("room:error", {
          message: "준비 상태 변경 중 오류가 발생했습니다.",
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

        const savedMessage = await RoomMessage.create({
          room: roomId,
          sender: socket.userId,
          content: trimmedContent,
        })

        await savedMessage.populate("sender", "username nickname")

        const message = formatRoomMessage(savedMessage)

        io.to(`room:${roomId}`).emit("room:chat", { message })
      } catch (error) {
        logRoomError("room:chat", error)
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

        const populatedRoom = await populateRoom(Room.findById(roomId))
        const onlineIds = getOnlineUserIds(io, roomId)
        const readySet = getReadySet(roomId)
        const roomPayload = buildRoomPayload(
          populatedRoom,
          onlineIds,
          readySet
        )

        if (roomPayload.currentPlayers < MIN_PLAYERS_TO_START) {
          socket.emit("room:error", {
            message: `게임 시작에는 최소 ${MIN_PLAYERS_TO_START}명의 참가자가 필요합니다.`,
          })
          return
        }

        if (!onlineIds.has(String(room.host))) {
          socket.emit("room:error", {
            message: "방장이 대기실에 연결되어 있어야 합니다.",
          })
          return
        }

        if (!roomPayload.canStart) {
          socket.emit("room:error", {
            message: "모든 참가자가 준비 완료해야 게임을 시작할 수 있습니다.",
          })
          return
        }

        room.status = "playing"
        await room.save()

        roomReadyUsers.delete(String(roomId))

        io.to(`room:${roomId}`).emit("room:start", {
          roomId: room._id,
          inviteCode: room.inviteCode,
          title: room.title,
        })

        await emitParticipantsUpdated(io, roomId)

        logRoomDebug("room:start", {
          roomId: String(roomId),
          userId: String(socket.userId),
        })
      } catch (error) {
        logRoomError("room:start", error)
        socket.emit("room:error", {
          message: "게임 시작 중 오류가 발생했습니다.",
        })
      }
    })

    socket.on("disconnect", async () => {
      const roomId = socket.data.roomId

      socket.data.roomId = null

      if (roomId) {
        await emitParticipantsUpdated(io, roomId)
        await cleanupFinishedRoomIfEmpty(io, roomId)
      }
    })
  })
}
