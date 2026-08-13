import mongoose from "mongoose"

const messageSchema = new mongoose.Schema(
  {
    // 메시지가 속한 1:1 채팅방
    chatRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatRoom",
      required: true,
      index: true
    },

    // 메시지를 보낸 사용자
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    // 방 초대 메시지도 보낼 수 있게 기능 확장 
    type: {
      type: String,
      enum: ["text", "room_invite"],
      default: "text"
    },

    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },

    // 방 초대 메시지일 때 연결되는 대기방
    invitedRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      default: null
    },

    inviteCode: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
)

// 한 채팅방의 메시지를 시간순으로 조회할 때 사용
messageSchema.index({
  chatRoom: 1,
  createdAt: 1
})

const Message = mongoose.model(
  "Message",
  messageSchema
)

export default Message
