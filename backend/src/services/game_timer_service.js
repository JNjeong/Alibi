/**
 * game_timer_service.js
 * -----------------------------------------------------------------------------
 * MongoDB의 stageEndsAt을 기준으로 게임 단계를 서버에서 자동 진행합니다.
 * 브라우저가 모두 종료되어도 타이머가 계속되고, 서버 재시작 시 만료된 게임을 복구합니다.
 */

import Game from "../models/Game.js"
import {
  migrateLegacyPlayingGames,
  processExpiredGameStage,
} from "./game_service.js"

const MAX_TIMEOUT_MS = 2_147_000_000
const RETRY_DELAY_MS = 2_000
const MAX_CATCH_UP_STEPS = 64

const emitProgressEvents = (io, result) => {
  ;(result.events || []).forEach(({ type, payload }) => {
    io.to(`game:${payload.gameId}`).emit(type, payload)
  })

  if (result.processed && result.events?.[0]?.payload?.gameId) {
    io.to(`game:${result.events[0].payload.gameId}`).emit(
      "game:state:changed",
      {
        gameId: result.events[0].payload.gameId,
        revision: result.revision,
      }
    )
  }
}

export const createGameTimerManager = (io) => {
  const timers = new Map()

  const clear = (gameId) => {
    const key = String(gameId)
    const timer = timers.get(key)
    if (timer) clearTimeout(timer)
    timers.delete(key)
  }

  const scheduleAt = (gameId, endsAt) => {
    const key = String(gameId)
    clear(key)

    if (!endsAt) return

    const delay = Math.max(0, new Date(endsAt).getTime() - Date.now())
    const timer = setTimeout(
      () => catchUp(key),
      Math.min(delay, MAX_TIMEOUT_MS)
    )
    timer.unref?.()
    timers.set(key, timer)
  }

  const loadAndSchedule = async (gameId) => {
    const game = await Game.findOne({ _id: gameId, status: "playing" })
      .select("stageEndsAt progressionLock")
      .lean()

    if (!game) {
      clear(gameId)
      return
    }

    if (game.progressionLock) {
      scheduleAt(gameId, new Date(Date.now() + RETRY_DELAY_MS))
      return
    }

    scheduleAt(gameId, game.stageEndsAt || new Date(Date.now() + RETRY_DELAY_MS))
  }

  const catchUp = async (gameId) => {
    clear(gameId)

    try {
      for (let step = 0; step < MAX_CATCH_UP_STEPS; step += 1) {
        const game = await Game.findOne({ _id: gameId, status: "playing" })
          .select("stageEndsAt progressionLock")
          .lean()

        if (!game) return

        const dueAt = game.stageEndsAt
          ? new Date(game.stageEndsAt).getTime()
          : Number.POSITIVE_INFINITY

        if (game.progressionLock || dueAt > Date.now()) {
          await loadAndSchedule(gameId)
          return
        }

        const result = await processExpiredGameStage({
          gameId,
          now: new Date(),
        })

        if (!result.processed) {
          scheduleAt(gameId, new Date(Date.now() + RETRY_DELAY_MS))
          return
        }

        emitProgressEvents(io, result)
        if (result.finished) return
      }

      // 비정상적으로 오래된 판도 이벤트 루프를 독점하지 않고 다음 tick에서 이어갑니다.
      scheduleAt(gameId, new Date(Date.now() + 1))
    } catch (error) {
      console.error("[game-timer] 단계 진행 실패:", error)
      scheduleAt(gameId, new Date(Date.now() + RETRY_DELAY_MS))
    }
  }

  const schedule = async (gameId) => {
    try {
      await loadAndSchedule(gameId)
    } catch (error) {
      console.error("[game-timer] 타이머 예약 실패:", error)
      scheduleAt(gameId, new Date(Date.now() + RETRY_DELAY_MS))
    }
  }

  const recover = async () => {
    await migrateLegacyPlayingGames()
    const playingGames = await Game.find({ status: "playing" })
      .select("_id")
      .lean()

    await Promise.all(playingGames.map((game) => catchUp(String(game._id))))
  }

  const stopAll = () => {
    for (const gameId of timers.keys()) clear(gameId)
  }

  return {
    catchUp,
    recover,
    schedule,
    stopAll,
  }
}
