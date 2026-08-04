// setGame() 모순 검사 함수를 서비스 구조와 연결하는 어댑터 

import mongoose from "mongoose"

// 현재 main의 레거시 사건 생성 함수입니다.
// 이 파일을 backend/src/adapters에 복사하면 ../../GameSetter.js가 정확한 경로입니다.
import { setGame } from "../../GameSetter.js"

/*
 * gameEngineAdapter의 책임
 * --------------------------------------------------------------------------
 * 서비스는 camelCase + slotIndex 계약만 이해합니다.
 * 반면 현재 GameSetter는 preparedPlayerTimelineMap, section02, place_id처럼
 * 다른 모양을 반환합니다. 그 차이를 이 한 파일에서만 번역합니다.
 *
 * 준홍님이 나중에 GameSetter 반환 구조를 바꾸더라도 서비스/컨트롤러/프론트를
 * 전부 고치지 않고 이 Adapter만 수정하면 됩니다.
 */

const SECTION_ORDER = ["section02", "section24", "section46"]
const SECTION_TO_MINUTE = {
  section02: 0,
  section24: 20,
  section46: 40,
}

const stringId = (value) => String(value?._id ?? value ?? "")

const splitRoleName = (roleName = "") => {
  const match = roleName.match(/^(.+?)\((.+)\)$/)

  return match
    ? { name: match[1].trim(), occupation: match[2].trim() }
    : { name: roleName, occupation: "" }
}

const makeTimeSlots = (preparedTimeline = []) => {
  const firstTimeline = preparedTimeline[0]?.alibi ?? {}
  const hours = Object.keys(firstTimeline)
    .map(Number)
    .sort((left, right) => left - right)

  return hours.flatMap((hour) =>
    SECTION_ORDER.map((section, sectionIndex) => ({
      slotIndex: (hours.indexOf(hour) * SECTION_ORDER.length) + sectionIndex,
      label: `${String(hour).padStart(2, "0")}:${String(
        SECTION_TO_MINUTE[section]
      ).padStart(2, "0")}`,
      legacyTimeKey: String(hour),
      legacySectionKey: section,
    }))
  )
}

const findRoleAssignment = (playersRoles, userId) =>
  playersRoles.find(
    (entry) => stringId(entry.player) === String(userId)
  )

const findPreparedTimeline = (preparedTimeline, userId) =>
  preparedTimeline.find(
    (entry) => stringId(entry.player) === String(userId)
  )

const normalizePlaces = (mapInfo) =>
  (mapInfo.map_places ?? []).map((place) => ({
    placeId: place.place_id,
    name: place.place_name,
    actions: place.place_action ?? [],
  }))

const normalizeTools = (mapInfo, usedToolIds) =>
  (mapInfo.items ?? [])
    .filter((item) => usedToolIds.size === 0 || usedToolIds.has(item.item_id))
    .map((item) => ({
      toolId: item.item_id,
      name: item.item_name,
      feature: item.item_feature,
      defaultPlaceId: item.item_location ?? null,
    }))

const collectUsedToolIds = (preparedTimeline) => {
  const ids = new Set()

  preparedTimeline.forEach((entry) => {
    Object.values(entry.alibi ?? {}).forEach((sections) => {
      Object.values(sections ?? {}).forEach((alibi) => {
        const toolId = alibi?.item?.item_id
        if (toolId) ids.add(toolId)
      })
    })
  })

  return ids
}

const normalizeHintValue = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (item?.place_id) {
        return { placeId: item.place_id, name: item.place_name }
      }

      return item
    })
  }

  return value ?? null
}

const normalizeHints = (hintsPerRound = {}) =>
  Object.entries(hintsPerRound)
    .map(([roundKey, value]) => ({
      round: Number(roundKey.replace("round", "")),
      value: normalizeHintValue(value),
    }))
    .filter((hint) => Number.isInteger(hint.round))
    .sort((left, right) => left.round - right.round)

const crimeSlotIndexFromLegacy = (crimeInfo, timeSlots) =>
  timeSlots.findIndex(
    (slot) =>
      Number(slot.legacyTimeKey) === Number(crimeInfo.crimeTime) &&
      slot.legacySectionKey === crimeInfo.timeSection
  )

const normalizeWitnessesForPlayer = (witnessesMap, userId) =>
  witnessesMap.find((entry) => stringId(entry.player) === String(userId))
    ?.witnesses ?? []

/*
 * 현재 GameSetter의 결과를 Game.create()에 바로 넣을 수 있는 구조로 바꿉니다.
 * 이 변환 로직은 다원님 연결 계층이고, 사건 생성 알고리즘 자체는 아닙니다.
 */
export const createGameWithEngine = async ({ users, mapInfo, roomId }) => {
  // role_char00은 테스트 역할이므로 실제 배정 후보에서 제외합니다.
  const safeMapInfo = {
    ...mapInfo,
    roles: (mapInfo.roles ?? []).filter(
      (role) => role.role_id !== "role_char00"
    ),
  }

  // TODO(준홍): GameSetter가 비동기로 변경되면 await setGame(...) 형태는 그대로 사용 가능합니다.
  const engineResult = await setGame(users, safeMapInfo)

  const preparedTimeline = engineResult.preparedPlayerTimelineMap ?? []
  const playersRoles = engineResult.playersRoles ?? []
  const witnessesMap = engineResult.witnessesMap ?? []
  const timeSlotsWithLegacyKeys = makeTimeSlots(preparedTimeline)
  const publicTimeSlots = timeSlotsWithLegacyKeys.map(
    ({ slotIndex, label }) => ({ slotIndex, label })
  )

  // userId -> 게임 내부 playerId 매핑을 먼저 만들면 동행자도 playerId로 바꿀 수 있습니다.
  const playerIdByUserId = new Map(
    users.map((user) => [
      stringId(user),
      new mongoose.Types.ObjectId(),
    ])
  )

  const players = users.map((user) => {
    const userId = stringId(user)
    const assignment = findRoleAssignment(playersRoles, userId)
    const legacyTimeline = findPreparedTimeline(preparedTimeline, userId)
    const role = assignment?.role ?? {}
    const parsedRoleName = splitRoleName(role.role_name)

    const timeline = timeSlotsWithLegacyKeys.map((slot) => {
      const alibi =
        legacyTimeline?.alibi?.[slot.legacyTimeKey]?.[
          slot.legacySectionKey
        ] ?? {}
      const placeId = alibi.place?.place_id ?? null

      const companionPlayerIds = preparedTimeline
        .filter((other) => stringId(other.player) !== userId)
        .filter((other) => {
          const otherPlaceId =
            other.alibi?.[slot.legacyTimeKey]?.[slot.legacySectionKey]
              ?.place?.place_id
          return placeId && otherPlaceId === placeId
        })
        .map((other) => playerIdByUserId.get(stringId(other.player)))
        .filter(Boolean)

      return {
        slotIndex: slot.slotIndex,
        placeId,
        action: alibi.action ?? "",
        companionPlayerIds,
        toolId: alibi.item?.item_id ?? null,
        flags: [],
      }
    })

    return {
      playerId: playerIdByUserId.get(userId),
      userId: user._id,
      username: user.username ?? user.id ?? "unknown",
      nickname: user.nickname ?? user.name ?? user.username ?? "플레이어",
      role: {
        roleId: role.role_id,
        name: parsedRoleName.name,
        occupation: parsedRoleName.occupation,
        motive: role.role_motiv ?? "",
      },
      timeline,
      witnesses: normalizeWitnessesForPlayer(witnessesMap, userId),
      questionCount: 0,
    }
  })

  const criminalAssignment = playersRoles.find(
    (entry) =>
      entry.role?.role_id === engineResult.crimeInfo?.crimeRole?.role_id
  )
  const criminalPlayerId = playerIdByUserId.get(
    stringId(criminalAssignment?.player)
  )
  const usedToolIds = collectUsedToolIds(preparedTimeline)
  const phaseStartedAt = new Date()
  const roundDurationMs = Number(process.env.GAME_ROUND_DURATION_MS ?? 300_000)

  return {
    roomId,
    status: "playing",
    phase: "rounds",
    currentRound: 1,
    totalRounds: 5,
    roundStatus: "collecting",
    phaseStartedAt,
    phaseEndsAt: new Date(phaseStartedAt.getTime() + roundDurationMs),
    caseData: {
      title: "대저택 살인사건",
      mapId: stringId(mapInfo) || null,
      mapStory: mapInfo.map_story ?? "",

      // TODO(준홍): 피해자/발견장소가 GameSetter 결과에 추가되면 여기서 연결합니다.
      victimName: "피해자",
      foundAtLabel: "21:00",
      foundPlaceId: null,
      timeSlots: publicTimeSlots,
      places: normalizePlaces(mapInfo),
      tools: normalizeTools(mapInfo, usedToolIds),
    },
    players,
    revealedHints: [],
    questions: [],
    finalSubmissions: [],
    roundHistory: [],

    // gameDto가 절대 일반 bootstrap 응답에 포함하지 않는 정답입니다.
    secret: {
      solution: {
        criminalPlayerId,
        crimeSlotIndex: crimeSlotIndexFromLegacy(
          engineResult.crimeInfo ?? {},
          timeSlotsWithLegacyKeys
        ),
        crimePlaceId: engineResult.crimeInfo?.crimePlace?.place_id ?? null,
        crimeToolId: engineResult.crimeInfo?.crimeItem?.item_id ?? null,
      },
      hintsByRound: normalizeHints(engineResult.hintsPerRound),
      legacyCrimeInfo: engineResult.crimeInfo,
    },

    // TODO(준홍): 새 엔진이 slotIndex 기반 runtime을 반환하면 이 레거시 필드를 교체합니다.
    runtime: {
      preparedPlayerTimelineMap: engineResult.preparedPlayerTimelineMap,
      inGamePlayerTimelineMap: engineResult.inGamePlayerTimelineMap,
      witnessesMap: engineResult.witnessesMap,
      inGameWitnessesMap: engineResult.inGameWitnessesMap,
    },
  }
}

const engineNotImplemented = (functionName) => {
  const error = new Error(
    `${functionName}은(는) 준홍님의 모순 검사 함수 연결이 필요합니다.`
  )
  error.code = "GAME_ENGINE_NOT_IMPLEMENTED"
  return error
}

/*
 * TODO(준홍): 실제 라운드 모순 검사 함수를 이 자리에서 호출하세요.
 *
 * 필요한 입력 계약:
 * {
 *   round, statements, questions,
 *   runtimeTimeline, runtimeWitnesses
 * }
 *
 * 필요한 반환 계약:
 * { valid: Boolean, conflicts: Conflict[] }
 *
 * 중요: 현재 inGameCheckValidation()은 단일 알리바이용 레거시 함수이고
 * PlayerTimelineMap 오참조와 Q&A TODO가 있으므로 그대로 호출하면 안 됩니다.
 */
export const validateRoundWithEngine = async (_input) => {
  throw engineNotImplemented("validateRoundWithEngine")
}

/*
 * TODO(준홍): YES/NO 답변과 공식 타임라인·목격·소유 정보를 비교하는 함수를 연결하세요.
 * false(NO) 자체는 모순이 아니며, 반대되는 공식 정보가 있을 때만 conflict를 반환합니다.
 */
export const validateAnswerWithEngine = async (_input) => {
  throw engineNotImplemented("validateAnswerWithEngine")
}
