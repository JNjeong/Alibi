/**
 * GameLog.js
 * -----------------------------------------------------------------------------
 * 역할
 * - 종료된 한 판의 정답과 참가자별 판정 결과를 영구 보관합니다.
 * - Room이 종료 후 삭제되어도 gameId로 결과 화면을 다시 열 수 있게 합니다.
 * - 사용자 닉네임·캐릭터는 당시 값의 스냅샷으로 저장합니다.
 */

import mongoose from "mongoose"

const { Schema } = mongoose

const solutionSchema = new Schema(
  {
    criminalPlayerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    crimeTime: { type: Number, required: true },
    crimeSection: {
      type: String,
      enum: ["section02", "section24", "section46"],
      required: true,
    },
    crimePlaceId: { type: String, required: true },
    crimeItemId: { type: String, required: true },
  },
  { _id: false }
)

const playerResultSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    username: { type: String, required: true},
    nickname: { type: String, required: true},
    characterId: { type: String, required: true },
    characterName: { type: String, required: true },
    isKiller: { type: Boolean, required: true },
    isCorrect: { type: Boolean, required: true },
    win: { type: Boolean, required: true },
    correctFields: {
      criminal: { type: Boolean, default: false },
      time: { type: Boolean, default: false },
      place: { type: Boolean, default: false },
      item: { type: Boolean, default: false },
    },
    deduction: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  { _id: false }
)

const gameLogSchema = new Schema(
  {
    // 한 Game은 결과 로그를 정확히 하나만 가집니다.
    gameId: {
      type: Schema.Types.ObjectId,
      ref: "Game",
      unique: true,
      sparse: true,
      index: true,
    },
    roomId: { type: Schema.Types.ObjectId, ref: "Room", default: null },

    // 기존 관리자/결과 코드와 호환하기 위해 이름 필드는 유지합니다.
    room_code: { type: String, required: true },
    room_members: { type: [String], default: [] },
    room_winner: { type: [String], default: [] },
    room_loser: { type: [String], default: [] },

    solution: { type: solutionSchema, default: null },
    playerResults: { type: [playerResultSchema], default: [] },
    citizenWinnerCount: { type: Number, default: 0 },
    killerWon: { type: Boolean, default: false },
    finishedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)



const GameLog = mongoose.model("GameLog", gameLogSchema)

export default GameLog
