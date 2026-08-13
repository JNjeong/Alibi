import mongoose from "mongoose"

const roomSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30
    },
    inviteCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    maxPlayers: {
      type: Number,
      default: 10
    },
    status: {
      type: String,
      enum: ["waiting", "starting", "playing", "finished"],
      default: "waiting"
    },
    currentGameId:{ // 같은 Room에서 재게임할 수 있으므로 `roomId` 자체를 현재 판 ID로 사용할 수 없습니다. 대기실은 `currentGameId`로 지금 진행 중인 정확한 Game 한 판을 가리킵니다.

      type : mongoose.Schema.Types.ObjectId,
      ref : "Game",
      default : null
    }
  },
  {
    timestamps: true
  }
)

const Room = mongoose.model("Room", roomSchema)

export default Room
