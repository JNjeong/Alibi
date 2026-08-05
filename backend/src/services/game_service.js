/**
 * game_service.js
 * -----------------------------------------------------------------------------
 * 역할
 * - REST Controller와 Socket Handler가 공통으로 사용하는 게임 진행 흐름입니다.
 * - 방 시작 잠금 → GameSetter 호출 → Game 저장 → Room 연결을 한곳에서 처리합니다.
 * - 공식 진술·질문·답변·최종 추리를 구조화된 JSON으로 검증하고 저장합니다.
 * - 모든 플레이어의 제출 완료 상태를 계산합니다.
 * - 여러 클라이언트가 동시에 라운드 검사를 요청해도 한 번만 실행되게 합니다.
 * - API에 정답 데이터가 섞이지 않도록 사용자별 안전한 응답을 만듭니다.
 *
 * 다원님/준홍님 경계
 * - 이 파일의 DB 연결, 중복 방지, 상태 전환, 응답 조립은 다원님 영역입니다.
 * - 아래 TODO(준홍님 구현) 함수 3개의 실제 알고리즘은 의도적으로 비워 두었습니다.
 *   1) projectOfficialRecordsForValidation()
 *   2) runRoundContradictionCheck()
 *   3) evaluateFinalDeductions()
 */

import mongoose from "mongoose"

import { setGame } from "../../GameSetter.js"
import Game from "../models/Game.js"
import GameLog from "../models/GameLog.js"
import GameMap from "../models/Map.js"
import Room from "../models/Room.js"
import User from "../user/User.js"

// 실제 확정된 5라운드 설명을 게임 시작 시 Game 문서에 스냅샷으로 저장합니다.
const ROUND_CONFIG = [
  {
    number: 1,
    title: "자유 행적 진술",
    description: "전체 18개 슬롯 중 자신의 행적 한 건을 공개합니다.",
    requiredStatementType: "ALIBI",
  },
  {
    number: 2,
    title: "후보 장소 진술",
    description: "1라운드 종료 후 공개된 후보 장소 6곳 안에서 진술합니다.",
    requiredStatementType: "ALIBI",
  },
  {
    number: 3,
    title: "후보 시간 진술",
    description: "2라운드 종료 후 공개된 최대 9개 시간 슬롯 안에서 진술합니다.",
    requiredStatementType: "ALIBI",
  },
  {
    number: 4,
    title: "도구 소지 진술",
    description: "3라운드 종료 후 공개된 도구 특징을 참고해 소지 여부를 진술합니다.",
    requiredStatementType: "ITEM_POSSESSION",
  },
  {
    number: 5,
    title: "최종 후보 장소 진술",
    description: "4라운드 종료 후 공개된 후보 장소 3곳 안에서 마지막 진술을 합니다.",
    requiredStatementType: "ALIBI",
  },
]

// 라운드 기본 제한 시간입니다.
// 함수 호출 시 읽는 이유는 현재 server.js의 dotenv.config()가 import 평가 뒤 실행되기 때문입니다.
const getRoundDurationMinutes = () => {
  const configuredMinutes = Number(process.env.GAME_ROUND_MINUTES || 10)

  return Number.isFinite(configuredMinutes) && configuredMinutes > 0
    ? configuredMinutes
    : 10
}

// 20분 section 키와 실제 분 값을 연결합니다.
const SECTION_MINUTES = {
  section02: 0,
  section24: 20,
  section46: 40,
}

// 프론트 플레이어 색상은 화면 구분용이며 게임 정답과 무관합니다.
const PLAYER_COLORS = [
  "#e6c77a",
  "#8cc7ff",
  "#7ee2b8",
  "#d8a0ff",
  "#ff9d8f",
  "#ffb4d3",
  "#97d5e8",
  "#d0e17a",
  "#ffbd7a",
  "#a9a7ff",
]

// HTTP 상태와 내부 코드를 함께 가진 오류를 만들면 Controller/Socket이 같은 방식으로 처리할 수 있습니다.
const createServiceError = (status, message, code = "GAME_SERVICE_ERROR") => {
  const error = new Error(message)
  error.status = status
  error.code = code
  return error
}

// MongoDB ObjectId가 아닌 입력을 DB 쿼리 전에 차단합니다.
const assertObjectId = (value, fieldName) => {
  if (!mongoose.isValidObjectId(value)) {
    throw createServiceError(400, `${fieldName} 형식이 올바르지 않습니다.`)
  }
}

// ObjectId와 문자열이 섞여 있어도 같은 ID인지 안전하게 비교합니다.
const sameId = (left, right) => String(left) === String(right)

// 공백 문자열을 허용하지 않는 공통 입력 검사입니다.
const requireText = (value, fieldName) => {
  if (typeof value !== "string" || !value.trim()) {
    throw createServiceError(400, `${fieldName} 값이 필요합니다.`)
  }

  return value.trim()
}

// 현재 라운드의 시작·종료 시각을 서버 기준으로 생성합니다.
const createRoundClock = () => {
  const roundDurationMinutes = getRoundDurationMinutes()
  const roundStartedAt = new Date()
  const roundEndsAt = new Date(
    roundStartedAt.getTime() + roundDurationMinutes * 60 * 1000
  )

  return {
    roundStartedAt,
    roundEndsAt,
  }
}

// GameSetter 타임라인의 hour/section 키를 프론트의 18개 시간 슬롯으로 변환합니다.
const buildTimeSlots = (preparedPlayerTimelineMap = []) => {
  const firstTimeline = preparedPlayerTimelineMap[0]?.alibi || {}
  const hours = Object.keys(firstTimeline)
    .map(Number)
    .filter(Number.isFinite)
    .sort((left, right) => left - right)

  return hours.flatMap((hour) =>
    Object.entries(SECTION_MINUTES).map(([section, minute]) => {
      const hourText = String(hour).padStart(2, "0")
      const minuteText = String(minute).padStart(2, "0")

      return {
        id: `time_${hourText}${minuteText}`,
        label: `${hourText}:${minuteText}`,
        time: hour,
        section,
      }
    })
  )
}

// 현재 Map.js 형식을 API/프론트에서 사용하는 안전한 장소 형식으로 바꿉니다.
const normalizePlaces = (places = []) =>
  places.map((place) => ({
    id: place.place_id,
    name: place.place_name,
    actions: [...(place.place_action || [])],
  }))

// 현재 Map.js의 도구 객체를 프론트가 사용하는 ID 중심 형식으로 바꿉니다.
const normalizeItems = (items = []) =>
  items.map((item) => ({
    id: item.item_id,
    name: item.item_name,
    feature: item.item_feature,
    defaultLocationId: item.item_location,
  }))

/**
 * GameSetter는 현재 items_in_use를 반환하지 않으므로 실제 타임라인에서 사용된 도구를 임시 추출합니다.
 *
 * TODO(준홍님 확인)
 * - 가장 안전한 최종 방식은 setGame() 반환값에 itemsInUse를 명시적으로 추가하는 것입니다.
 * - 준홍님이 itemsInUse를 반환하면 이 fallback 대신 generated.itemsInUse를 그대로 사용하세요.
 */
const extractItemsInUseFallback = (generated) => {
  const itemById = new Map()

  ;(generated.preparedPlayerTimelineMap || []).forEach((playerTimeline) => {
    Object.values(playerTimeline.alibi || {}).forEach((hourSlots) => {
      Object.values(hourSlots || {}).forEach((slot) => {
        const item = slot?.item

        if (item?.item_id) {
          itemById.set(item.item_id, item)
        }
      })
    })
  })

  const crimeItem = generated.crimeInfo?.crimeItem

  if (crimeItem?.item_id) {
    itemById.set(crimeItem.item_id, crimeItem)
  }

  return [...itemById.values()].slice(0, 8)
}

// 기존 hintsPerRound 객체를 revealAfterRound/appliesToRound가 분명한 배열로 바꿉니다.
const normalizeHints = (hintsPerRound = {}) => [
  {
    key: "PLACE_CANDIDATES_6",
    type: "PLACE_IDS",
    revealAfterRound: 1,
    appliesToRound: 2,
    title: "범행 후보 장소 6곳",
    description: "2라운드 공식 진술에 사용할 장소 후보입니다.",
    values: (hintsPerRound.round1 || []).map(
      (place) => place.place_id || place.id || place
    ),
  },
  {
    key: "TIME_CANDIDATE_HOURS",
    type: "HOUR_RANGE",
    revealAfterRound: 2,
    appliesToRound: 3,
    title: "범행 후보 시간",
    description: "3라운드 공식 진술에 사용할 최대 3시간, 9개 슬롯 후보입니다.",
    values: hintsPerRound.round2 || [],
  },
  {
    key: "CRIME_ITEM_FEATURE",
    type: "ITEM_FEATURE",
    revealAfterRound: 3,
    appliesToRound: 4,
    title: "범행 도구 특징",
    description: "4라운드 도구 소지 진술에 참고할 포렌식 특징입니다.",
    values: hintsPerRound.round3 || {},
  },
  {
    key: "PLACE_CANDIDATES_3",
    type: "PLACE_IDS",
    revealAfterRound: 4,
    appliesToRound: 5,
    title: "최종 후보 장소 3곳",
    description: "5라운드 마지막 공식 진술에 사용할 장소 후보입니다.",
    values: (hintsPerRound.round4 || []).map(
      (place) => place.place_id || place.id || place
    ),
  },
  {
    key: "FINAL_TIME_SLOTS_5",
    type: "TIME_SLOTS",
    revealAfterRound: 5,
    appliesToRound: null,
    title: "최종 핵심 시간 5슬롯",
    description: "최종 추리에서 선택할 수 있는 20분 슬롯 후보입니다.",
    values: hintsPerRound.round5 || [],
  },
]

// Room 참가자 순서를 유지해 GameSetter와 화면의 플레이어 순서가 동일하도록 만듭니다.
const orderUsersByParticipants = (users, participantIds) =>
  participantIds
    .map((participantId) =>
      users.find((user) => sameId(user._id, participantId))
    )
    .filter(Boolean)

// GameSetter에 비밀번호가 전달되지 않도록 필요한 사용자 필드만 새 객체로 만듭니다.
const makeSafeGeneratorUsers = (users) =>
  users.map((user) => ({
    _id: user._id,
    username: user.username,
    nickname: user.nickname,
  }))

// Map.js의 "이름(직업)" role_name을 화면의 이름/직업 필드로 분리합니다.
const splitRoleName = (roleName = "") => {
  const matched = roleName.match(/^(.+?)\((.+)\)$/)

  if (!matched) {
    return {
      characterName: roleName || "알 수 없는 용의자",
      characterOccupation: "용의자",
    }
  }

  return {
    characterName: matched[1].trim(),
    characterOccupation: matched[2].trim(),
  }
}

// GameSetter의 역할 배정 결과에서 특정 로그인 사용자의 캐릭터를 찾습니다.
const findGeneratedRole = (generated, userId) =>
  (generated.playersRoles || []).find((entry) =>
    sameId(entry.player?._id, userId)
  )?.role

// 게임 한 판의 공개/비공개 저장 문서를 조립합니다.
const buildGameDocument = ({ room, mapInfo, users, generated }) => {
  const clock = createRoundClock()

  // 준홍님이 itemsInUse를 반환하면 그것을 우선하고, 현재 버전에서는 fallback을 사용합니다.
  const rawItemsInUse =
    generated.itemsInUse || extractItemsInUseFallback(generated)

  return {
    roomId: room._id,
    roomSnapshot: {
      title: room.title,
      inviteCode: room.inviteCode,
    },
    status: "playing",
    phase: "active",
    currentRound: 1,
    roundStartedAt: clock.roundStartedAt,
    roundEndsAt: clock.roundEndsAt,
    revision: 1,
    players: users.map((user) => {
      const role = findGeneratedRole(generated, user._id)
      const publicRole = splitRoleName(role?.role_name)

      return {
        userId: user._id,
        username: user.username,
        nickname: user.nickname,
        characterId: role?.role_id || "role_unknown",
        characterName: publicRole.characterName,
        characterOccupation: publicRole.characterOccupation,
        questionCount: 0,
      }
    }),
    mapSnapshot: {
      story: mapInfo.map_story,
      places: normalizePlaces(mapInfo.map_places),
      itemsInUse: normalizeItems(rawItemsInUse),
    },

    /**
     * TODO(준홍님 데이터 제공)
     * GameSetter가 피해자 이름, 발견 장소, 사망 원인 등을 반환하면 아래 기본값 대신 연결하세요.
     * 정답인 범행 장소·도구·시각은 절대 caseBriefing에 넣으면 안 됩니다.
     */
    caseBriefing: {
      title: generated.caseBriefing?.title || "저택 살인사건",
      victimName: generated.caseBriefing?.victimName || "피해자",
      victimAge: generated.caseBriefing?.victimAge || null,
      victimOccupation: generated.caseBriefing?.victimOccupation || "저택의 주인",
      victimDescription: generated.caseBriefing?.victimDescription || "",
      discoveredAt: generated.caseBriefing?.discoveredAt || "21:00",
      discoveredPlaceId: generated.caseBriefing?.discoveredPlaceId || null,
      causeOfDeath: generated.caseBriefing?.causeOfDeath || "조사 중",
    },
    rulesSnapshot: {
      participantCount: users.length,
      maxPlayersAtSamePlace: 2,
      maxCompanions: 1,
      maxQuestionsPerPlayer: 2,
      maxItemsInUse: 8,
      roundCount: 5,
      slotCount: 18,
      roundDurationMinutes: getRoundDurationMinutes(),
      timeSlots: buildTimeSlots(generated.preparedPlayerTimelineMap),
    },
    roundsSnapshot: ROUND_CONFIG,
    hints: normalizeHints(generated.hintsPerRound),
    officialRecords: [],
    roundChecks: [],
    deductions: [],

    // GameSetter의 전체 결과는 일반 조회에서 제외되는 secretData에만 저장합니다.
    secretData: {
      crimeInfo: generated.crimeInfo,
      preparedPlayerTimelineMap: generated.preparedPlayerTimelineMap,
      playersRoles: generated.playersRoles,
      witnessesMap: generated.witnessesMap,
      inGamePlayerTimelineMap: generated.inGamePlayerTimelineMap,
      inGameWitnessesMap: generated.inGameWitnessesMap,
    },
    startedAt: new Date(),
  }
}

// 한 사용자가 실제 게임 참가자인지 확인합니다.
const assertGameParticipant = (game, userId) => {
  const participant = game.players.find((player) =>
    sameId(player.userId, userId)
  )

  if (!participant) {
    throw createServiceError(403, "이 게임의 참가자만 접근할 수 있습니다.")
  }

  return participant
}

// 현재 라운드에서 사용할 힌트의 values를 서버 입력 검증에 사용합니다.
const findAppliedHint = (game, round) =>
  game.hints.find((hint) => hint.appliesToRound === round)

// 프론트가 보낸 시간/section 조합이 게임의 실제 18개 슬롯인지 확인합니다.
const assertValidTimeSlot = (game, time, section) => {
  const exists = (game.rulesSnapshot.timeSlots || []).some(
    (slot) => Number(slot.time) === Number(time) && slot.section === section
  )

  if (!exists) {
    throw createServiceError(400, "게임에 존재하지 않는 시간 슬롯입니다.")
  }
}

// 현재 라운드에 맞는 공식 진술 payload인지 구조만 검사합니다.
// 진술의 진실 여부와 모순 여부는 준홍님 검사 함수가 라운드 종료 시 판정합니다.
const validateStatementPayload = (game, payload) => {
  const currentRoundConfig = ROUND_CONFIG.find(
    (round) => round.number === game.currentRound
  )

  if (Number(payload.round) !== game.currentRound) {
    throw createServiceError(409, "현재 진행 중인 라운드의 진술만 제출할 수 있습니다.")
  }

  if (payload.statementType !== currentRoundConfig.requiredStatementType) {
    throw createServiceError(
      400,
      `${game.currentRound}라운드는 ${currentRoundConfig.requiredStatementType} 진술만 제출할 수 있습니다.`
    )
  }

  assertValidTimeSlot(game, payload.time, payload.section)

  if (payload.statementType === "ALIBI") {
    requireText(payload.placeId, "placeId")

    const placeExists = game.mapSnapshot.places.some(
      (place) => place.id === payload.placeId
    )

    if (!placeExists) {
      throw createServiceError(400, "존재하지 않는 장소 ID입니다.")
    }

    const companions = payload.companionPlayerIds || []

    if (!Array.isArray(companions) || companions.length > 1) {
      throw createServiceError(400, "동행자는 최대 1명까지만 선택할 수 있습니다.")
    }

    companions.forEach((companionId) => {
      assertObjectId(companionId, "companionPlayerId")

      if (!game.players.some((player) => sameId(player.userId, companionId))) {
        throw createServiceError(400, "게임 참가자가 아닌 동행자입니다.")
      }
    })

    // 2R과 5R은 직전 라운드에서 공개된 장소 후보 안에서만 제출할 수 있습니다.
    const appliedHint = findAppliedHint(game, game.currentRound)

    if (
      appliedHint?.type === "PLACE_IDS" &&
      !appliedHint.values.includes(payload.placeId)
    ) {
      throw createServiceError(400, "현재 라운드의 공개 후보 장소가 아닙니다.")
    }

    // 3R은 공개된 시(hour) 후보 안의 20분 슬롯만 제출할 수 있습니다.
    if (
      appliedHint?.type === "HOUR_RANGE" &&
      !appliedHint.values.map(Number).includes(Number(payload.time))
    ) {
      throw createServiceError(400, "현재 라운드의 공개 후보 시간이 아닙니다.")
    }
  }

  if (payload.statementType === "ITEM_POSSESSION") {
    requireText(payload.itemId, "itemId")

    if (!["POSSESSED", "NOT_POSSESSED"].includes(payload.claim)) {
      throw createServiceError(
        400,
        "claim은 POSSESSED 또는 NOT_POSSESSED여야 합니다."
      )
    }

    const itemExists = game.mapSnapshot.itemsInUse.some(
      (item) => item.id === payload.itemId
    )

    if (!itemExists) {
      throw createServiceError(400, "이번 게임에서 사용하지 않는 도구 ID입니다.")
    }

    /**
     * TODO(준홍님 검사 규칙)
     * - 4라운드에서 플레이어가 실제 소지했던 도구만 선택 가능한지 확인
     * - 공개된 ITEM_FEATURE 힌트와 제출 도구의 허용 관계 확인
     * 위 검사는 GameSetter의 실제 도구 소유 데이터 정의가 확정된 뒤 구현합니다.
     */
  }
}

// 공식 질문 payload의 공통 ID와 필수 필드를 검사합니다.
const validateQuestionPayload = (game, authorId, payload) => {
  if (Number(payload.round) !== game.currentRound) {
    throw createServiceError(409, "현재 라운드에서만 공식 질문을 제출할 수 있습니다.")
  }

  assertObjectId(payload.targetPlayerId, "targetPlayerId")

  if (sameId(authorId, payload.targetPlayerId)) {
    throw createServiceError(400, "자기 자신에게는 공식 질문을 할 수 없습니다.")
  }

  if (!game.players.some((player) => sameId(player.userId, payload.targetPlayerId))) {
    throw createServiceError(400, "질문 대상이 게임 참가자가 아닙니다.")
  }

  if (!["PRESENCE", "WITNESS", "ITEM_POSSESSION"].includes(payload.questionType)) {
    throw createServiceError(400, "지원하지 않는 공식 질문 유형입니다.")
  }

  assertValidTimeSlot(game, payload.time, payload.section)

  if (payload.questionType === "PRESENCE") {
    requireText(payload.placeId, "placeId")
  }

  if (payload.questionType === "WITNESS") {
    requireText(payload.placeId, "placeId")
    assertObjectId(payload.subjectPlayerId, "subjectPlayerId")
  }

  if (payload.questionType === "ITEM_POSSESSION") {
    requireText(payload.itemId, "itemId")
  }
}

// 라운드별 진술 제출자와 미답변 질문 수를 계산합니다.
const getSubmissionStatusFromGame = (game) => {
  const round = game.currentRound
  const submittedUserIds = new Set(
    game.officialRecords
      .filter(
        (record) =>
          record.recordType === "statement" && record.round === round
      )
      .map((record) => String(record.authorId))
  )

  const pendingQuestions = game.officialRecords.filter(
    (record) =>
      record.recordType === "question" &&
      record.round === round &&
      record.status === "pending"
  )

  const players = game.players.map((player) => ({
    userId: String(player.userId),
    nickname: player.nickname,
    submitted: submittedUserIds.has(String(player.userId)),
  }))

  const submittedCount = players.filter((player) => player.submitted).length

  return {
    round,
    submittedCount,
    totalCount: players.length,
    allStatementsSubmitted: submittedCount === players.length,
    pendingQuestionCount: pendingQuestions.length,
    allReady:
      submittedCount === players.length && pendingQuestions.length === 0,
    players,
  }
}

// 공개 전 힌트의 values를 제거해 개발자 도구로 정답 후보가 보이는 문제를 막습니다.
const sanitizeHints = (hints) =>
  hints.map((hintDocument) => {
    const hint = hintDocument.toObject
      ? hintDocument.toObject()
      : { ...hintDocument }
    const revealed = Boolean(hint.revealedAt)

    return {
      ...hint,
      status: revealed ? "revealed" : "locked",
      values: revealed ? hint.values : [],
    }
  })

// 사용자 자신의 실제 역할 정보를 secretData에서 찾습니다.
const findViewerRole = (secretData, userId) => {
  const assignment = (secretData?.playersRoles || []).find((entry) =>
    sameId(entry.player?._id, userId)
  )

  return assignment?.role || null
}

// 사용자 자신의 18개 실제 타임라인만 API 응답으로 변환합니다.
const buildViewerTimeline = (game, userId) => {
  const secretData = game.secretData || {}
  const timelineEntry = (secretData.preparedPlayerTimelineMap || []).find(
    (entry) => sameId(entry.player?._id, userId)
  )
  const witnessEntry = (secretData.witnessesMap || []).find((entry) =>
    sameId(entry.player, userId)
  )

  if (!timelineEntry) {
    return []
  }

  return (game.rulesSnapshot.timeSlots || []).map((slot) => {
    const alibi = timelineEntry.alibi?.[slot.time]?.[slot.section] || {}
    const companionPlayerIds = (witnessEntry?.witnesses || [])
      .filter(
        (witness) =>
          Number(witness.time) === Number(slot.time) &&
          witness.section === slot.section &&
          witness.place === alibi.place?.place_id
      )
      .map((witness) => String(witness.witness))

    return {
      timeId: slot.id,
      time: slot.time,
      section: slot.section,
      placeId: alibi.place?.place_id || null,
      itemId: alibi.item?.item_id || null,
      action: alibi.action || "",
      companionPlayerIds,
    }
  })
}

// Game 문서를 로그인 사용자에게 필요한 공개 상태 + 자기 비공개 정보로 나눕니다.
const buildClientGameView = (game, userId) => {
  const participant = assertGameParticipant(game, userId)
  const submissionStatus = getSubmissionStatusFromGame(game)
  const ownDeduction = game.deductions.find((deduction) =>
    sameId(deduction.userId, userId)
  )

  return {
    game: {
      id: String(game._id),
      roomId: String(game.roomId),
      room: game.roomSnapshot,
      status: game.status,
      phase: game.phase,
      currentRound: game.currentRound,
      roundStartedAt: game.roundStartedAt,
      roundEndsAt: game.roundEndsAt,
      revision: game.revision,
      players: game.players.map((player, index) => ({
        id: String(player.userId),
        userId: String(player.userId),
        username: player.username,
        nickname: player.nickname,
        color: PLAYER_COLORS[index % PLAYER_COLORS.length],
        character: {
          id: player.characterId,
          name: player.characterName,
          occupation: player.characterOccupation,
        },
        questionCount: player.questionCount,
      })),
      mapSnapshot: game.mapSnapshot,
      caseBriefing: game.caseBriefing,
      rulesSnapshot: game.rulesSnapshot,
      roundsSnapshot: game.roundsSnapshot,
      hints: sanitizeHints(game.hints),
      officialRecords: game.officialRecords,
      roundChecks: game.roundChecks,
      submissionStatus,
      deductionStatus: game.players.map((player) => ({
        userId: String(player.userId),
        nickname: player.nickname,
        submitted: game.deductions.some((deduction) =>
          sameId(deduction.userId, player.userId)
        ),
      })),
      startedAt: game.startedAt,
      finishedAt: game.finishedAt,
    },
    viewer: {
      userId: String(participant.userId),
      role: findViewerRole(game.secretData, userId),
      timeline: buildViewerTimeline(game, userId),
      questionCount: participant.questionCount,
      hasSubmittedStatement: submissionStatus.players.some(
        (player) => sameId(player.userId, userId) && player.submitted
      ),
      hasSubmittedDeduction: Boolean(ownDeduction),
      ownDeduction: ownDeduction || null,
    },
  }
}

// 게임 문서와 secretData를 함께 읽고 참가자 권한까지 확인하는 내부 조회입니다.
const getGameDocumentForParticipant = async (gameId, userId) => {
  assertObjectId(gameId, "gameId")
  assertObjectId(userId, "userId")

  const game = await Game.findById(gameId).select("+secretData")

  if (!game) {
    throw createServiceError(404, "존재하지 않는 게임입니다.")
  }

  assertGameParticipant(game, userId)
  return game
}

/**
 * 방장이 게임 시작을 눌렀을 때 한 판을 새로 생성합니다.
 * waiting → starting 선점에 성공한 요청 하나만 GameSetter를 실행합니다.
 */
export const startGame = async ({ roomId, userId }) => {
  assertObjectId(roomId, "roomId")
  assertObjectId(userId, "userId")

  const lockedRoom = await Room.findOneAndUpdate(
    {
      _id: roomId,
      host: userId,
      status: "waiting",
    },
    {
      $set: {
        status: "starting",
        currentGameId: null,
      },
    },
    {
      new: true,
    }
  )

  if (!lockedRoom) {
    const room = await Room.findById(roomId)

    if (!room) {
      throw createServiceError(404, "존재하지 않는 방입니다.")
    }

    if (!sameId(room.host, userId)) {
      throw createServiceError(403, "방장만 게임을 시작할 수 있습니다.")
    }

    throw createServiceError(409, "이미 시작 중이거나 진행 중인 방입니다.")
  }

  try {
    // 최종 게임 규칙은 9명 또는 10명입니다.
    if (lockedRoom.participants.length < 9 || lockedRoom.participants.length > 10) {
      throw createServiceError(
        409,
        "ALIBI 게임은 9명 또는 10명의 참가자가 필요합니다."
      )
    }

    const [mapInfo, foundUsers] = await Promise.all([
      GameMap.findOne().lean(),
      User.find({ _id: { $in: lockedRoom.participants } })
        .select("_id username nickname")
        .lean(),
    ])

    if (!mapInfo) {
      throw createServiceError(500, "게임 생성에 사용할 Map 데이터가 없습니다.")
    }

    const orderedUsers = orderUsersByParticipants(
      foundUsers,
      lockedRoom.participants
    )

    if (orderedUsers.length !== lockedRoom.participants.length) {
      throw createServiceError(500, "일부 참가자 사용자 정보를 찾을 수 없습니다.")
    }

    const safeUsers = makeSafeGeneratorUsers(orderedUsers)

    /**
     * TODO(준홍님 함수 확인)
     * - setGame() 내부 무한 재시도 제한
     * - role_char00 제외
     * - 힌트 오류 수정
     * - 범행 슬롯/도구/목격 정합성 보장
     * 다원님 영역에서는 함수에 안전한 사용자와 Map을 넣고 반환값을 저장만 합니다.
     */
    const generated = setGame(safeUsers, mapInfo)

    const game = await Game.create(
      buildGameDocument({
        room: lockedRoom,
        mapInfo,
        users: orderedUsers,
        generated,
      })
    )

    await Room.findByIdAndUpdate(roomId, {
      $set: {
        status: "playing",
        currentGameId: game._id,
      },
    })

    return {
      roomId: String(roomId),
      gameId: String(game._id),
    }
  } catch (error) {
    // 생성 실패 시 방을 다시 시작 가능한 waiting 상태로 복구합니다.
    await Room.findByIdAndUpdate(roomId, {
      $set: {
        status: "waiting",
        currentGameId: null,
      },
    })

    throw error
  }
}

// 최초 진입과 새로고침에서 사용자별 안전한 게임 상태를 반환합니다.
export const getGameForUser = async ({ gameId, userId }) => {
  const game = await getGameDocumentForParticipant(gameId, userId)
  return buildClientGameView(game, userId)
}

// 현재 제출 현황만 다시 계산해 Socket 이벤트 payload로 사용합니다.
export const getSubmissionStatus = async ({ gameId, userId }) => {
  const game = await getGameDocumentForParticipant(gameId, userId)
  return getSubmissionStatusFromGame(game)
}

// 공식 진술 한 건을 원자적으로 추가합니다.
export const createOfficialStatement = async ({ gameId, userId, payload }) => {
  const game = await getGameDocumentForParticipant(gameId, userId)

  if (game.status !== "playing" || game.phase !== "active") {
    throw createServiceError(409, "현재 공식 진술을 제출할 수 없는 상태입니다.")
  }

  requireText(payload.clientRequestId, "clientRequestId")
  validateStatementPayload(game, payload)

  const recordId = new mongoose.Types.ObjectId()
  const record = {
    _id: recordId,
    recordType: "statement",
    round: game.currentRound,
    authorId: userId,
    targetId: null,
    subjectPlayerId: null,
    questionId: null,
    statementType: payload.statementType,
    questionType: null,
    time: Number(payload.time),
    section: payload.section,
    placeId: payload.placeId || null,
    companionPlayerIds: payload.companionPlayerIds || [],
    itemId: payload.itemId || null,
    claim: payload.claim || null,
    action: payload.action?.trim() || null,
    answer: null,
    status: "pending",
    conflicts: [],
    clientRequestId: payload.clientRequestId,
    createdAt: new Date(),
  }

  const updatedGame = await Game.findOneAndUpdate(
    {
      _id: gameId,
      status: "playing",
      phase: "active",
      currentRound: game.currentRound,
      "officialRecords.clientRequestId": { $ne: payload.clientRequestId },
      officialRecords: {
        $not: {
          $elemMatch: {
            recordType: "statement",
            round: game.currentRound,
            authorId: new mongoose.Types.ObjectId(userId),
          },
        },
      },
    },
    {
      $push: {
        officialRecords: record,
      },
      $inc: {
        revision: 1,
      },
    },
    {
      new: true,
      runValidators: true,
    }
  )

  if (!updatedGame) {
    throw createServiceError(
      409,
      "이미 이 라운드의 공식 진술을 제출했거나 같은 요청이 처리되었습니다."
    )
  }

  return {
    record: updatedGame.officialRecords.id(recordId),
    submissionStatus: getSubmissionStatusFromGame(updatedGame),
    revision: updatedGame.revision,
  }
}

// 공식 질문 한 건을 저장하고 질문자의 사용 횟수를 원자적으로 1 증가시킵니다.
export const createOfficialQuestion = async ({ gameId, userId, payload }) => {
  const game = await getGameDocumentForParticipant(gameId, userId)

  if (game.status !== "playing" || game.phase !== "active") {
    throw createServiceError(409, "현재 공식 질문을 제출할 수 없는 상태입니다.")
  }

  requireText(payload.clientRequestId, "clientRequestId")
  validateQuestionPayload(game, userId, payload)

  const recordId = new mongoose.Types.ObjectId()
  const record = {
    _id: recordId,
    recordType: "question",
    round: game.currentRound,
    authorId: userId,
    targetId: payload.targetPlayerId,
    subjectPlayerId: payload.subjectPlayerId || null,
    questionId: null,
    statementType: null,
    questionType: payload.questionType,
    time: Number(payload.time),
    section: payload.section,
    placeId: payload.placeId || null,
    companionPlayerIds: [],
    itemId: payload.itemId || null,
    claim: null,
    action: null,
    answer: null,
    status: "pending",
    conflicts: [],
    clientRequestId: payload.clientRequestId,
    createdAt: new Date(),
  }

  const updatedGame = await Game.findOneAndUpdate(
    {
      _id: gameId,
      status: "playing",
      phase: "active",
      currentRound: game.currentRound,
      "officialRecords.clientRequestId": { $ne: payload.clientRequestId },
      players: {
        $elemMatch: {
          userId: new mongoose.Types.ObjectId(userId),
          questionCount: { $lt: 2 },
        },
      },
    },
    {
      $push: {
        officialRecords: record,
      },
      $inc: {
        "players.$[questionAuthor].questionCount": 1,
        revision: 1,
      },
    },
    {
      new: true,
      runValidators: true,
      arrayFilters: [
        {
          "questionAuthor.userId": new mongoose.Types.ObjectId(userId),
        },
      ],
    }
  )

  if (!updatedGame) {
    throw createServiceError(
      409,
      "질문 가능 횟수 2회를 모두 사용했거나 같은 요청이 처리되었습니다."
    )
  }

  return {
    record: updatedGame.officialRecords.id(recordId),
    submissionStatus: getSubmissionStatusFromGame(updatedGame),
    revision: updatedGame.revision,
  }
}

// 질문을 받은 사용자만 YES/NO 답변 한 건을 저장할 수 있습니다.
export const answerOfficialQuestion = async ({
  gameId,
  questionId,
  userId,
  payload,
}) => {
  assertObjectId(questionId, "questionId")

  const game = await getGameDocumentForParticipant(gameId, userId)

  if (game.status !== "playing" || game.phase !== "active") {
    throw createServiceError(409, "현재 공식 답변을 제출할 수 없는 상태입니다.")
  }

  requireText(payload.clientRequestId, "clientRequestId")

  if (typeof payload.answer !== "boolean") {
    throw createServiceError(400, "answer는 true 또는 false여야 합니다.")
  }

  const question = game.officialRecords.id(questionId)

  if (!question || question.recordType !== "question") {
    throw createServiceError(404, "존재하지 않는 공식 질문입니다.")
  }

  if (!sameId(question.targetId, userId)) {
    throw createServiceError(403, "질문을 받은 사용자만 답변할 수 있습니다.")
  }

  if (question.status !== "pending") {
    throw createServiceError(409, "이미 답변이 완료된 질문입니다.")
  }

  const answerRecordId = new mongoose.Types.ObjectId()
  const answerRecord = {
    _id: answerRecordId,
    recordType: "answer",
    round: question.round,
    authorId: userId,
    targetId: question.authorId,
    subjectPlayerId: question.subjectPlayerId,
    questionId: question._id,
    statementType: null,
    questionType: question.questionType,
    time: question.time,
    section: question.section,
    placeId: question.placeId,
    companionPlayerIds: [],
    itemId: question.itemId,
    claim: null,
    action: null,
    answer: payload.answer,
    status: "pending",
    conflicts: [],
    clientRequestId: payload.clientRequestId,
    createdAt: new Date(),
  }

  const updatedGame = await Game.findOneAndUpdate(
    {
      _id: gameId,
      status: "playing",
      phase: "active",
      "officialRecords.clientRequestId": { $ne: payload.clientRequestId },
      officialRecords: {
        $elemMatch: {
          _id: new mongoose.Types.ObjectId(questionId),
          recordType: "question",
          targetId: new mongoose.Types.ObjectId(userId),
          status: "pending",
        },
      },
    },
    {
      $set: {
        "officialRecords.$[question].status": "answered",
      },
      $push: {
        officialRecords: answerRecord,
      },
      $inc: {
        revision: 1,
      },
    },
    {
      new: true,
      runValidators: true,
      arrayFilters: [
        {
          "question._id": new mongoose.Types.ObjectId(questionId),
          "question.status": "pending",
        },
      ],
    }
  )

  if (!updatedGame) {
    throw createServiceError(409, "이미 답변되었거나 같은 요청이 처리되었습니다.")
  }

  return {
    record: updatedGame.officialRecords.id(answerRecordId),
    submissionStatus: getSubmissionStatusFromGame(updatedGame),
    revision: updatedGame.revision,
  }
}

/**
 * TODO(준홍님 구현 1/3)
 * officialRecords를 준홍님의 검사 함수가 요구하는
 * inGamePlayerTimelineMap / inGameWitnessesMap 또는 새 입력 DTO로 변환해야 합니다.
 *
 * 권장 반환 예:
 * {
 *   inGamePlayerTimelineMap,
 *   inGameWitnessesMap,
 *   qanda
 * }
 */
export const projectOfficialRecordsForValidation = (_game) => {
  return null
}

/**
 * TODO(준홍님 구현 2/3)
 * 한 라운드 전체 공식 기록의 실제 모순 판정을 수행해야 합니다.
 * 현재 null 반환은 "구현되지 않음"을 명시하며 임의 통과시키지 않습니다.
 *
 * 권장 반환 형식:
 * {
 *   valid: false,
 *   records: [
 *     {
 *       recordId,
 *       status: "contradiction",
 *       conflicts: [{ code: "PLACE_CONFLICT", message, relatedRecordIds: [] }]
 *     }
 *   ],
 *   summary: { checked: 10, contradictions: 2 }
 * }
 */
export const runRoundContradictionCheck = async (_input) => {
  return null
}

// 검사 결과를 officialRecords의 status/conflicts에 반영합니다.
const applyRoundCheckResult = (game, checkResult) => {
  ;(checkResult.records || []).forEach((recordResult) => {
    const record = game.officialRecords.id(recordResult.recordId)

    if (!record) {
      return
    }

    record.status = recordResult.status || "verified"
    record.conflicts = recordResult.conflicts || []
  })
}

/**
 * 제출 완료 후 라운드 모순 검사를 한 번만 실행하고 힌트/다음 라운드를 갱신합니다.
 * 모든 참가자가 동시에 호출해도 active → checking 선점에 성공한 요청 하나만 실행됩니다.
 */
export const checkRoundContradictionsAndAdvance = async ({
  gameId,
  userId,
  round,
  clientRequestId,
}) => {
  requireText(clientRequestId, "clientRequestId")

  const currentGame = await getGameDocumentForParticipant(gameId, userId)

  if (Number(round) !== currentGame.currentRound) {
    throw createServiceError(409, "이미 지나갔거나 아직 시작하지 않은 라운드입니다.")
  }

  const beforeLockStatus = getSubmissionStatusFromGame(currentGame)

  if (!beforeLockStatus.allReady) {
    throw createServiceError(
      409,
      "모든 공식 진술 제출과 공식 답변 완료 후 검사할 수 있습니다."
    )
  }

  const lockedGame = await Game.findOneAndUpdate(
    {
      _id: gameId,
      currentRound: Number(round),
      status: "playing",
      phase: "active",
    },
    {
      $set: {
        phase: "checking",
      },
      $inc: {
        revision: 1,
      },
    },
    {
      new: true,
    }
  ).select("+secretData")

  if (!lockedGame) {
    throw createServiceError(409, "다른 요청이 이미 이 라운드를 검사 중입니다.")
  }

  try {
    const validationInput = projectOfficialRecordsForValidation(lockedGame)

    if (!validationInput) {
      throw createServiceError(
        501,
        "준홍님의 공식 기록 변환 함수가 아직 구현되지 않았습니다.",
        "JUNHONG_PROJECTION_TODO"
      )
    }

    const checkResult = await runRoundContradictionCheck({
      gameId: String(lockedGame._id),
      round: Number(round),
      officialRecords: lockedGame.officialRecords,
      preparedPlayerTimelineMap:
        lockedGame.secretData.preparedPlayerTimelineMap,
      witnessesMap: lockedGame.secretData.witnessesMap,
      ...validationInput,
    })

    if (!checkResult) {
      throw createServiceError(
        501,
        "준홍님의 라운드 모순 검사 함수가 아직 구현되지 않았습니다.",
        "JUNHONG_CONTRADICTION_TODO"
      )
    }

    applyRoundCheckResult(lockedGame, checkResult)

    const contradictionCount =
      checkResult.summary?.contradictions ||
      (checkResult.records || []).filter(
        (record) => record.status === "contradiction"
      ).length

    lockedGame.roundChecks.push({
      round: Number(round),
      valid: Boolean(checkResult.valid),
      checkedRecordCount:
        checkResult.summary?.checked ||
        lockedGame.officialRecords.filter(
          (record) => record.round === Number(round)
        ).length,
      contradictionCount,
      checkedAt: new Date(),
    })

    // 방금 종료한 라운드 뒤에 공개될 힌트를 현재 시각으로 엽니다.
    const hintToReveal = lockedGame.hints.find(
      (hint) => hint.revealAfterRound === Number(round)
    )

    if (hintToReveal && !hintToReveal.revealedAt) {
      hintToReveal.revealedAt = new Date()
    }

    if (Number(round) < 5) {
      const nextClock = createRoundClock()
      lockedGame.currentRound = Number(round) + 1
      lockedGame.phase = "active"
      lockedGame.roundStartedAt = nextClock.roundStartedAt
      lockedGame.roundEndsAt = nextClock.roundEndsAt
    } else {
      // 5라운드 종료 후에는 새 진술을 받지 않고 최종 추리 단계로 전환합니다.
      lockedGame.phase = "deduction"
    }

    lockedGame.revision += 1
    await lockedGame.save()

    return {
      gameId: String(lockedGame._id),
      checkedRound: Number(round),
      nextRound: lockedGame.phase === "active" ? lockedGame.currentRound : null,
      phase: lockedGame.phase,
      result: checkResult,
      revealedHint: hintToReveal
        ? sanitizeHints([hintToReveal])[0]
        : null,
      revision: lockedGame.revision,
    }
  } catch (error) {
    // TODO 구현 전 501 오류나 검사 실패가 나면 게임이 checking에서 영구 정지하지 않게 되돌립니다.
    await Game.updateOne(
      {
        _id: gameId,
        currentRound: Number(round),
        phase: "checking",
      },
      {
        $set: {
          phase: "active",
        },
        $inc: {
          revision: 1,
        },
      }
    )

    throw error
  }
}

// 최종 추리 payload의 ID/슬롯/후보 존재 여부를 검사합니다.
const validateDeductionPayload = (game, payload) => {
  assertObjectId(payload.criminalPlayerId, "criminalPlayerId")
  assertValidTimeSlot(game, payload.crimeTime, payload.crimeSection)
  requireText(payload.crimePlaceId, "crimePlaceId")
  requireText(payload.crimeItemId, "crimeItemId")

  if (!game.players.some((player) => sameId(player.userId, payload.criminalPlayerId))) {
    throw createServiceError(400, "범인 후보가 게임 참가자가 아닙니다.")
  }

  if (!game.mapSnapshot.places.some((place) => place.id === payload.crimePlaceId)) {
    throw createServiceError(400, "존재하지 않는 범행 장소 후보입니다.")
  }

  if (!game.mapSnapshot.itemsInUse.some((item) => item.id === payload.crimeItemId)) {
    throw createServiceError(400, "존재하지 않는 범행 도구 후보입니다.")
  }

  const finalHint = game.hints.find((hint) => hint.key === "FINAL_TIME_SLOTS_5")
  const isFinalTimeCandidate = (finalHint?.values || []).some(
    (slot) =>
      Number(slot.time) === Number(payload.crimeTime) &&
      slot.section === payload.crimeSection
  )

  if (!isFinalTimeCandidate) {
    throw createServiceError(400, "최종 힌트에 포함되지 않은 시간 슬롯입니다.")
  }
}

/**
 * TODO(준홍님 구현 3/3)
 * 전체 deductions를 secretData.crimeInfo의 정답과 비교하고 승패를 계산해야 합니다.
 * 현재 null을 반환하므로 임의로 정답 처리하거나 게임을 종료하지 않습니다.
 *
 * 권장 반환:
 * {
 *   results: [{ userId, isCorrect }],
 *   winnerIds: [],
 *   loserIds: [],
 *   solution: { criminalPlayerId, crimeTime, crimeSection, crimePlaceId, crimeItemId }
 * }
 */
export const evaluateFinalDeductions = async (_game) => {
  return null
}

// 모든 최종 추리가 제출된 뒤 준홍님 판정 함수가 구현되어 있으면 Game/GameLog/Room을 종료합니다.
const finalizeGameIfReady = async (game) => {
  const allSubmitted = game.deductions.length === game.players.length

  if (!allSubmitted) {
    return {
      finished: false,
      requiresJunhongImplementation: false,
    }
  }

  const evaluation = await evaluateFinalDeductions(game)

  if (!evaluation) {
    return {
      finished: false,
      requiresJunhongImplementation: true,
    }
  }

  ;(evaluation.results || []).forEach((result) => {
    const deduction = game.deductions.find((item) =>
      sameId(item.userId, result.userId)
    )

    if (deduction) {
      deduction.isCorrect = Boolean(result.isCorrect)
    }
  })

  game.status = "finished"
  game.phase = "finished"
  game.finishedAt = new Date()
  game.revision += 1
  await game.save()

  const winnerNames = game.players
    .filter((player) =>
      (evaluation.winnerIds || []).some((id) => sameId(id, player.userId))
    )
    .map((player) => player.nickname)

  const loserNames = game.players
    .filter((player) =>
      (evaluation.loserIds || []).some((id) => sameId(id, player.userId))
    )
    .map((player) => player.nickname)

  await GameLog.findOneAndUpdate(
    {
      gameId: game._id,
    },
    {
      $setOnInsert: {
        gameId: game._id,
        roomId: game.roomId,
        room_code: game.roomSnapshot.inviteCode,
        room_members: game.players.map((player) => player.nickname),
        room_winner: winnerNames,
        room_loser: loserNames,
        solution: evaluation.solution,
      },
    },
    {
      upsert: true,
      new: true,
    }
  )

  await Room.findByIdAndUpdate(game.roomId, {
    $set: {
      status: "finished",
    },
  })

  return {
    finished: true,
    requiresJunhongImplementation: false,
    resultPath: `/result/${game._id}`,
  }
}

// 최종 추리 한 건을 중복 없이 저장합니다.
export const submitFinalDeduction = async ({ gameId, userId, payload }) => {
  const game = await getGameDocumentForParticipant(gameId, userId)

  if (game.status !== "playing" || game.phase !== "deduction") {
    throw createServiceError(409, "현재 최종 추리를 제출할 수 없는 상태입니다.")
  }

  requireText(payload.clientRequestId, "clientRequestId")
  validateDeductionPayload(game, payload)

  const deductionId = new mongoose.Types.ObjectId()
  const deduction = {
    _id: deductionId,
    userId,
    criminalPlayerId: payload.criminalPlayerId,
    crimeTime: Number(payload.crimeTime),
    crimeSection: payload.crimeSection,
    crimePlaceId: payload.crimePlaceId,
    crimeItemId: payload.crimeItemId,
    clientRequestId: payload.clientRequestId,
    isCorrect: null,
    submittedAt: new Date(),
  }

  const updatedGame = await Game.findOneAndUpdate(
    {
      _id: gameId,
      status: "playing",
      phase: "deduction",
      "deductions.userId": { $ne: new mongoose.Types.ObjectId(userId) },
      "deductions.clientRequestId": { $ne: payload.clientRequestId },
    },
    {
      $push: {
        deductions: deduction,
      },
      $inc: {
        revision: 1,
      },
    },
    {
      new: true,
      runValidators: true,
    }
  ).select("+secretData")

  if (!updatedGame) {
    throw createServiceError(409, "이미 최종 추리를 제출했거나 같은 요청이 처리되었습니다.")
  }

  const finalization = await finalizeGameIfReady(updatedGame)

  return {
    deduction: updatedGame.deductions.id(deductionId),
    deductionStatus: updatedGame.players.map((player) => ({
      userId: String(player.userId),
      nickname: player.nickname,
      submitted: updatedGame.deductions.some((item) =>
        sameId(item.userId, player.userId)
      ),
    })),
    revision: updatedGame.revision,
    ...finalization,
  }
}
