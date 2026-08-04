export function setGame(users, mapinfo){
    // 플레이어 수 설정
    const players = users //user들이 담긴 배열
    const map_places = mapinfo.map_places 
    const roles = mapinfo.roles
    const items = mapinfo.items

    // 범행정보 생성
    const crimeInfo = createCrime(map_places,roles,items)

    // 맵 내 사용도구 선정
    const items_in_use = pickToolsByFeature(items, crimeInfo)

    // 플레이어 데이터맵 생성
    const {preparedPlayerTimelineMap, playersRoles} = createPlayerTimeline(players, map_places, roles, items_in_use, crimeInfo)

    // 거짓진술용 빈 플레이어 데이터맵
    const inGamePlayerTimelineMap = createPlayerTimelineMap(players,crimeInfo)  

    // 라운드별 힌트 생성
    const hintsPerRound = createHintsPerRound(preparedPlayerTimelineMap, crimeInfo, map_places)

    // 유저별 동행/목격 정보
    const witnessesMap = createWitnessesMap(preparedPlayerTimelineMap)

    return {crimeInfo, preparedPlayerTimelineMap, playersRoles, inGamePlayerTimelineMap, hintsPerRound, witnessesMap}
}
// 인게임 모순검사 함수
export function inGameCheckValidation(inGamePlayerTimelineMap,inGameWitnessesMap, playerObj, timeKeyA, sectionKeyA, timeKeyB, sectionKeyB, alibi=null, qa=null){
    if(alibi){ // 알리바이 모순
        // 시간:section 내의 장소 2인이상 모순 검사
        const placeCheck = PlayerTimelineMap.map(p=>p.alibi[timeKey][sectionKey]).filter(ali=>ali?.place === alibi.place) 

        if (placeCheck.length >= 2) {
            return {valid:false, conflicts: placeCheck}
        };

        // 시간:section 내의 동일 도구 중복 소유 검사
        const itemCheck = PlayerTimelineMap.map(p=>p.alibi[timeKey][sectionKey]).filter(ali=>ali?.item && ali?.item.item_id === alibi.item?.item_id)
        if (itemCheck.length >= 1) return {valid:false, conflicts: itemCheck}
        
    } else if(qa){ // 목격 관련 모순
        

    } else { // 모순없음
        return {}
    }
}

// 범행생성 함수
function createCrime(map_places, roles, items){
    // 범행 시각 생성 (13시~23시)
    const crimeTime = Math.floor(Math.random() * 10) +13

    // 범행 시각 섹션 생성
    const timeSection = ["section02","section24","section46"]
    const crimeTimeSection = timeSection[(Math.floor(Math.random()*timeSection.length))]

    // 범행 역할, 장소, 도구 설정
    const crimePlace = pickOneRandomly(map_places)
    const crimeRole = pickOneRandomly(roles)
    const crimeItem = pickOneRandomly(items)
    
    return {crimeTime, timeSection:crimeTimeSection, crimePlace, crimeRole, crimeItem}
}

function createPlayerTimeline(players, map_places, roles, items_in_use, crimeInfo){
    // 전체 플레이어 데이터맵 구조 생성
    const PlayerTimelineMap = createPlayerTimelineMap(players,crimeInfo)                                 

    // 역할분배
    const playersRoles = assingRolesToPlayers(players, roles, crimeInfo)

    // 타임라인 생성 
    const preparedPlayerTimelineMap = createPlayersAlibi(PlayerTimelineMap, playersRoles,players,map_places,items_in_use,crimeInfo)
    
    return {preparedPlayerTimelineMap, playersRoles}
}

// 배열 내 랜덤 지정 함수
function pickOneRandomly(arr){
    return arr[Math.floor(Math.random()*arr.length)]
}

// 알리바이 생성
function createPlayersAlibi(playerTimelineMap, playersRoles, players, map_places, items_in_use, crimeInfo){
    const timelineMap = playerTimelineMap
     // 범인 정보 반영
    const criminal = playersRoles.find(pr=> pr.role.role_id === crimeInfo.crimeRole.role_id).player
    timelineMap.find(p=>p.player._id===criminal._id).alibi[crimeInfo.crimeTime][crimeInfo.timeSection] = {
        place: crimeInfo.crimePlace,
        item: crimeInfo.crimeItem,
        action: "(경)★☆피해자 살인♬★☆(축)"
    }

    // 위험 알리바이 주입
    // 범인 외 유저 선택
    const otherPlayers = playersRoles.map(pr=>pr.player).filter(p=> p !== criminal)
    const shuffledOtherPlayers = otherPlayers.sort(()=> 0.5 - Math.random())
    const [playerA,playerB,playerC,playerD,playerE,playerF,playerG,playerH,playerI] = shuffledOtherPlayers

    // 범행도구와 동일 특징 도구
    const crimeItemFeature = crimeInfo.crimeItem.item_feature 
    const sameFeatureItem = items_in_use.filter(item=>item.item_feature === crimeItemFeature && item !== crimeInfo.crimeItem)

    // 범행시각내의 범행section 외의 section
    const dangerSections = ["section02","section24","section46"].filter(sec=>sec !== crimeInfo.timeSection)
    
    
    // 장소 위험 알리바이
    if(playerA){
        let alibi;
        do{
            alibi={
                place: crimeInfo.crimePlace,
                item: Math.random() < 0.5 ? pickOneRandomly(items_in_use.filter(i=> i.item_feature !== crimeInfo.crimeItem.item_feature)): null,
                action: pickOneRandomly(crimeInfo.crimePlace.place_action)
            }
        }while(!checkAlibiValidation(timelineMap, playerA, crimeInfo.crimeTime, dangerSections[0], alibi, crimeInfo, playersRoles))

        timelineMap.find(p=>p.player._id===playerA._id).alibi[crimeInfo.crimeTime][dangerSections[0]]= alibi
    } 
    if(playerB){
        let alibi;
        do{
            alibi={
                place: crimeInfo.crimePlace,
                item: Math.random() < 0.5 ? pickOneRandomly(items_in_use.filter(i=> i.item_feature !== crimeInfo.crimeItem.item_feature)): null,
                action: pickOneRandomly(crimeInfo.crimePlace.place_action)
            }
        }while(!checkAlibiValidation(timelineMap, playerB, crimeInfo.crimeTime, dangerSections[0], alibi, crimeInfo, playersRoles))

        timelineMap.find(p=>p.player._id===playerB._id).alibi[crimeInfo.crimeTime][dangerSections[0]] = alibi
    }
    if(playerC){
        let alibi;
        do{
            alibi={
                place: crimeInfo.crimePlace,
                item: Math.random() < 0.5 ? pickOneRandomly(items_in_use.filter(i=> i.item_feature !== crimeInfo.crimeItem.item_feature)): null,
                action: pickOneRandomly(crimeInfo.crimePlace.place_action)
            }
        }while(!checkAlibiValidation(timelineMap, playerC, crimeInfo.crimeTime, dangerSections[1], alibi, crimeInfo, playersRoles))
        
        timelineMap.find(p=>p.player._id===playerC._id).alibi[crimeInfo.crimeTime][dangerSections[1]] = alibi
    } 
    if(playerD){
        let alibi;
        do{
            alibi={
                place: crimeInfo.crimePlace,
                item: Math.random() < 0.5 ? pickOneRandomly(items_in_use.filter(i=> i.item_feature !== crimeInfo.crimeItem.item_feature)): null,
                action: pickOneRandomly(crimeInfo.crimePlace.place_action)
            }
        }while(!checkAlibiValidation(timelineMap, playerD, crimeInfo.crimeTime, dangerSections[1], alibi, crimeInfo, playersRoles))
        
        timelineMap.find(p=>p.player._id===playerD._id).alibi[crimeInfo.crimeTime][dangerSections[1]] = alibi
    }

    // 도구 위험 알리바이
    if (playerE){
        let alibi;
        do{
            const randPlace = pickOneRandomly(map_places.filter(m=>m !== crimeInfo.crimePlace))
            alibi={
                place: randPlace,
                item: pickOneRandomly(sameFeatureItem),
                action: pickOneRandomly(randPlace.place_action)
            }
        }while(!checkAlibiValidation(timelineMap, playerE, crimeInfo.crimeTime, crimeInfo.timeSection, alibi, crimeInfo, playersRoles))
            
        timelineMap.find(p=>p.player._id===playerE._id).alibi[crimeInfo.crimeTime][crimeInfo.timeSection]=alibi
    } 
    if(playerH){
        let alibi;
        do{
            const randPlace = pickOneRandomly(map_places.filter(m=>m !== crimeInfo.crimePlace))
            alibi={
                place: randPlace,
                item: crimeInfo.crimeItem,
                action: pickOneRandomly(randPlace.place_action) 
            }
        }while(!checkAlibiValidation(timelineMap, playerH, crimeInfo.crimeTime, dangerSections[0], alibi, crimeInfo, playersRoles))
            
        timelineMap.find(p=>p.player._id===playerH._id).alibi[crimeInfo.crimeTime][dangerSections[0]]=alibi
    }
    if(playerF){
        let alibi;
        do{
            const randPlace = pickOneRandomly(map_places.filter(m=>m !== crimeInfo.crimePlace))
            alibi={
                place:randPlace,
                item: crimeInfo.crimeItem,
                action: pickOneRandomly(randPlace.place_action)
            }
        }while(!checkAlibiValidation(timelineMap, playerF, crimeInfo.crimeTime, dangerSections[1], alibi, crimeInfo, playersRoles))
           
        timelineMap.find(p=>p.player._id===playerF._id).alibi[crimeInfo.crimeTime][dangerSections[1]]=alibi
    }
    if(playerG){
        let alibi;
        do{
            const randPlace = pickOneRandomly(map_places.filter(m=>m !== crimeInfo.crimePlace))
            alibi={
                place:randPlace,
                item: pickOneRandomly(sameFeatureItem),
                action: pickOneRandomly(randPlace.place_action)
            }
        }while(!checkAlibiValidation(timelineMap, playerG, crimeInfo.crimeTime, dangerSections[0], alibi, crimeInfo, playersRoles))
           
        timelineMap.find(p=>p.player._id===playerG._id).alibi[crimeInfo.crimeTime][dangerSections[0]]=alibi
    }
    if(playerI){
        let alibi;
        do{
            const randPlace = pickOneRandomly(map_places.filter(m=>m!==crimeInfo.crimePlace))
            alibi={
                place: randPlace,
                item: pickOneRandomly(sameFeatureItem),
                action: pickOneRandomly(randPlace.place_action)
            }
        }while(!checkAlibiValidation(timelineMap, playerI, crimeInfo.crimeTime, dangerSections[1], alibi, crimeInfo, playersRoles))
          
        timelineMap.find(p=>p.player._id===playerI._id).alibi[crimeInfo.crimeTime][dangerSections[1]]=alibi
    }

    // 남은 알리바이 생성
    const times = Object.keys(timelineMap[0].alibi)
    
    players.forEach(playerName=>{
        const playerObj = timelineMap.find(p=>p.player._id===playerName._id)
        times.map(timeKey=>{
            ["section02","section24","section46"].forEach(sectionKey =>{
                if(!playerObj.alibi[timeKey][sectionKey].place){
                    let alibi;
                    do{
                        const randomplace = pickOneRandomly(map_places) 
                        alibi={
                            place: randomplace,
                            item: Math.random() < 0.5 ? pickOneRandomly(items_in_use): null,
                            action: pickOneRandomly(randomplace.place_action)
                        } 
                    } while (!checkAlibiValidation(timelineMap, playerObj, timeKey, sectionKey, alibi, crimeInfo, playersRoles))
                    playerObj.alibi[timeKey][sectionKey]=alibi
                }
            })
        })
    })
    return timelineMap
}

// 알리바이 모순 검사 함수
function checkAlibiValidation(PlayerTimelineMap, playerObj, timeKey, sectionKey, alibi, crimeInfo, playersRoles){
    // 시간:section 내의 장소 2인이상 모순 검사
    const placeCheck = PlayerTimelineMap.map(p=>p.alibi[timeKey][sectionKey]).filter(ali=>ali?.place === alibi.place) 

    if (placeCheck.length >= 2) return false;

    // 시간:section 내의 동일 도구 중복 소유 검사
    const itemCheck = PlayerTimelineMap.map(p=>p.alibi[timeKey][sectionKey]).filter(ali=>ali?.item && ali?.item.item_id === alibi.item?.item_id)
    if (itemCheck.length >= 1) return false

    // 범행 장소 동행자 금지
    if (timeKey === crimeInfo.crimeTime && sectionKey === crimeInfo.timeSection){
        const player_role = playersRoles.find(pr=>pr.player._id === playerObj._id)
        if(alibi.place === crimeInfo.crimePlace && player_role.role.role_id !== crimeInfo.crimeRole.role_id) return false
        if(alibi.item?.item_id === crimeInfo.crimeItem.item_id && player_role.role.role_id !== crimeInfo.crimeRole.role_id) return false
    }
    return true    
}

// 빈 타임라인맵 생성 함수
function createPlayerTimelineMap(players,crimeInfo){
    const playerTimelineMap = []
    const playerCnt = players.length
    const endTimeRange = pickMaxAlibiHour(crimeInfo)
    const startTimeRange = endTimeRange-5

    // 플레이어별 빈 알리바이 타임라인 생성
    for(let i=0; i < players.length; i++){
        const playerTimeline = {}
        for (let hour =startTimeRange; hour<=endTimeRange; hour++){
            playerTimeline[hour]={
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
function pickMaxAlibiHour(crimeInfo){
    // 범행 시각 후보 생성
    const crimeTime = crimeInfo.crimeTime
    const candidates = [crimeTime, crimeTime+1, crimeTime+2];
    const validCandidates = candidates.filter(time => time >= 13 && time <=24)
    const maxTime = validCandidates[Math.floor(Math.random() * validCandidates.length)]
    return maxTime
}

// 플레이어에게 랜덤 역할 배정 함수
function assingRolesToPlayers(players,roles,crimeInfo){
    const crimeRole = crimeInfo.crimeRole
    const otherRoles = roles.filter(role=>role.role_id !== crimeRole.role_id)

    const shuffled = otherRoles.sort(()=> 0.5-Math.random())
    const randomRoles = shuffled.slice(0, players.length-1)

    const selectedRoles = [crimeRole, ...randomRoles]

    const shuffledSelectedRoles = selectedRoles.sort(()=>0.5-Math.random())
    
    const roleAssignments = players.map((player, idx)=>{
        return {player: player, role: shuffledSelectedRoles[idx]}
    })
    return roleAssignments
}

// feature별 도구 2개 선정 함수
function pickToolsByFeature(items, crimeInfo){
    // feature별 분류
    const featureGroup= items.reduce((acc, item)=>{
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
    const sameFeatureItem = featureGroup[crimeItemFeature].filter(item=>item.item_id !== crimeInfo.crimeItem.item_id)
    if (sameFeatureItem.length >0) {
        const randomSame = sameFeatureItem[Math.floor(Math.random() * sameFeatureItem.length)];
    selectedItems.push(randomSame);
    }

    // 기타 특징별 아이템 2개 랜덤 지정
    Object.keys(featureGroup).forEach(feature =>{
        if( feature === crimeItemFeature) return;
        const shuffled = featureGroup[feature].sort(()=> 0.5-Math.random())
        selectedItems.push(...shuffled.slice(0,2))
    })
    return selectedItems.slice(0,8)
}

// 라운드별 힌트 생성 함수
function createHintsPerRound(preparedPlayerTimelineMap, crimeInfo,map_places){
    const hints= {}

    // 1라운드: 12개 장소중 범행장소포함하여, 범행시각(+section1~3)내 최다 빈도 장소 5개 추가선정, 부족분 랜덤지정
    const placeCount = {} // 빈도수계산
    preparedPlayerTimelineMap.forEach(tl=>{
        ["section02","section24","section46"].forEach(sec=>{
            const place= tl.alibi[crimeInfo.crimeTime][sec]?.place
            if(place){
                placeCount[place.place_id] = (placeCount[place.place_id]||0)+1
            }
        })
    })
    const sortedPlaces= Object.entries(placeCount).sort((a,b)=>b[1]-a[1]).map(([place])=>place)
    let round1Places = [crimeInfo.crimePlace, ...sortedPlaces.slice(0,5)]
    if(round1Places.length<6){
        const randomFill = map_places.filter(m=>!round1Places.includes(m)).sort(()=>0.5-Math.random())
        round1Places.push(...randomFill.slice(0,6-round1Places.length))
    }
    hints.round1= round1Places

    // 2라운드: 6개의 시간중 범행시각 + 범행시각 가까운 2개의 시간대 선정
    const times = Object.keys(preparedPlayerTimelineMap[0].alibi).map(Number).sort((a,b)=>a-b); // 전체 시각 목록
    const idx = times.indexOf(crimeInfo.crimeTime)
    const round2Times = [crimeInfo.crimeTime]
    if(idx>0) round2Times.push(times[idx-1])
    if(idx<times.length-1) round2Times.push(times[idx+1])
    hints.round2= round2Times

    // 3라운드: 범행도구 특징 공개
    hints.round3= pickOneRandomly([
        {"sharp":"예리한 흉기에 의한 자상"},
        {"blunt":"둔기에 의한 두부 손상"},
        {"poison":"독성 물질에 의한 중독"},
        {"asphyxia":"기도 압박에 의한 질식"}])

    // 4라운드: 1라운드에서 선정된 6개의 장소중, 범행장소 포함하여, 범행시각 내 최다빈도 장소 2개 추가선정, 부족분 랜덤지정
    const round4Places = [crimeInfo.crimePlace, ...sortedPlaces.slice(0,2)]
    if(round4Places.length<3){
        const randomFill = round1Places.filter(p=>!round4Places.includes(p)).sort(()=>0.5-Math.random())
        round4Places.push(...randomFill.slice(0,3-round4Places.length))
    }
    hints.round4=round4Places

    // 5라운드: 3라운드에서 추출된 3개의 범행시각 == 9개 section중 범행시각에 해당하는 3개의 section 들을 포함하며, 2 section 추가 추출
    // 범행시각 이전시각과 이후시각이 있다면, 이전시각의 마지막 section 1개, 이후시각의 첫 section 1개 추출
    // 범행시각 이후 시각이 없다면, 이전시각의 마지막 두 section 추출
    const round5Sections = ["section02","section24","section46"].map(sec=>({time:crimeInfo.crimeTime, section:sec}))
    if(idx>0){
        round5Sections.push({time:times[idx-1], section:"section46"})
    }
    if(idx<times.length-1){
        round5Sections.push({time:times[idx+1], section:"section02"})
    } else if(idx>0){
        //이후 시작 없을 경우 이전시각의 마지막 두 section
        round5Sections.push({time: times[idx-1], section:"section24"})
        round5Sections.push({time:times[idx-1], section:"section46"})
    }
    hints.round5 = round5Sections
    
    return hints
}

// 유저별 동행/목격 정보 생성 함수
function createWitnessesMap(preparedPlayerTimelineMap){
    const witnessesMap = []
    
    preparedPlayerTimelineMap.forEach(player=>{
        witnessesMap.push({
            player: player.player._id,
            witnesses: []
        })
    })

    const placeGroups={}
    preparedPlayerTimelineMap.forEach(player=>{
        Object.keys(player.alibi).forEach(time=>{
            Object.keys(player.alibi[time]).forEach(section=>{
                const placeid = player.alibi[time][section]?.place.place_id
                if(!placeid) return

                const key = `${time}%${section}%${placeid}`
                if(!placeGroups[key]) placeGroups[key] = []
                placeGroups[key].push(player.player._id)
            })
        })
    })

    // 목격자 관계 생성
    Object.entries(placeGroups).forEach(([key, players])=>{
        if(players.length>1){
            const [time, section, place] = key.split("%")
            players.forEach(pid=>{
                const entry = witnessesMap.find(wit=>wit.player === pid)
                players.filter(x=>x!==pid).forEach(other=>{
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