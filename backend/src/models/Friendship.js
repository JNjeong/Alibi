import mongoose from "mongoose"

const friendshipSchema = new mongoose.Schema(
  {
    // 친구 요청을 보낸 사용자
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    // 친구 요청을 받은 사용자
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    // pending (요청 대기)
    // accepted (친구 수락 완료)
    
    status: {
      type: String,
      enum: ["pending", "accepted"],
      default: "pending"
    }
  },
  {
    timestamps: true
  }
)

const Friendship = mongoose.model(
  "Friendship",
  friendshipSchema
)

export default Friendship