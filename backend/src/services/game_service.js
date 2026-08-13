/**
 * game_service.js
 * -----------------------------------------------------------------------------
 * 역할
 * - REST Controller와 Socket Handler가 공통으로 사용하는 게임 진행 흐름입니다.
 * - 방 시작 잠금 → GameSetter 호출 → Game 저장 → Room 연결을 한곳에서 처리합니다.
 * - 공식 진술·질문·답변·최종 추리를 구조화된 JSON으로 검증하고 저장합니다.
 * - 모든 플레이어의 제출 완료 상태를 계산합니다.
 * - 마지막 제출/서버 타이머가 동시에 진행을 시도해도 progressionLock으로 한 번만 실행합니다.
 * - API에 정답 데이터가 섞이지 않도록 사용자별 안전한 응답을 만듭니다.
 *
 * 핵심 판정 책임
 * - 공식 기록을 논리 주장으로 바꾸고 라운드 모순을 검사합니다.
 * - 범인·시간·장소·도구 4개 정답과 역할별 승패를 서버에서 판정합니다.
 * - 게임 결과와 사용자 승패 통계를 한 번만 저장합니다.
 */

import mongoose from "mongoose"

import {
  getGamePlayerLimits,
  MAX_QUESTIONS_PER_PLAYER,
  MAX_QUESTIONS_PER_PLAYER_PER_ROUND,
} from "../config/gameConfig.js"
import {
  checkWitnessMapValidation,
  inGameCheckValidation,
  setGame,
} from "../../GameSetter.js"
import Game from "../models/Game.js"
import GameLog from "../models/GameLog.js"
import GameMap from "../models/Map.js"
import Room from "../models/Room.js"
import User from "../models/User.js"
import Log from "../models/AdminLog.js"

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
    description: "3라운드 종료 후 공개된 도구 특징을 참고해 소지 도구를 진술합니다.",
    requiredStatementType: "ITEM_POSSESSION",
  },
  {
    number: 5,
    title: "최종 후보 장소 진술",
    description: "4라운드 종료 후 공개된 후보 장소 3곳 안에서 마지막 진술을 합니다.",
    requiredStatementType: "ALIBI",
  },
]

// 세부 단계 이름은 DB·Socket·프론트가 공유하는 공개 계약입니다.
export const GAME_STAGES = Object.freeze({
  STATEMENT: "statement",
  DISCUSSION: "discussion",
  QUESTION: "question",
  ANSWER: "answer",
  CHECKING: "checking",
  HINT: "hint",
  DEDUCTION: "deduction",
  FINISHED: "finished",
})

export const GAME_STAGE_LABELS = Object.freeze({
  [GAME_STAGES.STATEMENT]: "공식 진술 제출",
  [GAME_STAGES.DISCUSSION]: "자유 추리·채팅",
  [GAME_STAGES.QUESTION]: "공식 질문 제출",
  [GAME_STAGES.ANSWER]: "공식 답변",
  [GAME_STAGES.CHECKING]: "모순 검사",
  [GAME_STAGES.HINT]: "힌트 공개",
  [GAME_STAGES.DEDUCTION]: "최종 추리",
  [GAME_STAGES.FINISHED]: "게임 종료",
})

// 시연·운영 환경에서 코드 수정 없이 초 단위 시간을 조정할 수 있습니다.
// dotenv가 import 평가 뒤 실행되므로 값을 모듈 상수가 아니라 함수 호출 시 읽습니다.
const readPositiveSeconds = (key, fallback) => {
  const value = Number(process.env[key] || fallback)
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback
}

export const getGameStageDurations = () => ({
  [GAME_STAGES.STATEMENT]: readPositiveSeconds("GAME_STATEMENT_SECONDS", 120),
  [GAME_STAGES.DISCUSSION]: readPositiveSeconds("GAME_DISCUSSION_SECONDS", 120),
  [GAME_STAGES.QUESTION]: readPositiveSeconds("GAME_QUESTION_SECONDS", 90),
  [GAME_STAGES.ANSWER]: readPositiveSeconds("GAME_ANSWER_SECONDS", 90),
  [GAME_STAGES.HINT]: readPositiveSeconds("GAME_HINT_SECONDS", 10),
  [GAME_STAGES.DEDUCTION]: readPositiveSeconds("GAME_DEDUCTION_SECONDS", 180),
})

const getMaxQuestionsPerTargetPerRound = () =>
  readPositiveSeconds("GAME_MAX_QUESTIONS_PER_TARGET_PER_ROUND", 2)

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
  error.isOperational = true
  return error
}

// MongoDB 경로·쿼리·스택 문구는 클라이언트에 절대 노출하지 않습니다.
export const makePublicGameError = (
  error,
  fallbackMessage = "게임 처리 중 오류가 발생했습니다."
) => {
  const status = Number(error?.status)
  const canExpose = Boolean(error?.isOperational) && status >= 400 && status < 500

  return {
    status: canExpose ? status : 500,
    code: canExpose ? error.code || "GAME_REQUEST_ERROR" : "GAME_INTERNAL_ERROR",
    message: canExpose ? error.message : fallbackMessage,
  }
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

// 현재 세부 단계의 시작·종료 시각을 서버 기준으로 생성합니다.
const createStageClock = (stage, startedAt = new Date()) => {
  const durationSeconds = getGameStageDurations()[stage]
  const normalizedStartedAt = new Date(startedAt)
  const stageEndsAt = Number.isFinite(durationSeconds)
    ? new Date(normalizedStartedAt.getTime() + durationSeconds * 1000)
    : null

  return {
    stageStartedAt: normalizedStartedAt,
    stageEndsAt,
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

// 이전 GameSetter 결과도 열 수 있도록 남겨 둔 호환용 보조 함수입니다.
// 원본 규칙과 동일하게 사용 도구는 최대 8개이며, 부족분을 임의로 채우지 않습니다.
const extractItemsInUseFallback = (generated) => {
  const itemById = new Map()

    ; (generated.preparedPlayerTimelineMap || []).forEach((playerTimeline) => {
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
export const buildGameDocument = ({ room, mapInfo, users, generated }) => {
  const clock = createStageClock(GAME_STAGES.STATEMENT)

  // 최신 생성값을 우선하고, 구버전 결과에는 타임라인 추출 fallback을 적용합니다.
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
    stage: GAME_STAGES.STATEMENT,
    currentRound: 1,
    roundStartedAt: clock.stageStartedAt,
    roundEndsAt: clock.stageEndsAt,
    stageStartedAt: clock.stageStartedAt,
    stageEndsAt: clock.stageEndsAt,
    progressionLock: null,
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

    // 정답인 범행 장소·도구·시각은 공개 브리핑에 넣지 않습니다.
    caseBriefing: {
      title: generated.caseBriefing?.title || "저택 살인사건",
      victimName: generated.caseBriefing?.victimName || "피해자",
      victimAge: generated.caseBriefing?.victimAge || null,
      victimOccupation: generated.caseBriefing?.victimOccupation || "저택의 주인",
      victimDescription: generated.caseBriefing?.victimDescription || "",
      // GameSetter가 정하지 않은 발견 장소·시각을 서버가 임의 값으로 만들지 않습니다.
      discoveredAt: generated.caseBriefing?.discoveredAt || null,
      discoveredPlaceId: generated.caseBriefing?.discoveredPlaceId || null,
      causeOfDeath: generated.caseBriefing?.causeOfDeath || "조사 중",
    },
    rulesSnapshot: {
      participantCount: users.length,
      maxPlayersAtSamePlace: 2,
      maxCompanions: 1,
      maxQuestionsPerPlayer: MAX_QUESTIONS_PER_PLAYER,
      maxQuestionsPerPlayerPerRound: MAX_QUESTIONS_PER_PLAYER_PER_ROUND,
      maxQuestionsPerTargetPerRound: getMaxQuestionsPerTargetPerRound(),
      maxItemsInUse: 8,
      roundCount: 5,
      slotCount: 18,
      stageDurationsSeconds: getGameStageDurations(),
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
// 진술의 공개 논리 모순 여부는 라운드 종료 시 서버 검사기가 판정합니다.
const validateStatementPayload = (game, payload, authorId) => {
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

    const selectedPlace = game.mapSnapshot.places.find(
      (place) => place.id === payload.placeId
    )

    if (!selectedPlace) {
      throw createServiceError(400, "존재하지 않는 장소 ID입니다.")
    }

    // GameSetter의 alibi.action도 place_action에서 생성되므로 공식 진술 역시
    // 선택한 장소에 실제로 정의된 행동 중 하나만 구조화해서 저장합니다.
    const action = requireText(payload.action, "action")
    if (!(selectedPlace.actions || []).includes(action)) {
      throw createServiceError(400, "선택한 장소에서 사용할 수 없는 행동입니다.")
    }

    const companions = payload.companionPlayerIds || []

    if (!Array.isArray(companions) || companions.length > 1) {
      throw createServiceError(400, "동행자는 최대 1명까지만 선택할 수 있습니다.")
    }

    companions.forEach((companionId) => {
      assertObjectId(companionId, "companionPlayerId")

      if (sameId(companionId, authorId)) {
        throw createServiceError(400, "자기 자신을 동행자로 선택할 수 없습니다.")
      }

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

    const itemExists = game.mapSnapshot.itemsInUse.some(
      (item) => item.id === payload.itemId
    )

    if (!itemExists) {
      throw createServiceError(400, "이번 게임에서 사용하지 않는 도구 ID입니다.")
    }

    // 거짓 진술이 허용되는 게임이므로 실제 소지 도구로 선택지를 제한하지 않습니다.
    // 4라운드는 선택한 도구를 "소지했다"는 positive alibi.item 주장으로만 저장합니다.
    // "소지하지 않았다"는 부정 주장은 공식 Q&A의 NO 답변으로 표현합니다.
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
    assertObjectId(payload.subjectPlayerId, "subjectPlayerId")

    if (sameId(payload.subjectPlayerId, payload.targetPlayerId)) {
      throw createServiceError(400, "질문 대상 자신을 목격 대상으로 선택할 수 없습니다.")
    }

    if (!game.players.some((player) => sameId(player.userId, payload.subjectPlayerId))) {
      throw createServiceError(400, "목격 대상이 게임 참가자가 아닙니다.")
    }
  }

  if (payload.questionType === "ITEM_POSSESSION") {
    requireText(payload.itemId, "itemId")
  }

  if (
    payload.placeId &&
    !game.mapSnapshot.places.some((place) => place.id === payload.placeId)
  ) {
    throw createServiceError(400, "존재하지 않는 장소 ID입니다.")
  }

  if (
    payload.itemId &&
    !game.mapSnapshot.itemsInUse.some((item) => item.id === payload.itemId)
  ) {
    throw createServiceError(400, "이번 게임에서 사용하지 않는 도구 ID입니다.")
  }
}

// v5에서 timeout 시 비밀 타임라인/가짜 답변으로 생성했던 officialRecord는
// v6 공개 기록으로 취급하지 않습니다. DB에 남아 있어도 화면·검사·제출수에서 제외합니다.
const isLegacyFakeTimeoutRecord = (record) =>
  record?.submissionSource === "system_timeout" &&
  ["statement", "answer"].includes(record?.recordType)

// 라운드별 진술 제출자와 미답변 질문 수를 계산합니다.
const getSubmissionStatusFromGame = (game) => {
  const round = game.currentRound
  const submittedUserIds = new Set(
    game.officialRecords
      .filter(
        (record) =>
          record.recordType === "statement" &&
          record.round === round &&
          !isLegacyFakeTimeoutRecord(record)
      )
      .map((record) => String(record.authorId))
  )

  const pendingQuestions = game.officialRecords.filter(
    (record) =>
      record.recordType === "question" &&
      record.round === round &&
      record.status === "pending"
  )

  const questionAuthorIds = new Set(
    game.officialRecords
      .filter(
        (record) =>
          record.recordType === "question" && record.round === round
      )
      .map((record) => String(record.authorId))
  )

  const players = game.players.map((player) => ({
    userId: String(player.userId),
    nickname: player.nickname,
    submitted: submittedUserIds.has(String(player.userId)),
    questionSubmitted: questionAuthorIds.has(String(player.userId)),
  }))

  const submittedCount = players.filter((player) => player.submitted).length
  const questionSubmittedCount = players.filter(
    (player) => player.questionSubmitted
  ).length
  const targetQuestionCounts = Object.fromEntries(
    game.players.map((player) => {
      const count = game.officialRecords.filter(
        (record) =>
          record.recordType === "question" &&
          record.round === round &&
          sameId(record.targetId, player.userId)
      ).length

      return [String(player.userId), count]
    })
  )

  return {
    round,
    stage: game.stage,
    submittedCount,
    totalCount: players.length,
    allStatementsSubmitted: submittedCount === players.length,
    questionSubmittedCount,
    allQuestionsSubmitted:
      players.length > 0 && questionSubmittedCount === players.length,
    pendingQuestionCount: pendingQuestions.length,
    targetQuestionCounts,
    maxQuestionsPerTargetPerRound:
      game.rulesSnapshot?.maxQuestionsPerTargetPerRound ||
      getMaxQuestionsPerTargetPerRound(),
    maxQuestionsPerPlayer:
      game.rulesSnapshot?.maxQuestionsPerPlayer || MAX_QUESTIONS_PER_PLAYER,
    maxQuestionsPerPlayerPerRound:
      game.rulesSnapshot?.maxQuestionsPerPlayerPerRound ||
      MAX_QUESTIONS_PER_PLAYER_PER_ROUND,
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
      stage: game.stage,
      stageLabel: GAME_STAGE_LABELS[game.stage] || game.stage,
      currentRound: game.currentRound,
      roundStartedAt: game.roundStartedAt,
      roundEndsAt: game.roundEndsAt,
      stageStartedAt: game.stageStartedAt,
      stageEndsAt: game.stageEndsAt,
      serverNow: new Date(),
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
      officialRecords: game.officialRecords.filter(
        (record) => !isLegacyFakeTimeoutRecord(record)
      ),
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
      // 범인 여부는 자기 응답에만 포함됩니다. 다른 참가자의 공개 player에는 넣지 않습니다.
      isKiller:
        participant.characterId === game.secretData?.crimeInfo?.crimeRole?.role_id,
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
    const { minPlayers, maxPlayers } = getGamePlayerLimits()
    if (
      lockedRoom.participants.length < minPlayers ||
      lockedRoom.participants.length > maxPlayers
    ) {
      throw createServiceError(
        409,
        `ALIBI 게임은 ${minPlayers}~${maxPlayers}명의 참가자가 필요합니다.`
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

    // GameSetter는 생성 전 입력 수량과 hard 정합성을 자체 검사합니다.
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

// 관리자 게임관리에서 전체 게임 목록을 조회합니다.
export const getAllGames  = async () => {
  return Game.find({})
    .sort({ createdAt: -1 })
    .lean()
}

// 종료된 한 판의 정답과 참가자별 승패를 gameId로 조회합니다.
// Room은 종료 후 삭제될 수 있으므로 결과 조회에서 Room 문서에 의존하지 않습니다.
export const getGameResultForUser = async ({ gameId, userId }) => {
  const game = await getGameDocumentForParticipant(gameId, userId)

  if (game.status !== "finished" || game.phase !== "finished") {
    throw createServiceError(409, "아직 종료되지 않은 게임입니다.")
  }

  const gameLog = await GameLog.findOne({ gameId: game._id }).lean()
  if (!gameLog) {
    throw createServiceError(404, "게임 결과 로그를 찾을 수 없습니다.")
  }

  const solution = gameLog.solution || {}
  const criminal = game.players.find((player) =>
    sameId(player.userId, solution.criminalPlayerId)
  )
  const place = game.mapSnapshot.places.find(
    (entry) => entry.id === solution.crimePlaceId
  )
  const item = game.mapSnapshot.itemsInUse.find(
    (entry) => entry.id === solution.crimeItemId
  )
  const minute = SECTION_MINUTES[solution.crimeSection]
  const crimeTimeLabel = Number.isFinite(Number(solution.crimeTime)) && minute !== undefined
    ? `${String(solution.crimeTime).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
    : "-"
  const players = (gameLog.playerResults || []).map((result) => ({
    userId: String(result.userId),
    username: result.username,
    nickname: result.nickname,
    characterId: result.characterId,
    characterName: result.characterName,
    isKiller: result.isKiller,
    isCorrect: result.isCorrect,
    win: result.win,
    correctFields: result.correctFields,
    deduction: result.deduction,
  }))

  return {
    result: {
      gameId: String(game._id),
      roomId: String(game.roomId),
      roomTitle: game.roomSnapshot.title,
      roomCode: game.roomSnapshot.inviteCode,
      startedAt: game.startedAt,
      finishedAt: game.finishedAt || gameLog.finishedAt,
      citizenWinnerCount: gameLog.citizenWinnerCount,
      killerWon: gameLog.killerWon,
      solution: {
        criminalPlayerId: String(solution.criminalPlayerId),
        criminalNickname: criminal?.nickname || "알 수 없음",
        criminalCharacterName: criminal?.characterName || "알 수 없음",
        crimeTime: solution.crimeTime,
        crimeSection: solution.crimeSection,
        crimeTimeLabel,
        crimePlaceId: solution.crimePlaceId,
        crimePlaceName: place?.name || solution.crimePlaceId,
        crimeItemId: solution.crimeItemId,
        crimeItemName: item?.name || solution.crimeItemId,
      },
      winners: players.filter((player) => player.win).map((player) => player.nickname),
      losers: players.filter((player) => !player.win).map((player) => player.nickname),
      players,
      viewerResult: players.find((player) => sameId(player.userId, userId)) || null,
    },
  }
}

const assertSubmissionStage = (game, expectedStage, message) => {
  if (
    game.status !== "playing" ||
    game.stage !== expectedStage ||
    game.progressionLock
  ) {
    throw createServiceError(409, message, "INVALID_GAME_STAGE")
  }

  if (game.stageEndsAt && new Date(game.stageEndsAt).getTime() <= Date.now()) {
    throw createServiceError(
      409,
      "이 단계의 제한 시간이 종료되었습니다. 서버가 다음 단계를 준비하고 있습니다.",
      "GAME_STAGE_EXPIRED"
    )
  }
}

// 공식 진술 한 건을 원자적으로 추가합니다.
export const createOfficialStatement = async ({ gameId, userId, payload }) => {
  const game = await getGameDocumentForParticipant(gameId, userId)
  requireText(payload.clientRequestId, "clientRequestId")

  // 저장 성공 응답이 네트워크에서 유실된 재전송은 단계가 이미 넘어갔더라도
  // 같은 clientRequestId의 기존 record를 그대로 반환합니다.
  const duplicateStatement = game.officialRecords.find(
    (record) =>
      record.recordType === "statement" &&
      sameId(record.authorId, userId) &&
      record.clientRequestId === payload.clientRequestId
  )
  if (duplicateStatement) {
    return {
      record: duplicateStatement,
      submissionStatus: getSubmissionStatusFromGame(game),
      revision: game.revision,
      events: [],
    }
  }

  assertSubmissionStage(
    game,
    GAME_STAGES.STATEMENT,
    "공식 진술 제출 단계에서만 진술할 수 있습니다."
  )

  validateStatementPayload(game, payload, userId)

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
    action: payload.action?.trim() || null,
    answer: null,
    submissionSource: "player",
    status: "submitted",
    validationStatus: "unchecked",
    conflicts: [],
    clientRequestId: payload.clientRequestId,
    createdAt: new Date(),
  }

  const updatedGame = await Game.findOneAndUpdate(
    {
      _id: gameId,
      status: "playing",
      stage: GAME_STAGES.STATEMENT,
      stageEndsAt: { $gt: new Date() },
      progressionLock: null,
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
      "이미 이 라운드의 공식 진술을 제출했거나 제출 시간이 종료되었습니다.",
      "STATEMENT_ALREADY_SUBMITTED"
    )
  }

  // 진술 저장은 이미 성공했습니다. 이후 검사/단계 전환이 실패하더라도
  // 저장 요청 자체를 실패로 응답하지 않고, 서버 타이머가 만료 시 다시 진행합니다.
  let progression = null
  if (getSubmissionStatusFromGame(updatedGame).allStatementsSubmitted) {
    try {
      progression = await advanceAfterAllStatements({
        gameId: String(updatedGame._id),
        now: new Date(),
      })
    } catch (error) {
      console.error(
        `[game-progression] 진술 저장 후 단계 전환 지연 (${updatedGame._id}):`,
        error
      )
    }
  }
  const finalGame = progression?.game || updatedGame

  return {
    record:
      finalGame.officialRecords.id(recordId) ||
      updatedGame.officialRecords.id(recordId),
    submissionStatus: getSubmissionStatusFromGame(finalGame),
    revision: finalGame.revision,
    events: progression?.events || [],
  }
}

// 공식 질문 한 건을 저장하고 질문자의 사용 횟수를 원자적으로 1 증가시킵니다.
// 한 참가자는 라운드당 1회, 게임 전체에서 최대 5회 질문할 수 있습니다.
export const createOfficialQuestion = async ({ gameId, userId, payload }) => {
  const game = await getGameDocumentForParticipant(gameId, userId)
  requireText(payload.clientRequestId, "clientRequestId")

  const duplicateQuestion = game.officialRecords.find(
    (record) =>
      record.recordType === "question" &&
      sameId(record.authorId, userId) &&
      record.clientRequestId === payload.clientRequestId
  )
  if (duplicateQuestion) {
    return {
      record: duplicateQuestion,
      submissionStatus: getSubmissionStatusFromGame(game),
      revision: game.revision,
      events: [],
    }
  }

  assertSubmissionStage(
    game,
    GAME_STAGES.QUESTION,
    "공식 질문 제출 단계에서만 질문할 수 있습니다."
  )

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
    placeId: payload.questionType === "WITNESS" ? null : payload.placeId || null,
    companionPlayerIds: [],
    itemId: payload.itemId || null,
    action: null,
    answer: null,
    submissionSource: "player",
    status: "pending",
    validationStatus: null,
    conflicts: [],
    clientRequestId: payload.clientRequestId,
    createdAt: new Date(),
  }

  const updatedGame = await Game.findOneAndUpdate(
    {
      _id: gameId,
      status: "playing",
      stage: GAME_STAGES.QUESTION,
      stageEndsAt: { $gt: new Date() },
      progressionLock: null,
      currentRound: game.currentRound,
      "officialRecords.clientRequestId": { $ne: payload.clientRequestId },
      officialRecords: {
        $not: {
          $elemMatch: {
            recordType: "question",
            round: game.currentRound,
            authorId: new mongoose.Types.ObjectId(userId),
          },
        },
      },
      players: {
        $elemMatch: {
          userId: new mongoose.Types.ObjectId(userId),
          questionCount: {
            $lt:
              game.rulesSnapshot?.maxQuestionsPerPlayer ||
              MAX_QUESTIONS_PER_PLAYER,
          },
        },
      },
      $expr: {
        $lt: [
          {
            $size: {
              $filter: {
                input: "$officialRecords",
                as: "record",
                cond: {
                  $and: [
                    { $eq: ["$$record.recordType", "question"] },
                    { $eq: ["$$record.round", game.currentRound] },
                    {
                      $eq: [
                        "$$record.targetId",
                        new mongoose.Types.ObjectId(payload.targetPlayerId),
                      ],
                    },
                  ],
                },
              },
            },
          },
          game.rulesSnapshot?.maxQuestionsPerTargetPerRound ||
            getMaxQuestionsPerTargetPerRound(),
        ],
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
    const latestGame = await getGameDocumentForParticipant(gameId, userId)
    const targetQuestionCount = latestGame.officialRecords.filter(
      (entry) =>
        entry.recordType === "question" &&
        entry.round === latestGame.currentRound &&
        sameId(entry.targetId, payload.targetPlayerId)
    ).length
    const maxTargetQuestions =
      latestGame.rulesSnapshot?.maxQuestionsPerTargetPerRound ||
      getMaxQuestionsPerTargetPerRound()

    if (targetQuestionCount >= maxTargetQuestions) {
      throw createServiceError(
        409,
        `이 참가자는 이번 라운드에 이미 질문 ${maxTargetQuestions}개를 받았습니다. 다른 대상을 선택해주세요.`,
        "QUESTION_TARGET_LIMIT_REACHED"
      )
    }

    const alreadyAskedThisRound = latestGame.officialRecords.some(
      (entry) =>
        entry.recordType === "question" &&
        entry.round === latestGame.currentRound &&
        sameId(entry.authorId, userId)
    )

    if (alreadyAskedThisRound) {
      throw createServiceError(
        409,
        "이번 라운드의 공식 질문을 이미 제출했습니다.",
        "QUESTION_ALREADY_SUBMITTED_THIS_ROUND"
      )
    }

    throw createServiceError(
      409,
      `질문 가능 횟수 ${
        latestGame.rulesSnapshot?.maxQuestionsPerPlayer ||
        MAX_QUESTIONS_PER_PLAYER
      }회를 모두 사용했거나 질문 시간이 종료되었습니다.`,
      "QUESTION_LIMIT_REACHED"
    )
  }

  let progression = null
  if (getSubmissionStatusFromGame(updatedGame).allQuestionsSubmitted) {
    try {
      progression = await advanceAfterAllQuestions({
        gameId: String(updatedGame._id),
        now: new Date(),
      })
    } catch (error) {
      console.error(
        `[game-progression] 질문 저장 후 단계 전환 지연 (${updatedGame._id}):`,
        error
      )
    }
  }
  const finalGame = progression?.game || updatedGame

  return {
    record:
      finalGame.officialRecords.id(recordId) ||
      updatedGame.officialRecords.id(recordId),
    submissionStatus: getSubmissionStatusFromGame(finalGame),
    revision: finalGame.revision,
    events: progression?.events || [],
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
  requireText(payload.clientRequestId, "clientRequestId")

  if (typeof payload.answer !== "boolean") {
    throw createServiceError(400, "answer는 true 또는 false여야 합니다.")
  }

  // 여러 사용자가 서로 다른 질문에 동시에 답할 수 있으므로 officialRecords 배열 전체를
  // revision CAS(compare-and-swap) 방식으로 원자 교체합니다. 복잡한 aggregation pipeline에
  // 의존하지 않아 실제 MongoDB에서도 Mongoose casting/path conflict가 발생하지 않습니다.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const game = await getGameDocumentForParticipant(gameId, userId)

    // 네트워크 재전송은 단계가 이미 넘어간 뒤 도착할 수도 있으므로
    // stage 검사보다 먼저 동일 clientRequestId의 저장 성공 여부를 확인합니다.
    const duplicateAnswer = game.officialRecords.find(
      (record) =>
        record.recordType === "answer" &&
        record.clientRequestId === payload.clientRequestId
    )
    if (duplicateAnswer) {
      return {
        record: duplicateAnswer,
        submissionStatus: getSubmissionStatusFromGame(game),
        revision: game.revision,
        events: [],
      }
    }

    const question = game.officialRecords.id(questionId)

    if (!question || question.recordType !== "question") {
      throw createServiceError(404, "존재하지 않는 공식 질문입니다.")
    }

    if (!sameId(question.targetId, userId)) {
      throw createServiceError(403, "질문을 받은 사용자만 답변할 수 있습니다.")
    }

    // 이미 닫힌 질문은 stage가 hint로 넘어간 뒤에도 정확한 원인을 반환합니다.
    if (question.status !== "pending") {
      throw createServiceError(
        409,
        question.status === "timed_out"
          ? "답변 시간이 종료된 질문입니다."
          : "이미 답변이 완료된 질문입니다.",
        "QUESTION_ALREADY_ANSWERED"
      )
    }

    assertSubmissionStage(
      game,
      GAME_STAGES.ANSWER,
      "공식 답변 단계에서만 답변할 수 있습니다."
    )

    const answerRecordId = new mongoose.Types.ObjectId()
    const answerRecord = {
      _id: answerRecordId,
      recordType: "answer",
      round: question.round,
      authorId: new mongoose.Types.ObjectId(userId),
      targetId: question.authorId,
      subjectPlayerId: question.subjectPlayerId,
      questionId: question._id,
      statementType: null,
      questionType: question.questionType,
      time: question.time,
      section: question.section,
      // WITNESS는 GameSetter 기준으로 장소를 사용하지 않습니다.
      placeId: question.questionType === "WITNESS" ? null : question.placeId,
      companionPlayerIds: [],
      itemId: question.itemId,
      action: null,
      answer: payload.answer,
      submissionSource: "player",
      status: "submitted",
      validationStatus: "unchecked",
      conflicts: [],
      clientRequestId: payload.clientRequestId,
      createdAt: new Date(),
    }

    const nextRecords = game.officialRecords.map((record) => {
      const plain = record.toObject ? record.toObject() : { ...record }
      if (String(plain._id) === String(questionId)) {
        return { ...plain, status: "answered" }
      }
      return plain
    })
    nextRecords.push(answerRecord)

    const updatedGame = await Game.findOneAndUpdate(
      {
        _id: gameId,
        revision: game.revision,
        status: "playing",
        stage: GAME_STAGES.ANSWER,
        stageEndsAt: { $gt: new Date() },
        progressionLock: null,
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
        $set: { officialRecords: nextRecords },
        $inc: { revision: 1 },
      },
      {
        new: true,
        runValidators: true,
      }
    )

    if (!updatedGame) {
      // 다른 답변이 먼저 revision을 갱신했다면 최신 상태를 읽어 다시 시도합니다.
      continue
    }

    // 답변 저장은 이미 성공했습니다. 모순검사나 다음 단계 저장이 실패해도
    // 답변 저장 실패로 오인시키지 않고, 서버 타이머가 만료 시 재시도합니다.
    let progression = null
    try {
      progression = await advanceAfterAllAnswers({
        gameId: String(updatedGame._id),
        now: new Date(),
      })
    } catch (error) {
      console.error(
        `[game-progression] 답변 저장 후 단계 전환 지연 (${updatedGame._id}):`,
        error
      )
    }
    const finalGame = progression?.game || updatedGame

    return {
      record:
        finalGame.officialRecords.id(answerRecordId) ||
        updatedGame.officialRecords.id(answerRecordId),
      submissionStatus: getSubmissionStatusFromGame(finalGame),
      revision: finalGame.revision,
      events: progression?.events || [],
    }
  }

  const latestGame = await getGameDocumentForParticipant(gameId, userId)
  const latestQuestion = latestGame.officialRecords.id(questionId)

  throw createServiceError(
    409,
    latestQuestion?.status === "timed_out"
      ? "답변 시간이 종료된 질문입니다."
      : "이미 답변되었거나 다른 답변 처리와 동시에 갱신되었습니다.",
    "QUESTION_ALREADY_ANSWERED"
  )
}

/**
 * officialRecords -> GameSetter 공개 검사 입력 변환
 * -----------------------------------------------------------------------------
 * v6에서는 game_service.js가 별도의 모순 규칙을 갖지 않습니다.
 * 현재까지 공개된 officialRecords를 deterministic하게 replay하면서
 * GameSetter의 inGameCheckValidation()/checkWitnessMapValidation()만 호출합니다.
 */
const toPlainOfficialRecord = (record) => {
  const plain = record?.toObject ? record.toObject() : { ...record }
  return {
    ...plain,
    id: String(plain._id || plain.id),
    authorId: String(plain.authorId),
    targetId: plain.targetId ? String(plain.targetId) : null,
    subjectPlayerId: plain.subjectPlayerId ? String(plain.subjectPlayerId) : null,
    questionId: plain.questionId ? String(plain.questionId) : null,
    companionPlayerIds: (plain.companionPlayerIds || []).map(String),
    time: Number(plain.time),
  }
}

const sortOfficialRecords = (records) =>
  [...records].sort((left, right) => {
    const roundDiff = Number(left.round) - Number(right.round)
    if (roundDiff !== 0) return roundDiff

    const createdDiff =
      new Date(left.createdAt || 0).getTime() -
      new Date(right.createdAt || 0).getTime()
    if (createdDiff !== 0) return createdDiff

    return String(left.id).localeCompare(String(right.id))
  })

const makeGameSetterPlace = (game, placeId) => {
  if (!placeId) return null
  const place = game.mapSnapshot.places.find((entry) => entry.id === placeId)
  if (!place) return null

  return {
    place_id: place.id,
    place_name: place.name,
    place_floor: place.floor || null,
    place_action: place.actions || [],
  }
}

const makeGameSetterItem = (game, itemId) => {
  if (!itemId) return null
  const item = game.mapSnapshot.itemsInUse.find((entry) => entry.id === itemId)
  if (!item) return null

  return {
    item_id: item.id,
    item_name: item.name,
    item_feature: item.feature || null,
    item_location: item.defaultLocationId || null,
  }
}

const createEmptyPublicTimelineMap = (game) => {
  const slots = game.rulesSnapshot?.timeSlots || []

  return game.players.map((player) => {
    const alibi = {}
    slots.forEach((slot) => {
      const time = Number(slot.time)
      if (!alibi[time]) alibi[time] = {}
      alibi[time][slot.section] = null
    })

    return {
      player: {
        _id: String(player.userId),
        username: player.username,
        nickname: player.nickname,
      },
      alibi,
    }
  })
}

const createEmptyPublicWitnessesMap = (game) =>
  game.players.map((player) => ({
    player: String(player.userId),
    witnesses: [],
  }))

const sourceRecordIds = (value) => [
  ...new Set((value?.__sourceRecordIds || []).filter(Boolean).map(String)),
]

const sourceIdsFromConflictEntries = (entries = []) => [
  ...new Set(
    entries.flatMap((entry) => [
      ...sourceRecordIds(entry),
      ...sourceRecordIds(entry?.alibi),
    ])
  ),
]

const findPublicTimelineEntry = (timelineMap, playerId) =>
  timelineMap.find(
    (entry) => String(entry.player?._id || entry.player_id) === String(playerId)
  )

const getPublicAlibi = (timelineMap, playerId, time, section) =>
  findPublicTimelineEntry(timelineMap, playerId)?.alibi?.[Number(time)]?.[section] ||
  null

const mergeUniqueIds = (...groups) => [
  ...new Set(groups.flat().filter(Boolean).map(String)),
]

const mergeStatementIntoPublicTimeline = (timelineMap, statement, alibi) => {
  const entry = findPublicTimelineEntry(timelineMap, statement.authorId)
  if (!entry) return

  const previous = entry.alibi?.[statement.time]?.[statement.section] || null
  const recordId = String(statement.id)

  if (statement.statementType === "ITEM_POSSESSION") {
    const samePreviousItem =
      previous?.item &&
      alibi.item &&
      String(previous.item.item_id) === String(alibi.item.item_id)
    const itemSourceIds = samePreviousItem
      ? mergeUniqueIds(previous.__itemSourceRecordIds, recordId)
      : [recordId]

    entry.alibi[statement.time][statement.section] = {
      place: previous?.place || null,
      item: alibi.item,
      action: previous?.action || null,
      __placeSourceRecordIds: previous?.__placeSourceRecordIds || [],
      __itemSourceRecordIds: itemSourceIds,
      __sourceRecordIds: mergeUniqueIds(
        previous?.__placeSourceRecordIds,
        itemSourceIds
      ),
    }
    return
  }

  const samePreviousPlace =
    previous?.place &&
    alibi.place &&
    String(previous.place.place_id) === String(alibi.place.place_id)
  const placeSourceIds = samePreviousPlace
    ? mergeUniqueIds(previous.__placeSourceRecordIds, recordId)
    : [recordId]

  entry.alibi[statement.time][statement.section] = {
    place: alibi.place,
    item: previous?.item || null,
    action: alibi.action || null,
    __placeSourceRecordIds: placeSourceIds,
    __itemSourceRecordIds: previous?.__itemSourceRecordIds || [],
    __sourceRecordIds: mergeUniqueIds(
      placeSourceIds,
      previous?.__itemSourceRecordIds
    ),
  }
}

const makeStatementAlibi = (game, statement) => {
  if (statement.statementType === "ITEM_POSSESSION") {
    return {
      place: null,
      item: makeGameSetterItem(game, statement.itemId),
      action: null,
      __sourceRecordIds: [String(statement.id)],
      __itemSourceRecordIds: [String(statement.id)],
      __placeSourceRecordIds: [],
    }
  }

  return {
    place: makeGameSetterPlace(game, statement.placeId),
    item: null,
    action: statement.action || null,
    __sourceRecordIds: [String(statement.id)],
    __placeSourceRecordIds: [String(statement.id)],
    __itemSourceRecordIds: [],
  }
}

const makeGameSetterQanda = (game, question, answer) => {
  const common = {
    player_from: String(question.authorId),
    player_to: String(question.targetId),
    time: Number(question.time),
    section: question.section,
    answer: Boolean(answer.answer),
    __sourceRecordIds: [String(answer.id)],
    __questionRecordId: String(question.id),
  }

  if (question.questionType === "PRESENCE") {
    return {
      ...common,
      alibi: {
        place: makeGameSetterPlace(game, question.placeId),
        item: null,
        action: null,
      },
    }
  }

  if (question.questionType === "ITEM_POSSESSION") {
    return {
      ...common,
      alibi: {
        place: null,
        item: makeGameSetterItem(game, question.itemId),
        action: null,
      },
    }
  }

  return {
    ...common,
    witness: String(question.subjectPlayerId),
  }
}

/**
 * 검사 시점에 따라 공개 가능한 기록을 뽑아 GameSetter 입력을 준비합니다.
 * mode="statement": 현재 라운드 Q&A는 아직 포함하지 않습니다.
 * mode="qanda": 현재 라운드까지 정상 답변이 끝난 Q&A를 모두 포함합니다.
 */
export const projectOfficialRecordsForValidation = (
  game,
  { mode = "qanda" } = {}
) => {
  const currentRound = Number(game.currentRound)
  const records = sortOfficialRecords(
    (game.officialRecords || [])
      .filter((record) => !isLegacyFakeTimeoutRecord(record))
      .map(toPlainOfficialRecord)
  )
  const statements = records.filter(
    (record) =>
      record.recordType === "statement" &&
      Number(record.round) <= currentRound
  )
  const questions = records.filter(
    (record) =>
      record.recordType === "question" &&
      Number(record.round) <= currentRound
  )
  const questionById = new Map(questions.map((record) => [record.id, record]))
  const answers = records.filter((record) => {
    if (record.recordType !== "answer") return false
    if (typeof record.answer !== "boolean") return false
    if (mode === "statement") return Number(record.round) < currentRound
    return Number(record.round) <= currentRound
  })
  const qandaList = answers
    .map((answer) => {
      const question = questionById.get(String(answer.questionId))
      return question ? makeGameSetterQanda(game, question, answer) : null
    })
    .filter(Boolean)

  return {
    records,
    statements,
    answers,
    questionById,
    qandaList,
    inGamePlayerTimelineMap: createEmptyPublicTimelineMap(game),
    inGameWitnessesMap: createEmptyPublicWitnessesMap(game),
  }
}

const conflictMessage = {
  PLACE_CONFLICT: "공개 장소 진술끼리 동시에 성립할 수 없습니다.",
  ITEM_CONFLICT: "공개 도구 소지 진술끼리 동시에 성립할 수 없습니다.",
  QANDA_CONFLICT: "공식 답변과 기존 공개 기록이 서로 충돌합니다.",
  WITNESS_CONFLICT: "공개 동행·목격 정보가 서로 충돌합니다.",
}

const makeValidationResultMap = (statements, answers) => {
  const result = new Map()
  ;[...statements, ...answers].forEach((record) => {
    result.set(String(record.id), {
      recordId: String(record.id),
      validationStatus: "verified",
      conflicts: [],
    })
  })
  return result
}

const registerConflictFactory = (resultById) => {
  const groups = new Map()

  const registerConflict = (code, participantRecordIds, message = "") => {
    const ids = [...new Set((participantRecordIds || []).filter(Boolean).map(String))]
      .filter((id) => resultById.has(id))
      .sort()

    if (ids.length < 2) return

    const conflictKey = `${code}:${ids.join(":")}`
    if (!groups.has(conflictKey)) {
      groups.set(conflictKey, { code, participantRecordIds: ids })
    }

    ids.forEach((recordId) => {
      const result = resultById.get(recordId)
      if (!result) return

      const relatedRecordIds = ids.filter((id) => id !== recordId)
      const duplicate = result.conflicts.some(
        (entry) =>
          entry.code === code &&
          [...(entry.relatedRecordIds || [])].map(String).sort().join(":") ===
            relatedRecordIds.join(":")
      )
      if (duplicate) return

      result.validationStatus = "contradiction"
      result.conflicts.push({
        code,
        message: message || conflictMessage[code] || "공개 기록 사이에 모순이 발견되었습니다.",
        relatedRecordIds,
      })
    })
  }

  return { groups, registerConflict }
}

const registerGameSetterConflicts = ({
  primaryRecordIds,
  conflicts,
  registerConflict,
}) => {
  const mappings = [
    ["placeCheck", "PLACE_CONFLICT"],
    ["itemCheck", "ITEM_CONFLICT"],
    ["qandaCheck", "QANDA_CONFLICT"],
    ["witnessCheck", "WITNESS_CONFLICT"],
  ]

  mappings.forEach(([key, code]) => {
    const relatedIds = sourceIdsFromConflictEntries(conflicts?.[key] || [])
    registerConflict(
      code,
      mergeUniqueIds(primaryRecordIds, relatedIds),
      conflictMessage[code]
    )
  })
}

const buildPublicWitnessesMap = ({ statements, inGameWitnessesMap }) => {
  statements
    .filter(
      (statement) =>
        statement.statementType === "ALIBI" &&
        statement.placeId &&
        statement.companionPlayerIds?.length
    )
    .forEach((statement) => {
      const owner = inGameWitnessesMap.find(
        (entry) => String(entry.player) === String(statement.authorId)
      )
      if (!owner) return

      statement.companionPlayerIds.slice(0, 1).forEach((companionId) => {
        owner.witnesses.push({
          time: Number(statement.time),
          section: statement.section,
          place: statement.placeId,
          witness: String(companionId),
          __sourceRecordIds: [String(statement.id)],
        })
      })
    })
}

/**
 * v6 공개 모순검사 wrapper.
 * 규칙 판정은 모두 GameSetter에 맡기고 여기서는 replay와 record ID 연결만 담당합니다.
 */
export const runRoundContradictionCheck = async ({ game, mode = "qanda" }) => {
  const projection = projectOfficialRecordsForValidation(game, { mode })
  const {
    statements,
    answers,
    qandaList,
    questionById,
    inGamePlayerTimelineMap,
    inGameWitnessesMap,
  } = projection
  const resultById = makeValidationResultMap(statements, answers)
  const { groups, registerConflict } = registerConflictFactory(resultById)

  // 1. 공식 진술을 순서대로 기존 공개 상태와 비교한 뒤 공개 timeline에 merge합니다.
  statements.forEach((statement) => {
    const alibi = makeStatementAlibi(game, statement)
    const playerObj = {
      player: { _id: String(statement.authorId) },
    }
    const conflicts = inGameCheckValidation(
      inGamePlayerTimelineMap,
      inGameWitnessesMap,
      playerObj,
      Number(statement.time),
      statement.section,
      qandaList,
      alibi,
      null
    )

    registerGameSetterConflicts({
      primaryRecordIds: [statement.id],
      conflicts,
      registerConflict,
    })

    mergeStatementIntoPublicTimeline(inGamePlayerTimelineMap, statement, alibi)
  })

  // 2. 모든 companion을 한 번에 공개 witnesses map으로 만든 뒤 reciprocal 검사를 합니다.
  buildPublicWitnessesMap({ statements, inGameWitnessesMap })
  const witnessValidation = checkWitnessMapValidation(
    inGameWitnessesMap,
    inGamePlayerTimelineMap
  )

  ;(witnessValidation.conflicts || []).forEach((conflict) => {
    const edgeSourceIds = sourceRecordIds(conflict)
    const otherAli = getPublicAlibi(
      inGamePlayerTimelineMap,
      conflict.witness,
      conflict.time,
      conflict.section
    )
    const relatedIds = mergeUniqueIds(
      edgeSourceIds,
      otherAli?.__placeSourceRecordIds,
      otherAli?.__sourceRecordIds
    )
    registerConflict(
      "WITNESS_CONFLICT",
      relatedIds,
      conflictMessage.WITNESS_CONFLICT
    )
  })

  // 3. 답변 한 건씩 current qanda로 GameSetter에 전달합니다.
  answers.forEach((answer) => {
    const question = questionById.get(String(answer.questionId))
    if (!question) return
    const qanda = makeGameSetterQanda(game, question, answer)
    const conflicts = inGameCheckValidation(
      inGamePlayerTimelineMap,
      inGameWitnessesMap,
      { player: { _id: String(answer.authorId) } },
      Number(question.time),
      question.section,
      qandaList,
      null,
      qanda
    )

    registerGameSetterConflicts({
      primaryRecordIds: [answer.id],
      conflicts,
      registerConflict,
    })
  })

  const records = [...resultById.values()]
  return {
    valid: groups.size === 0,
    records,
    conflicts: [...groups.entries()].map(([conflictKey, value]) => ({
      conflictKey,
      ...value,
    })),
    summary: {
      checked: records.length,
      contradictions: groups.size,
    },
  }
}

// 검사 결과를 statement/answer의 validationStatus와 conflicts에 반영합니다.
// question은 lifecycle 상태만 관리하며 논리 검증 대상이 아닙니다.
const applyRoundCheckResult = (game, checkResult) => {
  ;(checkResult.records || []).forEach((recordResult) => {
    const record = game.officialRecords.id(recordResult.recordId)
    if (!record || record.recordType === "question") return

    record.validationStatus = recordResult.validationStatus || "verified"
    record.conflicts = recordResult.conflicts || []
  })
}

const phaseForStage = (stage) => {
  if (stage === GAME_STAGES.CHECKING) return "checking"
  if (stage === GAME_STAGES.DEDUCTION) return "deduction"
  if (stage === GAME_STAGES.FINISHED) return "finished"
  return "active"
}

const moveToTimedStage = (game, stage, startedAt) => {
  const clock = createStageClock(stage, startedAt)
  game.stage = stage
  game.phase = phaseForStage(stage)
  game.stageStartedAt = clock.stageStartedAt
  game.stageEndsAt = clock.stageEndsAt
  // v3 화면과 관리자 코드가 roundEndsAt을 읽어도 현재 단계 시간이 보이게 유지합니다.
  game.roundEndsAt = clock.stageEndsAt || clock.stageStartedAt
}

const makeStageChangedEvent = (game, previousStage, reason = "timer") => ({
  type: "game:stage:changed",
  payload: {
    gameId: String(game._id),
    round: game.currentRound,
    previousStage,
    stage: game.stage,
    stageLabel: GAME_STAGE_LABELS[game.stage],
    stageStartedAt: game.stageStartedAt,
    stageEndsAt: game.stageEndsAt,
    reason,
  },
})

// 진술 시간 초과 시 실제 비밀 타임라인을 대신 공개하지 않습니다.
// 제출하지 않은 사용자는 그 라운드에 공식 진술 record가 없는 상태로 남습니다.

// 미답변 질문은 질문 lifecycle만 timed_out으로 닫습니다.
// TIMEOUT이라는 가짜 answer record는 만들지 않으며 GameSetter qandaList에도 들어가지 않습니다.
const closePendingQuestionsAsTimedOut = (game) => {
  const pending = game.officialRecords.filter(
    (record) =>
      record.recordType === "question" &&
      record.round === game.currentRound &&
      record.status === "pending"
  )

  pending.forEach((question) => {
    question.status = "timed_out"
  })

  return pending.length
}

const upsertRoundCheck = (game, round, checkResult, checkedAt) => {
  const payload = {
    round,
    valid: Boolean(checkResult.valid),
    checkedRecordCount: checkResult.summary?.checked || 0,
    // record 개수가 아니라 unique conflict group 개수를 저장합니다.
    contradictionCount: checkResult.summary?.contradictions || 0,
    checkedAt,
  }
  const existing = game.roundChecks.find((entry) => entry.round === round)
  if (existing) {
    existing.valid = payload.valid
    existing.checkedRecordCount = payload.checkedRecordCount
    existing.contradictionCount = payload.contradictionCount
    existing.checkedAt = payload.checkedAt
  } else {
    game.roundChecks.push(payload)
  }
}

// 공식 진술 전원 제출/진술 타임아웃 직후의 중간 검사입니다.
// 현재 라운드 Q&A는 아직 없으므로 이전 라운드 Q&A만 비교 컨텍스트로 사용합니다.
const runAndApplyStatementCheck = async (game, checkedAt) => {
  const checkResult = await runRoundContradictionCheck({
    game,
    mode: "statement",
  })
  applyRoundCheckResult(game, checkResult)
  return { checkResult, checkedAt }
}

// 답변 완료/답변 타임아웃 뒤 현재 라운드 Q&A까지 포함한 최종 라운드 검사입니다.
const runAndApplyCurrentRoundCheck = async (game, checkedAt) => {
  const round = game.currentRound
  const checkResult = await runRoundContradictionCheck({
    game,
    mode: "qanda",
  })

  applyRoundCheckResult(game, checkResult)
  upsertRoundCheck(game, round, checkResult, checkedAt)

  const hint = game.hints.find((entry) => entry.revealAfterRound === round)
  if (hint && !hint.revealedAt) hint.revealedAt = checkedAt

  return { checkResult, hint }
}

const makeStatementCheckedEvent = (game, checkResult) => ({
  type: "game:statements:checked",
  payload: {
    gameId: String(game._id),
    checkedRound: game.currentRound,
    result: {
      valid: checkResult.valid,
      summary: checkResult.summary,
    },
  },
})

const makeRoundCheckedEvent = (game, checkResult) => ({
  type: "game:round:checked",
  payload: {
    gameId: String(game._id),
    checkedRound: game.currentRound,
    result: {
      valid: checkResult.valid,
      summary: checkResult.summary,
    },
  },
})

const makeHintRevealedEvent = (game, hint) => ({
  type: "game:hint:revealed",
  payload: {
    gameId: String(game._id),
    round: game.currentRound,
    hint: sanitizeHints([hint])[0],
  },
})

const allCurrentRoundStatementsSubmitted = (game) =>
  getSubmissionStatusFromGame(game).allStatementsSubmitted

const allCurrentRoundQuestionsSubmitted = (game) =>
  getSubmissionStatusFromGame(game).allQuestionsSubmitted

const allCurrentRoundQuestionsClosed = (game) =>
  getSubmissionStatusFromGame(game).pendingQuestionCount === 0

const acquireProgressionLock = async ({ gameId, stage, now, readyExpr }) => {
  const lockToken = new mongoose.Types.ObjectId().toString()
  const filter = {
    _id: gameId,
    status: "playing",
    stage,
    progressionLock: null,
  }
  if (readyExpr) filter.$expr = readyExpr

  const game = await Game.findOneAndUpdate(
    filter,
    {
      $set: {
        progressionLock: { token: lockToken, lockedAt: now },
      },
    },
    { new: true }
  ).select("+secretData")

  return { game, lockToken }
}

const releaseProgressionLock = async (gameId, lockToken) => {
  await Game.updateOne(
    { _id: gameId, "progressionLock.token": lockToken },
    { $set: { progressionLock: null } }
  )
}

// 마지막 공식 진술이 들어온 순간 검사 후 discussion으로 즉시 전환합니다.
const advanceAfterAllStatements = async ({ gameId, now = new Date() }) => {
  const { game, lockToken } = await acquireProgressionLock({
    gameId,
    stage: GAME_STAGES.STATEMENT,
    now,
    readyExpr: {
      $eq: [
        {
          $size: {
            $filter: {
              input: "$officialRecords",
              as: "record",
              cond: {
                $and: [
                  { $eq: ["$$record.recordType", "statement"] },
                  { $eq: ["$$record.round", "$currentRound"] },
                ],
              },
            },
          },
        },
        { $size: "$players" },
      ],
    },
  })

  if (!game || !allCurrentRoundStatementsSubmitted(game)) return null

  try {
    const previousStage = game.stage
    const { checkResult } = await runAndApplyStatementCheck(game, now)
    moveToTimedStage(game, GAME_STAGES.DISCUSSION, now)
    game.progressionLock = null
    game.revision += 1
    await game.save()

    return {
      game,
      events: [
        makeStatementCheckedEvent(game, checkResult),
        makeStageChangedEvent(game, previousStage, "all_submitted"),
      ],
    }
  } catch (error) {
    await releaseProgressionLock(gameId, lockToken)
    throw error
  }
}

// 모든 참가자가 이번 라운드의 질문 1개를 제출하면 답변 단계로 즉시 전환합니다.
const advanceAfterAllQuestions = async ({ gameId, now = new Date() }) => {
  const { game, lockToken } = await acquireProgressionLock({
    gameId,
    stage: GAME_STAGES.QUESTION,
    now,
    readyExpr: {
      $eq: [
        {
          $size: {
            $filter: {
              input: "$officialRecords",
              as: "record",
              cond: {
                $and: [
                  { $eq: ["$$record.recordType", "question"] },
                  { $eq: ["$$record.round", "$currentRound"] },
                ],
              },
            },
          },
        },
        { $size: "$players" },
      ],
    },
  })

  if (!game || !allCurrentRoundQuestionsSubmitted(game)) return null

  try {
    const previousStage = game.stage
    moveToTimedStage(game, GAME_STAGES.ANSWER, now)
    game.progressionLock = null
    game.revision += 1
    await game.save()

    return {
      game,
      events: [makeStageChangedEvent(game, previousStage, "all_submitted")],
    }
  } catch (error) {
    await releaseProgressionLock(gameId, lockToken)
    throw error
  }
}

// 마지막 미답변 질문이 정상 답변된 순간 라운드 최종 검사 → 힌트로 즉시 전환합니다.
const advanceAfterAllAnswers = async ({ gameId, now = new Date() }) => {
  const { game, lockToken } = await acquireProgressionLock({
    gameId,
    stage: GAME_STAGES.ANSWER,
    now,
    readyExpr: {
      $eq: [
        {
          $size: {
            $filter: {
              input: "$officialRecords",
              as: "record",
              cond: {
                $and: [
                  { $eq: ["$$record.recordType", "question"] },
                  { $eq: ["$$record.round", "$currentRound"] },
                  { $eq: ["$$record.status", "pending"] },
                ],
              },
            },
          },
        },
        0,
      ],
    },
  })

  if (!game || !allCurrentRoundQuestionsClosed(game)) return null

  try {
    const previousStage = game.stage
    const { checkResult, hint } = await runAndApplyCurrentRoundCheck(game, now)
    moveToTimedStage(game, GAME_STAGES.HINT, now)
    game.progressionLock = null
    game.revision += 1
    await game.save()

    const events = [makeRoundCheckedEvent(game, checkResult)]
    if (hint) events.push(makeHintRevealedEvent(game, hint))
    events.push(makeStageChangedEvent(game, previousStage, "all_answered"))

    return { game, events }
  } catch (error) {
    await releaseProgressionLock(gameId, lockToken)
    throw error
  }
}

const makeTimeoutDeduction = (game, player) => {
  const crimeInfo = game.secretData?.crimeInfo || {}
  const criminal = game.players.find(
    (entry) => entry.characterId === crimeInfo.crimeRole?.role_id
  )
  const wrongCriminal =
    game.players.find((entry) => !sameId(entry.userId, criminal?.userId)) ||
    game.players[0]
  const finalTimeHint = game.hints.find((entry) => entry.key === "FINAL_TIME_SLOTS_5")
  const timeSlot = finalTimeHint?.values?.[0] || game.rulesSnapshot.timeSlots[0]
  const finalPlaceHint = game.hints.find((entry) => entry.key === "PLACE_CANDIDATES_3")

  return {
    _id: new mongoose.Types.ObjectId(),
    userId: player.userId,
    criminalPlayerId: wrongCriminal.userId,
    crimeTime: Number(timeSlot.time),
    crimeSection: timeSlot.section,
    crimePlaceId: finalPlaceHint?.values?.[0] || game.mapSnapshot.places[0]?.id,
    crimeItemId: game.mapSnapshot.itemsInUse[0]?.id,
    clientRequestId: `system_timeout_deduction_${player.userId}`,
    isCorrect: null,
    submittedAt: new Date(),
    submissionSource: "system_timeout",
  }
}

const addMissingTimeoutDeductions = (game) => {
  const submitted = new Set(game.deductions.map((entry) => String(entry.userId)))
  game.players.forEach((player) => {
    if (!submitted.has(String(player.userId))) {
      game.deductions.push(makeTimeoutDeduction(game, player))
    }
  })
}

// v3 진행 중 문서도 서버 재시작 뒤 stage 기반 타이머로 이어지게 한 번 보정합니다.
export const migrateLegacyPlayingGames = async () => {
  await Game.updateMany(
    {
      status: "playing",
      $or: [
        { stage: { $exists: false } },
        { stageStartedAt: { $exists: false } },
        { stageEndsAt: { $exists: false } },
      ],
    },
    [
      {
        $set: {
          stage: {
            $switch: {
              branches: [
                { case: { $eq: ["$phase", "checking"] }, then: "checking" },
                { case: { $eq: ["$phase", "deduction"] }, then: "deduction" },
                { case: { $eq: ["$phase", "finished"] }, then: "finished" },
              ],
              default: "statement",
            },
          },
          stageStartedAt: { $ifNull: ["$stageStartedAt", "$roundStartedAt"] },
          stageEndsAt: { $ifNull: ["$stageEndsAt", "$roundEndsAt"] },
          progressionLock: null,
        },
      },
    ]
  )
}

export const skipGameStage = async ({ gameId, userId }) => {
  assertObjectId(gameId, "gameId")
  assertObjectId(userId, "userId")

  const game = await Game.findById(gameId)

  if (!game) {
    throw createServiceError(404, "존재하지 않는 게임입니다.")
  }

  if (game.status !== "playing") {
    throw createServiceError(409, "진행 중인 게임만 시간을 스킵할 수 있습니다.")
  }

  const room = await Room.findById(game.roomId)

  if (!room) {
    throw createServiceError(404, "게임 방을 찾을 수 없습니다.")
  }

  if (!sameId(room.host, userId)) {
    throw createServiceError(403, "방장만 시간을 스킵할 수 있습니다.")
  }

  game.stageEndsAt = new Date()
  await game.save()

  return processExpiredGameStage({
    gameId: String(game._id),
    now: new Date(),
  })
}

/**
 * 만료된 세부 단계를 서버가 한 단계 진행합니다.
 * progressionLock을 MongoDB에서 먼저 선점하므로 재시도·복구·다중 서버에서도 중복 처리되지 않습니다.
 */
export const processExpiredGameStage = async ({ gameId, now = new Date() }) => {
  assertObjectId(gameId, "gameId")
  const currentTime = new Date(now)
  const lockToken = new mongoose.Types.ObjectId().toString()
  const staleBefore = new Date(currentTime.getTime() - 15_000)
  const lockedGame = await Game.findOneAndUpdate(
    {
      _id: gameId,
      status: "playing",
      stageEndsAt: { $ne: null, $lte: currentTime },
      $or: [
        { progressionLock: null },
        { "progressionLock.lockedAt": { $lte: staleBefore } },
      ],
    },
    {
      $set: {
        progressionLock: { token: lockToken, lockedAt: currentTime },
      },
    },
    { new: true }
  ).select("+secretData")

  if (!lockedGame) {
    return { processed: false, events: [] }
  }

  const previousStage = lockedGame.stage
  const boundaryAt = new Date(lockedGame.stageEndsAt || currentTime)
  const events = [
    {
      type: "game:timer:expired",
      payload: {
        gameId: String(lockedGame._id),
        round: lockedGame.currentRound,
        stage: previousStage,
        stageLabel: GAME_STAGE_LABELS[previousStage],
        expiredAt: boundaryAt,
      },
    },
  ]

  try {
    if (previousStage === GAME_STAGES.STATEMENT) {
      // 미제출자의 실제 비밀 타임라인을 대신 공개하지 않고, 제출된 공식 진술만 검사합니다.
      const { checkResult } = await runAndApplyStatementCheck(lockedGame, boundaryAt)
      moveToTimedStage(lockedGame, GAME_STAGES.DISCUSSION, boundaryAt)
      events.push(makeStatementCheckedEvent(lockedGame, checkResult))
      events.push(makeStageChangedEvent(lockedGame, previousStage, "timeout"))
      events.push({
        type: "game:submission:updated",
        payload: { submissionStatus: getSubmissionStatusFromGame(lockedGame) },
      })
    } else if (previousStage === GAME_STAGES.DISCUSSION) {
      moveToTimedStage(lockedGame, GAME_STAGES.QUESTION, boundaryAt)
      events.push(makeStageChangedEvent(lockedGame, previousStage, "timeout"))
    } else if (previousStage === GAME_STAGES.QUESTION) {
      // 질문이 한 건도 없으면 비어 있는 답변 단계를 기다릴 이유가 없습니다.
      // 현재까지 공개된 기록으로 라운드 검사를 마치고 바로 힌트 단계로 이동합니다.
      if (getSubmissionStatusFromGame(lockedGame).pendingQuestionCount === 0) {
        const { checkResult, hint } = await runAndApplyCurrentRoundCheck(
          lockedGame,
          boundaryAt
        )
        moveToTimedStage(lockedGame, GAME_STAGES.HINT, boundaryAt)
        events.push(makeRoundCheckedEvent(lockedGame, checkResult))
        if (hint) events.push(makeHintRevealedEvent(lockedGame, hint))
        events.push(makeStageChangedEvent(lockedGame, previousStage, "no_questions"))
      } else {
        moveToTimedStage(lockedGame, GAME_STAGES.ANSWER, boundaryAt)
        events.push(makeStageChangedEvent(lockedGame, previousStage, "timeout"))
      }
    } else if (
      previousStage === GAME_STAGES.ANSWER ||
      // 기존 v5 문서가 checking에서 재시작된 경우에도 v6 최종 검사로 복구합니다.
      previousStage === GAME_STAGES.CHECKING
    ) {
      closePendingQuestionsAsTimedOut(lockedGame)
      const { checkResult, hint } = await runAndApplyCurrentRoundCheck(
        lockedGame,
        boundaryAt
      )
      moveToTimedStage(lockedGame, GAME_STAGES.HINT, boundaryAt)
      events.push(makeRoundCheckedEvent(lockedGame, checkResult))
      if (hint) events.push(makeHintRevealedEvent(lockedGame, hint))
      events.push(makeStageChangedEvent(lockedGame, previousStage, "checked"))
    } else if (previousStage === GAME_STAGES.HINT) {
      const completedRound = lockedGame.currentRound
      if (completedRound < 5) {
        lockedGame.currentRound += 1
        lockedGame.roundStartedAt = boundaryAt
        moveToTimedStage(lockedGame, GAME_STAGES.STATEMENT, boundaryAt)
        events.push({
          type: "game:round:changed",
          payload: {
            gameId: String(lockedGame._id),
            previousRound: completedRound,
            currentRound: lockedGame.currentRound,
          },
        })
      } else {
        moveToTimedStage(lockedGame, GAME_STAGES.DEDUCTION, boundaryAt)
      }
      events.push(makeStageChangedEvent(lockedGame, previousStage, "timeout"))
    } else if (previousStage === GAME_STAGES.DEDUCTION) {
      addMissingTimeoutDeductions(lockedGame)
      lockedGame.progressionLock = null
      const finalization = await finalizeGameIfReady(lockedGame)
      events.push({
        type: "game:finished",
        payload: {
          gameId: String(lockedGame._id),
          resultPath: finalization.resultPath,
        },
      })
      return {
        processed: true,
        finished: true,
        events: events.map((event) => ({
          ...event,
          payload: { ...event.payload, revision: lockedGame.revision },
        })),
      }
    }

    lockedGame.progressionLock = null
    lockedGame.revision += 1
    await lockedGame.save()

    return {
      processed: true,
      finished: false,
      stage: lockedGame.stage,
      stageEndsAt: lockedGame.stageEndsAt,
      revision: lockedGame.revision,
      events: events.map((event) => ({
        ...event,
        payload: {
          gameId: String(lockedGame._id),
          ...event.payload,
          revision: lockedGame.revision,
        },
      })),
    }
  } catch (error) {
    await Game.updateOne(
      { _id: gameId, "progressionLock.token": lockToken },
      { $set: { progressionLock: null } }
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

  const finalPlaceHint = game.hints.find(
    (hint) => hint.key === "PLACE_CANDIDATES_3"
  )
  if (
    finalPlaceHint?.values?.length > 0 &&
    !finalPlaceHint.values.includes(payload.crimePlaceId)
  ) {
    throw createServiceError(400, "최종 후보 3곳에 포함되지 않은 장소입니다.")
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
 * 최종 추리와 역할별 승패를 서버에서 판정합니다.
 *
 * 확정 승패 규칙
 * - 일반인: 범인·시간(20분 슬롯)·장소·도구 네 항목을 모두 맞히면 개인 승리
 * - 범인: 승리한 일반인이 5명 이상이면 패배, 4명 이하면 승리
 *
 * 범인의 추리 정답 여부(isCorrect)는 결과 설명용으로 계산하지만,
 * 실제 범인 승패는 오직 일반인 승리 인원으로 결정합니다.
 */
export const evaluateFinalDeductions = async (game) => {
  const crimeInfo = game.secretData?.crimeInfo
  if (!crimeInfo) {
    throw createServiceError(500, "게임 정답 데이터를 찾을 수 없습니다.")
  }

  const criminalPlayer = game.players.find(
    (player) => player.characterId === crimeInfo.crimeRole?.role_id
  )
  if (!criminalPlayer) {
    throw createServiceError(500, "범인 역할이 배정된 참가자를 찾을 수 없습니다.")
  }

  const solution = {
    criminalPlayerId: String(criminalPlayer.userId),
    crimeTime: Number(crimeInfo.crimeTime),
    crimeSection: crimeInfo.timeSection,
    crimePlaceId: crimeInfo.crimePlace?.place_id,
    crimeItemId: crimeInfo.crimeItem?.item_id,
  }

  const preliminaryResults = game.players.map((player) => {
    const deduction = game.deductions.find((item) =>
      sameId(item.userId, player.userId)
    )
    const correctFields = {
      criminal: sameId(deduction?.criminalPlayerId, solution.criminalPlayerId),
      time:
        Number(deduction?.crimeTime) === solution.crimeTime &&
        deduction?.crimeSection === solution.crimeSection,
      place: deduction?.crimePlaceId === solution.crimePlaceId,
      item: deduction?.crimeItemId === solution.crimeItemId,
    }
    const isCorrect = Object.values(correctFields).every(Boolean)

    return {
      userId: String(player.userId),
      isKiller: sameId(player.userId, solution.criminalPlayerId),
      isCorrect,
      correctFields,
      deduction: deduction
        ? {
            criminalPlayerId: String(deduction.criminalPlayerId),
            crimeTime: Number(deduction.crimeTime),
            crimeSection: deduction.crimeSection,
            crimePlaceId: deduction.crimePlaceId,
            crimeItemId: deduction.crimeItemId,
          }
        : null,
    }
  })

  const citizenWinnerCount = preliminaryResults.filter(
    (result) => !result.isKiller && result.isCorrect
  ).length
  const killerWon = citizenWinnerCount <= 4
  const results = preliminaryResults.map((result) => ({
    ...result,
    win: result.isKiller ? killerWon : result.isCorrect,
  }))

  return {
    results,
    winnerIds: results.filter((result) => result.win).map((result) => result.userId),
    loserIds: results.filter((result) => !result.win).map((result) => result.userId),
    citizenWinnerCount,
    killerWon,
    solution,
  }
}

// 모든 최종 추리가 제출되면 Game/GameLog/Room과 사용자 전적을 한 번에 마무리합니다.
const finalizeGameIfReady = async (game) => {
  const allSubmitted = game.deductions.length === game.players.length

  if (!allSubmitted) {
    return {
      finished: false,
    }
  }

  const evaluation = await evaluateFinalDeductions(game)

  ; (evaluation.results || []).forEach((result) => {
    const deduction = game.deductions.find((item) =>
      sameId(item.userId, result.userId)
    )

    if (deduction) {
      deduction.isCorrect = Boolean(result.isCorrect)
    }
  })

  game.status = "finished"
  game.phase = "finished"
  game.stage = GAME_STAGES.FINISHED
  game.finishedAt = new Date()
  game.stageStartedAt = game.finishedAt
  game.stageEndsAt = null
  game.roundEndsAt = game.finishedAt
  game.progressionLock = null
  game.revision += 1
  await game.save()

  const playerResults = game.players.map((player) => {
    const evaluationResult = evaluation.results.find((result) =>
      sameId(result.userId, player.userId)
    )

    return {
      userId: player.userId,
      username: player.username,
      nickname: player.nickname,
      characterId: player.characterId,
      characterName: player.characterName,
      isKiller: Boolean(evaluationResult?.isKiller),
      isCorrect: Boolean(evaluationResult?.isCorrect),
      win: Boolean(evaluationResult?.win),
      correctFields: evaluationResult?.correctFields || {},
      deduction: evaluationResult?.deduction || null,
    }
  })
  const winnerNames = playerResults.filter((result) => result.win).map((result) => result.nickname)
  const loserNames = playerResults.filter((result) => !result.win).map((result) => result.nickname)

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
        playerResults,
        citizenWinnerCount: evaluation.citizenWinnerCount,
        killerWon: evaluation.killerWon,
        finishedAt: game.finishedAt,
      },
    },
    {
      upsert: true,
      new: true,
    }
  )

  // 각 사용자 전적은 이 게임의 최종 판정 결과를 기준으로 증가시킵니다.
  // 범인은 killer*, 일반인은 citizen* 통계를 각각 따로 관리합니다.
  await User.bulkWrite(
    playerResults.map((result) => {
      const increment = {
        playCnt: 1,
        winCnt: result.win ? 1 : 0,
        loseCnt: result.win ? 0 : 1,
        ...(result.isKiller
          ? {
              killerPlayCnt: 1,
              killerWinCnt: result.win ? 1 : 0,
            }
          : {
              citizenPlayCnt: 1,
              citizenWinCnt: result.win ? 1 : 0,
              perfectSolveCnt: result.isCorrect ? 1 : 0,
            }),
      }

      return {
        updateOne: {
          filter: { _id: result.userId },
          update: { $inc: increment },
        },
      }
    })
  )

  await Room.findByIdAndUpdate(game.roomId, {
    $set: {
      status: "finished",
    },
  })

  return {
    finished: true,
    resultPath: `/result/${game._id}`,
  }
}



export const forceEndGame = async (gameId, adminUserId) => {

    const game = await Game.findById(gameId)

    if (!game) {
        throw new Error("게임을 찾을 수 없습니다.")
    }

    if (game.status !== "playing") {
        throw new Error("진행 중인 게임만 강제종료할 수 있습니다.")
    }

    const finishedAt = new Date()

    game.status = "forced"
    game.phase = "finished"
    game.stage = GAME_STAGES.FINISHED
    game.finishedAt = finishedAt
    game.stageStartedAt = finishedAt
    game.stageEndsAt = null
    game.roundEndsAt = finishedAt
    game.progressionLock = null
    game.revision += 1

    await game.save()

    await Room.findByIdAndUpdate(game.roomId, {
        $set: {
            status: "finished",
        },
    })

    const admin = await User.findById(adminUserId).select("nickname")

    if (!admin) {
        throw new Error("관리자 정보를 찾을 수 없습니다.")
    }

    await Log.create({
        type: "게임 강제종료",
        //username: user.username,
        nickname: admin.nickname,
        content: `${game.roomSnapshot.title} 게임이 관리자에 의해 강제종료되었습니다.`,
    })

    return {
        finished: true,
        gameId: game._id,
    }
}

// 최종 추리 한 건을 중복 없이 저장합니다.
export const submitFinalDeduction = async ({ gameId, userId, payload }) => {
  const game = await getGameDocumentForParticipant(gameId, userId)

  assertSubmissionStage(
    game,
    GAME_STAGES.DEDUCTION,
    "최종 추리 단계에서만 제출할 수 있습니다."
  )

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
    submissionSource: "player",
  }

  const updatedGame = await Game.findOneAndUpdate(
    {
      _id: gameId,
      status: "playing",
      stage: GAME_STAGES.DEDUCTION,
      stageEndsAt: { $gt: new Date() },
      progressionLock: null,
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
    throw createServiceError(
      409,
      "이미 최종 추리를 제출했거나 제출 시간이 종료되었습니다.",
      "DEDUCTION_ALREADY_SUBMITTED"
    )
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
