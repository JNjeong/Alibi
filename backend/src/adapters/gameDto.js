// DTO(Data Transfer Object) 역할을 수행하는 모듈
// Game 문서를 기반으로, 사용자별로 공개/비공개 응답을 분리하여 반환하는 역할을 수행
// res.json(game) 형태로 보내면 정답과 다른 사람 타임라인 유출됨

// id : ObjectId를 문자열로 변환하여 반환
const id = (value) => String(value?._id ?? value ?? "")
const iso = (value) => (value ? new Date(value). toISOString() : null)

// publicPlayer : player 객체를 받아, 공개 가능한 정보만 반환
const publicPlayer = (player) => ({
    playerId: id(player.playerId),
    nickname: player.nickname,
    role: {
        roleId: player.role?.roleId,
        name: player.role?.name,
        occupation : player.role?.occupation,
    },
    questionCount: player.questionCount ?? 0,
    })

// privateMe : player 객체를 받아, 본인에게만 공개되는 정보 반환
const privateMe = (player) => ({
    ...publicPlayer(player),
    userId: id(player.userId),
    username: player.username,
    role: {
        ...publicPlayer(player).role,
        motive: player.role?.motive,

    },
    timeline : (player.timeline ?? []).map((entry) => ({
        slotIndex: entry.slotIndex,
        placeId: entry.placeId,
        action : entry.action,
        companionPlyerIds : (entry.companionPlyerIds ?? []).map(id),
        toolId: entry.toolId,
        flags: entry.flags ?? []
    })),
    witness:player.witness ?? [],
    })

    // toStatementDto = 더 작성해야하아아아아아아아ㅏ앙
    // toQuestionDto
    // toFeedItems
    // questionItems
    // toBootstrapDto
    // toActiveGameDto
    // toREsultDto



