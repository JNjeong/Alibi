

export function setGame(players, mapinfo){
    // 플레이어 수 설정
    const players = players //user들이 담긴 배열
    const map_places = mapinfo.map_places 
    const roles = mapinfo.roles
    const items = mapinfo.items

    // 범행정보 생성
    const crimeInfo = createCrime(map_places,roles,items)

    // 플레이어 데이터맵 생성
    const preparedPlayerTimelineMap = createPlayerTimeline(players, map_places, roles, items, crimeInfo)

    // 플레이어 가변데이터맵
    // 거짓진술용

    // 라운드별 힌트 생성 함수
    // 힌트용 장소는 범행시각때 나온 장소의 빈도수별...
    // 도구는 특징으로 힌트


    return ""
}


// 범행생성 함수
export function createCrime(map_places, roles, items){
    // 범행 시각 생성 (13시~23시)
    const crimeTime = Math.floor(Math.random() * 10) +13

    // 범행 시각 섹션 생성
    const timeSection = ["section02","section24","section46"]
    const crimeTimeSection = timeSection[(Math.floor(Math.random()*timeSection.length))]

    // 범행 역할, 장소, 도구 설정
    const crimePlace = pickOneRandomly(map_places)
    const crimeRole = pickOneRandomly(roles)
    const crimeItem = pickOneRandomly(items)
    
    return {crimeInfo: {crimeTime, timeSection, crimePlace, crimeRole, crimeItem}}
}

export function createPlayerTimeline(players, map_places, roles, items, crimeInfo){
    // 전체 플레이어 데이터맵 구조 생성
    const PlayerTimelineMap = createPlayerTimelineMap(players,crimeInfo)                                 

    // 역할분배
    const playersRoles = assingRolesToPlayers(players, roles, crimeInfo)

    // 맵 내 사용도구 선정
    const items_in_use = pickToolsByFeature(items, crimeInfo)

    // 타임라인 생성 
    const inGamePlayerTimelineMap = createPlayerTimelineMap(players,crimeInfo)

    // 반환


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
    const placeCheck = PlayerTimelineMap.map(p=>p.alibi[timeKey][sectionKey]).filter(ali=>ali.place === alibi.place) 

    if (placeCheck.length >= 2) return false;

    // 시간:section 내의 동일 도구 중복 소유 검사
    const itemCheck = PlayerTimelineMap.map(p=>p.alibi[timeKey][sectionKey]).filter(ali=>ali.item && ali.item.item_id === alibi.item?.item_id)
    if (itemCheck.length >= 1) return false

    // 범행 장소 동행자 금지
    if (timeKey === crimeInfo.crimeTime && sectionKey === crimeInfo.timeSection){
        const player_role = playersRoles.find(pr=>pr.player._id === playerObj.player._id)
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
    
    const roleAssignments = players.map((player, idx)=>{
        return {player: player, role: selectedRoles[idx]}
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
    })

    return selectedItems = []
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