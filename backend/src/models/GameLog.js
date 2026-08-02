import mongoose from "mongoose"

const GameLogSchema = new mongoose.Schema({
    room_code:{type:String, required: true},
    room_members:{type:[String], default:[]},
    room_winner:{type:[String], default:[]},
    room_loser:{type:[String], default:[]}
},{
    timestamps:true
})

const GameLog = mongoose.model("GameLog", GameLogSchema)
export default GameLog