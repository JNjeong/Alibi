// 게임 생성, 시작, 복원, 종료 
// 게임 상태를 관리하는 서비스

import mongoose from "mongoose"

import Game from "../models/Game.js"
import GameStatement from "../models/GameStatement.js"
import Room from "../models/Room.js"
import GameMap from "../models/Map.js"
import { createGameWithEngine } from "../adapters/gameEngineAdapter.js"
import {
  toActiveGameDto,
  toBootstrapDto,
  toResultDto,
} from "../adapters/gameDto.js"
import {
  getSubmissionStatus,
  scheduleRoundTimeout,
} from "./round_service.js"

const id = (value) => String(value?._id ?? value ?? "")

const serviceError = (message, status = 400, code = "BAD_REQUEST") => {
  const error = new Error(message)
  error.status = status
  error.code = code
  return error
}

const assertObjectId = (value, fieldName) => {
  if (!mongoose.isValidObjectId(value)) {
    throw serviceError(`${fieldName} 값이 올바르지 않습니다.`)
  }
}

export const startGame = async ({ io, roomId, userId }) => {
  assertObjectId(roomId, "roomId")

  /*
   * waiting → generating을 한 번의 findOneAndUpdate로 바꿉니다.
   * 더블 클릭이나 두 개 탭에서 room:start가 와도 한 요청만 잠금을 얻습니다.
   *
   * 기존 Room.js에 generating enum과 activeGame 필드가 먼저 추가돼야 합니다.
   */
  const room = await Room.findOneAndUpdate(
    {
      _id: roomId,
      host: userId,
      status: "waiting",
      $expr: {
        $and: [
          { $gte: [{ $size: "$participants" }, 9] },
          { $lte: [{ $size: "$participants" }, 10] },
        ],
      },
    },
    { $set: { status: "generating" } },
    { new: true }
  ).populate("participants", "username nickname")

  if (!room) {
    const currentRoom = await Room.findById(roomId)
    if (!currentRoom) throw serviceError("방을 찾을 수 없습니다.", 404)
    if (id(currentRoom.host) !== String(userId)) {
      throw serviceError("방장만 게임을 시작할 수 있습니다.", 403)
    }
    if (currentRoom.participants.length < 9 || currentRoom.participants.length > 10) {
      throw serviceError("게임은 9~10명일 때 시작할 수 있습니다.", 409)
    }
    throw serviceError("게임 생성이 이미 진행 중이거나 시작되었습니다.", 409)
  }

  try {
    // DB에 Map 문서가 아직 없으면 스키마 default를 가진 임시 문서를 사용합니다.
    const mapDocument = (await GameMap.findOne()) ?? new GameMap()
    const gameData = await createGameWithEngine({
      users: room.participants.map((user) => user.toObject()),
      mapInfo: mapDocument.toObject(),
      roomId: room._id,
    })

    const game = await Game.create(gameData)

    await Room.updateOne(
      { _id: room._id, status: "generating" },
      {
        $set: {
          status: "playing",
          activeGame: game._id,
        },
      }
    )

    scheduleRoundTimeout(io, game)
    return toActiveGameDto(game)
  } catch (error) {
    // 생성 실패 시 방이 영원히 generating에 남지 않게 되돌립니다.
    await Room.updateOne(
      { _id: roomId, status: "generating" },
      { $set: { status: "waiting", activeGame: null } }
    )
    throw error
  }
}

export const getActiveGameByRoom = async ({ roomId, userId }) => {
  assertObjectId(roomId, "roomId")

  const room = await Room.findOne({
    _id: roomId,
    participants: userId,
  })
  if (!room) throw serviceError("방 참가자가 아닙니다.", 403)

  const game = room.activeGame
    ? await Game.findById(room.activeGame)
    : await Game.findOne({
        roomId,
        status: { $in: ["generating", "playing"] },
      }).sort({ createdAt: -1 })

  if (!game) throw serviceError("현재 진행 중인 게임이 없습니다.", 404)
  return toActiveGameDto(game)
}

export const getGameForUser = async ({ gameId, userId, includeSecret = false }) => {
  assertObjectId(gameId, "gameId")

  let query = Game.findOne({
    _id: gameId,
    "players.userId": userId,
  })
  if (includeSecret) query = query.select("+secret +runtime")

  const game = await query
  if (!game) throw serviceError("게임 참가자가 아니거나 게임이 없습니다.", 404)
  return game
}

export const getBootstrap = async ({ gameId, userId }) => {
  const game = await getGameForUser({ gameId, userId })
  const statements = await GameStatement.find({ gameId }).sort({ createdAt: 1 })
  const submissionStatus = await getSubmissionStatus({
    gameId,
    round: game.currentRound,
    game,
  })

  return toBootstrapDto({ game, userId, statements, submissionStatus })
}

export const getResult = async ({ gameId, userId }) => {
  const game = await getGameForUser({
    gameId,
    userId,
    includeSecret: true,
  })
  return toResultDto(game)
}

const normalizeDeduction = (deduction) => {
  if (!deduction) throw serviceError("최종 추리 내용이 없습니다.")
  assertObjectId(deduction.criminalPlayerId, "criminalPlayerId")

  const crimeSlotIndex = Number(deduction.crimeSlotIndex)
  if (!Number.isInteger(crimeSlotIndex) || crimeSlotIndex < 0) {
    throw serviceError("crimeSlotIndex 값이 올바르지 않습니다.")
  }
  if (!deduction.crimePlaceId || !deduction.crimeToolId) {
    throw serviceError("범행 장소와 도구를 모두 선택해주세요.")
  }

  return {
    criminalPlayerId: new mongoose.Types.ObjectId(
      deduction.criminalPlayerId
    ),
    crimeSlotIndex,
    crimePlaceId: deduction.crimePlaceId,
    crimeToolId: deduction.crimeToolId,
  }
}

export const submitFinalDeduction = async ({ io, userId, payload }) => {
  const { gameId, requestId } = payload ?? {}
  if (!requestId) throw serviceError("requestId가 필요합니다.")

  const deduction = normalizeDeduction(payload.deduction)
  const game = await Game.findOne({
    _id: gameId,
    status: "playing",
    phase: "final_deduction",
  }).select("+secret")

  if (!game) throw serviceError("최종 추리 단계의 게임이 아닙니다.", 409)

  const player = game.players.find(
    (entry) => id(entry.userId) === String(userId)
  )
  if (!player) throw serviceError("게임 참가자가 아닙니다.", 403)

  const existing = game.finalSubmissions.find(
    (entry) => id(entry.playerId) === id(player.playerId)
  )
  if (existing) {
    if (existing.requestId === requestId) {
      return { idempotent: true, submittedCount: game.finalSubmissions.length }
    }
    throw serviceError("이미 최종 추리를 제출했습니다.", 409)
  }

  const solution = game.secret.solution
  const isCorrect =
    id(deduction.criminalPlayerId) === id(solution.criminalPlayerId) &&
    deduction.crimeSlotIndex === solution.crimeSlotIndex &&
    deduction.crimePlaceId === solution.crimePlaceId &&
    deduction.crimeToolId === solution.crimeToolId

  const updatedGame = await Game.findOneAndUpdate(
    {
      _id: gameId,
      status: "playing",
      phase: "final_deduction",
      finalSubmissions: {
        $not: { $elemMatch: { playerId: player.playerId } },
      },
    },
    {
      $push: {
        finalSubmissions: {
          playerId: player.playerId,
          requestId,
          deduction,
          isCorrect,
          submittedAt: new Date(),
        },
      },
    },
    { new: true }
  )

  if (!updatedGame) throw serviceError("최종 추리가 이미 제출되었습니다.", 409)

  const statusPayload = {
    gameId: id(gameId),
    requiredCount: updatedGame.players.length,
    submittedCount: updatedGame.finalSubmissions.length,
    entries: updatedGame.finalSubmissions.map((entry) => ({
      playerId: id(entry.playerId),
      status: "submitted",
    })),
  }
  io.to(`game:${gameId}`).emit(
    "game:final:submission-updated",
    statusPayload
  )

  if (updatedGame.finalSubmissions.length === updatedGame.players.length) {
    const finishedAt = new Date()
    const finishedGame = await Game.findOneAndUpdate(
      {
        _id: gameId,
        status: "playing",
        phase: "final_deduction",
      },
      {
        $set: {
          status: "finished",
          phase: "finished",
          finishedAt,
        },
      },
      { new: true }
    )

    if (finishedGame) {
      await Room.updateOne(
        { _id: finishedGame.roomId, activeGame: gameId },
        { $set: { status: "finished" } }
      )

      // TODO(팀 통합): 기존 GameLog 스키마를 gameId 기준으로 확장한 뒤
      // 여기서 승/패 집계와 GameLog 저장 함수를 호출합니다.
      io.to(`game:${gameId}`).emit("game:finished", {
        gameId: id(gameId),
        resultPath: `/result/${gameId}`,
      })
    }
  }

  return { idempotent: false, ...statusPayload }
}
