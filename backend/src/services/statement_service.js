// 진술 검증, 저장 중복 방지, 제출 현황 계산
// 진술 상태를 관리하는 서비스

import Game from "../models/Game.js"
import GameStatement from "../models/GameStatement.js"
import { toStatementDto } from "../adapters/gameDto.js"
import {
  getSubmissionStatus,
  tryValidateRound,
} from "./round_service.js"

const id = (value) => String(value?._id ?? value ?? "")

const serviceError = (message, status = 400, code = "BAD_REQUEST") => {
  const error = new Error(message)
  error.status = status
  error.code = code
  return error
}

const normalizeStatement = (statement, slotCount) => {
  if (!statement || !["ALIBI", "TOOL_POSSESSION"].includes(statement.kind)) {
    throw serviceError("올바른 공식 진술 유형이 아닙니다.")
  }

  const slotIndex = Number(statement.slotIndex)
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= slotCount) {
    throw serviceError("올바른 시간 슬롯을 선택해주세요.")
  }

  if (statement.kind === "ALIBI" && !statement.placeId) {
    throw serviceError("행적 진술에는 장소가 필요합니다.")
  }

  if (statement.kind === "TOOL_POSSESSION" && !statement.toolId) {
    throw serviceError("도구 진술에는 도구가 필요합니다.")
  }

  return {
    kind: statement.kind,
    slotIndex,
    placeId: statement.kind === "ALIBI" ? statement.placeId : null,
    action: statement.kind === "ALIBI" ? statement.action?.trim() || null : null,
    companionPlayerIds:
      statement.kind === "ALIBI"
        ? [...new Set(statement.companionPlayerIds ?? [])]
        : [],
    toolId: statement.kind === "TOOL_POSSESSION" ? statement.toolId : null,
  }
}

export const submitStatement = async ({ io, userId, payload }) => {
  const { gameId, round, requestId, source = "manual" } = payload ?? {}

  if (!requestId) {
    throw serviceError("requestId가 필요합니다.")
  }

  const game = await Game.findOne({
    _id: gameId,
    status: "playing",
    phase: "rounds",
  })

  if (!game) throw serviceError("진행 중인 게임을 찾을 수 없습니다.", 404)
  if (game.currentRound !== Number(round)) {
    throw serviceError("현재 라운드의 진술만 제출할 수 있습니다.", 409)
  }
  if (game.roundStatus !== "collecting") {
    throw serviceError("현재 라운드는 진술을 받고 있지 않습니다.", 409)
  }

  const player = game.players.find(
    (entry) => id(entry.userId) === String(userId)
  )
  if (!player) throw serviceError("게임 참가자가 아닙니다.", 403)

  const statement = normalizeStatement(
    payload.statement,
    game.caseData.timeSlots.length
  )

  let document
  let created = false

  try {
    document = await GameStatement.create({
      gameId,
      round: game.currentRound,
      playerId: player.playerId,
      userId: player.userId,
      requestId,
      status: "submitted",
      source: source === "auto" ? "auto" : "manual",
      statement,
      submittedAt: new Date(),
    })
    created = true
  } catch (error) {
    if (error?.code !== 11000) throw error

    // 같은 requestId의 재전송이면 성공 응답을 다시 주고, 다른 요청이면 중복 제출입니다.
    document = await GameStatement.findOne({ gameId, requestId })
    if (!document) {
      throw serviceError("이미 이 라운드의 진술을 제출했습니다.", 409)
    }
  }

  if (created) {
    io.to(`game:${gameId}`).emit(
      "game:statement:published",
      toStatementDto(document)
    )
  }

  const submissionStatus = await getSubmissionStatus({
    gameId,
    round: game.currentRound,
    game,
  })

  io.to(`game:${gameId}`).emit(
    "game:submission:updated",
    submissionStatus
  )

  // 핵심: 프론트의 finalize 이벤트 없이 저장 직후 백엔드가 자동 검사 진입을 시도합니다.
  // 아직 전원이 처리되지 않았으면 tryValidateRound가 아무 일도 하지 않고 반환합니다.
  await tryValidateRound({ io, gameId, round: game.currentRound })

  return {
    statement: toStatementDto(document),
    submissionStatus,
    idempotent: !created,
  }
}
