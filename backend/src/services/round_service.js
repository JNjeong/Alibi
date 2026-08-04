// 타임아웃, 라운드 잠금, 모순검사, 다음라운드 
// 라운드 상태를 관리하는 서비스 

import Game from "../models/Game.js"
import GameStatement from "../models/GameStatement.js"
import { validateRoundWithEngine } from "../adapters/gameEngineAdapter.js"

/*
 * 서버 타이머는 화면용 타이머와 별개입니다.
 * 브라우저가 꺼져도 phaseEndsAt이 지나면 서버가 timed_out 문서를 만들고
 * tryValidateRound()를 호출해야 게임이 멈추지 않습니다.
 */
const roundTimers = new Map()

const id = (value) => String(value?._id ?? value ?? "")
const timerKey = (gameId) => String(gameId)

const clearRoundTimer = (gameId) => {
  const key = timerKey(gameId)
  const timer = roundTimers.get(key)

  if (timer) {
    clearTimeout(timer)
    roundTimers.delete(key)
  }
}

export const getSubmissionStatus = async ({ gameId, round, game = null }) => {
  const targetGame = game ?? (await Game.findById(gameId))

  if (!targetGame) {
    const error = new Error("게임을 찾을 수 없습니다.")
    error.status = 404
    throw error
  }

  const documents = await GameStatement.find({ gameId, round }).lean()
  const byPlayerId = new Map(
    documents.map((document) => [id(document.playerId), document])
  )

  const entries = targetGame.players.map((player) => {
    const document = byPlayerId.get(id(player.playerId))

    return {
      playerId: id(player.playerId),
      status: document?.status ?? "pending",
    }
  })

  const submittedCount = entries.filter(
    (entry) => entry.status === "submitted"
  ).length
  const timedOutCount = entries.filter(
    (entry) => entry.status === "timed_out"
  ).length
  const resolvedCount = submittedCount + timedOutCount
  const requiredCount = targetGame.players.length
  const latestRevision = documents.reduce(
    (latest, document) =>
      Math.max(latest, new Date(document.updatedAt ?? 0).getTime()),
    0
  )

  return {
    round,
    requiredCount,
    submittedCount,
    timedOutCount,
    resolvedCount,
    allSubmitted: submittedCount === requiredCount,
    readyToValidate: resolvedCount === requiredCount,
    entries,
    // 클라이언트가 늦게 도착한 이전 이벤트를 무시할 때 사용합니다.
    revision: latestRevision,
  }
}

export const scheduleRoundTimeout = (io, game) => {
  clearRoundTimer(game._id)

  if (
    game.status !== "playing" ||
    game.phase !== "rounds" ||
    game.roundStatus !== "collecting"
  ) {
    return
  }

  const delay = Math.max(0, new Date(game.phaseEndsAt).getTime() - Date.now())
  // setTimeout의 안전 범위를 넘는 값은 여러 번 나누어 예약해야 하지만,
  // 현재 라운드는 수 분이므로 아래 상한이면 충분합니다.
  const safeDelay = Math.min(delay, 2_147_483_647)

  const timeout = setTimeout(() => {
    resolveRoundTimeout({ io, gameId: game._id }).catch((error) => {
      console.error("라운드 타임아웃 처리 실패:", error)
    })
  }, safeDelay)

  roundTimers.set(timerKey(game._id), timeout)
}

export const restoreRoundTimers = async (io) => {
  const games = await Game.find({
    status: "playing",
    phase: "rounds",
    roundStatus: "collecting",
  })

  games.forEach((game) => scheduleRoundTimeout(io, game))
}

export const resolveRoundTimeout = async ({ io, gameId }) => {
  const game = await Game.findOne({
    _id: gameId,
    status: "playing",
    phase: "rounds",
    roundStatus: "collecting",
  })

  if (!game) return null

  // 아직 종료 시간이 아니면 서버 시간 오차를 고려해 다시 예약합니다.
  if (new Date(game.phaseEndsAt).getTime() > Date.now()) {
    scheduleRoundTimeout(io, game)
    return null
  }

  const existing = await GameStatement.find({
    gameId: game._id,
    round: game.currentRound,
  })
    .select("playerId")
    .lean()

  const resolvedPlayerIds = new Set(existing.map((entry) => id(entry.playerId)))
  const missingPlayers = game.players.filter(
    (player) => !resolvedPlayerIds.has(id(player.playerId))
  )

  if (missingPlayers.length > 0) {
    // 작성 중인 화면 값은 서버가 알 수 없으므로 임의 진술을 만들지 않습니다.
    // statement:null인 timed_out 기록만 생성하고 검사 입력에서는 제외합니다.
    await GameStatement.bulkWrite(
      missingPlayers.map((player) => ({
        updateOne: {
          filter: {
            gameId: game._id,
            round: game.currentRound,
            playerId: player.playerId,
          },
          update: {
            $setOnInsert: {
              userId: player.userId,
              requestId: `server-timeout:${game._id}:${game.currentRound}:${player.playerId}`,
              status: "timed_out",
              source: "server_timeout",
              statement: null,
              submittedAt: new Date(),
            },
          },
          upsert: true,
        },
      })),
      { ordered: false }
    )
  }

  const submissionStatus = await getSubmissionStatus({
    gameId: game._id,
    round: game.currentRound,
    game,
  })

  io.to(`game:${game._id}`).emit(
    "game:submission:updated",
    submissionStatus
  )

  return tryValidateRound({ io, gameId: game._id, round: game.currentRound })
}

export const tryValidateRound = async ({ io, gameId, round }) => {
  // 1) 클라이언트가 보낸 allSubmitted를 믿지 않고 DB에서 다시 계산합니다.
  const submissionStatus = await getSubmissionStatus({ gameId, round })

  if (!submissionStatus.readyToValidate) {
    return { started: false, submissionStatus }
  }

  // 2) 마지막 두 제출 요청이 동시에 도착해도 한 요청만 validating 잠금을 얻습니다.
  const lockedGame = await Game.findOneAndUpdate(
    {
      _id: gameId,
      status: "playing",
      phase: "rounds",
      currentRound: round,
      roundStatus: "collecting",
    },
    { $set: { roundStatus: "validating" } },
    { new: true }
  ).select("+secret +runtime")

  if (!lockedGame) {
    return { started: false, submissionStatus }
  }

  clearRoundTimer(gameId)
  io.to(`game:${gameId}`).emit("game:round:validating", {
    gameId: id(gameId),
    round,
  })

  const statementDocuments = await GameStatement.find({
    gameId,
    round,
    status: "submitted",
  }).lean()

  let validation

  try {
    // TODO(준홍): 실제 판단은 gameEngineAdapter 내부 함수에 연결합니다.
    validation = await validateRoundWithEngine({
      round,
      statements: statementDocuments,
      questions: (lockedGame.questions ?? []).filter(
        (question) => question.round === round
      ),
      runtimeTimeline: lockedGame.runtime?.inGamePlayerTimelineMap,
      runtimeWitnesses: lockedGame.runtime?.inGameWitnessesMap,
    })
  } catch (error) {
    // 엔진 연결 전에는 "모순 없음"으로 통과시키지 않습니다.
    // 잘못된 결과 저장을 막고 해당 라운드를 다시 collecting으로 되돌립니다.
    await Game.updateOne(
      { _id: gameId, currentRound: round, roundStatus: "validating" },
      { $set: { roundStatus: "collecting" } }
    )

    io.to(`game:${gameId}`).emit("game:error", {
      code: error.code ?? "ROUND_VALIDATION_FAILED",
      message: error.message,
    })

    throw error
  }

  const hintEntry = lockedGame.secret?.hintsByRound?.find(
    (hint) => Number(hint.round) === Number(round)
  )
  const revealedHint = hintEntry?.value ?? null
  const now = new Date()

  lockedGame.roundHistory.push({
    round,
    valid: validation.valid,
    conflicts: validation.conflicts ?? [],
    revealedHint,
    completedAt: now,
  })

  if (revealedHint !== null) {
    lockedGame.revealedHints.push({ round, value: revealedHint })
  }

  if (round < lockedGame.totalRounds) {
    const roundDurationMs = Number(
      process.env.GAME_ROUND_DURATION_MS ?? 300_000
    )

    lockedGame.currentRound = round + 1
    lockedGame.roundStatus = "collecting"
    lockedGame.phaseStartedAt = now
    lockedGame.phaseEndsAt = new Date(now.getTime() + roundDurationMs)
  } else {
    const finalDurationMs = Number(
      process.env.GAME_FINAL_DURATION_MS ?? 300_000
    )

    lockedGame.phase = "final_deduction"
    lockedGame.roundStatus = "completed"
    lockedGame.phaseStartedAt = now
    lockedGame.phaseEndsAt = new Date(now.getTime() + finalDurationMs)
  }

  await lockedGame.save()

  const payload = {
    gameId: id(gameId),
    completedRound: round,
    validation: {
      valid: validation.valid,
      conflicts: validation.conflicts ?? [],
    },
    revealedHint,
    next: {
      phase: lockedGame.phase,
      currentRound: lockedGame.currentRound,
      roundStatus: lockedGame.roundStatus,
      phaseStartedAt: lockedGame.phaseStartedAt.toISOString(),
      phaseEndsAt: lockedGame.phaseEndsAt.toISOString(),
      serverNow: new Date().toISOString(),
    },
  }

  io.to(`game:${gameId}`).emit("game:round:completed", payload)

  if (lockedGame.phase === "rounds") {
    scheduleRoundTimeout(io, lockedGame)
  }

  return { started: true, payload }
}
