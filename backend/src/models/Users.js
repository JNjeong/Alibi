import mongoose from "mongoose"

const UserSchema = new mongoose.Schema({
    name:{type:String, required:[true],trim:true},
    id:{type:String, required:[true],trim:true,unique:true},
    password:{type:String,required:[true],trim:true},
    winCnt:{type:Number, default: 0},
    lostCnt:{type:Number, defualt:0}
})

const Users= mongoose.model("Users", UserSchema)
export default Users