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
      enum: ["waiting", "playing", "finished"],
      default: "waiting"
    }
  },
  {
    timestamps: true
  }
)

const Room = mongoose.model("Room", roomSchema)

export default Room
