import mongoose from "mongoose"

import Friendship from "../models/Friendship.js"

import User from "../models/User.js"



// 친구 요청 보내기
export const sendFriendRequest = async (req, res) => {
  try {
    // JWT 안에 저장된 로그인 사용자의 MongoDB _id
    const requesterId = req.user.userId

    // apple1 같은 로그인 아이디
    const { receiverUserId } = req.body

    if (!receiverUserId) {
      return res.status(400).json({
        message: "친구 요청을 받을 사용자의 ID가 필요합니다."
      })
    }

    // 로그인 아이디로 상대방 조회
    const receiver = await User.findOne({
      username: receiverUserId
    })

    if (!receiver) {
      return res.status(404).json({
        message: "친구 요청을 받을 사용자를 찾을 수 없습니다."
      })
    }

    // 자기 자신에게 친구 요청 방지
    if (requesterId.toString() === receiver._id.toString()) {
      return res.status(400).json({
        message: "자기 자신에게 친구 요청을 보낼 수 없습니다."
      })
    }

    // 기존 요청이나 친구 관계 확인
    const existingFriendship = await Friendship.findOne({
      $or: [
        {
          requester: requesterId,
          receiver: receiver._id
        },
        {
          requester: receiver._id,
          receiver: requesterId
        }
      ]
    })

    if (existingFriendship) {
      if (existingFriendship.status === "accepted") {
        return res.status(409).json({
          message: "이미 친구인 사용자입니다."
        })
      }

      return res.status(409).json({
        message: "이미 친구 요청이 존재합니다."
      })
    }

    // 실제 Friendship에는 MongoDB _id 저장
    const friendship = await Friendship.create({
      requester: requesterId,
      receiver: receiver._id,
      status: "pending"
    })

    return res.status(201).json({
      message: `${receiverUserId}님에게 친구 요청을 보냈습니다.`,
      friendship
    })
  } catch (error) {
    console.error("친구 요청 보내기 오류:", error)

    return res.status(500).json({
      message: "친구 요청 보내기 중 서버 오류가 발생했습니다."
    })
  }
}

// 내가 보낸 친구 요청 목록 조회
export const getSentFriendRequests = async (req, res) => {
  try {
    const requesterId = req.user.userId

    if (!requesterId) {
      return res.status(400).json({
        message: "로그인 사용자 정보가 없습니다."
      })
    }

    const sentRequests = await Friendship.find({
      requester: requesterId,
      status: "pending"
    }).populate("receiver", "username nickname").sort({ createdAt: -1 })

    return res.status(200).json({
      sentRequests
    })
  } catch (error) {
    console.error("보낸 친구 요청 목록 조회 오류:", error)

    return res.status(500).json({
      message: "보낸 친구 요청 목록 조회 중 서버 오류가 발생했습니다."
    })
  }
}



//  나에게 온 친구 요청 목록 조회
export const getFriendRequests = async(req,res)=>{
  try{
    const receiverId = req.user.userId 

    if(!receiverId){
      return res.status(400).json({
        message:"로그인 사용자 정보가 없습니다."
      })
    }
    const friendRequests = await Friendship.find({
      receiver: receiverId,
      status:"pending"
    }).populate("requester","username nickname").sort({createdAt:-1})
    return res.status(200).json({
      friendRequests
    })
  } catch (error) {
    console.error("친구 요청 목록 조회 오류:", error)
    return res.status(500).json({
      message: "친구 요청 목록 조회 중 서버 오류가 발생했습니다."
    })
  }
}

// 친구 요청 수락
export const acceptFriendRequest = async (req, res) => {
  try {
    // 현재 로그인한 사용자, 즉 친구 요청을 받은 사람
    const receiverId = req.user.userId

    // 상대방의 username을 URL 파라미터로 받음
    const { requesterUsername } = req.params

    // 상대방 검증 
    if (!requesterUsername) {
      return res.status(400).json({
        message: "친구 요청을 보낸 사용자의 아이디가 필요합니다."
      })
    }

    // username으로 요청 보낸 사용자 찾기
    const requester = await User.findOne({
      username: requesterUsername
    })

    if (!requester) {
      return res.status(404).json({
        message: "친구 요청을 보낸 사용자를 찾을 수 없습니다."
      })
    }

    // 상대방이 현재 로그인 사용자에게 보낸 요청 조회
    const friendship = await Friendship.findOne({
      requester: requester._id,
      receiver: receiverId,
      status: "pending"
    })

    if (!friendship) {
      return res.status(404).json({
        message: "해당 사용자가 보낸 친구 요청을 찾을 수 없습니다."
      })
    }

    friendship.status = "accepted"
    await friendship.save()

    return res.status(200).json({
      message: `${requester.username}님의 친구 요청을 수락했습니다.`,
      friendship
    })
  } catch (error) {
    console.error("친구 요청 수락 오류:", error)

    return res.status(500).json({
      message: "친구 요청 수락 중 서버 오류가 발생했습니다."
    })
  }
}

// 친구 요청 거절 
export const rejectFriendRequest = async (req, res) => {
  try {
    const receiverId = req.user.userId
    const { requesterUsername } = req.params

    if (!requesterUsername) {
      return res.status(400).json({
        message: "친구 요청을 보낸 사용자의 아이디가 필요합니다."
      })
    }

    const requester = await User.findOne({
      username: requesterUsername
    })

    if (!requester) {
      return res.status(404).json({
        message: "친구 요청을 보낸 사용자를 찾을 수 없습니다."
      })
    }

    const friendship = await Friendship.findOneAndDelete({
      requester: requester._id,
      receiver: receiverId,
      status: "pending"
    })

    if (!friendship) {
      return res.status(404).json({
        message: "해당 사용자가 보낸 친구 요청을 찾을 수 없습니다."
      })
    }

    return res.status(200).json({
      message: `${requester.username}님의 친구 요청을 거절했습니다.`
    })
  } catch (error) {
    console.error("친구 요청 거절 오류:", error)

    return res.status(500).json({
      message: "친구 요청 거절 중 서버 오류가 발생했습니다."
    })
  }
}

// 친구 목록 조회
export const getFriends = async (req, res) =>{
  try{
    const userId = req.user.userId

    if(!userId){
      return res.status(400).json({
        message:"로그인 사용자 정보가 없습니다."
      })
    }
    
    // 친구 요청이 수락된 상태에서, requester 또는 receiver가 현재 로그인한 사용자와 일치하는 경우
    const friends = await Friendship.find({
      $or: [
        { requester: userId, status: "accepted" },
        { receiver: userId, status: "accepted" }
      ]
    }).populate("requester receiver","username nickname").sort({createdAt:-1})

    return res.status(200).json({
      friends
    })

  }
  catch(error){
    console.error("친구 목록 조회 오류:", error)
    return res.status(500).json({
      message: "친구 목록 조회 중 서버 오류가 발생했습니다."
    })
  }
}

// 친구 삭제

export const deleteFriend = async (req, res) => {
  try {
    const userId = req.user.userId
    const { friendUsername } = req.params

    if (!friendUsername) {
      return res.status(400).json({
        message: "삭제할 친구의 아이디가 필요합니다."
      })
    }

    const friend = await User.findOne({
      username: friendUsername
    })

    if (!friend) {
      return res.status(404).json({
        message: "삭제할 친구를 찾을 수 없습니다."
      })
    }

    const friendship = await Friendship.findOneAndDelete({
      $or: [
        { requester: userId, receiver: friend._id, status: "accepted" },
        { requester: friend._id, receiver: userId, status: "accepted" }
      ]
    })

    if (!friendship) {
      return res.status(404).json({
        message: "해당 사용자가 친구 목록에 없습니다."
      })
    }

    return res.status(200).json({
      message: `${friend.username}님을 친구 목록에서 삭제했습니다.`
    })
  } catch (error) {
    console.error("친구 삭제 오류:", error)

    return res.status(500).json({
      message: "친구 삭제 중 서버 오류가 발생했습니다."
    })
  }
}