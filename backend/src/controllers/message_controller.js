import mongoose from "mongoose"

import ChatRoom from "../models/ChatRoom.js"
import Message from "../models/Message.js"
import Friendship from "../models/Friendship.js"
import User from "../user/User.js"
import Room from "../models/Room.js"

// 특정 채팅방 메시지 목록 조회
export const getMessages = async (req, res)=>{
  try {
    const currentUserId = req.user.userId
    const {chatRoomId} = req.params

    if(!mongoose.Types.ObjectId.isValid(chatRoomId)){
      return res.status(400).json({
        message: "올바르지 않은 채팅방 ID입니다."
      })
    }
    // 현재 사용자가 참여 중인 채팅방인지 확인
    const chatRoom = await ChatRoom.findOne({
      _id : chatRoomId,
      participants: currentUserId
    })

    if(!chatRoom){
      return res.status(403).json({
        message: "참여하지 않은 채팅방입니다."
      })
    }
    const messages = await Message.find({
  chatRoom: chatRoomId
})
  .populate([
    {
      path: "sender",
      select: "_id username nickname"
    },
    {
      path: "invitedRoom",
      select: "_id title inviteCode status"
    }
  ])
  .sort({
    createdAt: 1
  })
    .sort({
      createdAt : 1
    })
    return res.status(200).json({
      messages
    })
  }catch (error){
    console.error(error)
    return res.status(500).json({
      message: "메시지를 불러오지 못했습니다."
    })
  }
}

// 메시지 전송 

export const sendMessage = async (req,res)=>{
  try{
    const currentUserId = req.user.userId
    const {chatRoomId} = req.params 
    const content = req.body.content?.trim()

    if(!mongoose.Types.ObjectId.isValid(chatRoomId)){
      return res.status(400).json({
        message: "올바르지 않은 채팅방 ID입니다."
      })
    }

    if(!content){
      return res.status(400).json({
        message: "메시지 내용을 입력해주세요."
      })
    }
    if (content.length > 1000){
      return res.status(400).json({
        message: "메시지 내용은 1000자 이하로 입력해주세요."
      })
    }

    // 내가 참여한 채팅방인지 확인
    const chatRoom = await ChatRoom.findOne({
      _id : chatRoomId,
      participants: currentUserId
    })

    if(!chatRoom){
      return res.status(403).json({
        message: "참여하지 않은 채팅방입니다."
      })
    }

    // 새로운 메시지 생성

    const newMessage = await Message.create({
      chatRoom: chatRoomId,
      sender: currentUserId,
      content: content,
      type : "text"
    })

    await newMessage.populate({
      path: "sender",
      select: "_id username nickname"
    })

    // 채팅방 목록에 마지막 메시지 표시되도록 하기
    chatRoom.lastMessage = content
    chatRoom.lastSender = currentUserId 
    chatRoom.lastMessageAt = newMessage.createdAt

    await chatRoom.save()

    // Socket.IO가 연결 -> 실시간 전달
    const io = req.app.get("io")

    if(io){
      io.to(`chatRoom:${chatRoomId}`).emit("newMessage", {
        message : newMessage
      })
    }
    return res.status(200).json({
      message: "메시지를 전송했습니다.",
      newMessage
    })
  }catch (error){
    console.error(error)
    return res.status(500).json({
      message: "메시지를 전송하지 못했습니다."
    })
  }
}

// 생성한 게임방으로 친구 초대
export const sendRoomInvite = async (req, res) => {
  try {
    const currentUserId = req.user.userId
    const { chatRoomId } = req.params
    const { roomId } = req.body

    // 1:1 채팅방 ID 검사
    if (
      !mongoose.Types.ObjectId.isValid(
        chatRoomId
      )
    ) {
      return res.status(400).json({
        message:
          "올바르지 않은 채팅방 ID입니다.",
      })
    }

    // 초대할 게임방 ID 검사
    if (
      !mongoose.Types.ObjectId.isValid(
        roomId
      )
    ) {
      return res.status(400).json({
        message:
          "올바르지 않은 게임방 ID입니다.",
      })
    }

    // 현재 사용자가 참여한 1:1 채팅방인지 확인
    const chatRoom = await ChatRoom.findOne({
      _id: chatRoomId,
      participants: currentUserId,
    })

    if (!chatRoom) {
      return res.status(403).json({
        message:
          "참여하지 않은 채팅방입니다.",
      })
    }

    /*
      프론트가 보내준 초대 코드를 그대로 믿지 않고,
      roomId로 실제 게임방을 조회한다.

      현재 로그인 사용자가 만든 방이며
      아직 대기 중인 방만 초대 가능
    */
    const invitedRoom = await Room.findOne({
      _id: roomId,
      host: currentUserId,
      status: "waiting",
    })

    if (!invitedRoom) {
      return res.status(404).json({
        message:
          "초대할 수 있는 게임방을 찾지 못했습니다.",
      })
    }

    // room_invite 타입 메시지 생성
    const newMessage = await Message.create({
      chatRoom: chatRoomId,
      sender: currentUserId,
      type: "room_invite",

      // 현재 채팅 UI에서도 코드가 보이도록 content에도 포함
      content:
        `${invitedRoom.title} 방에 초대했습니다. ` +
        `초대 코드: ${invitedRoom.inviteCode}`,

      invitedRoom: invitedRoom._id,
      inviteCode: invitedRoom.inviteCode,
    })

    // 화면 출력에 필요한 정보 추가
    await newMessage.populate([
      {
        path: "sender",
        select: "_id username nickname",
      },
      {
        path: "invitedRoom",
        select:
          "_id title inviteCode status",
      },
    ])

    // 채팅방의 마지막 메시지 정보 갱신
    chatRoom.lastMessage =
      `[방 초대] ${invitedRoom.title}`

    chatRoom.lastSender =
      currentUserId

    chatRoom.lastMessageAt =
      newMessage.createdAt

    await chatRoom.save()

    // 현재 채팅방에 접속 중인 사용자에게 실시간 전달
    const io = req.app.get("io")

    if (io) {
      io
        .to(`chatRoom:${chatRoomId}`)
        .emit("newMessage", {
          message: newMessage,
        })
    }

    return res.status(201).json({
      message:
        "친구에게 방 초대를 보냈습니다.",
      newMessage,
    })
  } catch (error) {
    console.error(
      "게임방 초대 메시지 전송 실패:",
      error
    )

    return res.status(500).json({
      message:
        "게임방 초대를 보내지 못했습니다.",
    })
  }
}