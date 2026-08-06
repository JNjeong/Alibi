export function setGame(users, mapinfo) {
    // 플레이어 수 설정
    const players = users //user들이 담긴 배열
    const map_places = mapinfo.map_places
    const roles = mapinfo.roles
    const items = mapinfo.items

    // 범행정보 생성
    const crimeInfo = createCrime(map_places, roles, items)

    // 맵 내 사용도구 선정
    const items_in_use = pickToolsByFeature(items, crimeInfo)

    // 플레이어 데이터맵 생성
    const { preparedPlayerTimelineMap, playersRoles } = createPlayerTimeline(players, map_places, roles, items_in_use, crimeInfo)

    // 거짓진술용 빈 플레이어 데이터맵
    const inGamePlayerTimelineMap = createPlayerTimelineMap(players, crimeInfo)

    // 라운드별 힌트 생성
    const hintsPerRound = createHintsPerRound(preparedPlayerTimelineMap, crimeInfo, map_places)

    // 유저별 동행/목격 정보
    const witnessesMap = createWitnessesMap(preparedPlayerTimelineMap)

    // 빈 동행/목격 정보 생성
    const inGameWitnessesMap = createInGameWitnessesMap(preparedPlayerTimelineMap)

    const caseBriefing = {
        title: "오래된 대저택 살인사건",
        victimName: "김사과",
        victimAge: 55,
        victimOccupation: "저택 주인",
        victimDescription: "RIP 여기 잠들다...",
        discoveredAt: "",
        discoveredPlaceId: "",
        causeOfDeath: "",
    }

    return { crimeInfo, preparedPlayerTimelineMap, playersRoles, inGamePlayerTimelineMap, hintsPerRound, witnessesMap, inGameWitnessesMap, itemsInUse: items_in_use, caseBriefing }
}
// 인게임 모순검사 함수
export function inGameCheckValidation(inGamePlayerTimelineMap, inGameWitnessesMap, playerObj, timeKey, sectionKey, qandaList, alibi = null, qanda = null) {
    const conflicts = { placeCheck: [], itemCheck: [], qandaCheck: [], witnessCheck: [] }
    const { QandaList_alibi, _ } = seperateQandAList(qandaList)

    if (alibi) {
        // 알리바이 모순
        // 시간:section 내의 장소 2인이상 모순 검사
        const placeCheck = inGamePlayerTimelineMap.map(p => {
            const ali = p.alibi?.[timeKey]?.[sectionKey]
            return ali ? { player_id: p.player_id, alibi: ali } : null
        }).filter(Boolean).filter(entry => entry.alibi.place === alibi.place)
        QandaList_alibi.forEach(qa => {
            if (qa.time === timeKey && qa.section === sectionKey && qa.alibi?.place) {
                if (qa.alibi?.place === alibi.place) placeCheck.push({ player_id: qa.player_to, alibi: qa.alibi })
            }
        })
        if (placeCheck.length >= 2) conflicts.placeCheck.push(...placeCheck)

        // 시간:section 내의 동일 도구 중복 소유 검사
        const itemCheck = inGamePlayerTimelineMap.map(p => {
            const ali = p.alibi?.[timeKey]?.[sectionKey]
            return ali ? { player_id: p.player_id, alibi: ali } : null
        }).filter(Boolean).filter(entry => entry.alibi.item && entry.alibi.item.item_id === alibi.item.item_id)
        // const { QandaList_alibi, _ } = seperateQandAList(qandaList)
        QandaList_alibi.forEach(qa => {
            if (qa.time === timeKey && qa.section === sectionKey && qa.alibi?.item) {
                if (qa.alibi?.item.item_id === alibi.item.item_id) itemCheck.push({ player_id: qa.player_to, alibi: qa.alibi })
            }
        })
        if (itemCheck.length >= 1) conflicts.itemCheck.push(...itemCheck)
    }
    if (qanda) {
        /* 질의응답 모순여부 검사 
        [
            {
                player_from: plyer_id,
                player_to: player_id,
                time: timeKey,
                section: sectionKey,
                alibi: alibi{place,time,action},
                answer: answer(true/false)
            }, ...
        ]
        */
        // const { QandaList_alibi, _ } = seperateQandAList(qandaList)
        const qandaCheck = QandaList_alibi.forEach(qa => {
            if (qa.answer) {
                if (qa.time === timeKey && qa.section === sectionKey) {
                    const targetAli = inGamePlayerTimelineMap.find(p => p.player._id === qa.player_to)?.alibi?.[timeKey]?.[sectionKey];

                    // qa와 장소모순
                    if (qa.alibi.place && targetAli.place && qa.alibi.place !== targetAli.place) conflicts.qandaCheck.push({ player_id: qa.player_to, alibi: targetAli })

                    // qa와 도구모순
                    if (qa.alibi.item && targetAli.item && qa.alibi.item.item_id !== targetAli.item.item_id) conflicts.qandaCheck.push({ player_id: qa.player_to, alibi: targetAli })

                }
            }
            else if (qa.answer === false) {
                const targetAli = inGamePlayerTimelineMap.find(p => p.player._id === qa.player_to)?.alibi?.[timeKey]?.[sectionKey]

                // 본인 진술의 장소 비교
                if (qa.alibi?.place && targetAli?.place && qa.alibi.place !== targetAli.place) conflicts.qandaCheck.push({ player_id: qa.player_to, alibi: targetAli })

                // 해당시각 목격정보와 비교
                inGameWitnessesMap.forEach(entry => {
                    if (entry.player === qa.player_to) return
                    const witnessAli = inGamePlayerTimelineMap.find(p => p.player._id === entry.player)?.alibi?.[timeKey]?.[sectionKey];
                    entry.witnesses.forEach(wit => {
                        if (wit.time === timeKey && wit.section === sectionKey && wit.witness === qa.player_to) {
                            if (qa.alibi?.place && wit.place && qa.alibi.place !== wit.place) {
                                conflicts.witnessCheck.push(witnessAli)
                            }
                        }
                    })
                })

                // 본인 진술의 도구 소유와 비교
                if (qa.alibi?.item && targetAli?.item && qa.alibi.item.item_id !== targetAli.item?.item_id) conflicts.qandaCheck.push({ player_id: qa.player_to, alibi: targetAli })
            }
        })
    }

    // 알리바이 시 상호 목격정보 불일치 모순
    const witnessCheckAsSlot = checkPlayerWitnessAtSlot(inGameWitnessesMap, playerObj.player._id, timeKey, sectionKey, alibi.place)
    let witnessAlibis = null
    if (!witnessCheckAsSlot.valid) {
        witnessAlibis = witnessCheckAsSlot.conflicts.map(c => {
            return findWitnessAlibi(inGamePlayerTimelineMap, qandaList, c.time, c.section, c.place, c.witness)
        }).filter(Boolean)
    }
    conflicts.witnessCheck.push(...witnessAlibis)

    return conflicts
}


function findPlayerWitnessEntry(witnessesMap, playerId) {
    return witnessesMap.find(entry => entry.player === playerId)
}

function hasReciprocalWitness(witnessesMap, playerA, playerB, time, section, place) {
    const otherEntry = findPlayerWitnessEntry(witnessesMap, playerB)
    if (!otherEntry) return false

    return otherEntry.witnesses.some(w =>
        w.time === time &&
        w.section === section &&
        w.place === place &&
        w.witness === playerA
    )
}

// 특정 플레이어의 한 시각·섹션·장소 목격정보 상호 일치 검사
export function checkPlayerWitnessAtSlot(witnessesMap, playerId, time, section, place) {
    const placeId = place?.place_id ?? place
    const playerEntry = findPlayerWitnessEntry(witnessesMap, playerId)
    if (!playerEntry || !placeId) return { valid: true, conflicts: [] }

    const slotWitnesses = playerEntry.witnesses.filter(w =>
        w.time === time && w.section === section && w.place === placeId
    )
    if (slotWitnesses.length === 0) return { valid: true, conflicts: [] }

    const conflicts = slotWitnesses.filter(w =>
        !hasReciprocalWitness(witnessesMap, playerId, w.witness, time, section, placeId)
    )

    return { valid: conflicts.length === 0, conflicts }
}

// witnessesMap 전체 상호 목격정보 일치 검사
export function checkWitnessMapValidation(witnessesMap) {
    const conflicts = []

    witnessesMap.forEach(entry => {
        entry.witnesses.forEach(w => {
            if (hasReciprocalWitness(witnessesMap, entry.player, w.witness, w.time, w.section, w.place)) return
            conflicts.push(w)
        })
    })

    return { valid: conflicts.length === 0, conflicts }
}

function findWitnessAlibi(inGamePlayerTimelineMap, qandaList, timeKey, sectionKey, place, playerid) {
    // TODO: 목격자의 알리바이가, 질의응답에 있거나 timelinemap 에 있거나 두가지 경우가 있음
    // const { QandaList_alibi, _ } = seperateQandAList(qandaList)

    let alibi = null

    // qandaList에서 목격
    const qandaMatch = qandaList.find(qa =>
        qa.player_to === playerid && qa.time === timeKey && qa.section === sectionKey && qa.alibi
    )
    if (qandaMatch) {
        alibi = {
            player_id: qandaMatch.player_to,
            alibi: qandaMatch.alibi
        }
    }

    //timelinemap에서 목격
    if (!alibi) {
        const playerEntry = inGamePlayerTimelineMap.find(p => p.player._id === playerid)
        if (playerEntry && playerEntry.alibi?.[timeKey]?.[sectionKey]) {
            const timelineAli = playerEntry.alibi[timeKey][sectionKey]
            if (!place || timelineAli.place === place) {
                alibi = { player_id: playerid, alibi: timelineAli }
            }
        }
    }
    return alibi
}

function seperateQandAList(qandaList) {
    const QandaList_alibi = []
    const QandaList_wit = []

    qandaList.forEach(qa => {
        // alibi가 존재하는 경우
        if (qa.alibi) {
            QandaList_alibi.push({
                player_from: qa.player_from,
                player_to: qa.player_to,
                time: qa.time,
                section: qa.section,
                alibi: qa.alibi,
                answer: qa.answer
            })
        }
        // witness가 존재하는 경우
        else if (qa.witness) {
            QandaList_wit.push({
                player_from: qa.player_from,
                player_to: qa.player_to,
                time: qa.time,
                section: qa.section,
                witness: qa.witness,
                answer: qa.answer
            })
        }
    })

    return { QandaList_alibi, QandaList_wit }
}

// 범행생성 함수
function createCrime(map_places, roles, items) {
    // 범행 시각 생성 (13시~23시)
    const crimeTime = Math.floor(Math.random() * 10) + 13

    // 범행 시각 섹션 생성
    const timeSection = ["section02", "section24", "section46"]
    const crimeTimeSection = timeSection[(Math.floor(Math.random() * timeSection.length))]

    // 범행 역할, 장소, 도구 설정
    const crimePlace = pickOneRandomly(map_places)
    const crimeRole = pickOneRandomly(roles)
    const crimeItem = pickOneRandomly(items)

    return { crimeTime, timeSection: crimeTimeSection, crimePlace, crimeRole, crimeItem }
}

function createPlayerTimeline(players, map_places, roles, items_in_use, crimeInfo) {
    // 전체 플레이어 데이터맵 구조 생성
    const PlayerTimelineMap = createPlayerTimelineMap(players, crimeInfo)

    // 역할분배
    const playersRoles = assingRolesToPlayers(players, roles, crimeInfo)

    // 타임라인 생성 
    const preparedPlayerTimelineMap = createPlayersAlibi(PlayerTimelineMap, playersRoles, players, map_places, items_in_use, crimeInfo)

    return { preparedPlayerTimelineMap, playersRoles }
}

// 배열 내 랜덤 지정 함수
function pickOneRandomly(arr) {
    return arr[Math.floor(Math.random() * arr.length)]
}

// 알리바이 생성
function createPlayersAlibi(playerTimelineMap, playersRoles, players, map_places, items_in_use, crimeInfo) {
    const timelineMap = playerTimelineMap
    // 범인 정보 반영
    const criminal = playersRoles.find(pr => pr.role.role_id === crimeInfo.crimeRole.role_id).player
    timelineMap.find(p => p.player._id === criminal._id).alibi[crimeInfo.crimeTime][crimeInfo.timeSection] = {
        place: crimeInfo.crimePlace,
        item: crimeInfo.crimeItem,
        action: "(경)★☆피해자 살인♬★☆(축)"
    }

    // 위험 알리바이 주입
    // 범인 외 유저 선택
    const otherPlayers = playersRoles.map(pr => pr.player).filter(p => p !== criminal)
    const shuffledOtherPlayers = otherPlayers.sort(() => 0.5 - Math.random())
    const [playerA, playerB, playerC, playerD, playerE, playerF, playerG, playerH, playerI] = shuffledOtherPlayers

    // 범행도구와 동일 특징 도구
    const crimeItemFeature = crimeInfo.crimeItem.item_feature
    const sameFeatureItem = items_in_use.filter(item => item.item_feature === crimeItemFeature && item !== crimeInfo.crimeItem)

    // 범행시각내의 범행section 외의 section
    const dangerSections = ["section02", "section24", "section46"].filter(sec => sec !== crimeInfo.timeSection)


    // 장소 위험 알리바이
    if (playerA) {
        let alibi;
        do {
            alibi = {
                place: crimeInfo.crimePlace,
                item: Math.random() < 0.5 ? pickOneRandomly(items_in_use.filter(i => i.item_feature !== crimeInfo.crimeItem.item_feature)) : null,
                action: pickOneRandomly(crimeInfo.crimePlace.place_action)
            }
        } while (!checkAlibiValidation(timelineMap, playerA, crimeInfo.crimeTime, dangerSections[0], alibi, crimeInfo, playersRoles))

        timelineMap.find(p => p.player._id === playerA._id).alibi[crimeInfo.crimeTime][dangerSections[0]] = alibi
    }
    if (playerB) {
        let alibi;
        do {
            alibi = {
                place: crimeInfo.crimePlace,
                item: Math.random() < 0.5 ? pickOneRandomly(items_in_use.filter(i => i.item_feature !== crimeInfo.crimeItem.item_feature)) : null,
                action: pickOneRandomly(crimeInfo.crimePlace.place_action)
            }
        } while (!checkAlibiValidation(timelineMap, playerB, crimeInfo.crimeTime, dangerSections[0], alibi, crimeInfo, playersRoles))

        timelineMap.find(p => p.player._id === playerB._id).alibi[crimeInfo.crimeTime][dangerSections[0]] = alibi
    }
    if (playerC) {
        let alibi;
        do {
            alibi = {
                place: crimeInfo.crimePlace,
                item: Math.random() < 0.5 ? pickOneRandomly(items_in_use.filter(i => i.item_feature !== crimeInfo.crimeItem.item_feature)) : null,
                action: pickOneRandomly(crimeInfo.crimePlace.place_action)
            }
        } while (!checkAlibiValidation(timelineMap, playerC, crimeInfo.crimeTime, dangerSections[1], alibi, crimeInfo, playersRoles))

        timelineMap.find(p => p.player._id === playerC._id).alibi[crimeInfo.crimeTime][dangerSections[1]] = alibi
    }
    if (playerD) {
        let alibi;
        do {
            alibi = {
                place: crimeInfo.crimePlace,
                item: Math.random() < 0.5 ? pickOneRandomly(items_in_use.filter(i => i.item_feature !== crimeInfo.crimeItem.item_feature)) : null,
                action: pickOneRandomly(crimeInfo.crimePlace.place_action)
            }
        } while (!checkAlibiValidation(timelineMap, playerD, crimeInfo.crimeTime, dangerSections[1], alibi, crimeInfo, playersRoles))

        timelineMap.find(p => p.player._id === playerD._id).alibi[crimeInfo.crimeTime][dangerSections[1]] = alibi
    }

    // 도구 위험 알리바이
    if (playerE) {
        let alibi;
        do {
            const randPlace = pickOneRandomly(map_places.filter(m => m !== crimeInfo.crimePlace))
            alibi = {
                place: randPlace,
                item: pickOneRandomly(sameFeatureItem),
                action: pickOneRandomly(randPlace.place_action)
            }
        } while (!checkAlibiValidation(timelineMap, playerE, crimeInfo.crimeTime, crimeInfo.timeSection, alibi, crimeInfo, playersRoles))

        timelineMap.find(p => p.player._id === playerE._id).alibi[crimeInfo.crimeTime][crimeInfo.timeSection] = alibi
    }
    if (playerH) {
        let alibi;
        do {
            const randPlace = pickOneRandomly(map_places.filter(m => m !== crimeInfo.crimePlace))
            alibi = {
                place: randPlace,
                item: crimeInfo.crimeItem,
                action: pickOneRandomly(randPlace.place_action)
            }
        } while (!checkAlibiValidation(timelineMap, playerH, crimeInfo.crimeTime, dangerSections[0], alibi, crimeInfo, playersRoles))

        timelineMap.find(p => p.player._id === playerH._id).alibi[crimeInfo.crimeTime][dangerSections[0]] = alibi
    }
    if (playerF) {
        let alibi;
        do {
            const randPlace = pickOneRandomly(map_places.filter(m => m !== crimeInfo.crimePlace))
            alibi = {
                place: randPlace,
                item: crimeInfo.crimeItem,
                action: pickOneRandomly(randPlace.place_action)
            }
        } while (!checkAlibiValidation(timelineMap, playerF, crimeInfo.crimeTime, dangerSections[1], alibi, crimeInfo, playersRoles))

        timelineMap.find(p => p.player._id === playerF._id).alibi[crimeInfo.crimeTime][dangerSections[1]] = alibi
    }
    if (playerG) {
        let alibi;
        do {
            const randPlace = pickOneRandomly(map_places.filter(m => m !== crimeInfo.crimePlace))
            alibi = {
                place: randPlace,
                item: pickOneRandomly(sameFeatureItem),
                action: pickOneRandomly(randPlace.place_action)
            }
        } while (!checkAlibiValidation(timelineMap, playerG, crimeInfo.crimeTime, dangerSections[0], alibi, crimeInfo, playersRoles))

        timelineMap.find(p => p.player._id === playerG._id).alibi[crimeInfo.crimeTime][dangerSections[0]] = alibi
    }
    if (playerI) {
        let alibi;
        do {
            const randPlace = pickOneRandomly(map_places.filter(m => m !== crimeInfo.crimePlace))
            alibi = {
                place: randPlace,
                item: pickOneRandomly(sameFeatureItem),
                action: pickOneRandomly(randPlace.place_action)
            }
        } while (!checkAlibiValidation(timelineMap, playerI, crimeInfo.crimeTime, dangerSections[1], alibi, crimeInfo, playersRoles))

        timelineMap.find(p => p.player._id === playerI._id).alibi[crimeInfo.crimeTime][dangerSections[1]] = alibi
    }

    // 남은 알리바이 생성
    const times = Object.keys(timelineMap[0].alibi)

    players.forEach(playerName => {
        const playerObj = timelineMap.find(p => p.player._id === playerName._id)
        times.map(timeKey => {
            ["section02", "section24", "section46"].forEach(sectionKey => {
                if (!playerObj.alibi[timeKey][sectionKey].place) {
                    let alibi;
                    do {
                        const randomplace = pickOneRandomly(map_places)
                        alibi = {
                            place: randomplace,
                            item: Math.random() < 0.5 ? pickOneRandomly(items_in_use) : null,
                            action: pickOneRandomly(randomplace.place_action)
                        }
                    } while (!checkAlibiValidation(timelineMap, playerObj, timeKey, sectionKey, alibi, crimeInfo, playersRoles))
                    playerObj.alibi[timeKey][sectionKey] = alibi
                }
            })
        })
    })
    return timelineMap
}

// 알리바이 모순 검사 함수
function checkAlibiValidation(PlayerTimelineMap, playerObj, timeKey, sectionKey, alibi, crimeInfo, playersRoles) {
    // 시간:section 내의 장소 2인이상 모순 검사
    const placeCheck = PlayerTimelineMap.map(p => p.alibi[timeKey][sectionKey]).filter(ali => ali?.place === alibi.place)

    if (placeCheck.length >= 2) return false;

    // 시간:section 내의 동일 도구 중복 소유 검사
    const itemCheck = PlayerTimelineMap.map(p => p.alibi[timeKey][sectionKey]).filter(ali => ali?.item && ali?.item.item_id === alibi.item?.item_id)
    if (itemCheck.length >= 1) return false

    // 범행 장소 동행자 금지
    if (timeKey === crimeInfo.crimeTime && sectionKey === crimeInfo.timeSection) {
        const player_role = playersRoles.find(pr => pr.player._id === playerObj._id)
        if (alibi.place === crimeInfo.crimePlace && player_role.role.role_id !== crimeInfo.crimeRole.role_id) return false
        if (alibi.item?.item_id === crimeInfo.crimeItem.item_id && player_role.role.role_id !== crimeInfo.crimeRole.role_id) return false
    }
    return true
}

// 빈 타임라인맵 생성 함수
function createPlayerTimelineMap(players, crimeInfo) {
    const playerTimelineMap = []
    const playerCnt = players.length
    const endTimeRange = pickMaxAlibiHour(crimeInfo)
    const startTimeRange = endTimeRange - 5

    // 플레이어별 빈 알리바이 타임라인 생성
    for (let i = 0; i < players.length; i++) {
        const playerTimeline = {}
        for (let hour = startTimeRange; hour <= endTimeRange; hour++) {
            playerTimeline[hour] = {
                section02: {},
                section24: {},
                section46: {}
            }
        }
        playerTimelineMap.push({
            player: players[i],
            alibi: playerTimeline
        })
    }
    return playerTimelineMap
}

// 플레이 시간 max치 랜덤 지정 함수
function pickMaxAlibiHour(crimeInfo) {
    // 범행 시각 후보 생성
    const crimeTime = crimeInfo.crimeTime
    const candidates = [crimeTime, crimeTime + 1, crimeTime + 2];
    const validCandidates = candidates.filter(time => time >= 13 && time <= 24)
    const maxTime = validCandidates[Math.floor(Math.random() * validCandidates.length)]
    return maxTime
}

// 플레이어에게 랜덤 역할 배정 함수
function assingRolesToPlayers(players, roles, crimeInfo) {
    const crimeRole = crimeInfo.crimeRole
    const otherRoles = roles.filter(role => role.role_id !== crimeRole.role_id)

    const shuffled = otherRoles.sort(() => 0.5 - Math.random())
    const randomRoles = shuffled.slice(0, players.length - 1)

    const selectedRoles = [crimeRole, ...randomRoles]

    const shuffledSelectedRoles = selectedRoles.sort(() => 0.5 - Math.random())

    const roleAssignments = players.map((player, idx) => {
        return { player: player, role: shuffledSelectedRoles[idx] }
    })
    return roleAssignments
}

// feature별 도구 2개 선정 함수
function pickToolsByFeature(items, crimeInfo) {
    // feature별 분류
    const featureGroup = items.reduce((acc, item) => {
        const feat = item.item_feature
        if (!acc[feat]) acc[feat] = []
        acc[feat].push(item)
        return acc
    }, {})

    const selectedItems = []
    // 범행도구 추가
    selectedItems.push(crimeInfo.crimeItem)

    // 범행도구특징
    const crimeItemFeature = crimeInfo.crimeItem.item_feature

    // 범행도구와 같은 feature item 랜덤 지정
    const sameFeatureItem = featureGroup[crimeItemFeature].filter(item => item.item_id !== crimeInfo.crimeItem.item_id)
    if (sameFeatureItem.length > 0) {
        const randomSame = sameFeatureItem[Math.floor(Math.random() * sameFeatureItem.length)];
        selectedItems.push(randomSame);
    }

    // 기타 특징별 아이템 2개 랜덤 지정
    Object.keys(featureGroup).forEach(feature => {
        if (feature === crimeItemFeature) return;
        const shuffled = featureGroup[feature].sort(() => 0.5 - Math.random())
        selectedItems.push(...shuffled.slice(0, 2))
    })
    return selectedItems.slice(0, 8)
}

// place_id 기준 중복 제거
function dedupePlacesById(places) {
    const seen = new Set()
    return places.filter(place => {
        if (seen.has(place.place_id)) return false
        seen.add(place.place_id)
        return true
    })
}

// 라운드별 힌트 생성 함수
function createHintsPerRound(preparedPlayerTimelineMap, crimeInfo, map_places) {
    const hints = {}

    // 1라운드: 12개 장소중 범행장소포함하여, 범행시각(+section1~3)내 최다 빈도 장소 5개 추가선정, 부족분 랜덤지정
    const placeCount = {} // 빈도수계산
    preparedPlayerTimelineMap.forEach(tl => {
        ["section02", "section24", "section46"].forEach(sec => {
            const place = tl.alibi[crimeInfo.crimeTime][sec]?.place
            if (place) {
                placeCount[place.place_id] = (placeCount[place.place_id] || 0) + 1
            }
        })
    })
    const sortedPlaces = Object.entries(placeCount)
        .sort((a, b) => b[1] - a[1])
        .map(([placeId]) => map_places.find(p => p.place_id === placeId))
        .filter(Boolean)
    let round1Places = dedupePlacesById([crimeInfo.crimePlace, ...sortedPlaces.slice(0, 5)])
    if (round1Places.length < 6) {
        const selectedIds = new Set(round1Places.map(p => p.place_id))
        const randomFill = map_places.filter(m => !selectedIds.has(m.place_id)).sort(() => 0.5 - Math.random())
        round1Places.push(...randomFill.slice(0, 6 - round1Places.length))
    }
    hints.round1 = round1Places

    // 2라운드: 6개의 시간중 범행시각 + 범행시각 가까운 2개의 시간대 선정
    const times = Object.keys(preparedPlayerTimelineMap[0].alibi).map(Number).sort((a, b) => a - b); // 전체 시각 목록
    const idx = times.indexOf(crimeInfo.crimeTime)
    const round2Times = [crimeInfo.crimeTime]
    if (idx > 0) round2Times.push(times[idx - 1])
    if (idx < times.length - 1) round2Times.push(times[idx + 1])
    hints.round2 = round2Times

    // 3라운드: 범행도구 특징 공개
    hints.round3 = pickOneRandomly([
        { "sharp": "예리한 흉기에 의한 자상" },
        { "blunt": "둔기에 의한 두부 손상" },
        { "poison": "독성 물질에 의한 중독" },
        { "asphyxia": "기도 압박에 의한 질식" }])

    // 4라운드: 1라운드에서 선정된 6개의 장소중, 범행장소 포함하여, 범행시각 내 최다빈도 장소 2개 추가선정, 부족분 랜덤지정
    const round4Places = dedupePlacesById([crimeInfo.crimePlace, ...sortedPlaces.slice(0, 2)])
    if (round4Places.length < 3) {
        const selectedIds = new Set(round4Places.map(p => p.place_id))
        const randomFill = round1Places.filter(p => !selectedIds.has(p.place_id)).sort(() => 0.5 - Math.random())
        round4Places.push(...randomFill.slice(0, 3 - round4Places.length))
    }
    hints.round4 = round4Places

    // 5라운드: 3라운드에서 추출된 3개의 범행시각 == 9개 section중 범행시각에 해당하는 3개의 section 들을 포함하며, 2 section 추가 추출
    // 범행시각 이전시각과 이후시각이 있다면, 이전시각의 마지막 section 1개, 이후시각의 첫 section 1개 추출
    // 범행시각 이후 시각이 없다면, 이전시각의 마지막 두 section 추출
    const round5Sections = ["section02", "section24", "section46"].map(sec => ({ time: crimeInfo.crimeTime, section: sec }))
    if (idx > 0 && idx < times.length - 1) {
        round5Sections.push({ time: times[idx - 1], section: "section46" })
        round5Sections.push({ time: times[idx + 1], section: "section02" })
    } else if (idx > 0) {
        //이후 시작 없을 경우 이전시각의 마지막 두 section
        round5Sections.push({ time: times[idx - 1], section: "section24" })
        round5Sections.push({ time: times[idx - 1], section: "section46" })
    } else if (idx < times.length - 1) {
        round5Sections.push({ time: times[idx + 1], section: "section02" })
    }
    hints.round5 = round5Sections

    return hints
}

// 유저별 동행/목격 정보 생성 함수
function createWitnessesMap(preparedPlayerTimelineMap) {
    const witnessesMap = []

    preparedPlayerTimelineMap.forEach(player => {
        witnessesMap.push({
            player: player.player._id,
            witnesses: []
        })
    })

    const placeGroups = {}
    preparedPlayerTimelineMap.forEach(player => {
        Object.keys(player.alibi).forEach(time => {
            Object.keys(player.alibi[time]).forEach(section => {
                const placeid = player.alibi[time][section]?.place.place_id
                if (!placeid) return

                const key = `${time}%${section}%${placeid}`
                if (!placeGroups[key]) placeGroups[key] = []
                placeGroups[key].push(player.player._id)
            })
        })
    })

    // 목격자 관계 생성
    Object.entries(placeGroups).forEach(([key, players]) => {
        if (players.length > 1) {
            const [time, section, place] = key.split("%")
            players.forEach(pid => {
                const entry = witnessesMap.find(wit => wit.player === pid)
                players.filter(x => x !== pid).forEach(other => {
                    entry.witnesses.push({
                        time: parseInt(time),
                        section,
                        place,
                        witness: other
                    })
                })
            })
        }
    })
    return witnessesMap
}

function createInGameWitnessesMap(preparedPlayerTimelineMap) {
    const inGameWitnessesMap = []
    preparedPlayerTimelineMap.forEach(player => {
        inGameWitnessesMap.push({
            player: player.player._id,
            witnesses: []
        })
    })
    return inGameWitnessesMap
}