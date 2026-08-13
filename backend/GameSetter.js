export function setGame(users, mapinfo) {
    // 원본 GameSetter의 입력 규칙을 유지합니다.
    // 참가 인원, 테스트 역할 제외, 도구 최소 개수 등을 생성기에서 새로 강제하지 않습니다.
    // 방의 참가 인원 정책은 Room 계층이 담당하고 GameSetter는 전달된 배열로 사건을 만듭니다.
    const players = users
    const map_places = mapinfo.map_places
    const roles = mapinfo.roles
    const items = mapinfo.items

    // 범행정보 생성
    const crimeInfo = createCrime(map_places, roles, items)

    // 맵 내 사용도구 선정
    const items_in_use = pickToolsByFeature(items, crimeInfo)

    // 플레이어 데이터맵 생성
    const { preparedPlayerTimelineMap, playersRoles } = createPlayerTimeline(players, map_places, roles, items_in_use, crimeInfo)

    // 거짓진술용 빈 플레이어 데이터맵도 실제 타임라인과 같은 랜덤 시간창을 씁니다.
    // createPlayerTimelineMap()을 다시 무작위 호출하면 두 맵의 시작·종료 시간이
    // 달라질 수 있으므로, 먼저 생성된 실제 타임라인의 hour 목록을 그대로 전달합니다.
    const timelineHours = Object.keys(preparedPlayerTimelineMap[0]?.alibi || {}).map(Number)
    const inGamePlayerTimelineMap = createPlayerTimelineMap(players, crimeInfo, timelineHours)

    // 라운드별 힌트 생성
    const hintsPerRound = createHintsPerRound(preparedPlayerTimelineMap, crimeInfo, map_places)

    // 유저별 동행/목격 정보
    const witnessesMap = createWitnessesMap(preparedPlayerTimelineMap)

    // 빈 동행/목격 정보 생성
    const inGameWitnessesMap = createInGameWitnessesMap(preparedPlayerTimelineMap)

    // 발견 장소·시각은 원본 GameSetter에 생성 규칙이 없으므로 빈 값으로 유지합니다.
    // 저장/API 계층에서는 이 값을 null/"미공개"로 안전하게 표시합니다.
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
// -----------------------------------------------------------------------------
// v6 원칙
// - 이 파일이 공개 공식 기록의 논리 모순을 판정하는 단일 Source of Truth입니다.
// - game_service.js는 officialRecords를 이 함수가 이해하는 alibi / witnesses / qanda
//   형식으로 변환하고, 여기서 나온 결과를 다시 record ID에 연결만 합니다.
// - 실제 비밀 타임라인과 비교해 거짓/진실을 공개하지 않습니다.
// - __sourceRecordIds 같은 필드는 service가 런타임 추적용으로 붙이는 metadata이며
//   이 함수는 논리 판정에는 사용하지 않고 결과와 함께 그대로 보존합니다.

const getPlayerId = value => value?.player_id || value?.player?._id || value?._id || value
const getPlaceId = value => value?.place_id || value?.id || value
const getItemId = value => value?.item_id || value?.id || value
const samePlayer = (left, right) => String(getPlayerId(left)) === String(getPlayerId(right))
const samePlace = (left, right) => String(getPlaceId(left)) === String(getPlaceId(right))
const sameItem = (left, right) => String(getItemId(left)) === String(getItemId(right))
const sameTime = (left, right) => Number(left) === Number(right)
const sourceIdsOf = (value, field = null) => {
    const fieldKey = field === "place"
        ? "__placeSourceRecordIds"
        : field === "item"
            ? "__itemSourceRecordIds"
            : null
    const ids = fieldKey && value?.[fieldKey]?.length
        ? value[fieldKey]
        : value?.__sourceRecordIds || []
    return [...new Set(ids.map(String))]
}

const makeAlibiEntry = (playerId, alibi, field = null) => ({
    player_id: getPlayerId(playerId),
    alibi,
    __sourceRecordIds: sourceIdsOf(alibi, field)
})

const makeQandaEntry = qa => ({
    ...qa,
    __sourceRecordIds: sourceIdsOf(qa)
})

const findTimelineEntry = (timelineMap, playerId) =>
    (timelineMap || []).find(entry => samePlayer(entry, playerId))

const findTimelineAlibi = (timelineMap, playerId, time, section) =>
    findTimelineEntry(timelineMap, playerId)?.alibi?.[Number(time)]?.[section] ||
    findTimelineEntry(timelineMap, playerId)?.alibi?.[String(time)]?.[section] ||
    null

const uniqueEntriesByPlayer = entries => {
    const result = new Map()
    ;(entries || []).forEach(entry => {
        const key = String(getPlayerId(entry))
        if (!key || key === "undefined") return
        const previous = result.get(key)
        if (!previous) {
            result.set(key, entry)
            return
        }
        const mergedSourceIds = [...new Set([
            ...(previous.__sourceRecordIds || []),
            ...(entry.__sourceRecordIds || []),
        ].map(String))]
        result.set(key, {
            ...previous,
            __sourceRecordIds: mergedSourceIds,
            alibi: previous.alibi
                ? { ...previous.alibi, __sourceRecordIds: mergedSourceIds }
                : previous.alibi,
        })
    })
    return [...result.values()]
}

const sameQandaSource = (left, right) => {
    const leftIds = sourceIdsOf(left)
    const rightIds = new Set(sourceIdsOf(right))
    return leftIds.length > 0 && leftIds.every(id => rightIds.has(id))
}

const findWitnessEdgesAtSlot = (witnessesMap, playerId, time, section) => {
    const entry = findPlayerWitnessEntry(witnessesMap, playerId)
    if (!entry) return []
    return (entry.witnesses || []).filter(w =>
        sameTime(w.time, time) && w.section === section
    )
}

/**
 * GameSetter 공개 모순 검사.
 *
 * alibi가 전달되면 현재 공식 진술 1건을 기존 공개 상태와 비교합니다.
 * qanda가 전달되면 현재 공식 답변 1건을 기존 공개 상태/qandaList와 비교합니다.
 * 두 값은 동시에 전달하지 않는 것을 원칙으로 합니다.
 */
export function inGameCheckValidation(
    inGamePlayerTimelineMap,
    inGameWitnessesMap,
    playerObj,
    timeKey,
    sectionKey,
    qandaList,
    alibi = null,
    qanda = null
) {
    const conflicts = { placeCheck: [], itemCheck: [], qandaCheck: [], witnessCheck: [] }
    const { QandaList_alibi, QandaList_wit } = seperateQandAList(qandaList || [])
    const currentPlayerId = getPlayerId(playerObj)
    const normalizedTime = Number(timeKey)

    // -------------------------------------------------------------------------
    // 1) 공식 진술(alibi) 검사
    // -------------------------------------------------------------------------
    if (alibi) {
        const previousOwnAlibi = findTimelineAlibi(
            inGamePlayerTimelineMap,
            currentPlayerId,
            normalizedTime,
            sectionKey
        )

        // 같은 사용자가 같은 슬롯에 서로 다른 장소를 공식 주장하면 충돌입니다.
        if (
            alibi.place &&
            previousOwnAlibi?.place &&
            !samePlace(alibi.place, previousOwnAlibi.place)
        ) {
            conflicts.placeCheck.push(makeAlibiEntry(currentPlayerId, previousOwnAlibi, "place"))
        }

        // 현재 진술과 이전 공개 Q&A도 같은 GameSetter 규칙 안에서 비교합니다.
        // YES 장소가 다르거나 NO 장소와 현재 장소가 같으면 서로 동시에 참일 수 없습니다.
        if (alibi.place) {
            QandaList_alibi.forEach(previous => {
                if (
                    !samePlayer(previous.player_to, currentPlayerId) ||
                    !sameTime(previous.time, normalizedTime) ||
                    previous.section !== sectionKey ||
                    !previous.alibi?.place
                ) return

                const conflict =
                    (previous.answer === true && !samePlace(previous.alibi.place, alibi.place)) ||
                    (previous.answer === false && samePlace(previous.alibi.place, alibi.place))
                if (conflict) conflicts.qandaCheck.push(makeQandaEntry(previous))
            })
        }

        if (alibi.item) {
            QandaList_alibi.forEach(previous => {
                if (
                    !samePlayer(previous.player_to, currentPlayerId) ||
                    !sameTime(previous.time, normalizedTime) ||
                    previous.section !== sectionKey ||
                    !previous.alibi?.item
                ) return

                const conflict =
                    (previous.answer === true && !sameItem(previous.alibi.item, alibi.item)) ||
                    (previous.answer === false && sameItem(previous.alibi.item, alibi.item))
                if (conflict) conflicts.qandaCheck.push(makeQandaEntry(previous))
            })
        }

        if (alibi.place) {
            const occupants = []

            ;(inGamePlayerTimelineMap || []).forEach(entry => {
                const existing = findTimelineAlibi(
                    inGamePlayerTimelineMap,
                    getPlayerId(entry),
                    normalizedTime,
                    sectionKey
                )
                if (existing?.place && samePlace(existing.place, alibi.place)) {
                    occupants.push(makeAlibiEntry(getPlayerId(entry), existing, "place"))
                }
            })

            // Q&A의 YES만 실제 장소 점유라는 positive claim으로 셉니다.
            QandaList_alibi.forEach(qa => {
                if (
                    qa.answer === true &&
                    sameTime(qa.time, normalizedTime) &&
                    qa.section === sectionKey &&
                    qa.alibi?.place &&
                    samePlace(qa.alibi.place, alibi.place)
                ) {
                    occupants.push({
                        player_id: qa.player_to,
                        alibi: qa.alibi,
                        __sourceRecordIds: sourceIdsOf(qa),
                    })
                }
            })

            occupants.push(makeAlibiEntry(currentPlayerId, alibi, "place"))
            const uniqueOccupants = uniqueEntriesByPlayer(occupants)

            // 기존 GameSetter 규칙: 같은 슬롯·같은 장소는 최대 2명입니다.
            if (uniqueOccupants.length > 2) {
                conflicts.placeCheck.push(...uniqueOccupants)
            }
        }

        if (alibi.item?.item_id || alibi.item?.id) {
            const owners = []

            ;(inGamePlayerTimelineMap || []).forEach(entry => {
                const existing = findTimelineAlibi(
                    inGamePlayerTimelineMap,
                    getPlayerId(entry),
                    normalizedTime,
                    sectionKey
                )
                if (existing?.item && sameItem(existing.item, alibi.item)) {
                    owners.push(makeAlibiEntry(getPlayerId(entry), existing, "item"))
                }
            })

            // Q&A의 YES만 실제 도구 소유 positive claim으로 셉니다.
            QandaList_alibi.forEach(qa => {
                if (
                    qa.answer === true &&
                    sameTime(qa.time, normalizedTime) &&
                    qa.section === sectionKey &&
                    qa.alibi?.item &&
                    sameItem(qa.alibi.item, alibi.item)
                ) {
                    owners.push({
                        player_id: qa.player_to,
                        alibi: qa.alibi,
                        __sourceRecordIds: sourceIdsOf(qa),
                    })
                }
            })

            owners.push(makeAlibiEntry(currentPlayerId, alibi, "item"))
            const uniqueOwners = uniqueEntriesByPlayer(owners)

            // 기존 GameSetter 규칙: 같은 슬롯의 동일 도구 소유자는 한 명뿐입니다.
            if (uniqueOwners.length > 1) {
                conflicts.itemCheck.push(...uniqueOwners)
            }
        }
    }

    // -------------------------------------------------------------------------
    // 2) 공식 Q&A 검사
    // -------------------------------------------------------------------------
    if (qanda) {
        const qa = qanda
        const targetId = qa.player_to
        const qaTime = Number(qa.time)
        const qaSection = qa.section
        const targetAli = findTimelineAlibi(
            inGamePlayerTimelineMap,
            targetId,
            qaTime,
            qaSection
        )

        if (qa.alibi?.place) {
            if (qa.answer === true) {
                // YES인데 본인의 공개 장소 진술이 다르면 모순입니다.
                if (targetAli?.place && !samePlace(qa.alibi.place, targetAli.place)) {
                    conflicts.qandaCheck.push(makeAlibiEntry(targetId, targetAli, "place"))
                }

                // 기존 Q&A의 다른 장소 YES 또는 동일 장소 NO와 충돌합니다.
                QandaList_alibi.forEach(previous => {
                    if (
                        sameQandaSource(previous, qa) ||
                        !samePlayer(previous.player_to, targetId) ||
                        !sameTime(previous.time, qaTime) ||
                        previous.section !== qaSection ||
                        !previous.alibi?.place
                    ) return

                    const conflict =
                        (previous.answer === true && !samePlace(previous.alibi.place, qa.alibi.place)) ||
                        (previous.answer === false && samePlace(previous.alibi.place, qa.alibi.place))

                    if (conflict) conflicts.qandaCheck.push(makeQandaEntry(previous))
                })

                // PRESENCE YES도 공개 장소 점유 주장입니다. 기존 타임라인과 다른 YES Q&A를
                // 합쳐 같은 슬롯·같은 장소의 고유 인원이 2명을 넘으면 placeCheck입니다.
                const occupants = []
                ;(inGamePlayerTimelineMap || []).forEach(entry => {
                    const playerId = getPlayerId(entry)
                    const existing = findTimelineAlibi(
                        inGamePlayerTimelineMap,
                        playerId,
                        qaTime,
                        qaSection
                    )
                    if (existing?.place && samePlace(existing.place, qa.alibi.place)) {
                        occupants.push(makeAlibiEntry(playerId, existing, "place"))
                    }
                })
                QandaList_alibi.forEach(previous => {
                    if (
                        previous.answer === true &&
                        sameTime(previous.time, qaTime) &&
                        previous.section === qaSection &&
                        previous.alibi?.place &&
                        samePlace(previous.alibi.place, qa.alibi.place)
                    ) {
                        occupants.push({
                            player_id: previous.player_to,
                            alibi: previous.alibi,
                            __sourceRecordIds: sourceIdsOf(previous),
                        })
                    }
                })
                const uniqueOccupants = uniqueEntriesByPlayer(occupants)
                if (uniqueOccupants.length > 2) {
                    conflicts.placeCheck.push(...uniqueOccupants)
                }

                // 다른 사람이 해당 대상을 다른 장소에서 동행자로 공개했다면 충돌입니다.
                ;(inGameWitnessesMap || []).forEach(entry => {
                    ;(entry.witnesses || []).forEach(wit => {
                        if (
                            sameTime(wit.time, qaTime) &&
                            wit.section === qaSection &&
                            samePlayer(wit.witness, targetId) &&
                            wit.place &&
                            !samePlace(wit.place, qa.alibi.place)
                        ) {
                            conflicts.witnessCheck.push({
                                ...wit,
                                player_id: entry.player,
                                __sourceRecordIds: sourceIdsOf(wit),
                            })
                        }
                    })
                })
            } else if (qa.answer === false) {
                // v6 버그 수정: NO는 질문 장소와 기존 공개 장소가 '같을 때' 모순입니다.
                if (targetAli?.place && samePlace(qa.alibi.place, targetAli.place)) {
                    conflicts.qandaCheck.push(makeAlibiEntry(targetId, targetAli, "place"))
                }

                // 동일 장소 YES Q&A와 NO가 충돌합니다.
                QandaList_alibi.forEach(previous => {
                    if (
                        sameQandaSource(previous, qa) ||
                        previous.answer !== true ||
                        !samePlayer(previous.player_to, targetId) ||
                        !sameTime(previous.time, qaTime) ||
                        previous.section !== qaSection ||
                        !previous.alibi?.place ||
                        !samePlace(previous.alibi.place, qa.alibi.place)
                    ) return
                    conflicts.qandaCheck.push(makeQandaEntry(previous))
                })

                // 해당 장소에서 자신을 봤다는 공개 companion/witness와 NO가 충돌합니다.
                ;(inGameWitnessesMap || []).forEach(entry => {
                    ;(entry.witnesses || []).forEach(wit => {
                        if (
                            sameTime(wit.time, qaTime) &&
                            wit.section === qaSection &&
                            samePlayer(wit.witness, targetId) &&
                            wit.place &&
                            samePlace(wit.place, qa.alibi.place)
                        ) {
                            conflicts.witnessCheck.push({
                                ...wit,
                                player_id: entry.player,
                                __sourceRecordIds: sourceIdsOf(wit),
                            })
                        }
                    })
                })
            }
        }

        if (qa.alibi?.item) {
            if (qa.answer === true) {
                // 기존 GameSetter 의미를 유지: 같은 슬롯에서 공개한 도구가 다른 경우 충돌합니다.
                if (targetAli?.item && !sameItem(qa.alibi.item, targetAli.item)) {
                    conflicts.qandaCheck.push(makeAlibiEntry(targetId, targetAli, "item"))
                }

                // 동일 도구를 다른 사람이 positive claim한 경우에도 공개 소유 규칙과 충돌합니다.
                ;(inGamePlayerTimelineMap || []).forEach(entry => {
                    const ownerId = getPlayerId(entry)
                    if (samePlayer(ownerId, targetId)) return
                    const existing = findTimelineAlibi(inGamePlayerTimelineMap, ownerId, qaTime, qaSection)
                    if (existing?.item && sameItem(existing.item, qa.alibi.item)) {
                        conflicts.qandaCheck.push(makeAlibiEntry(ownerId, existing, "item"))
                    }
                })

                QandaList_alibi.forEach(previous => {
                    if (
                        sameQandaSource(previous, qa) ||
                        !sameTime(previous.time, qaTime) ||
                        previous.section !== qaSection ||
                        !previous.alibi?.item ||
                        !sameItem(previous.alibi.item, qa.alibi.item)
                    ) return

                    if (
                        previous.answer === false && samePlayer(previous.player_to, targetId)
                    ) {
                        conflicts.qandaCheck.push(makeQandaEntry(previous))
                    } else if (
                        previous.answer === true && !samePlayer(previous.player_to, targetId)
                    ) {
                        conflicts.qandaCheck.push(makeQandaEntry(previous))
                    }
                })
            } else if (qa.answer === false) {
                // v6 버그 수정: NO는 기존 공개 소지 도구와 '같을 때' 모순입니다.
                if (targetAli?.item && sameItem(qa.alibi.item, targetAli.item)) {
                    conflicts.qandaCheck.push(makeAlibiEntry(targetId, targetAli, "item"))
                }

                QandaList_alibi.forEach(previous => {
                    if (
                        sameQandaSource(previous, qa) ||
                        previous.answer !== true ||
                        !samePlayer(previous.player_to, targetId) ||
                        !sameTime(previous.time, qaTime) ||
                        previous.section !== qaSection ||
                        !previous.alibi?.item ||
                        !sameItem(previous.alibi.item, qa.alibi.item)
                    ) return
                    conflicts.qandaCheck.push(makeQandaEntry(previous))
                })
            }
        }

        if (qa.witness) {
            const otherPlayerId = qa.witness
            const targetEdges = findWitnessEdgesAtSlot(
                inGameWitnessesMap,
                targetId,
                qaTime,
                qaSection
            )
            const otherEdges = findWitnessEdgesAtSlot(
                inGameWitnessesMap,
                otherPlayerId,
                qaTime,
                qaSection
            )
            const targetAliAtSlot = findTimelineAlibi(
                inGamePlayerTimelineMap,
                targetId,
                qaTime,
                qaSection
            )
            const otherAliAtSlot = findTimelineAlibi(
                inGamePlayerTimelineMap,
                otherPlayerId,
                qaTime,
                qaSection
            )
            const targetSaysTogether = targetEdges.some(edge => samePlayer(edge.witness, otherPlayerId))
            const otherSaysTogether = otherEdges.some(edge => samePlayer(edge.witness, targetId))

            if (qa.answer === true) {
                // 함께 있었다고 했는데 두 사람의 공개 장소가 다르면 모순입니다.
                if (
                    targetAliAtSlot?.place &&
                    otherAliAtSlot?.place &&
                    !samePlace(targetAliAtSlot.place, otherAliAtSlot.place)
                ) {
                    conflicts.witnessCheck.push(
                        makeAlibiEntry(targetId, targetAliAtSlot, "place"),
                        makeAlibiEntry(otherPlayerId, otherAliAtSlot, "place")
                    )
                }

                // 이미 같은 슬롯에서 공식 진술을 한 사람이 상대를 동행자로 제출하지 않았다면
                // '혼자/다른 동행자' 공개 주장과 YES가 충돌합니다.
                // item-only 공식진술은 동행/혼자 여부를 주장하지 않습니다.
                // 실제 장소 alibi가 공개된 경우에만 companion 미제출을 명시적 비동행 주장으로 봅니다.
                if (targetAliAtSlot?.place && !targetSaysTogether) {
                    conflicts.witnessCheck.push(makeAlibiEntry(targetId, targetAliAtSlot, "place"))
                }
                if (otherAliAtSlot?.place && !otherSaysTogether) {
                    conflicts.witnessCheck.push(makeAlibiEntry(otherPlayerId, otherAliAtSlot, "place"))
                }
            } else if (qa.answer === false) {
                // NO는 단순히 같은 장소였다는 사실만으로 모순 처리하지 않습니다.
                // 공개 companion/witness가 실제로 두 사람의 동행을 주장한 경우에만 충돌합니다.
                targetEdges
                    .filter(edge => samePlayer(edge.witness, otherPlayerId))
                    .forEach(edge => conflicts.witnessCheck.push({
                        ...edge,
                        player_id: targetId,
                        __sourceRecordIds: sourceIdsOf(edge),
                    }))
                otherEdges
                    .filter(edge => samePlayer(edge.witness, targetId))
                    .forEach(edge => conflicts.witnessCheck.push({
                        ...edge,
                        player_id: otherPlayerId,
                        __sourceRecordIds: sourceIdsOf(edge),
                    }))
            }

            // WITNESS YES↔NO Q&A끼리도 공개 기록 모순을 검사합니다.
            QandaList_wit.forEach(previous => {
                if (
                    sameQandaSource(previous, qa) ||
                    !sameTime(previous.time, qaTime) ||
                    previous.section !== qaSection
                ) return

                const samePair =
                    (samePlayer(previous.player_to, targetId) && samePlayer(previous.witness, otherPlayerId)) ||
                    (samePlayer(previous.player_to, otherPlayerId) && samePlayer(previous.witness, targetId))

                if (samePair && previous.answer !== qa.answer) {
                    conflicts.witnessCheck.push(makeQandaEntry(previous))
                }
            })
        }
    }

    return conflicts
}

function findPlayerWitnessEntry(witnessesMap, playerId) {
    return (witnessesMap || []).find(entry => String(entry.player) === String(playerId))
}

function hasReciprocalWitness(witnessesMap, playerA, playerB, time, section, place) {
    const otherEntry = findPlayerWitnessEntry(witnessesMap, playerB)
    if (!otherEntry) return false

    return (otherEntry.witnesses || []).some(w =>
        sameTime(w.time, time) &&
        w.section === section &&
        samePlace(w.place, place) &&
        samePlayer(w.witness, playerA)
    )
}

// 특정 플레이어의 한 시각·섹션·장소 목격정보 상호 일치 검사
// 상대가 해당 슬롯에 아무 공식 alibi도 제출하지 않았다면 "혼자"라고 말한 것이
// 아니므로 모순으로 확정하지 않습니다.
export function checkPlayerWitnessAtSlot(
    witnessesMap,
    playerId,
    time,
    section,
    place,
    inGamePlayerTimelineMap = null
) {
    const placeId = getPlaceId(place)
    const playerEntry = findPlayerWitnessEntry(witnessesMap, playerId)
    if (!playerEntry || !placeId) return { valid: true, conflicts: [] }

    const slotWitnesses = (playerEntry.witnesses || []).filter(w =>
        sameTime(w.time, time) && w.section === section && samePlace(w.place, placeId)
    )
    if (slotWitnesses.length === 0) return { valid: true, conflicts: [] }

    const conflicts = slotWitnesses.filter(w => {
        if (hasReciprocalWitness(witnessesMap, playerId, w.witness, time, section, placeId)) {
            return false
        }

        // 공개 타임라인이 주어진 경우 상대가 해당 슬롯에 실제 공식 진술을 했을 때만
        // reciprocal 누락을 "함께 vs 혼자/다른 동행" 모순으로 확정합니다.
        if (inGamePlayerTimelineMap) {
            const otherAli = findTimelineAlibi(
                inGamePlayerTimelineMap,
                w.witness,
                time,
                section
            )
            // 4R item-only 공식진술은 해당 슬롯의 위치/동행 여부를 주장하지 않습니다.
            // reciprocal 누락을 모순으로 확정하려면 상대의 장소 alibi가 실제로 공개되어야 합니다.
            if (!otherAli?.place) return false
        }

        return true
    })

    return { valid: conflicts.length === 0, conflicts }
}

// witnessesMap 전체 상호 목격정보 일치 검사
export function checkWitnessMapValidation(witnessesMap, inGamePlayerTimelineMap = null) {
    const conflicts = []

    ;(witnessesMap || []).forEach(entry => {
        ;(entry.witnesses || []).forEach(w => {
            const check = checkPlayerWitnessAtSlot(
                witnessesMap,
                entry.player,
                w.time,
                w.section,
                w.place,
                inGamePlayerTimelineMap
            )
            if (check.valid) return

            check.conflicts
                .filter(conflict => samePlayer(conflict.witness, w.witness))
                .forEach(conflict => conflicts.push({
                    ...conflict,
                    player: entry.player,
                    __sourceRecordIds: sourceIdsOf(conflict),
                }))
        })
    })

    // 같은 한 방향 edge가 중복으로 들어와도 한 번만 반환합니다.
    const seen = new Set()
    const deduped = conflicts.filter(conflict => {
        const key = [
            String(conflict.player),
            String(conflict.witness),
            Number(conflict.time),
            conflict.section,
            String(getPlaceId(conflict.place)),
            sourceIdsOf(conflict).sort().join(","),
        ].join("|")
        if (seen.has(key)) return false
        seen.add(key)
        return true
    })

    return { valid: deduped.length === 0, conflicts: deduped }
}

function seperateQandAList(qandaList = []) {
    const QandaList_alibi = []
    const QandaList_wit = []

    qandaList.forEach(qa => {
        const common = {
            player_from: qa.player_from,
            player_to: qa.player_to,
            time: Number(qa.time),
            section: qa.section,
            answer: qa.answer,
            __sourceRecordIds: sourceIdsOf(qa),
            __questionRecordId: qa.__questionRecordId || null,
        }

        if (qa.alibi) {
            QandaList_alibi.push({ ...common, alibi: qa.alibi })
        } else if (qa.witness) {
            QandaList_wit.push({ ...common, witness: qa.witness })
        }
    })

    return { QandaList_alibi, QandaList_wit }
}

// 범행생성 함수
function createCrime(map_places, roles, items) {
    // 기존 GameSetter 규칙을 유지합니다.
    // 범행 hour는 13~22 중 하나를 매 게임 무작위로 선택합니다.
    // 주의: 예전 주석에는 "13~23시"라고 적혀 있었지만,
    // Math.floor(Math.random() * 10) + 13의 실제 결과 범위는 13~22입니다.
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
    if (!Array.isArray(arr) || arr.length === 0) return null
    return arr[Math.floor(Math.random() * arr.length)]
}

// 알리바이 생성
function createPlayersAlibi(playerTimelineMap, playersRoles, players, map_places, items_in_use, crimeInfo) {
    const timelineMap = playerTimelineMap
    const sections = ["section02", "section24", "section46"]
    const sameId = (left, right, key) => String(left?.[key] || left) === String(right?.[key] || right)
    const getTimeline = player => timelineMap.find(entry => sameId(entry.player, player, "_id"))

    // 원본의 do...while는 데이터가 부족하거나 후보가 막히면 끝없이 반복될 수 있었습니다.
    // 후보를 만드는 방식은 그대로 두되 최대 횟수 뒤에는 명확한 오류를 내도록만 보완합니다.
    const buildValidAlibi = (player, time, section, createCandidate) => {
        for (let attempt = 0; attempt < 600; attempt += 1) {
            const candidate = createCandidate()
            if (candidate && checkAlibiValidation(
                timelineMap,
                player,
                time,
                section,
                candidate,
                crimeInfo,
                playersRoles
            )) {
                return candidate
            }
        }

        throw new Error(`${time}:${section} 알리바이를 원본 규칙 안에서 배치하지 못했습니다.`)
    }

    // 범인 정보 반영: 원본 문구를 요청대로 간결하게 유지합니다.
    const criminal = playersRoles.find(
        assignment => assignment.role.role_id === crimeInfo.crimeRole.role_id
    )?.player
    if (!criminal) throw new Error("범인 역할을 배정할 플레이어를 찾지 못했습니다.")

    getTimeline(criminal).alibi[crimeInfo.crimeTime][crimeInfo.timeSection] = {
        place: crimeInfo.crimePlace,
        item: crimeInfo.crimeItem,
        action: "피해자 살인"
    }

    // 원본 규칙: 범인을 제외한 플레이어를 섞어 A~I에 배정합니다.
    // 복사본을 섞어 roles/users 원본 배열 순서를 바꾸지 않습니다.
    const otherPlayers = playersRoles
        .map(assignment => assignment.player)
        .filter(player => !sameId(player, criminal, "_id"))
    const shuffledOtherPlayers = [...otherPlayers].sort(() => 0.5 - Math.random())
    const [playerA, playerB, playerC, playerD, playerE, playerF, playerG, playerH, playerI] = shuffledOtherPlayers

    const crimeItemFeature = crimeInfo.crimeItem.item_feature
    const sameFeatureItems = items_in_use.filter(item =>
        item.item_feature === crimeItemFeature &&
        item.item_id !== crimeInfo.crimeItem.item_id
    )
    const otherFeatureItems = items_in_use.filter(item =>
        item.item_feature !== crimeItemFeature
    )
    const placesExceptCrime = map_places.filter(place =>
        place.place_id !== crimeInfo.crimePlace.place_id
    )
    const dangerSections = sections.filter(section => section !== crimeInfo.timeSection)

    const putAlibi = (player, time, section, createCandidate) => {
        if (!player) return
        getTimeline(player).alibi[time][section] = buildValidAlibi(
            player,
            time,
            section,
            createCandidate
        )
    }

    // 장소 관련 불리한 정보: 범행 hour의 나머지 두 20분 구간에 각각 2명씩 배치합니다.
    ;[
        [playerA, dangerSections[0]],
        [playerB, dangerSections[0]],
        [playerC, dangerSections[1]],
        [playerD, dangerSections[1]],
    ].forEach(([player, section]) => {
        putAlibi(player, crimeInfo.crimeTime, section, () => ({
            place: crimeInfo.crimePlace,
            item: Math.random() < 0.5 ? pickOneRandomly(otherFeatureItems) : null,
            action: pickOneRandomly(crimeInfo.crimePlace.place_action)
        }))
    })

    // 도구 관련 불리한 정보도 모두 범행 hour 안에만 배치합니다.
    // E/G/I는 동일 특징의 다른 도구, F/H는 실제 범행도구를 갖습니다.
    putAlibi(playerE, crimeInfo.crimeTime, crimeInfo.timeSection, () => {
        const place = pickOneRandomly(placesExceptCrime)
        return {
            place,
            item: pickOneRandomly(sameFeatureItems),
            action: pickOneRandomly(place?.place_action)
        }
    })
    putAlibi(playerH, crimeInfo.crimeTime, dangerSections[0], () => {
        const place = pickOneRandomly(placesExceptCrime)
        return {
            place,
            item: crimeInfo.crimeItem,
            action: pickOneRandomly(place?.place_action)
        }
    })
    putAlibi(playerF, crimeInfo.crimeTime, dangerSections[1], () => {
        const place = pickOneRandomly(placesExceptCrime)
        return {
            place,
            item: crimeInfo.crimeItem,
            action: pickOneRandomly(place?.place_action)
        }
    })
    putAlibi(playerG, crimeInfo.crimeTime, dangerSections[0], () => {
        const place = pickOneRandomly(placesExceptCrime)
        return {
            place,
            item: pickOneRandomly(sameFeatureItems),
            action: pickOneRandomly(place?.place_action)
        }
    })
    putAlibi(playerI, crimeInfo.crimeTime, dangerSections[1], () => {
        const place = pickOneRandomly(placesExceptCrime)
        return {
            place,
            item: pickOneRandomly(sameFeatureItems),
            action: pickOneRandomly(place?.place_action)
        }
    })

    // 남은 슬롯을 원본 방식대로 무작위 장소·도구·행동으로 채웁니다.
    // checkAlibiValidation이 장소 최대 2명, 동일 도구 중복, 범행 슬롯 단독 규칙을 검사합니다.
    const times = Object.keys(timelineMap[0].alibi)
    players.forEach(player => {
        const playerTimeline = getTimeline(player)
        times.forEach(time => {
            sections.forEach(section => {
                if (playerTimeline.alibi[time][section].place) return

                playerTimeline.alibi[time][section] = buildValidAlibi(
                    playerTimeline,
                    time,
                    section,
                    () => {
                        const place = pickOneRandomly(map_places)
                        return {
                            place,
                            item: Math.random() < 0.5 ? pickOneRandomly(items_in_use) : null,
                            action: pickOneRandomly(place?.place_action)
                        }
                    }
                )
            })
        })
    })

    return timelineMap
}

// 알리바이 모순 검사 함수
function checkAlibiValidation(PlayerTimelineMap, playerObj, timeKey, sectionKey, alibi, crimeInfo, playersRoles) {
    // 시간:section 내의 장소 2인이상 모순 검사
    const placeCheck = PlayerTimelineMap
        .map(player => player.alibi?.[timeKey]?.[sectionKey])
        .filter(existing =>
            existing?.place?.place_id &&
            existing.place.place_id === alibi.place?.place_id
        )

    if (placeCheck.length >= 2) return false;

    // 시간:section 내의 동일 도구 중복 소유 검사
    const itemCheck = alibi.item?.item_id
        ? PlayerTimelineMap
            .map(player => player.alibi?.[timeKey]?.[sectionKey])
            .filter(existing => existing?.item?.item_id === alibi.item.item_id)
        : []
    if (itemCheck.length >= 1) return false

    // 범행 장소 동행자 금지
    if (Number(timeKey) === Number(crimeInfo.crimeTime) && sectionKey === crimeInfo.timeSection) {
        const currentPlayerId = playerObj?.player?._id || playerObj?._id
        const playerRole = playersRoles.find(pr => String(pr.player._id) === String(currentPlayerId))
        const isCriminal = playerRole?.role?.role_id === crimeInfo.crimeRole.role_id
        if (alibi.place?.place_id === crimeInfo.crimePlace.place_id && !isCriminal) return false
        if (alibi.item?.item_id === crimeInfo.crimeItem.item_id && !isCriminal) return false
    }
    return true
}

// 빈 타임라인맵 생성 함수
function createPlayerTimelineMap(players, crimeInfo, selectedHours = null) {
    const playerTimelineMap = []
    const hours = Array.isArray(selectedHours) && selectedHours.length > 0
        ? [...selectedHours].map(Number).sort((a, b) => a - b)
        : (() => {
            const endTimeRange = pickMaxAlibiHour(crimeInfo)
            const startTimeRange = endTimeRange - 5
            return Array.from({ length: 6 }, (_, index) => startTimeRange + index)
        })()

    // 플레이어별 빈 알리바이 타임라인 생성
    for (let i = 0; i < players.length; i++) {
        const playerTimeline = {}
        for (const hour of hours) {
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
    // 기존 GameSetter 규칙처럼 범행 hour, +1시간, +2시간 중
    // 24시를 넘지 않는 값을 무작위로 골라 타임라인의 마지막 hour로 사용합니다.
    // 시작 hour는 마지막 hour - 5이므로 실제 시계 범위는 매 게임 달라지지만,
    // 6개 hour × 3개 section = 18개 슬롯이라는 개수는 항상 같습니다.
    const crimeTime = Number(crimeInfo.crimeTime)
    const candidates = [crimeTime, crimeTime + 1, crimeTime + 2]
    const validCandidates = candidates.filter(time => time >= 13 && time <= 24)
    return pickOneRandomly(validCandidates)
}

// 플레이어에게 랜덤 역할 배정 함수
function assingRolesToPlayers(players, roles, crimeInfo) {
    const crimeRole = crimeInfo.crimeRole
    const otherRoles = roles.filter(role => role.role_id !== crimeRole.role_id)

    const shuffled = [...otherRoles].sort(() => 0.5 - Math.random())
    const randomRoles = shuffled.slice(0, players.length - 1)

    const selectedRoles = [crimeRole, ...randomRoles]

    const shuffledSelectedRoles = [...selectedRoles].sort(() => 0.5 - Math.random())

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
        const shuffled = [...featureGroup[feature]].sort(() => 0.5 - Math.random())
        selectedItems.push(...shuffled.slice(0, 2))
    })

    // 원본 규칙: 선택된 도구 중 최대 8개까지만 반환합니다.
    // 부족한 개수를 임의 도구로 채워 "항상 8개"로 바꾸지 않습니다.
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

    // 2라운드: 범행시각을 포함한 연속 3시간을 골라 정확히 9개 슬롯을 공개합니다.
    // 범행시각이 타임라인의 첫/끝 시간이면 존재하는 한쪽 방향에서 2시간을 더 선택합니다.
    const times = Object.keys(preparedPlayerTimelineMap[0].alibi).map(Number).sort((a, b) => a - b); // 전체 시각 목록
    const idx = times.indexOf(crimeInfo.crimeTime)
    const round2StartIndex = Math.max(0, Math.min(idx - 1, times.length - 3))
    hints.round2 = times.slice(round2StartIndex, round2StartIndex + 3)

    // 3라운드: 범행도구 특징 공개
    const itemFeatureDescriptions = {
        sharp: "예리한 흉기에 의한 자상",
        blunt: "둔기에 의한 두부 손상",
        poison: "독성 물질에 의한 중독",
        asphyxia: "기도 압박에 의한 질식"
    }
    const crimeFeature = crimeInfo.crimeItem.item_feature
    hints.round3 = {
        [crimeFeature]: itemFeatureDescriptions[crimeFeature] || "범행 도구의 특징이 확인되었습니다."
    }

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
        round5Sections.push({ time: times[idx + 1], section: "section24" })
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
                const entry = witnessesMap.find(wit => String(wit.player) === String(pid))
                players.filter(x => String(x) !== String(pid)).forEach(other => {
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
