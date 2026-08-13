/**
 * 실제 MongoDB + REST + Socket.IO 게임 진행 통합 테스트입니다.
 *
 * 실행 전 테스트 전용 DB를 지정해야 합니다.
 * TEST_MONGO_URI=mongodb://127.0.0.1:27017/alibi_integration npm run test:integration
 * 운영 DB 주소는 사용하지 마세요. 테스트가 해당 DB의 컬렉션을 비웁니다.
 */

import assert from "node:assert/strict"
import http from "node:http"
import test, { after, before } from "node:test"

import jwt from "jsonwebtoken"
import mongoose from "mongoose"
import { io as createSocketClient } from "socket.io-client"

import { setGame } from "../GameSetter.js"
import app from "../src/app.js"
import Game from "../src/models/Game.js"
import GameMap from "../src/models/Map.js"
import Room from "../src/models/Room.js"
import User from "../src/models/User.js"
import { buildGameDocument } from "../src/services/game_service.js"
import { initSocket } from "../src/socket/index.js"

const TEST_MONGO_URI = process.env.TEST_MONGO_URI
const integrationTest = TEST_MONGO_URI ? test : test.skip

let server
let io
let baseUrl

const makeToken = (user) =>
  jwt.sign(
    {
      userId: String(user._id),
      username: user.username,
      nickname: user.nickname,
    },
    process.env.JWT_SECRET
  )

const requestJson = async (path, token, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  })
  const body = await response.json()
  return { response, body }
}

const createFixture = async (suffix) => {
  const users = await User.create(
    Array.from({ length: 9 }, (_, index) => ({
      username: `integration_${suffix}_${index}`,
      nickname: `통합${index + 1}`,
      password: "not-used-in-test",
    }))
  )
  const mapInfo = new GameMap().toObject()
  const generated = setGame(
    users.map((user) => ({
      _id: user._id,
      username: user.username,
      nickname: user.nickname,
    })),
    mapInfo
  )
  const room = await Room.create({
    title: "통합 테스트 방",
    inviteCode: `IT${suffix}`.slice(0, 12),
    host: users[0]._id,
    participants: users.map((user) => user._id),
    maxPlayers: 9,
    status: "playing",
  })
  const game = await Game.create(
    buildGameDocument({ room, mapInfo, users, generated })
  )
  room.currentGameId = game._id
  await room.save()
  return { users, room, game }
}

before(async () => {
  if (!TEST_MONGO_URI) return

  process.env.JWT_SECRET = "integration-test-secret"
  process.env.CLIENT_ORIGINS = "http://127.0.0.1"
  process.env.GAME_STATEMENT_SECONDS = "1"
  process.env.GAME_DISCUSSION_SECONDS = "1"
  process.env.GAME_QUESTION_SECONDS = "1"
  process.env.GAME_ANSWER_SECONDS = "1"
  process.env.GAME_HINT_SECONDS = "1"
  process.env.GAME_DEDUCTION_SECONDS = "2"

  await mongoose.connect(TEST_MONGO_URI)
  await mongoose.connection.dropDatabase()

  server = http.createServer(app)
  io = initSocket(server, app)
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  if (!TEST_MONGO_URI) return

  app.get("gameTimer")?.stopAll()
  await new Promise((resolve) => io.close(resolve))
  if (server.listening) {
    await new Promise((resolve) => server.close(resolve))
  }
  await mongoose.connection.dropDatabase()
  await mongoose.disconnect()
})


integrationTest("마지막 공식 진술 제출 즉시 GameSetter 검사를 실행하고 discussion으로 전환한다", async () => {
  const { users, game } = await createFixture(`S${Date.now()}`)
  const slot = game.rulesSnapshot.timeSlots[0]
  const future = new Date(Date.now() + 60_000)

  await Game.updateOne(
    { _id: game._id },
    {
      $set: {
        stage: "statement",
        phase: "active",
        stageStartedAt: new Date(),
        stageEndsAt: future,
        roundEndsAt: future,
      },
    }
  )

  let lastResult = null
  for (let index = 0; index < users.length; index += 1) {
    const place = game.mapSnapshot.places[index % game.mapSnapshot.places.length]
    lastResult = await requestJson(
      `/api/games/${game._id}/statements`,
      makeToken(users[index]),
      {
        method: "POST",
        body: JSON.stringify({
          round: 1,
          statementType: "ALIBI",
          time: slot.time,
          section: slot.section,
          placeId: place.id,
          companionPlayerIds: [],
          action: place.actions?.[0] || "주변 둘러보기",
          clientRequestId: `integration-statement-${index}`,
        }),
      }
    )
    assert.equal(lastResult.response.status, 201)
  }

  assert.ok(lastResult.body.events.some((event) => event.type === "game:statements:checked"))
  assert.ok(lastResult.body.events.some((event) => event.type === "game:stage:changed"))

  const saved = await Game.findById(game._id).lean()
  assert.equal(saved.stage, "discussion")
  const statements = saved.officialRecords.filter((record) => record.recordType === "statement")
  assert.equal(statements.length, users.length)
  assert.ok(statements.every((record) => ["verified", "contradiction"].includes(record.validationStatus)))
  assert.equal(
    statements.some((record) => record.submissionSource === "system_timeout"),
    false
  )
})

integrationTest("전원이 라운드 질문 1개를 제출하면 answer 단계로 즉시 전환한다", async () => {
  const { users, game } = await createFixture(`Q${Date.now()}`)
  const slot = game.rulesSnapshot.timeSlots[0]
  const place = game.mapSnapshot.places[0]
  const future = new Date(Date.now() + 60_000)

  await Game.updateOne(
    { _id: game._id },
    {
      $set: {
        stage: "question",
        phase: "active",
        stageStartedAt: new Date(),
        stageEndsAt: future,
        roundEndsAt: future,
      },
    }
  )

  let lastResult = null
  for (let index = 0; index < users.length; index += 1) {
    const target = users[(index + 1) % users.length]
    lastResult = await requestJson(
      `/api/games/${game._id}/questions`,
      makeToken(users[index]),
      {
        method: "POST",
        body: JSON.stringify({
          round: 1,
          questionType: "PRESENCE",
          targetPlayerId: String(target._id),
          time: slot.time,
          section: slot.section,
          placeId: place.id,
          clientRequestId: `integration-round-question-${index}`,
        }),
      }
    )
    assert.equal(lastResult.response.status, 201)
  }

  assert.ok(
    lastResult.body.events.some(
      (event) =>
        event.type === "game:stage:changed" &&
        event.payload.stage === "answer"
    )
  )

  const saved = await Game.findById(game._id).lean()
  assert.equal(saved.stage, "answer")
  assert.equal(saved.officialRecords.filter((record) => record.recordType === "question").length, users.length)
})

integrationTest("REST 질문→답변이 실제 MongoDB 배열에 원자 저장된다", async () => {
  const { users, game } = await createFixture(`A${Date.now()}`)
  const slot = game.rulesSnapshot.timeSlots[0]
  const place = game.mapSnapshot.places[0]
  const future = new Date(Date.now() + 30_000)

  await Game.updateOne(
    { _id: game._id },
    {
      $set: {
        stage: "question",
        phase: "active",
        stageStartedAt: new Date(),
        stageEndsAt: future,
        roundEndsAt: future,
      },
    }
  )

  const questionResult = await requestJson(
    `/api/games/${game._id}/questions`,
    makeToken(users[0]),
    {
      method: "POST",
      body: JSON.stringify({
        round: 1,
        questionType: "PRESENCE",
        targetPlayerId: String(users[1]._id),
        time: slot.time,
        section: slot.section,
        placeId: place.id,
        clientRequestId: "integration-question-1",
      }),
    }
  )
  assert.equal(questionResult.response.status, 201)
  const questionId = questionResult.body.record._id

  await Game.updateOne(
    { _id: game._id },
    { $set: { stage: "answer", stageEndsAt: future, roundEndsAt: future } }
  )

  const answerResult = await requestJson(
    `/api/games/${game._id}/questions/${questionId}/answer`,
    makeToken(users[1]),
    {
      method: "POST",
      body: JSON.stringify({
        answer: true,
        clientRequestId: "integration-answer-1",
      }),
    }
  )
  assert.equal(answerResult.response.status, 201)

  const saved = await Game.findById(game._id).lean()
  const savedQuestion = saved.officialRecords.find(
    (record) => String(record._id) === String(questionId)
  )
  const savedAnswers = saved.officialRecords.filter(
    (record) =>
      record.recordType === "answer" &&
      String(record.questionId) === String(questionId)
  )
  assert.equal(savedQuestion.status, "answered")
  assert.equal(savedAnswers.length, 1)
  assert.equal(savedAnswers[0].answer, true)
  assert.equal(savedAnswers[0].status, "submitted")
  assert.equal(savedAnswers[0].validationStatus, "verified")
  assert.equal(saved.stage, "hint")
  assert.equal(saved.roundChecks.length, 1)

  const stateResult = await requestJson(
    `/api/games/${game._id}`,
    makeToken(users[0])
  )
  assert.equal(stateResult.response.status, 200)
  assert.ok(stateResult.body.game.serverNow)

  const duplicate = await requestJson(
    `/api/games/${game._id}/questions/${questionId}/answer`,
    makeToken(users[1]),
    {
      method: "POST",
      body: JSON.stringify({
        answer: false,
        clientRequestId: "integration-answer-duplicate",
      }),
    }
  )
  assert.equal(duplicate.response.status, 409)
  assert.equal(duplicate.body.code, "QUESTION_ALREADY_ANSWERED")
})

integrationTest("단계별 제출 제한과 질문 대상 집중 제한을 적용한다", async () => {
  const { users, game } = await createFixture(`B${Date.now()}`)
  const slot = game.rulesSnapshot.timeSlots[0]
  const place = game.mapSnapshot.places[0]
  const future = new Date(Date.now() + 30_000)

  await Game.updateOne(
    { _id: game._id },
    { $set: { stage: "answer", stageEndsAt: future, roundEndsAt: future } }
  )
  const wrongStage = await requestJson(
    `/api/games/${game._id}/statements`,
    makeToken(users[0]),
    {
      method: "POST",
      body: JSON.stringify({
        round: 1,
        statementType: "ALIBI",
        time: slot.time,
        section: slot.section,
        placeId: place.id,
        companionPlayerIds: [],
        clientRequestId: "wrong-stage-statement",
      }),
    }
  )
  assert.equal(wrongStage.response.status, 409)
  assert.equal(wrongStage.body.code, "INVALID_GAME_STAGE")

  await Game.updateOne(
    { _id: game._id },
    { $set: { stage: "question", stageEndsAt: future, roundEndsAt: future } }
  )

  for (let index = 0; index < 2; index += 1) {
    const accepted = await requestJson(
      `/api/games/${game._id}/questions`,
      makeToken(users[index]),
      {
        method: "POST",
        body: JSON.stringify({
          round: 1,
          questionType: "PRESENCE",
          targetPlayerId: String(users[8]._id),
          time: slot.time,
          section: slot.section,
          placeId: place.id,
          clientRequestId: `target-limit-${index}`,
        }),
      }
    )
    assert.equal(accepted.response.status, 201)
  }

  const rejected = await requestJson(
    `/api/games/${game._id}/questions`,
    makeToken(users[2]),
    {
      method: "POST",
      body: JSON.stringify({
        round: 1,
        questionType: "PRESENCE",
        targetPlayerId: String(users[8]._id),
        time: slot.time,
        section: slot.section,
        placeId: place.id,
        clientRequestId: "target-limit-third",
      }),
    }
  )
  assert.equal(rejected.response.status, 409)
  assert.equal(rejected.body.code, "QUESTION_TARGET_LIMIT_REACHED")
})


integrationTest("답변 타이머 만료는 pending 질문만 timed_out으로 닫고 fake answer 없이 힌트로 진행한다", async () => {
  const { users, game } = await createFixture(`T${Date.now()}`)
  const slot = game.rulesSnapshot.timeSlots[0]
  const place = game.mapSnapshot.places[0]
  const future = new Date(Date.now() + 30_000)

  await Game.updateOne(
    { _id: game._id },
    {
      $set: {
        stage: "question",
        phase: "active",
        stageStartedAt: new Date(),
        stageEndsAt: future,
        roundEndsAt: future,
      },
    }
  )

  const questionResult = await requestJson(
    `/api/games/${game._id}/questions`,
    makeToken(users[0]),
    {
      method: "POST",
      body: JSON.stringify({
        round: 1,
        questionType: "PRESENCE",
        targetPlayerId: String(users[1]._id),
        time: slot.time,
        section: slot.section,
        placeId: place.id,
        clientRequestId: "integration-timeout-question",
      }),
    }
  )
  assert.equal(questionResult.response.status, 201)
  const questionId = questionResult.body.record._id

  const expiredAt = new Date(Date.now() - 50)
  await Game.updateOne(
    { _id: game._id },
    {
      $set: {
        stage: "answer",
        stageStartedAt: new Date(expiredAt.getTime() - 1_000),
        stageEndsAt: expiredAt,
        roundEndsAt: expiredAt,
        progressionLock: null,
      },
    }
  )

  await app.get("gameTimer").catchUp(String(game._id))
  const saved = await Game.findById(game._id).lean()
  const question = saved.officialRecords.find(
    (record) => String(record._id) === String(questionId)
  )

  assert.equal(question.status, "timed_out")
  assert.equal(saved.stage, "hint")
  assert.equal(
    saved.officialRecords.filter(
      (record) => record.recordType === "answer" && String(record.questionId) === String(questionId)
    ).length,
    0
  )
  assert.equal(saved.roundChecks.length, 1)
})

integrationTest("서버 재시작 복구가 이미 만료된 단계를 DB 기준으로 진행한다", async () => {
  const { game } = await createFixture(`R${Date.now()}`)
  const expiredAt = new Date(Date.now() - 100)
  await Game.updateOne(
    { _id: game._id },
    {
      $set: {
        stage: "discussion",
        phase: "active",
        stageStartedAt: new Date(expiredAt.getTime() - 1_000),
        stageEndsAt: expiredAt,
        roundEndsAt: expiredAt,
        progressionLock: null,
      },
    }
  )

  await app.get("gameTimer").recover()
  const recovered = await Game.findById(game._id).lean()
  assert.equal(recovered.currentRound, 1)
  assert.equal(recovered.stage, "question")
  assert.ok(new Date(recovered.stageEndsAt).getTime() > expiredAt.getTime())
})

integrationTest(
  "Socket 서버 타이머가 빈 질문 라운드에서 답변 단계를 건너뛰고 힌트→다음 라운드를 진행한다",
  { timeout: 15_000 },
  async () => {
    const { users, game } = await createFixture(`C${Date.now()}`)
    const receivedStages = []
    const receivedHints = []
    const receivedRounds = []
    const expiredStages = []
    const client = createSocketClient(baseUrl, {
      transports: ["websocket"],
      auth: { token: makeToken(users[0]) },
    })

    client.on("game:stage:changed", (payload) => receivedStages.push(payload.stage))
    client.on("game:hint:revealed", (payload) => receivedHints.push(payload))
    client.on("game:round:changed", (payload) => receivedRounds.push(payload.currentRound))
    client.on("game:timer:expired", (payload) => expiredStages.push(payload.stage))

    await new Promise((resolve, reject) => {
      client.on("connect_error", reject)
      client.on("connect", () => {
        client.emit("game:join", { gameId: String(game._id) }, (ack) => {
          if (ack?.ok) resolve()
          else reject(new Error(ack?.error?.message || "game join failed"))
        })
      })
    })

    await app.get("gameTimer").schedule(String(game._id))

    const deadline = Date.now() + 9_000
    while (Date.now() < deadline && !receivedRounds.includes(2)) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    client.disconnect()
    assert.ok(receivedStages.includes("discussion"))
    assert.ok(expiredStages.includes("statement"))
    assert.ok(receivedStages.includes("question"))
    assert.equal(receivedStages.includes("answer"), false)
    assert.equal(receivedStages.includes("checking"), false)
    assert.ok(receivedStages.includes("hint"))
    assert.equal(receivedHints.length, 1)
    assert.ok(receivedRounds.includes(2))

    const saved = await Game.findById(game._id).lean()
    assert.equal(saved.currentRound, 2)
    assert.equal(saved.stage, "statement")
    // 진술 시간 초과가 실제 비밀 타임라인을 대신 공개하는 fake statement를 만들면 안 됩니다.
    assert.equal(
      saved.officialRecords.filter(
        (record) =>
          record.round === 1 &&
          record.recordType === "statement" &&
          record.submissionSource === "system_timeout"
      ).length,
      0
    )
    // 질문이 없었으므로 fake TIMEOUT answer도 없어야 합니다.
    assert.equal(
      saved.officialRecords.filter(
        (record) => record.round === 1 && record.recordType === "answer"
      ).length,
      0
    )
    assert.equal(saved.roundChecks.length, 1)
    assert.ok(saved.hints[0].revealedAt)
  }
)
