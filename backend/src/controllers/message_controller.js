import mongoose from "mongoose"

import ChatRoom from "../models/ChatRoom.js"
import Message from "../models/Message.js"
import Friendship from "../models/Friendship.js"
import User from "../models/User.js"

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
      chatRoom : chatRoomId
    }).populate({
      path : "sender",
      select : "_id username nickname"
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
      io.to(`chat-room:${chatRoomId}`).emit("newMessage", {
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