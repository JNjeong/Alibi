import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },

        password: {
            type: String,
            required: true,
        },

        nickname: {
            type: String,
            required: true,
            trim: true,
        },

        // 마지막 로그인( 관리자페이지 - 회원관리 )
        lastLoginAt: {
            type: Date,
            default: null,
        },  

        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user",
        }, 

        playCnt: {
            type: Number,
            default: 0,
        },

        winCnt: {
            type: Number,
            default: 0,
        },

        loseCnt: {
            type: Number,
            default: 0,
        },

        // 시민
        citizenPlayCnt: {
            type: Number,
            default: 0,
        },

        citizenWinCnt: {
            type: Number,
            default: 0,
        },

        // 범인
        killerPlayCnt: {
            type: Number,
            default: 0,
        },

        killerWinCnt: {
            type: Number,
            default: 0,
        },

        // 완전해결
        perfectSolveCnt: {
            type: Number,
            default: 0,
        },

    },
    {
        timestamps: true,
    }
);

const User = mongoose.model("User", userSchema);

export default User;