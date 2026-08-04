// 한 판 전체 상태. 비밀 데이터. 힌트. Q&A. 최종 제출 저장
// 게임 상태를 저장하는 모델

import mongoose from "mongoose"

/*
 * Game 모델
 * --------------------------------------------------------------------------
 * Room은 "사람들이 모인 대기방"이고, Game은 "실제로 생성된 한 판"입니다.
 *
 * MongoDB가 이 문서를 저장하면서 만드는 Game._id가 프론트에서 사용하는
 * gameId가 됩니다. Room._id(roomId)와 역할이 다르므로 둘을 섞으면 안 됩니다.
 */

const { Schema } = mongoose

const timelineEntrySchema = new Schema(
  {
    slotIndex: { type: Number, required: true },
    placeId: { type: String, default: null },
    action: { type: String, default: "" },
    companionPlayerIds: [{ type: Schema.Types.ObjectId }],
    toolId: { type: String, default: null },
    flags: [{ type: String }],
  },
  { _id: false }
)

const playerSchema = new Schema(
  {
    // 게임 안에서만 쓰는 참가자 ID입니다. 질문 대상·최종 범인 선택에 사용합니다.
    playerId: {
      type: Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId(),
      required: true,
    },
    // 로그인 계정 ID입니다. socket.userId와 대조할 때만 사용합니다.
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    username: { type: String, required: true },
    nickname: { type: String, required: true },

    role: {
      roleId: { type: String, required: true },
      name: { type: String, required: true },
      occupation: { type: String, default: "" },
      motive: { type: String, default: "" },
    },

    // 전체 Game 문서 안에는 모두 저장하지만 gameDto가 본인 것만 응답합니다.
    timeline: { type: [timelineEntrySchema], default: [] },
    witnesses: { type: [Schema.Types.Mixed], default: [] },

    // 공식 질문은 한 사람당 최대 2회입니다. 원자적 $inc로 경쟁 요청을 막습니다.
    questionCount: { type: Number, default: 0, min: 0, max: 2 },
  },
  { _id: false }
)

const placeSchema = new Schema(
  {
    placeId: { type: String, required: true },
    name: { type: String, required: true },
    actions: { type: [String], default: [] },
  },
  { _id: false }
)

const toolSchema = new Schema(
  {
    toolId: { type: String, required: true },
    name: { type: String, required: true },
    feature: { type: String, default: "" },
    defaultPlaceId: { type: String, default: null },
  },
  { _id: false }
)

const timeSlotSchema = new Schema(
  {
    slotIndex: { type: Number, required: true },
    label: { type: String, required: true },
  },
  { _id: false }
)

const conflictSchema = new Schema(
  {
    type: { type: String, required: true },
    sourceIds: { type: [String], default: [] },
    playerIds: [{ type: Schema.Types.ObjectId }],
    slotIndex: { type: Number, default: null },
    placeId: { type: String, default: null },
    toolId: { type: String, default: null },
    message: { type: String, required: true },
  },
  { _id: false }
)

const questionSchema = new Schema(
  {
    questionId: {
      type: Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId(),
      required: true,
    },
    round: { type: Number, required: true, min: 1, max: 5 },
    requestId: { type: String, required: true },
    askerPlayerId: { type: Schema.Types.ObjectId, required: true },
    targetPlayerId: { type: Schema.Types.ObjectId, required: true },
    predicate: {
      type: String,
      enum: ["AT_PLACE", "WITH_PLAYER", "SAW_PLAYER", "POSSESSED_TOOL"],
      required: true,
    },
    slotIndex: { type: Number, default: null },
    placeId: { type: String, default: null },
    relatedPlayerId: { type: Schema.Types.ObjectId, default: null },
    toolId: { type: String, default: null },
    answer: { type: Boolean, default: null },
    answeredAt: { type: Date, default: null },
    validation: {
      status: {
        type: String,
        enum: ["pending", "valid", "conflict", "failed"],
        default: "pending",
      },
      conflicts: { type: [conflictSchema], default: [] },
      message: { type: String, default: "" },
    },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
)

const deductionSchema = new Schema(
  {
    criminalPlayerId: { type: Schema.Types.ObjectId, required: true },
    crimeSlotIndex: { type: Number, required: true },
    crimePlaceId: { type: String, required: true },
    crimeToolId: { type: String, required: true },
  },
  { _id: false }
)

const finalSubmissionSchema = new Schema(
  {
    playerId: { type: Schema.Types.ObjectId, required: true },
    requestId: { type: String, required: true },
    deduction: { type: deductionSchema, required: true },
    isCorrect: { type: Boolean, required: true },
    submittedAt: { type: Date, default: Date.now },
  },
  { _id: false }
)

const roundHistorySchema = new Schema(
  {
    round: { type: Number, required: true },
    valid: { type: Boolean, required: true },
    conflicts: { type: [conflictSchema], default: [] },
    revealedHint: { type: Schema.Types.Mixed, default: null },
    completedAt: { type: Date, default: Date.now },
  },
  { _id: false }
)

const gameSchema = new Schema(
  {
    roomId: {
      type: Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["generating", "playing", "finished", "failed"],
      default: "generating",
      index: true,
    },
    phase: {
      type: String,
      enum: ["rounds", "final_deduction", "finished"],
      default: "rounds",
    },
    currentRound: { type: Number, default: 1, min: 1, max: 5 },
    totalRounds: { type: Number, default: 5 },
    roundStatus: {
      type: String,
      enum: ["collecting", "validating", "completed"],
      default: "collecting",
    },
    phaseStartedAt: { type: Date, required: true },
    phaseEndsAt: { type: Date, required: true, index: true },

    caseData: {
      title: { type: String, default: "대저택 살인사건" },
      mapId: { type: String, default: null },
      mapStory: { type: String, default: "" },
      victimName: { type: String, default: "피해자" },
      foundAtLabel: { type: String, default: "21:00" },
      foundPlaceId: { type: String, default: null },
      timeSlots: { type: [timeSlotSchema], default: [] },
      places: { type: [placeSchema], default: [] },
      tools: { type: [toolSchema], default: [] },
    },

    players: { type: [playerSchema], default: [] },
    questions: { type: [questionSchema], default: [] },
    finalSubmissions: { type: [finalSubmissionSchema], default: [] },
    roundHistory: { type: [roundHistorySchema], default: [] },
    revealedHints: { type: [Schema.Types.Mixed], default: [] },

    // 아래 두 필드는 API 기본 조회에서 제외됩니다. 반드시 +secret/+runtime으로만 조회합니다.
    secret: {
      type: Schema.Types.Mixed,
      required: true,
      select: false,
    },
    runtime: {
      type: Schema.Types.Mixed,
      required: true,
      select: false,
    },

    finishedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

// 한 방에 동시에 진행 중인 한 판만 존재하도록 서비스에서도 Room.activeGame을 잠급니다.
gameSchema.index({ roomId: 1, status: 1 })
gameSchema.index({ "players.userId": 1, status: 1 })
gameSchema.index({ "questions.requestId": 1 }, { unique: true, sparse: true })

const Game = mongoose.model("Game", gameSchema)

export default Game
