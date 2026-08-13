// 게임 관련 어댑터
// - API 호출 결과를 게임 컴포넌트에서 사용하기 적합한 형태로 변환
// - 게임 컴포넌트에서 필요한 데이터만 추출하여 반환
// - Map.js의 place_id, item_id, officialRecords, viewer, timeline을 화면 필드로 맞춤


// section 키를 20분 단위 화면 분 값으로 변환
// - section02 : 0분, section24 : 20분, section46 : 40분
const SECTION_MINUTES = {
    section02 : 0,
    section24 : 20,
    section46 : 40,
}

// Mongoose ObjectId를 문자열로 변환
const getId = (value) => String(value?._id || value?.id || value || "")

// ISO DATE 문자열을 Date 객체의 HH:MM 형식으로 변환
// - value : ISO DATE 문자열 또는 Date 객체
// - 반환값 : "HH:MM" 형식 문자열, value가 유효하지 않으면 "--:--" 반환
const formatCreatedAt = (value) => {
    if (!value) return "--:--"

    const date = new Date(value)

    // 유효하지 않은 날짜이면 원래 문자열 반환
    if(Number.isNaN(date.getTime())) {
        return String(value)
    }
    
    // Intl.DateTimeFormat : 브라우저 로케일에 맞게 날짜/시간을 포맷팅
    return new Intl.DateTimeFormat("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(date)
}

const formatSlotLabel = (time, section) => {
    const minute = SECTION_MINUTES[section]

    if(!Number.isFinite(Number(time)) || minute === undefined) {
        return "--:--"
    }
    
    return `${String(time).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

// 장소 이름 칸에 맞게 줄이기
const makeShortPlaceName = (name="") => 
    name.replace("그랜드 ", "").replace("1층", "").replace("와인저장고", "저장고").trim()


//  백앤드 장소 > deductionboard/hintpanel 형식으로 변경
const adaptPlaces = (places = []) => 
    places.map((place) => ({
        id: place.id || place._id,
        name: place.name || place.place_name,
        shortName: makeShortPlaceName(place.name), 
        floor : place.floor || "",
        actions : Array.isArray(place.actions)
        ? place.actions
        : [],
    }))

// 백엔드 도구 UI의 toolPool 형식으로 변경
const adaptItems = (items = []) => 
    items.map((item) => ({
        id: item.id || item._id,
        name: item.name || item.item_name,
        category: item.feature || item.item_feature || "",
        defaultLocationId: item.defaultLocationId || item.item_location || null,
    })) 

// 게임의 18개 슬롯을 UI 순서와 index에 맞게 변환
const adaptTimeSlots = (timeSlots = []) =>
    timeSlots.map((slot, index) => ({
    id: slot.id,
    label: slot.label || formatSlotLabel(slot.time, slot.section),
    index,
    time: Number(slot.time),
    section: slot.section,
  }))

// w잠금/완료/current 상태 계산해 Timer와 Nav 에서 사용할 라운드 배열 만들기
const adaptRounds = ({ roundsSnapshot = [], currentRound, phase, submissionStatus, totalPlayers, }) =>
  roundsSnapshot.map((round) => {
    let status = "locked"

    // 라운드 상태 계산
    if (round.number < currentRound) {
      status = "completed"
    } else if (round.number === currentRound && phase !== "finished") {
      status = "current"
    }

    // 현재 라운드인지 여부 확인
    const isCurrent = round.number === currentRound

    // 반환할 라운드 객체 생성
    return {
      number: round.number,
      title: round.title,
      description: round.description,
      requiredStatementType: round.requiredStatementType,
      status,
      submitted: isCurrent
        ? submissionStatus?.submittedCount || 0
        : round.number < currentRound
          ? totalPlayers
          : 0,
      total: totalPlayers,
    }
  })


// 힌트의 hour 또는 {time, section} 값을 현재 time slot ID로 변환
const hintValuesToIds = (hint, timeSlots) => {
    const values = hint.values || []

    if (hint.type === "PLACE_IDS") {
        return values.map(String)

    }

    if(hint.type === "HOUR_RANGE") {
        const hours = values.map(Number)

        return timeSlots
            .filter((slot) => hours.includes(Number(slot.time)))
            .map((slot) => slot.id)
    }

    if (hint.type === "TIME_SLOTS") {
    return values
      .map((value) =>
        timeSlots.find(
          (slot) =>
            Number(slot.time) === Number(value.time) &&
            slot.section === value.section
        )
      )
      .filter(Boolean)
      .map((slot) => slot.id)
  }

  if (hint.type === "ITEM_FEATURE") {
    if (Array.isArray(values)) {
      return values.map(String)
    }

    return Object.entries(values).map(
      ([feature, description]) => `${feature}: ${description}`
    )
  }

  return []
}


// HintPanel이 기대하는 id/round/content/valueIds 필드로 변환합니다.
const adaptHints = (hints = [], timeSlots = []) =>
  hints.map((hint) => ({
    id: getId(hint),
    key: hint.key,
    type: hint.type,
    round: hint.revealAfterRound,
    revealAfterRound: hint.revealAfterRound,
    appliesToRound: hint.appliesToRound,
    title: hint.title,
    status: hint.status || (hint.revealedAt ? "revealed" : "locked"),
    content: hint.description,
    valueIds:
      hint.status === "revealed" || hint.revealedAt
        ? hintValuesToIds(hint, timeSlots)
        : [],
    rawValues:
      hint.status === "revealed" || hint.revealedAt
        ? hint.values || []
        : [],
  }))

// private viewer timeline을 기존 player.timeline 형식으로 변환합니다.
const adaptViewerTimeline = (timeline = []) =>
  timeline.map((entry) => ({
    timeId: entry.timeId,
    time: Number(entry.time),
    section: entry.section,
    placeId: entry.placeId,
    activity: entry.action || "",
    companionIds: (entry.companionPlayerIds || []).map(String),
    toolId: entry.itemId || null,
    flags: [],
    isPrivate: true,
  }))

// 공개 플레이어 정보에 현재 로그인 사용자 자신의 비공개 타임라인만 합칩니다.
const adaptPlayers = (players = [], viewer = {}) =>
  players.map((player) => ({
    id: getId(player),
    userId: String(player.userId || player.id),
    username: player.username,
    nickname: player.nickname,
    color: player.color || "#a9a7ff",
    character: player.character || {
      id: "role_unknown",
      name: "알 수 없는 용의자",
      occupation: "용의자",
    },
    timeline:
      getId(player) === String(viewer.userId)
        ? adaptViewerTimeline(viewer.timeline)
        : [],
    questionCount: player.questionCount || 0,
    statementSubmitted:
      getId(player) === String(viewer.userId)
        ? Boolean(viewer.hasSubmittedStatement)
        : false,
  }))

// ID로 장소/도구/플레이어 표시 이름을 찾을 때 사용하는 작은 검색 함수들입니다.
const makeFinders = ({ players, places, tools }) => ({
  playerName: (id) =>
    players.find((player) => player.id === String(id))?.nickname ||
    "알 수 없는 참가자",
  placeName: (id) =>
    places.find((place) => place.id === id)?.name || id || "장소 미정",
  itemName: (id) =>
    tools.find((tool) => tool.id === id)?.name || id || "도구 미정",
})

// 하나의 공식 기록을 사람이 읽는 한국어 문장으로 만듭니다.
const makeRecordContent = (record, finders) => {
  const timeLabel = formatSlotLabel(record.time, record.section)

  if (record.recordType === "statement") {
    if (record.statementType === "ITEM_POSSESSION") {
      return `${timeLabel}에 ${finders.itemName(record.itemId)}을(를) 소지했다고 진술했습니다.`
    }

    const companionText = record.companionPlayerIds?.length
      ? ` ${record.companionPlayerIds
          .map(finders.playerName)
          .join(", ")}와(과) 함께`
      : " 혼자"
    const actionText = record.action ? ` ${record.action} 행동을 했습니다.` : " 있었습니다."

    return `${timeLabel}에 ${finders.placeName(record.placeId)}에서${companionText}${actionText}`
  }

  if (record.recordType === "question") {
    if (record.questionType === "PRESENCE") {
      return `${timeLabel}에 ${finders.placeName(record.placeId)}에 있었습니까?`
    }

    if (record.questionType === "WITNESS") {
      return `${timeLabel}에 ${finders.playerName(record.subjectPlayerId)}와(과) 함께 있었습니까?`
    }

    return `${timeLabel}에 ${finders.itemName(record.itemId)}을(를) 소지했습니까?`
  }

  if (record.recordType === "answer") {
    return record.answer ? "예, 맞습니다." : "아니오, 그렇지 않습니다."
  }

  return "공식 기록"
}

// officialRecords를 OfficialFeed의 카드 형식으로 변환합니다.
const adaptOfficialFeed = (records, finders) =>
  [...records]
    .sort(
      (left, right) =>
        new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
    )
    .map((record) => ({
      id: getId(record),
      type: record.recordType,
      round: record.round,
      authorId: String(record.authorId),
      targetId: record.targetId ? String(record.targetId) : null,
      parentId: record.questionId ? String(record.questionId) : null,
      questionType: record.questionType,
      statementType: record.statementType,
      time: record.time,
      section: record.section,
      timeLabel: formatSlotLabel(record.time, record.section),
      content: makeRecordContent(record, finders),
      lifecycleStatus: record.status,
      validationStatus:
        record.validationStatus ||
        (["verified", "contradiction"].includes(record.status) ? record.status : null),
      status:
        record.recordType === "question"
          ? record.status
          : record.validationStatus === "contradiction" || record.status === "contradiction"
            ? "contradiction"
            : record.validationStatus === "verified" || record.status === "verified"
              ? "verified"
              : "unchecked",
      conflicts: record.conflicts || [],
      createdAt: formatCreatedAt(record.createdAt),
      answer: record.answer,
      submissionSource: record.submissionSource || "player",
    }))

// 질문 레코드에 연결된 답변을 묶어 Q&A 히스토리에서 사용합니다.
const adaptOfficialQuestions = (records, officialFeed) =>
  records
    .filter((record) => record.recordType === "question")
    .map((question) => {
      const questionId = getId(question)
      const questionFeed = officialFeed.find((item) => item.id === questionId)
      const answerFeed = officialFeed.find(
        (item) => item.type === "answer" && item.parentId === questionId
      )

      return {
        ...questionFeed,
        answer: answerFeed || null,
      }
    })

// 구조화된 ALIBI 진술을 시간×플레이어 추리 보드의 공개 증거 칸으로 변환합니다.
// 같은 사용자가 같은 슬롯을 여러 라운드에서 다시 진술할 수 있으므로 마지막 record로
// 덮어쓰지 않고 한 셀에 누적합니다. 서로 다른 장소를 말했다면 모순 기록도 그대로 보입니다.
const buildBoardEvidence = (records, timeSlots, places) => {
  const result = {}

  records
    .filter(
      (record) =>
        record.recordType === "statement" &&
        record.statementType === "ALIBI"
    )
    .forEach((record) => {
      const slot = timeSlots.find(
        (item) =>
          Number(item.time) === Number(record.time) &&
          item.section === record.section
      )

      if (!slot) return

      const key = `${slot.id}-${record.authorId}`
      const place = places.find((item) => item.id === record.placeId)
      const recordStatus =
        record.validationStatus ||
        (["verified", "contradiction"].includes(record.status)
          ? record.status
          : "unchecked")
      const previous = result[key]
      const placeIds = [
        ...(previous?.placeIds || []),
        ...(record.placeId ? [record.placeId] : []),
      ].filter((value, index, array) => array.indexOf(value) === index)
      const sourceIds = [
        ...(previous?.sourceIds || []),
        getId(record),
      ].filter((value, index, array) => array.indexOf(value) === index)
      const hasConflict =
        recordStatus === "contradiction" || previous?.status === "contradiction"

      result[key] = {
        placeId: record.placeId,
        placeIds,
        label:
          placeIds.length > 1
            ? "복수 장소 진술"
            : place?.shortName || place?.name || record.placeId,
        sourceType: "statement",
        sourceId: getId(record),
        sourceIds,
        recordCount: sourceIds.length,
        status: hasConflict ? "contradiction" : recordStatus,
        toolId: record.itemId || previous?.toolId || null,
      }
    })

  return result
}

// 공개된 힌트 중 특정 key의 값만 가져옵니다.
const getRevealedHintValues = (hints, key) =>
  hints.find((hint) => hint.key === key && hint.status === "revealed")
    ?.rawValues || []

// Result/Deduction/Briefing 화면에서 사용할 사건 후보 묶음을 만듭니다.
const buildCaseProfile = ({ caseBriefing, hints, timeSlots, tools }) => ({
  title: caseBriefing.title || "오래된 대저택 살인사건",
  victimName: caseBriefing.victimName || "피해자",
  victimAge: caseBriefing.victimAge || null,
  victimOccupation: caseBriefing.victimOccupation || "저택의 주인",
  victimDescription: caseBriefing.victimDescription || "",
  story: caseBriefing.story || "",
  // 서버에 고정 발견 시각이 없으면 정답처럼 보이는 임의 시각 대신 미공개로 표시합니다.
  discoveredAt: caseBriefing.discoveredAt || "미공개",
  discoveredPlaceId: caseBriefing.discoveredPlaceId || null,
  causeOfDeath: caseBriefing.causeOfDeath || "조사 중",
  locationCandidateIds:
    getRevealedHintValues(hints, "PLACE_CANDIDATES_3").length > 0
      ? getRevealedHintValues(hints, "PLACE_CANDIDATES_3")
      : getRevealedHintValues(hints, "PLACE_CANDIDATES_6"),
  weaponCandidateIds: tools.map((tool) => tool.id),
  forensicWindowIds: hints
    .find((hint) => hint.key === "TIME_CANDIDATE_HOURS")
    ?.valueIds || [],
  finalWindowIds: hints
    .find((hint) => hint.key === "FINAL_TIME_SLOTS_5")
    ?.valueIds || [],
  allTimeSlotIds: timeSlots.map((slot) => slot.id),
})

/**
 * GET /api/games/:gameId 전체 응답을 현재 MainGamePage용 game 객체로 변환합니다.
 * rawResponse가 없을 때 null을 반환해 GameContext가 로딩 화면을 유지할 수 있게 합니다.
 */
export const adaptGameResponse = (rawResponse) => {
  if (!rawResponse?.game) {
    return null
  }

  const rawGame = rawResponse.game
  const viewer = rawResponse.viewer || {}
  const timeSlots = adaptTimeSlots(rawGame.rulesSnapshot?.timeSlots)
  const places = adaptPlaces(rawGame.mapSnapshot?.places)
  const toolPool = adaptItems(rawGame.mapSnapshot?.itemsInUse)
  const players = adaptPlayers(rawGame.players, viewer)
  const finders = makeFinders({ players, places, tools: toolPool })
  const records = rawGame.officialRecords || []
  const officialFeed = adaptOfficialFeed(records, finders)
  const hints = adaptHints(rawGame.hints, timeSlots)
  const caseBriefing = {
    ...(rawGame.caseBriefing || {}),
    story: rawGame.mapSnapshot?.story || "",
  }

  return {
    id: rawGame.id,
    roomId: rawGame.roomId,
    // 방장 ID
    hostId: getId(rawGame.room?.host),
    // 방장 ID 불러오기
    roomCode: rawGame.room?.inviteCode || "",
    title: caseBriefing.title || rawGame.room?.title || "저택 살인사건",
    status: rawGame.status,
    phase: rawGame.phase,
    stage: rawGame.stage || "statement",
    stageLabel: rawGame.stageLabel || "공식 진술 제출",
    currentRound: rawGame.currentRound,
    currentPlayerId: String(viewer.userId || ""),
    roundStartedAt: rawGame.roundStartedAt,
    roundEndsAt: rawGame.roundEndsAt,
    stageStartedAt: rawGame.stageStartedAt || rawGame.roundStartedAt,
    stageEndsAt: rawGame.stageEndsAt || rawGame.roundEndsAt,
    serverNow: rawGame.serverNow || null,
    revision: rawGame.revision || 0,
    createdAt: rawGame.startedAt,
    timeSlots,
    places,
    toolPool,
    players,
    caseProfile: buildCaseProfile({
      caseBriefing,
      hints,
      timeSlots,
      tools: toolPool,
    }),
    rounds: adaptRounds({
      roundsSnapshot: rawGame.roundsSnapshot,
      currentRound: rawGame.currentRound,
      phase: rawGame.phase,
      submissionStatus: rawGame.submissionStatus,
      totalPlayers: players.length,
    }),
    hints,
    officialStatements: officialFeed.filter(
      (item) => item.type === "statement"
    ),
    officialQuestions: adaptOfficialQuestions(records, officialFeed),
    officialFeed,
    boardEvidence: buildBoardEvidence(records, timeSlots, places),
    rules: {
      ...rawGame.rulesSnapshot,
    },
    submissionStatus: rawGame.submissionStatus,
    deductionStatus: rawGame.deductionStatus || [],
    roundChecks: rawGame.roundChecks || [],
    viewer: {
      ...viewer,
      role: viewer.role,
      timeline: adaptViewerTimeline(viewer.timeline),
    },
  }
}

export default adaptGameResponse
