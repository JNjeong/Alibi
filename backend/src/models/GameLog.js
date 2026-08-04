import mongoose from "mongoose"

const GameLogSchema = new mongoose.Schema({
    room_code:{type:String, required: true},
    room_members:{type:[String], default:[]},
    room_winner:{type:[String], default:[]},
    room_loser:{type:[String], default:[]},

    // 게임 진행에 있어서 gameId와 roomId를 저장하여, 게임 진행 중에 발생한 로그를 추적할 수 있도록 함
    gameId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Game",
        required: true,
        unique: true
    },
    roomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Room",
        required: true
    },

    // 사건생성에 있어서 범죄자, 범죄장소, 범죄도구를 저장하여, 게임 종료 후 사건을 확인할 수 있도록 함
    crime: {
        criminalPlayerId: mongoose.Schema.Types.ObjectId,
        crimeSlotIndex: Number,
        crimePlaceId: String,
        crimeToolId: String
    },
  
    // finalSubmissions - 게임 종료 후, 각 플레이어의 최종 제출물을 저장하여, 게임 종료 후 결과를 확인할 수 있도록 함
    finalSubmissions: { type: [mongoose.Schema.Types.Mixed], default: [] }
    },{
    timestamps:true
})

const GameLog = mongoose.model("GameLog", GameLogSchema)
export default GameLog