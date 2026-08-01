import mongoose from "mongoose"

import ChatRoom from "../models/ChatRoom.js"

import Friendship from "../models/Friendship.js"
import User from "../user/User.js"


// 두 사용자가 현재 친구 관계인지 확인하는 메서드
const isFriend = async (
  userId1,
  userId2
) => {
  return Friendship.findOne({
    status: "accepted",

    $or: [
      {
        requester: userId1,
        receiver: userId2
      },
      {
        requester: userId2,
        receiver: userId1
      }
    ]
  })
}


// 친구와의 채팅방 조회 또는 생성
export const openChatRoom = async (req, res) => {
  try {
    // JWT에서 가져온 현재 로그인 사용자 MongoDB _id
    const currentUserId = req.user.userId

    // 프론트에서 클릭한 친구의 MongoDB _id
    const { friendId } = req.body

    // 친구 ID 입력 확인
    if (!friendId) {
      return res.status(400).json({
        message: "채팅할 친구 ID가 필요합니다."
      })
    }

    // ObjectId 형식 확인
    if (!mongoose.Types.ObjectId.isValid(friendId)) {
      return res.status(400).json({
        message: "올바르지 않은 사용자 ID입니다."
      })
    }

    // 자기 자신과의 채팅 방지
    if (String(currentUserId) === String(friendId)) {
      return res.status(400).json({
        message: "자기 자신과는 채팅할 수 없습니다."
      })
    }

    // 상대 사용자가 실제로 존재하는지 확인
    const friend = await User.findById(friendId)
      .select("_id username nickname")

    if (!friend) {
      return res.status(404).json({
        message: "상대 사용자를 찾을 수 없습니다."
      })
    }

    // 현재 친구 관계인지 확인
    const friendship = await isFriend(
      currentUserId,
      friendId
    )

    if (!friendship) {
      return res.status(403).json({
        message: "친구 관계인 사용자와만 채팅할 수 있습니다."
      })
    }

    // 두 사용자 ID 순서에 상관없이 같은 participantKey 생성
    const participantKey =
      ChatRoom.createParticipantKey(
        currentUserId,
        friendId
      )

    // 기존 채팅방 조회
    let chatRoom = await ChatRoom.findOne({
      participantKey
    })

    let created = false

    // 기존 채팅방이 없으면 새로 생성
    if (!chatRoom) {
      try {
        chatRoom = await ChatRoom.create({
          participants: [
            currentUserId,
            friendId
          ],
          participantKey
        })

        created = true
      } catch (error) {
        /*
          두 사용자가 거의 동시에 채팅방을 열면
          participantKey unique 충돌이 날 수 있음.
         
          이 때, 이미 생성된 방을 다시 조회한다.
         */
        if (error.code === 11000) { // 11000 :  MongoDB unique index 충돌 코드
          chatRoom = await ChatRoom.findOne({
            participantKey
          })
        } else {
          throw error
        }
      }
    }

    await chatRoom.populate({ // participants 필드에 사용자 정보 채우기
      path: "participants",
      select: "_id username nickname"
    })

    return res.status(created ? 201 : 200).json({
      message: created
        ? "채팅방이 생성되었습니다."
        : "기존 채팅방을 불러왔습니다.",

      created,
      chatRoom
    })
  } catch (error) {
    console.error("채팅방 조회 또는 생성 실패:", error)

    return res.status(500).json({
      message: "채팅방을 불러오는 중 오류가 발생했습니다."
    })
  }
}


// 내가 참여한 채팅방 목록 조회
export const getMyChatRooms = async (req, res) => {
  try {
    const currentUserId = req.user.userId

    const chatRooms = await ChatRoom.find({
      participants: currentUserId
    })
      .populate({
        path: "participants",
        select: "_id username nickname"
      })
      .populate({
        path: "lastSender",
        select: "_id username nickname"
      })
      .sort({
        lastMessageAt: -1,
        updatedAt: -1
      })

    // 각 채팅방에서 나를 제외한 상대방만 friend 필드로 정리해서 전달

    const formattedChatRooms = chatRooms.map(
      (chatRoom) => {
        const friend = chatRoom.participants.find(
          (participant) =>
            String(participant._id) !==
            String(currentUserId)
        )

        return {
          _id: chatRoom._id,
          friend,
          lastMessage: chatRoom.lastMessage,
          lastSender: chatRoom.lastSender,
          lastMessageAt: chatRoom.lastMessageAt,
          createdAt: chatRoom.createdAt,
          updatedAt: chatRoom.updatedAt
        }
      }
    )

    return res.status(200).json({
      chatRooms: formattedChatRooms
    })
  } catch (error) {
    console.error("채팅방 목록 조회 실패:", error)

    return res.status(500).json({
      message: "채팅방 목록을 불러오지 못했습니다."
    })
  }
}


// 특정 채팅방 조회
export const getChatRoomById = async (req, res) => {
  try {
    const currentUserId = req.user.userId
    const { chatRoomId } = req.params

    if ( // 채팅 방이 없으면 오류 처리 
      !mongoose.Types.ObjectId.isValid(chatRoomId)
    ) {
      return res.status(400).json({
        message: "올바르지 않은 채팅방 ID입니다."
      })
    }

    // _id뿐만 아니라 participants 조건도 넣는다.
    // 다른 사람의 채팅방 ID를 알아도 조회할 수 없게 한다.
    const chatRoom = await ChatRoom.findOne({
      _id: chatRoomId,
      participants: currentUserId
    })
      .populate({
        path: "participants",
        select: "_id username nickname"
      })
      .populate({
        path: "lastSender",
        select: "_id username nickname"
      })

    if (!chatRoom) {
      return res.status(404).json({
        message:
          "채팅방이 없거나 접근 권한이 없습니다."
      })
    }

    // 나를 제외한 상대방만 friend 필드로 정리해서 전달
    const friend = chatRoom.participants.find(
      (participant) =>
        String(participant._id) !==
        String(currentUserId)
    )

    return res.status(200).json({
      chatRoom: {
        _id: chatRoom._id,
        friend,
        lastMessage: chatRoom.lastMessage,
        lastSender: chatRoom.lastSender,
        lastMessageAt: chatRoom.lastMessageAt,
        createdAt: chatRoom.createdAt
      }
    })
  } catch (error) {
    console.error("채팅방 조회 실패:", error)

    return res.status(500).json({
      message: "채팅방을 불러오지 못했습니다."
    })
  }
}