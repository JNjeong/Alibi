import mongoose from "mongoose"
import Room from "../models/Room.js"
import User from "../models/User.js"

const generateInviteCode = () => { // 무작위 코드 생성하기 
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = "ALB-"

  for (let index = 0; index < 4; index += 1) {
    const randomIndex = Math.floor(Math.random() * characters.length)
    code += characters[randomIndex]
  }

  return code
}

// 방 생성 시 초대 코드 중복 확인 및 고유 코드 생성
const createUniqueInviteCode = async () => {
  let inviteCode
  let existingRoom

  do {
    inviteCode = generateInviteCode()
    existingRoom = await Room.findOne({ inviteCode })
  } while (existingRoom)

  return inviteCode
}

// 방 조회 시 host와 participants를 populate하는 함수
const populateRoom = (query) =>
  query
    .populate("host", "username nickname")
    .populate("participants", "username nickname")


// 방 정보를 클라이언트에 전달할 때 필요한 정보만 추출하는 함수
const formatRoom = (room) => ({
  roomId: room._id,
  title: room.title,
  inviteCode: room.inviteCode,
  host: room.host,
  participants: room.participants,
  currentPlayers: room.participants.length,
  maxPlayers: room.maxPlayers,
  status: room.status,
  createdAt: room.createdAt
})

// 방 참가자를 안전하게 추가하는 함수
const addParticipant = async (roomFilter, userId) => {
  /*
    다음 조건을 모두 만족할 때만 한 번에 참가자 추가

    1. 방 상태가 waiting
    2. 이미 참가한 사용자가 아님
    3. 현재 참가자 수가 최대 인원보다 적음
  */
  const updatedRoom = await Room.findOneAndUpdate(
    {
      ...roomFilter,

      status: "waiting",

      // 이미 참가 중인 사용자 제외
      participants: {
        $ne: userId
      },

      // participants.length < maxPlayers
      $expr: {
        $lt: [
          {
            $size: "$participants"
          },
          "$maxPlayers"
        ]
      }
    },
    {
      // 중복 없이 참가자 추가
      $addToSet: {
        participants: userId
      }
    },
    {
      new: true,
      runValidators: true
    }
  )

  // 정상적으로 참가자 추가 성공
  if (updatedRoom) {
    return {
      room: updatedRoom,
      joined: true
    }
  }

  /*
    업데이트되지 않았다면
    어떤 조건 때문에 실패했는지 확인
  */
  const room = await Room.findOne(roomFilter)

  if (!room) {
    const error = new Error("존재하지 않는 방입니다.")
    error.status = 404
    throw error
  }

  if (room.status !== "waiting") {
    const error = new Error("현재 입장할 수 없는 방입니다.")
    error.status = 409
    throw error
  }

  const isAlreadyParticipant = room.participants.some(
    (participantId) =>
      participantId.toString() === userId.toString()
  )

  if (isAlreadyParticipant) {
    return {
      room,
      joined: false
    }
  }

  if (room.participants.length >= room.maxPlayers) {
    const error = new Error("방 정원이 가득 찼습니다.")
    error.status = 409
    throw error
  }

  const error = new Error("방에 입장하지 못했습니다.")
  error.status = 409
  throw error
}

export const createRoom = async (req, res) => {
  try {
    const userId = req.user.userId
    const { title } = req.body

    const user = await User.findById(userId)

    if (!user) {
      return res.status(404).json({
        message: "로그인한 사용자를 찾을 수 없습니다."
      })
    }

    const roomTitle = title?.trim() || `${user.nickname}의 방`

    if (roomTitle.length > 30) {
      return res.status(400).json({
        message: "방 제목은 30자 이하로 입력해주세요."
      })
    }

    const inviteCode = await createUniqueInviteCode()

    const newRoom = await Room.create({
      title: roomTitle,
      inviteCode,
      host: user._id,
      participants: [user._id]
    })

    const populatedRoom = await populateRoom(Room.findById(newRoom._id))

    return res.status(201).json({
      message: "방이 생성되었습니다.",
      room: formatRoom(populatedRoom)
    })
  } catch (error) {
    console.error("방 생성 오류:", error)

    return res.status(500).json({
      message: "방 생성 중 서버 오류가 발생했습니다."
    })
  }
}

export const getRooms = async (req, res) => {
  try {
    const rooms = await populateRoom(
      Room.find({ status: { $ne: "finished" } }).sort({ createdAt: -1 })
    )

    return res.status(200).json({
      rooms: rooms.map(formatRoom)
    })
  } catch (error) {
    console.error("방 목록 조회 오류:", error)

    return res.status(500).json({
      message: "방 목록 조회 중 서버 오류가 발생했습니다."
    })
  }
}

export const getRoom = async (req, res) => {
  try {
    const { roomId } = req.params

    if (!mongoose.isValidObjectId(roomId)) {
      return res.status(400).json({
        message: "올바른 방 ID가 아닙니다."
      })
    }

    const room = await populateRoom(Room.findById(roomId))

    if (!room) {
      return res.status(404).json({
        message: "존재하지 않는 방입니다."
      })
    }

    return res.status(200).json({
      room: formatRoom(room)
    })
  } catch (error) {
    console.error("방 조회 오류:", error)

    return res.status(500).json({
      message: "방 조회 중 서버 오류가 발생했습니다."
    })
  }
}

export const joinRoom = async (req, res) => {
  try {
    const { roomId } = req.params
    const userId = req.user.userId

    if (!mongoose.isValidObjectId(roomId)) {
      return res.status(400).json({
        message: "올바른 방 ID가 아닙니다."
      })
    }

    const user = await User.findById(userId)

    if (!user) {
      return res.status(404).json({
        message: "로그인한 사용자를 찾을 수 없습니다."
      })
    }

    const { room, joined } = await addParticipant(
      {
        _id: roomId
      },
      user._id
    )

    return res.status(200).json({
      message: joined
        ? "방 입장 성공"
        : "이미 참가 중인 방입니다.",

      roomId: room._id,
      currentPlayers: room.participants.length
    })
  } catch (error) {
    console.error("방 입장 오류:", error)

    return res.status(error.status || 500).json({
      message:
        error.message ||
        "방 입장 중 서버 오류가 발생했습니다."
    })
  }
}

export const joinRoomByCode = async (req, res) => {
  try {
    const userId = req.user.userId

    const inviteCode =
      req.body.inviteCode?.trim().toUpperCase()

    if (!inviteCode) {
      return res.status(400).json({
        message: "초대 코드를 입력해주세요."
      })
    }

    const user = await User.findById(userId)

    if (!user) {
      return res.status(404).json({
        message: "로그인한 사용자를 찾을 수 없습니다."
      })
    }

    const { room, joined } = await addParticipant(
      {
        inviteCode
      },
      user._id
    )

    return res.status(200).json({
      message: joined
        ? "방 입장 성공"
        : "이미 참가 중인 방입니다.",

      roomId: room._id,
      currentPlayers: room.participants.length
    })
  } catch (error) {
    console.error("초대 코드 입장 오류:", error)

    return res.status(error.status || 500).json({
      message:
        error.message ||
        "방 입장 중 서버 오류가 발생했습니다."
    })
  }
}

export const deleteRoom = async (req, res) => {
  try {
    const { roomId } = req.params
    const userId = req.user.userId

    if (!mongoose.isValidObjectId(roomId)) {
      return res.status(400).json({
        message: "올바른 방 ID가 아닙니다."
      })
    }

    const room = await Room.findById(roomId)

    if (!room) {
      return res.status(404).json({
        message: "존재하지 않는 방입니다."
      })
    }

    if (room.host.toString() !== userId) {
      return res.status(403).json({
        message: "방장만 방을 삭제할 수 있습니다."
      })
    }

    await room.deleteOne()

    return res.status(200).json({
      message: "방이 삭제되었습니다."
    })
  } catch (error) {
    console.error("방 삭제 오류:", error)

    return res.status(500).json({
      message: "방 삭제 중 서버 오류가 발생했습니다."
    })
  }
}
