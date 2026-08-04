// 질문 제한, 답변 권한, 질문과 답변 저장, 모순검사
// 질문과 답변을 관리하는 서비스

import mongoose from "mongoose"

import Game from "../models/Game.js"
import { toQuestionDto } from "../adapters/gameDto.js"
import { validateAnswerWithEngine } from "../adapters/gameEngineAdapter.js"

const id = (value) => String(value?._id ?? value ?? "")

const serviceError = (message, status = 400, code = "BAD_REQUEST") => {
  const error = new Error(message)
  error.status = status
  error.code = code
  return error
}

const requireObjectId = (value, fieldName) => {
  if (!mongoose.isValidObjectId(value)) {
    throw serviceError(`${fieldName} 값이 올바르지 않습니다.`)
  }
  return new mongoose.Types.ObjectId(value)
}

const normalizeQuestion = (question) => {
  const predicates = [
    "AT_PLACE",
    "WITH_PLAYER",
    "SAW_PLAYER",
    "POSSESSED_TOOL",
  ]

  if (!question || !predicates.includes(question.predicate)) {
    throw serviceError("올바른 질문 유형이 아닙니다.")
  }

  const normalized = {
    targetPlayerId: requireObjectId(
      question.targetPlayerId,
      "targetPlayerId"
    ),
    predicate: question.predicate,
    slotIndex:
      question.slotIndex === null || question.slotIndex === undefined
        ? null
        : Number(question.slotIndex),
    placeId: question.placeId ?? null,
    relatedPlayerId: question.relatedPlayerId
      ? requireObjectId(question.relatedPlayerId, "relatedPlayerId")
      : null,
    toolId: question.toolId ?? null,
  }

  if (
    ["AT_PLACE", "WITH_PLAYER", "SAW_PLAYER"].includes(
      normalized.predicate
    ) &&
    !Number.isInteger(normalized.slotIndex)
  ) {
    throw serviceError("이 질문에는 시간 슬롯이 필요합니다.")
  }
  if (normalized.predicate === "AT_PLACE" && !normalized.placeId) {
    throw serviceError("장소 질문에는 placeId가 필요합니다.")
  }
  if (
    ["WITH_PLAYER", "SAW_PLAYER"].includes(normalized.predicate) &&
    !normalized.relatedPlayerId
  ) {
    throw serviceError("플레이어 관련 질문에는 relatedPlayerId가 필요합니다.")
  }
  if (normalized.predicate === "POSSESSED_TOOL" && !normalized.toolId) {
    throw serviceError("도구 질문에는 toolId가 필요합니다.")
  }

  return normalized
}

export const submitQuestion = async ({ io, userId, payload }) => {
  const { gameId, round, requestId } = payload ?? {}
  if (!requestId) throw serviceError("requestId가 필요합니다.")

  const questionInput = normalizeQuestion(payload.question)
  const game = await Game.findOne({
    _id: gameId,
    status: "playing",
    phase: "rounds",
  })

  if (!game) throw serviceError("진행 중인 게임을 찾을 수 없습니다.", 404)
  if (game.currentRound !== Number(round)) {
    throw serviceError("현재 라운드의 질문만 등록할 수 있습니다.", 409)
  }

  const asker = game.players.find(
    (player) => id(player.userId) === String(userId)
  )
  if (!asker) throw serviceError("게임 참가자가 아닙니다.", 403)

  const target = game.players.find(
    (player) => id(player.playerId) === id(questionInput.targetPlayerId)
  )
  if (!target) throw serviceError("질문 대상을 찾을 수 없습니다.")
  if (id(target.playerId) === id(asker.playerId)) {
    throw serviceError("자기 자신에게는 질문할 수 없습니다.")
  }

  const duplicate = game.questions.find(
    (question) => question.requestId === requestId
  )
  if (duplicate) {
    return { question: toQuestionDto(duplicate), idempotent: true }
  }

  const question = {
    questionId: new mongoose.Types.ObjectId(),
    round: game.currentRound,
    requestId,
    askerPlayerId: asker.playerId,
    ...questionInput,
    answer: null,
    validation: { status: "pending", conflicts: [], message: "" },
    createdAt: new Date(),
  }

  // players.$.questionCount를 같은 update에서 올려 동시 클릭에도 최대 2회를 지킵니다.
  const updatedGame = await Game.findOneAndUpdate(
    {
      _id: gameId,
      status: "playing",
      currentRound: game.currentRound,
      players: {
        $elemMatch: {
          playerId: asker.playerId,
          questionCount: { $lt: 2 },
        },
      },
    },
    {
      $inc: { "players.$.questionCount": 1 },
      $push: { questions: question },
    },
    { new: true, runValidators: true }
  )

  if (!updatedGame) {
    throw serviceError("공식 질문은 최대 2회까지 가능합니다.", 409)
  }

  const saved = updatedGame.questions.find(
    (entry) => id(entry.questionId) === id(question.questionId)
  )
  const dto = toQuestionDto(saved)
  io.to(`game:${gameId}`).emit("game:question:published", dto)

  return { question: dto, idempotent: false }
}

export const submitAnswer = async ({ io, userId, payload }) => {
  const { gameId, questionId, requestId, answer } = payload ?? {}

  if (!requestId) throw serviceError("requestId가 필요합니다.")
  if (typeof answer !== "boolean") {
    throw serviceError("answer는 YES=true 또는 NO=false여야 합니다.")
  }

  const game = await Game.findOne({
    _id: gameId,
    status: "playing",
    phase: "rounds",
  }).select("+runtime")

  if (!game) throw serviceError("진행 중인 게임을 찾을 수 없습니다.", 404)

  const question = game.questions.find(
    (entry) => id(entry.questionId) === String(questionId)
  )
  if (!question) throw serviceError("질문을 찾을 수 없습니다.", 404)

  const target = game.players.find(
    (player) => id(player.playerId) === id(question.targetPlayerId)
  )
  if (!target || id(target.userId) !== String(userId)) {
    throw serviceError("질문 대상자만 답변할 수 있습니다.", 403)
  }

  if (question.answer !== null) {
    // 이미 같은 답변이 저장됐다면 재연결 재전송을 멱등 처리합니다.
    if (question.answer === answer) {
      return { question: toQuestionDto(question), idempotent: true }
    }
    throw serviceError("이미 답변이 완료된 질문입니다.", 409)
  }

  let validation

  try {
    // TODO(준홍): Adapter 안에서 실제 Q&A 모순 판정 함수를 연결합니다.
    const result = await validateAnswerWithEngine({
      question: toQuestionDto(question),
      answer,
      runtimeTimeline: game.runtime?.inGamePlayerTimelineMap,
      runtimeWitnesses: game.runtime?.inGameWitnessesMap,
    })

    validation = {
      status: result.valid ? "valid" : "conflict",
      conflicts: result.conflicts ?? [],
      message: "",
    }
  } catch (error) {
    // 답변 사실 자체는 보존하되, 검사되지 않은 답변을 valid로 가장하지 않습니다.
    validation = {
      status: "failed",
      conflicts: [],
      message: error.message,
    }
  }

  const updatedGame = await Game.findOneAndUpdate(
    {
      _id: gameId,
      questions: {
        $elemMatch: {
          questionId: question.questionId,
          answer: null,
        },
      },
    },
    {
      $set: {
        "questions.$.answer": answer,
        "questions.$.answeredAt": new Date(),
        "questions.$.validation": validation,
      },
    },
    { new: true }
  )

  if (!updatedGame) {
    throw serviceError("답변 저장 중 상태가 변경되었습니다.", 409)
  }

  const saved = updatedGame.questions.find(
    (entry) => id(entry.questionId) === String(questionId)
  )
  const dto = toQuestionDto(saved)
  io.to(`game:${gameId}`).emit("game:answer:published", dto)

  if (validation.status === "failed") {
    io.to(`game:${gameId}`).emit("game:error", {
      code: "ANSWER_VALIDATION_FAILED",
      message: validation.message,
    })
  }

  return { question: dto, idempotent: false }
}
