import "dotenv/config"

import mongoose from "mongoose"

import { getGamePlayerLimits } from "../src/config/gameConfig.js"
import Game from "../src/models/Game.js"

const applyChanges = process.argv.includes("--apply")
const { minPlayers, maxPlayers } = getGamePlayerLimits()

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("backend/.env에 MONGO_URI가 필요합니다.")
  }

  await mongoose.connect(process.env.MONGO_URI)

  const playingGames = await Game.find({ status: "playing" })
    .select("_id players roomSnapshot.title startedAt")
    .lean()

  const invalidGames = playingGames.filter((game) => {
    const playerCount = Array.isArray(game.players) ? game.players.length : 0
    return playerCount < minPlayers || playerCount > maxPlayers
  })

  if (invalidGames.length === 0) {
    console.log("정리할 비정상 playing 게임이 없습니다.")
    return
  }

  console.log(`비정상 playing 게임 ${invalidGames.length}개를 찾았습니다.`)
  invalidGames.forEach((game) => {
    console.log(
      `- ${game._id} | ${game.roomSnapshot?.title || "제목 없음"} | ${game.players?.length || 0}명`
    )
  })

  if (!applyChanges) {
    console.log("확인만 했습니다. 실제 중단 처리는 npm run cleanup:games -- --apply 로 실행하세요.")
    return
  }

  const now = new Date()
  const result = await Game.updateMany(
    {
      _id: { $in: invalidGames.map((game) => game._id) },
      status: "playing",
    },
    {
      $set: {
        status: "aborted",
        stage: "finished",
        stageEndsAt: null,
        progressionLock: null,
        finishedAt: now,
      },
      $inc: { revision: 1 },
    }
  )

  console.log(`${result.modifiedCount}개 게임을 aborted 상태로 변경했습니다.`)
}

try {
  await run()
} catch (error) {
  console.error("게임 정리 중 오류:", error.message)
  process.exitCode = 1
} finally {
  await mongoose.disconnect()
}
