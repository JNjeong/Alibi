// 플레이어별 라운드 공식 진술과 질문과 답변 저장

import mongoose from "mongoose"

/*
 * 플레이어 한 명이 한 라운드에 제출한 공식 진술 한 건을 저장합니다.
 *
 * Game 안의 큰 배열로 넣지 않고 분리한 이유:
 * 1) gameId + round + playerId UNIQUE 인덱스로 중복 제출을 DB가 막을 수 있습니다.
 * 2) 전원 제출 여부를 countDocuments로 다시 계산할 수 있습니다.
 * 3) 동시에 마지막 두 명이 제출해도 round_service의 잠금과 함께 안전하게 처리됩니다.
 */

const { Schema } = mongoose

const statementBodySchema = new Schema(
  {
    kind: {
      type: String,
      enum: ["ALIBI", "TOOL_POSSESSION"],
      required: true,
    },
    slotIndex: { type: Number, required: true, min: 0 },
    placeId: { type: String, default: null },
    action: { type: String, default: null },
    companionPlayerIds: [{ type: Schema.Types.ObjectId }],
    toolId: { type: String, default: null },
  },
  { _id: false }
)

const gameStatementSchema = new Schema(
  {
    gameId: {
      type: Schema.Types.ObjectId,
      ref: "Game",
      required: true,
      index: true,
    },
    round: { type: Number, required: true, min: 1, max: 5 },
    playerId: { type: Schema.Types.ObjectId, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    // 클라이언트가 재전송해도 같은 요청인지 판별하는 멱등성 키입니다.
    requestId: { type: String, required: true },
    status: {
      type: String,
      enum: ["submitted", "timed_out"],
      required: true,
    },
    source: {
      type: String,
      enum: ["manual", "auto", "server_timeout"],
      required: true,
    },
    statement: { type: statementBodySchema, default: null },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

gameStatementSchema.index(
  { gameId: 1, round: 1, playerId: 1 },
  { unique: true }
)

gameStatementSchema.index(
  { gameId: 1, requestId: 1 },
  { unique: true }
)

const GameStatement = mongoose.model("GameStatement", gameStatementSchema)

export default GameStatement
