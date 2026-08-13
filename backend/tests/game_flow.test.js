/**
 * game_flow.test.js - ALIBI v6 핵심 회귀 테스트
 * -----------------------------------------------------------------------------
 * 1. GameSetter 사건 생성 hard 규칙
 * 2. GameSetter 자체 NO/null/witness 검사 버그 회귀
 * 3. officialRecords -> GameSetter replay 및 record ID conflict 연결
 * 4. 최종 추리 승패 경계
 */

import assert from "node:assert/strict"
import test from "node:test"
import mongoose from "mongoose"

import {
  checkWitnessMapValidation,
  inGameCheckValidation,
  setGame,
} from "../GameSetter.js"
import GameMap from "../src/models/Map.js"
import Game from "../src/models/Game.js"
import {
  buildGameDocument,
  evaluateFinalDeductions,
  makePublicGameError,
  projectOfficialRecordsForValidation,
  runRoundContradictionCheck,
} from "../src/services/game_service.js"

const makeUsers = (count) =>
  Array.from({ length: count }, (_, index) => ({
    _id: new mongoose.Types.ObjectId(),
    username: `demo${index + 1}`,
    nickname: `플레이어${index + 1}`,
  }))

const slotEntries = (timeline) =>
  Object.entries(timeline.alibi).flatMap(([time, sections]) =>
    Object.entries(sections).map(([section, alibi]) => ({
      time: Number(time),
      section,
      alibi,
    }))
  )

const validateGeneratedGame = (generated, playerCount) => {
  assert.ok(generated.itemsInUse.length > 0)
  assert.ok(generated.itemsInUse.length <= 8)
  assert.equal(generated.preparedPlayerTimelineMap.length, playerCount)
  assert.ok(generated.crimeInfo.crimeTime >= 13 && generated.crimeInfo.crimeTime <= 22)
  assert.ok(["section02", "section24", "section46"].includes(generated.crimeInfo.timeSection))

  // v6 확정: round3 힌트는 랜덤 특징이 아니라 실제 범행도구 특징입니다.
  assert.ok(
    Object.hasOwn(
      generated.hintsPerRound.round3,
      generated.crimeInfo.crimeItem.item_feature
    )
  )
  assert.equal(generated.hintsPerRound.round5.length, 5)
  assert.equal(generated.hintsPerRound.round2.length, 3)
  assert.equal(new Set(generated.hintsPerRound.round2).size, 3)
  assert.equal(generated.hintsPerRound.round1.length, 6)
  assert.equal(generated.hintsPerRound.round4.length, 3)
  const round1PlaceIds = new Set(
    generated.hintsPerRound.round1.map((place) => place.place_id)
  )
  assert.ok(
    generated.hintsPerRound.round4.every((place) =>
      round1PlaceIds.has(place.place_id)
    )
  )
  assert.ok(
    generated.hintsPerRound.round5.some(
      (slot) =>
        Number(slot.time) === Number(generated.crimeInfo.crimeTime) &&
        slot.section === generated.crimeInfo.timeSection
    )
  )

  const culprit = generated.playersRoles.find(
    (entry) => entry.role.role_id === generated.crimeInfo.crimeRole.role_id
  )
  const culpritId = String(culprit.player._id)
  const adverseInnocents = new Set()
  const occupancy = new Map()
  const itemOwners = new Map()
  const timelineHours = Object.keys(generated.preparedPlayerTimelineMap[0].alibi)
    .map(Number)
    .sort((a, b) => a - b)

  assert.equal(timelineHours.length, 6)
  assert.ok(timelineHours.every((hour, index) => index === 0 || hour === timelineHours[index - 1] + 1))
  assert.ok(timelineHours.includes(generated.crimeInfo.crimeTime))
  assert.deepEqual(
    Object.keys(generated.inGamePlayerTimelineMap[0].alibi).map(Number).sort((a, b) => a - b),
    timelineHours
  )

  generated.preparedPlayerTimelineMap.forEach((timeline) => {
    const slots = slotEntries(timeline)
    assert.equal(slots.length, 18)

    slots.forEach(({ time, section, alibi }) => {
      const placeKey = `${time}:${section}:${alibi.place.place_id}`
      occupancy.set(placeKey, (occupancy.get(placeKey) || 0) + 1)

      if (alibi.item) {
        const itemKey = `${time}:${section}:${alibi.item.item_id}`
        itemOwners.set(itemKey, (itemOwners.get(itemKey) || 0) + 1)
      }

      if (
        String(timeline.player._id) !== culpritId &&
        time === generated.crimeInfo.crimeTime &&
        (
          alibi.place.place_id === generated.crimeInfo.crimePlace.place_id ||
          alibi.item?.item_id === generated.crimeInfo.crimeItem.item_id ||
          alibi.item?.item_feature === generated.crimeInfo.crimeItem.item_feature
        )
      ) {
        adverseInnocents.add(String(timeline.player._id))
      }
    })
  })

  assert.ok([...occupancy.values()].every((count) => count <= 2))
  assert.ok([...itemOwners.values()].every((count) => count <= 1))
  assert.equal(adverseInnocents.size, playerCount - 1)
  assert.equal(checkWitnessMapValidation(generated.witnessesMap).valid, true)

  const crimePlaceKey = [
    generated.crimeInfo.crimeTime,
    generated.crimeInfo.timeSection,
    generated.crimeInfo.crimePlace.place_id,
  ].join(":")
  assert.equal(occupancy.get(crimePlaceKey), 1)
}

test("9인과 10인 사건을 반복 생성해 GameSetter hard 규칙을 지킨다", () => {
  const mapInfo = new GameMap().toObject()
  for (const playerCount of [9, 10]) {
    for (let run = 0; run < 40; run += 1) {
      validateGeneratedGame(setGame(makeUsers(playerCount), mapInfo), playerCount)
    }
  }
})

test("GameSetter 결과가 v6 Game MongoDB 스키마를 통과한다", async () => {
  const users = makeUsers(10)
  const mapInfo = new GameMap().toObject()
  const generated = setGame(users, mapInfo)
  const room = {
    _id: new mongoose.Types.ObjectId(),
    title: "통합 테스트 방",
    inviteCode: "ALB-TEST",
  }
  const document = buildGameDocument({ room, mapInfo, users, generated })
  await new Game(document).validate()
  assert.equal(document.rulesSnapshot.slotCount, 18)
  assert.ok(document.mapSnapshot.itemsInUse.length <= 8)
})

const basePublicTimeline = () => [
  {
    player: { _id: "p1" },
    alibi: {
      18: {
        section02: {
          place: { place_id: "study" },
          item: { item_id: "knife" },
          action: "",
          __sourceRecordIds: ["s1", "i1"],
          __placeSourceRecordIds: ["s1"],
          __itemSourceRecordIds: ["i1"],
        },
      },
    },
  },
  { player: { _id: "p2" }, alibi: { 18: { section02: null } } },
]

const baseWitnessMap = () => [
  { player: "p1", witnesses: [] },
  { player: "p2", witnesses: [] },
]

test("GameSetter NO 장소/도구 조건은 같은 공개 주장일 때 모순이며 null Q&A도 안전하다", () => {
  const timeline = basePublicTimeline()
  const witnesses = baseWitnessMap()
  const placeNo = {
    player_from: "p2",
    player_to: "p1",
    time: "18",
    section: "section02",
    alibi: { place: { place_id: "study" }, item: null },
    answer: false,
    __sourceRecordIds: ["a-place"],
  }
  const itemNo = {
    player_from: "p2",
    player_to: "p1",
    time: 18,
    section: "section02",
    alibi: { place: null, item: { item_id: "knife" } },
    answer: false,
    __sourceRecordIds: ["a-item"],
  }

  const placeResult = inGameCheckValidation(
    timeline,
    witnesses,
    { player: { _id: "p1" } },
    18,
    "section02",
    [placeNo],
    null,
    placeNo
  )
  assert.equal(placeResult.qandaCheck.length, 1)
  assert.deepEqual(placeResult.qandaCheck[0].__sourceRecordIds, ["s1"])

  const itemResult = inGameCheckValidation(
    timeline,
    witnesses,
    { player: { _id: "p1" } },
    18,
    "section02",
    [itemNo],
    null,
    itemNo
  )
  assert.equal(itemResult.qandaCheck.length, 1)
  assert.deepEqual(itemResult.qandaCheck[0].__sourceRecordIds, ["i1"])

  assert.doesNotThrow(() =>
    inGameCheckValidation(timeline, witnesses, { player: { _id: "p1" } }, 18, "section02", [], null, null)
  )
})

const makeRecord = (overrides) => ({
  id: overrides.id,
  _id: overrides.id,
  recordType: "statement",
  round: 1,
  authorId: "p1",
  targetId: null,
  subjectPlayerId: null,
  questionId: null,
  statementType: "ALIBI",
  questionType: null,
  time: 18,
  section: "section02",
  placeId: "study",
  companionPlayerIds: [],
  itemId: null,
  action: "",
  answer: null,
  status: "submitted",
  validationStatus: "unchecked",
  conflicts: [],
  createdAt: new Date("2026-08-07T00:00:00Z"),
  ...overrides,
})

const makeValidationGame = (officialRecords, currentRound = 1) => ({
  currentRound,
  players: ["p1", "p2", "p3", "p4"].map((userId) => ({
    userId,
    username: userId,
    nickname: userId,
  })),
  rulesSnapshot: {
    timeSlots: [
      { id: "t1800", time: 18, section: "section02", label: "18:00" },
      { id: "t1820", time: 18, section: "section24", label: "18:20" },
    ],
  },
  mapSnapshot: {
    places: [
      { id: "study", name: "서재", actions: [] },
      { id: "kitchen", name: "주방", actions: [] },
      { id: "hall", name: "응접실", actions: [] },
    ],
    itemsInUse: [
      { id: "knife", name: "칼", feature: "sharp" },
      { id: "rope", name: "밧줄", feature: "asphyxia" },
    ],
  },
  officialRecords,
})

const resultFor = (result, id) => result.records.find((entry) => entry.recordId === id)

test("replay는 같은 장소 3명과 동일 도구 2명의 conflict를 record ID에 대칭 연결한다", async () => {
  const records = [
    makeRecord({ id: "s1", authorId: "p1", placeId: "study" }),
    makeRecord({ id: "s2", authorId: "p2", placeId: "study", createdAt: new Date("2026-08-07T00:00:01Z") }),
    makeRecord({ id: "s3", authorId: "p3", placeId: "study", createdAt: new Date("2026-08-07T00:00:02Z") }),
    makeRecord({ id: "i1", authorId: "p1", statementType: "ITEM_POSSESSION", placeId: null, itemId: "knife", createdAt: new Date("2026-08-07T00:00:03Z") }),
    makeRecord({ id: "i2", authorId: "p2", statementType: "ITEM_POSSESSION", placeId: null, itemId: "knife", createdAt: new Date("2026-08-07T00:00:04Z") }),
  ]

  const result = await runRoundContradictionCheck({ game: makeValidationGame(records), mode: "statement" })
  assert.equal(result.valid, false)
  assert.equal(result.summary.contradictions, 2)
  assert.equal(resultFor(result, "s1").validationStatus, "contradiction")
  assert.equal(resultFor(result, "s3").validationStatus, "contradiction")
  assert.equal(resultFor(result, "i1").validationStatus, "contradiction")
  assert.equal(resultFor(result, "i2").validationStatus, "contradiction")
})

test("같은 사용자의 이전 라운드 다른 장소 진술도 누적 replay에서 모순이다", async () => {
  const records = [
    makeRecord({ id: "r1", round: 1, authorId: "p1", placeId: "study" }),
    makeRecord({ id: "r2", round: 2, authorId: "p1", placeId: "kitchen", createdAt: new Date("2026-08-07T00:01:00Z") }),
  ]
  const result = await runRoundContradictionCheck({ game: makeValidationGame(records, 2), mode: "statement" })
  assert.equal(result.summary.contradictions, 1)
  assert.equal(resultFor(result, "r1").validationStatus, "contradiction")
  assert.equal(resultFor(result, "r2").validationStatus, "contradiction")
})

test("동행은 A→B와 B→A이면 정상, B가 같은 슬롯 진술 후 동행을 말하지 않으면 모순이다", async () => {
  const reciprocal = [
    makeRecord({ id: "a", authorId: "p1", placeId: "study", companionPlayerIds: ["p2"] }),
    makeRecord({ id: "b", authorId: "p2", placeId: "study", companionPlayerIds: ["p1"], createdAt: new Date("2026-08-07T00:00:01Z") }),
  ]
  const clean = await runRoundContradictionCheck({ game: makeValidationGame(reciprocal), mode: "statement" })
  assert.equal(clean.valid, true)

  const oneSided = [
    makeRecord({ id: "a", authorId: "p1", placeId: "study", companionPlayerIds: ["p2"] }),
    makeRecord({ id: "b", authorId: "p2", placeId: "study", companionPlayerIds: [], createdAt: new Date("2026-08-07T00:00:01Z") }),
  ]
  const conflict = await runRoundContradictionCheck({ game: makeValidationGame(oneSided), mode: "statement" })
  assert.equal(conflict.summary.contradictions, 1)
  assert.equal(resultFor(conflict, "a").validationStatus, "contradiction")
  assert.equal(resultFor(conflict, "b").validationStatus, "contradiction")

  // 상대가 그 슬롯에 아무 공식 진술도 하지 않았다면 "혼자"라고 단정하지 않습니다.
  const noOtherStatement = [
    makeRecord({ id: "a", authorId: "p1", placeId: "study", companionPlayerIds: ["p2"] }),
  ]
  const undecidable = await runRoundContradictionCheck({ game: makeValidationGame(noOtherStatement), mode: "statement" })
  assert.equal(undecidable.valid, true)
})

const makeQuestionAnswer = ({
  questionId,
  answerId,
  type,
  asker = "p3",
  target = "p1",
  subject = null,
  placeId = null,
  itemId = null,
  answer,
  round = 1,
  second = 10,
}) => [
  makeRecord({
    id: questionId,
    recordType: "question",
    round,
    authorId: asker,
    targetId: target,
    subjectPlayerId: subject,
    statementType: null,
    questionType: type,
    placeId,
    itemId,
    status: "answered",
    validationStatus: null,
    createdAt: new Date(`2026-08-07T00:00:${String(second).padStart(2, "0")}Z`),
  }),
  makeRecord({
    id: answerId,
    recordType: "answer",
    round,
    authorId: target,
    targetId: asker,
    subjectPlayerId: subject,
    questionId,
    statementType: null,
    questionType: type,
    placeId: type === "WITNESS" ? null : placeId,
    itemId,
    answer,
    status: "submitted",
    validationStatus: "unchecked",
    createdAt: new Date(`2026-08-07T00:00:${String(second + 1).padStart(2, "0")}Z`),
  }),
]

test("PRESENCE/ITEM/WITNESS Q&A는 GameSetter 형식으로 변환되고 질문 자체에는 contradiction을 붙이지 않는다", async () => {
  const records = [
    makeRecord({ id: "s-place", authorId: "p1", placeId: "study" }),
    makeRecord({ id: "s-item", authorId: "p1", statementType: "ITEM_POSSESSION", placeId: null, itemId: "knife", createdAt: new Date("2026-08-07T00:00:02Z") }),
    makeRecord({ id: "s-wit", authorId: "p2", placeId: "study", companionPlayerIds: ["p1"], createdAt: new Date("2026-08-07T00:00:03Z") }),
    ...makeQuestionAnswer({ questionId: "qp", answerId: "ap", type: "PRESENCE", placeId: "study", answer: false, second: 10 }),
    ...makeQuestionAnswer({ questionId: "qi", answerId: "ai", type: "ITEM_POSSESSION", itemId: "knife", answer: false, second: 20 }),
    ...makeQuestionAnswer({ questionId: "qw", answerId: "aw", type: "WITNESS", target: "p1", subject: "p2", answer: false, second: 30 }),
  ]
  const result = await runRoundContradictionCheck({ game: makeValidationGame(records), mode: "qanda" })

  assert.equal(resultFor(result, "ap").validationStatus, "contradiction")
  assert.equal(resultFor(result, "ai").validationStatus, "contradiction")
  assert.equal(resultFor(result, "aw").validationStatus, "contradiction")
  assert.equal(result.records.some((entry) => entry.recordId === "qp"), false)
  assert.equal(result.records.some((entry) => entry.recordId === "qi"), false)
  assert.equal(result.records.some((entry) => entry.recordId === "qw"), false)
})

test("PRESENCE YES Q&A만으로 같은 장소 3명이 되면 장소 최대 2명 규칙에 걸린다", async () => {
  const records = [
    ...makeQuestionAnswer({ questionId: "q1", answerId: "a1", type: "PRESENCE", target: "p1", placeId: "study", answer: true, second: 10 }),
    ...makeQuestionAnswer({ questionId: "q2", answerId: "a2", type: "PRESENCE", target: "p2", placeId: "study", answer: true, second: 20 }),
    ...makeQuestionAnswer({ questionId: "q3", answerId: "a3", type: "PRESENCE", target: "p3", placeId: "study", answer: true, second: 30 }),
  ]

  const result = await runRoundContradictionCheck({
    game: makeValidationGame(records),
    mode: "qanda",
  })

  assert.equal(result.valid, false)
  assert.equal(resultFor(result, "a1").validationStatus, "contradiction")
  assert.equal(resultFor(result, "a2").validationStatus, "contradiction")
  assert.equal(resultFor(result, "a3").validationStatus, "contradiction")
})

test("WITNESS YES와 기존 두 사람의 비동행 공개 진술은 모순이고 WITNESS NO는 같은 장소만으로 모순이 아니다", async () => {
  const base = [
    makeRecord({ id: "s1", authorId: "p1", placeId: "study", companionPlayerIds: [] }),
    makeRecord({ id: "s2", authorId: "p2", placeId: "study", companionPlayerIds: [], createdAt: new Date("2026-08-07T00:00:01Z") }),
  ]
  const yesResult = await runRoundContradictionCheck({
    game: makeValidationGame([
      ...base,
      ...makeQuestionAnswer({ questionId: "qy", answerId: "ay", type: "WITNESS", target: "p1", subject: "p2", answer: true, second: 10 }),
    ]),
    mode: "qanda",
  })
  assert.equal(resultFor(yesResult, "ay").validationStatus, "contradiction")

  const noResult = await runRoundContradictionCheck({
    game: makeValidationGame([
      ...base,
      ...makeQuestionAnswer({ questionId: "qn", answerId: "an", type: "WITNESS", target: "p1", subject: "p2", answer: false, second: 10 }),
    ]),
    mode: "qanda",
  })
  assert.equal(resultFor(noResult, "an").validationStatus, "verified")
})


test("동일 사용자의 같은 장소/도구 반복 주장은 인원·소유자 수를 중복 계산하지 않는다", async () => {
  const records = [
    makeRecord({ id: "p1-r1", round: 1, authorId: "p1", placeId: "study" }),
    makeRecord({ id: "p1-r2", round: 2, authorId: "p1", placeId: "study", createdAt: new Date("2026-08-07T00:01:00Z") }),
    makeRecord({ id: "p2-r2", round: 2, authorId: "p2", placeId: "study", createdAt: new Date("2026-08-07T00:01:01Z") }),
    makeRecord({ id: "i1-r1", round: 1, authorId: "p1", statementType: "ITEM_POSSESSION", placeId: null, itemId: "knife", createdAt: new Date("2026-08-07T00:02:00Z") }),
    makeRecord({ id: "i1-r2", round: 2, authorId: "p1", statementType: "ITEM_POSSESSION", placeId: null, itemId: "knife", createdAt: new Date("2026-08-07T00:02:01Z") }),
  ]

  const result = await runRoundContradictionCheck({
    game: makeValidationGame(records, 2),
    mode: "statement",
  })

  assert.equal(result.valid, true)
  assert.equal(result.summary.contradictions, 0)
})

test("이전 라운드 Q&A와 현재 라운드 공식 진술도 누적 replay에서 비교한다", async () => {
  const records = [
    ...makeQuestionAnswer({
      questionId: "q-r1",
      answerId: "a-r1",
      type: "PRESENCE",
      target: "p1",
      placeId: "study",
      answer: false,
      round: 1,
      second: 10,
    }),
    makeRecord({
      id: "s-r2",
      round: 2,
      authorId: "p1",
      placeId: "study",
      createdAt: new Date("2026-08-07T00:02:00Z"),
    }),
  ]

  const result = await runRoundContradictionCheck({
    game: makeValidationGame(records, 2),
    mode: "statement",
  })

  assert.equal(result.valid, false)
  assert.equal(resultFor(result, "a-r1").validationStatus, "contradiction")
  assert.equal(resultFor(result, "s-r2").validationStatus, "contradiction")
})

test("PRESENCE/ITEM/WITNESS의 이전 YES와 이후 NO Q&A가 서로 모순으로 연결된다", async () => {
  const records = [
    ...makeQuestionAnswer({ questionId: "qp-y", answerId: "ap-y", type: "PRESENCE", target: "p1", placeId: "study", answer: true, round: 1, second: 10 }),
    ...makeQuestionAnswer({ questionId: "qp-n", answerId: "ap-n", type: "PRESENCE", target: "p1", placeId: "study", answer: false, round: 2, second: 20 }),
    ...makeQuestionAnswer({ questionId: "qi-y", answerId: "ai-y", type: "ITEM_POSSESSION", target: "p1", itemId: "knife", answer: true, round: 1, second: 30 }),
    ...makeQuestionAnswer({ questionId: "qi-n", answerId: "ai-n", type: "ITEM_POSSESSION", target: "p1", itemId: "knife", answer: false, round: 2, second: 40 }),
    ...makeQuestionAnswer({ questionId: "qw-y", answerId: "aw-y", type: "WITNESS", target: "p1", subject: "p2", answer: true, round: 1, second: 50 }),
    ...makeQuestionAnswer({ questionId: "qw-n", answerId: "aw-n", type: "WITNESS", target: "p1", subject: "p2", answer: false, round: 2, second: 55 }),
  ]

  const result = await runRoundContradictionCheck({
    game: makeValidationGame(records, 2),
    mode: "qanda",
  })

  for (const id of ["ap-y", "ap-n", "ai-y", "ai-n", "aw-y", "aw-n"]) {
    assert.equal(resultFor(result, id).validationStatus, "contradiction")
  }
  assert.equal(result.records.some((entry) => entry.recordId.startsWith("q")), false)
})

test("officialRecords 입력 배열 순서가 달라도 stable replay 결과는 동일하다", async () => {
  const records = [
    makeRecord({ id: "stable-1", authorId: "p1", placeId: "study", createdAt: new Date("2026-08-07T00:00:01Z") }),
    makeRecord({ id: "stable-2", authorId: "p2", placeId: "study", createdAt: new Date("2026-08-07T00:00:02Z") }),
    makeRecord({ id: "stable-3", authorId: "p3", placeId: "study", createdAt: new Date("2026-08-07T00:00:03Z") }),
  ]

  const normal = await runRoundContradictionCheck({
    game: makeValidationGame(records),
    mode: "statement",
  })
  const reversed = await runRoundContradictionCheck({
    game: makeValidationGame([...records].reverse()),
    mode: "statement",
  })

  assert.deepEqual(normal.conflicts, reversed.conflicts)
  assert.deepEqual(normal.records, reversed.records)
})


test("v5의 system_timeout fake statement/answer는 v6 공개 replay에서 제외한다", async () => {
  const fakeStatement = makeRecord({
    id: "legacy-timeout-statement",
    recordType: "statement",
    authorId: "p1",
    placeId: "study",
    submissionSource: "system_timeout",
  })
  const [question, fakeAnswer] = makeQuestionAnswer({
    questionId: "legacy-q",
    answerId: "legacy-a",
    type: "PRESENCE",
    target: "p1",
    placeId: "study",
    answer: true,
    second: 10,
  })
  fakeAnswer.submissionSource = "system_timeout"

  const projected = projectOfficialRecordsForValidation(
    makeValidationGame([fakeStatement, question, fakeAnswer]),
    { mode: "qanda" }
  )
  assert.equal(projected.statements.length, 0)
  assert.equal(projected.answers.length, 0)
  assert.equal(projected.qandaList.length, 0)
})

test("timed_out 질문은 answer/qanda claim을 만들지 않는다", async () => {
  const records = [
    makeRecord({ id: "s1", authorId: "p1", placeId: "study" }),
    makeRecord({
      id: "q-timeout",
      recordType: "question",
      authorId: "p2",
      targetId: "p1",
      statementType: null,
      questionType: "PRESENCE",
      placeId: "study",
      status: "timed_out",
      validationStatus: null,
    }),
  ]
  const game = makeValidationGame(records)
  const projected = projectOfficialRecordsForValidation(game, { mode: "qanda" })
  assert.equal(projected.qandaList.length, 0)
  const result = await runRoundContradictionCheck({ game, mode: "qanda" })
  assert.equal(result.valid, true)
  assert.equal(result.records.some((entry) => entry.recordId === "q-timeout"), false)
})

test("예상하지 못한 DB 오류 메시지는 사용자 응답에서 숨긴다", () => {
  const publicError = makePublicGameError(
    new Error("internal mongodb detail"),
    "공식 답변 저장 중 오류가 발생했습니다."
  )
  assert.equal(publicError.status, 500)
  assert.equal(publicError.code, "GAME_INTERNAL_ERROR")
  assert.equal(publicError.message, "공식 답변 저장 중 오류가 발생했습니다.")
})

const makeEvaluationGame = (citizenCorrectCount) => {
  const players = Array.from({ length: 10 }, (_, index) => ({
    userId: `p${index}`,
    characterId: index === 0 ? "killer-role" : `role-${index}`,
  }))
  const correct = {
    criminalPlayerId: "p0",
    crimeTime: 18,
    crimeSection: "section24",
    crimePlaceId: "study",
    crimeItemId: "knife",
  }
  const wrong = { ...correct, crimePlaceId: "kitchen" }

  return {
    players,
    deductions: players.map((player, index) => ({
      userId: player.userId,
      ...(index > 0 && index <= citizenCorrectCount ? correct : wrong),
    })),
    secretData: {
      crimeInfo: {
        crimeRole: { role_id: "killer-role" },
        crimeTime: 18,
        timeSection: "section24",
        crimePlace: { place_id: "study" },
        crimeItem: { item_id: "knife" },
      },
    },
  }
}

test("일반인 승리 5명이면 범인 패배, 4명이면 범인 승리다", async () => {
  const fiveWinners = await evaluateFinalDeductions(makeEvaluationGame(5))
  assert.equal(fiveWinners.citizenWinnerCount, 5)
  assert.equal(fiveWinners.killerWon, false)

  const fourWinners = await evaluateFinalDeductions(makeEvaluationGame(4))
  assert.equal(fourWinners.citizenWinnerCount, 4)
  assert.equal(fourWinners.killerWon, true)
})
