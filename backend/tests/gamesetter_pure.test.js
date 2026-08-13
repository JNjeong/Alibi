/**
 * GameSetter 단독 회귀 테스트.
 * -----------------------------------------------------------------------------
 * mongoose/express/socket.io 없이 `node --test`만으로 실행할 수 있습니다.
 * v6의 가장 중요한 Source of Truth가 의존성 설치 문제와 무관하게 검증되도록 둡니다.
 */

import assert from "node:assert/strict"
import test from "node:test"

import {
  checkWitnessMapValidation,
  inGameCheckValidation,
  setGame,
} from "../GameSetter.js"

const FEATURES = ["sharp", "blunt", "poison", "asphyxia"]

const makeMapInfo = () => ({
  map_story: "GameSetter pure test map",
  map_places: Array.from({ length: 12 }, (_, index) => ({
    place_id: `place_${index + 1}`,
    place_name: `장소${index + 1}`,
    place_action: [`행동${index + 1}A`, `행동${index + 1}B`],
  })),
  roles: Array.from({ length: 20 }, (_, index) => ({
    role_id: `role_${index + 1}`,
    role_name: `역할${index + 1}(직업${index + 1})`,
    role_motiv: `동기${index + 1}`,
  })),
  items: Array.from({ length: 16 }, (_, index) => ({
    item_id: `item_${index + 1}`,
    item_name: `도구${index + 1}`,
    item_feature: FEATURES[index % FEATURES.length],
    item_location: `place_${(index % 12) + 1}`,
  })),
})

const makeUsers = (count) =>
  Array.from({ length: count }, (_, index) => ({
    _id: `user_${index + 1}`,
    username: `user${index + 1}`,
    nickname: `플레이어${index + 1}`,
  }))

const flattenTimeline = (timeline) =>
  Object.entries(timeline.alibi).flatMap(([time, sections]) =>
    Object.entries(sections).map(([section, alibi]) => ({
      time: Number(time),
      section,
      alibi,
    }))
  )

const assertGeneratedHardRules = (generated, playerCount) => {
  assert.equal(generated.preparedPlayerTimelineMap.length, playerCount)
  assert.ok(generated.itemsInUse.length > 0)
  assert.ok(generated.itemsInUse.length <= 8)
  assert.ok(generated.crimeInfo.crimeTime >= 13 && generated.crimeInfo.crimeTime <= 22)
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
  assert.ok(
    Object.hasOwn(
      generated.hintsPerRound.round3,
      generated.crimeInfo.crimeItem.item_feature
    )
  )

  const culprit = generated.playersRoles.find(
    (entry) => entry.role.role_id === generated.crimeInfo.crimeRole.role_id
  )
  const culpritId = String(culprit.player._id)
  const occupancy = new Map()
  const itemOwners = new Map()
  const adverseInnocents = new Set()

  generated.preparedPlayerTimelineMap.forEach((timeline) => {
    const slots = flattenTimeline(timeline)
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

  const crimePlaceKey = [
    generated.crimeInfo.crimeTime,
    generated.crimeInfo.timeSection,
    generated.crimeInfo.crimePlace.place_id,
  ].join(":")
  assert.equal(occupancy.get(crimePlaceKey), 1)
  assert.equal(checkWitnessMapValidation(generated.witnessesMap).valid, true)
}

test("GameSetter가 9/10인 사건 생성 hard rule과 실제 round3 도구 특징을 유지한다", () => {
  const mapInfo = makeMapInfo()

  for (const playerCount of [9, 10]) {
    for (let index = 0; index < 30; index += 1) {
      assertGeneratedHardRules(setGame(makeUsers(playerCount), mapInfo), playerCount)
    }
  }
})

test("GameSetter는 2인 로컬 통신 테스트용 사건도 생성 가능하다", () => {
  const generated = setGame(makeUsers(2), makeMapInfo())
  assertGeneratedHardRules(generated, 2)
})

test("PRESENCE/ITEM NO는 같은 공개 장소/도구 주장과 충돌하고 null 입력은 안전하다", () => {
  const timeline = [
    {
      player: { _id: "p1" },
      alibi: {
        18: {
          section02: {
            place: { place_id: "study" },
            item: { item_id: "knife" },
            action: "책 읽기",
            __sourceRecordIds: ["s1", "i1"],
            __placeSourceRecordIds: ["s1"],
            __itemSourceRecordIds: ["i1"],
          },
        },
      },
    },
    { player: { _id: "p2" }, alibi: { 18: { section02: null } } },
  ]
  const witnesses = [
    { player: "p1", witnesses: [] },
    { player: "p2", witnesses: [] },
  ]
  const presenceNo = {
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
    [presenceNo],
    null,
    presenceNo
  )
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

  assert.equal(placeResult.qandaCheck.length, 1)
  assert.equal(itemResult.qandaCheck.length, 1)
  assert.doesNotThrow(() =>
    inGameCheckValidation(
      timeline,
      witnesses,
      { player: { _id: "p1" } },
      18,
      "section02",
      [],
      null,
      null
    )
  )
})

test("동행 한쪽 주장만 있을 때 상대의 같은 슬롯 공식 alibi가 있어야 모순으로 확정한다", () => {
  const witnesses = [
    {
      player: "p1",
      witnesses: [
        {
          time: 18,
          section: "section02",
          place: "study",
          witness: "p2",
          __sourceRecordIds: ["s1"],
        },
      ],
    },
    { player: "p2", witnesses: [] },
  ]

  const noCounterpartStatement = [
    {
      player: { _id: "p1" },
      alibi: { 18: { section02: { place: { place_id: "study" } } } },
    },
    { player: { _id: "p2" }, alibi: { 18: { section02: null } } },
  ]
  assert.equal(
    checkWitnessMapValidation(witnesses, noCounterpartStatement).valid,
    true
  )

  // 4R item-only 공식진술은 장소/동행 여부를 주장하지 않으므로
  // reciprocal companion 누락의 근거로 사용하면 안 됩니다.
  const counterpartItemOnly = [
    noCounterpartStatement[0],
    {
      player: { _id: "p2" },
      alibi: {
        18: {
          section02: {
            place: null,
            item: { item_id: "knife" },
            __itemSourceRecordIds: ["item-only"],
            __sourceRecordIds: ["item-only"],
          },
        },
      },
    },
  ]
  assert.equal(
    checkWitnessMapValidation(witnesses, counterpartItemOnly).valid,
    true
  )

  const counterpartSaysAlone = [
    noCounterpartStatement[0],
    {
      player: { _id: "p2" },
      alibi: { 18: { section02: { place: { place_id: "study" } } } },
    },
  ]
  assert.equal(
    checkWitnessMapValidation(witnesses, counterpartSaysAlone).valid,
    false
  )
})
