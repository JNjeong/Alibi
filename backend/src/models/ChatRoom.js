import mongoose from "mongoose"

const chatRoomSchema = new mongoose.Schema(
  {
    // 1:1 채팅에 참여하는 두 사용자
    participants: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        }
      ],
      required: true, // 1:1 채팅방에는 두 명의 사용자가 필요

      validate: { // participants 배열의 유효성 검사
        validator(participants) { // 배열이 두 명의 서로 다른 사용자 ID를 포함하는지 확인
          if ( 
            !Array.isArray(participants) ||
            participants.length !== 2
          ) {
            return false
          }

          // 같은 사용자가 두 번 들어가는 것 방지
          const participantIds = participants.map(
            (participantId) => String(participantId)
          )

          return new Set(participantIds).size === 2
        },
        message:
          "1:1 채팅방에는 서로 다른 두 명의 사용자가 필요합니다."
      }
    },

    // 동일한 두 사용자 사이에 채팅방이 중복 생성되는 것 방지
    participantKey: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    // 채팅 목록에서 마지막 메시지 미리보기용
    lastMessage: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500
    },

    // 마지막 메시지를 보낸 사용자
    lastSender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    // 채팅방 정렬에 사용
    lastMessageAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
)

// 두 사용자 ID를 항상 같은 순서의 문자열로 변환
chatRoomSchema.statics.createParticipantKey = function (
  firstUserId,
  secondUserId
) {
  return [String(firstUserId), String(secondUserId)]
    .sort()
    .join(":")
}

const ChatRoom = mongoose.model(
  "ChatRoom",
  chatRoomSchema
)

export default ChatRoom