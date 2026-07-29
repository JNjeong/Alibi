

export function setGame(players, mapinfo){
    // 플레이어 수 설정
    const players = players //user들이 담긴 배열
    const map_places = mapinfo.map_places 
    const roles = mapinfo.roles
    const items = mapinfo.items

    // 범행정보 생성
    const crimeInfo = createCrime(map_places,roles,items)

    // 플레이어 데이터맵 생성

    // 플레이어 가변데이터맵
    
    // 라운드별 힌트 생성 함수


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

    // 맵 내 

   

    // 유저별 위험 알리바이 1개 생성
    // 위험알리바이: 해당 시각의 section 마다 범행장소와 겹치는 유저 (장소별 최대 2인), 혹은 해당 시간대에 범행도구와 유사한 feature의 도구(최대2개) 소지자 2명 (시간대별 1명씩 도구 소지 가능)
    유저) a b c d e    f g h i j
    time         ||   도구1       도구2
    9s1     범인  ||   범인        g
    9s2     a b  ||   e          h
    9s3     c d  ||   f          i
    // 위의 경우 j사람은 위험알리바이가 없을 수 있음
    // 랜덤알리바이 생성 및 검사


}

function pickOneRandomly(arr){
    return arr[Math.floor(Math.random()*arr.length)]
}

// 알리바이 생성
function createPlayersAlibi(playerTimelineMap, playersRoles, players, map_places, items_in_use, crimeInfo){
    const timelineMap = playerTimelineMap
     // 범인 정보 반영
    const criminal = players.find(p => playersRoles[p].role === crimeInfo.crimeRole)
    timelineMap[criminal][crimeInfo.crimeTime][crimeInfo.timeSection] = {
        place: crimeInfo.crimePlace,
        item: crimeInfo.crimeItem,
        action: "피해자 살인"
    }

    // 위험 알리바이 주입


    // 남은 알리바이 생성
    const times = Object.keys(timelineMap[Object.keys(timelineMap)[0]])
    
    players.forEach(player=>{
        //TODO
        times.map(timeKey=>{
            ["section02","section24","section46"].forEach(sectionKey =>{
                if(!timelineMap[player][timeKey][sectionKey].place){
                    let alibi;
                    do{
                        const randomplace = pickOneRandomly(map_places) 
                        alibi={
                            place: randomplace,
                            item: Math.random() < 0.5 ? pickOneRandomly(items_in_use): null,
                            action: pickOneRandomly(randomplace.place_action)
                        } 
                    } while (!checkAlibiValidation(timelineMap, player, timeKey, sectionKey, alibi, crimeInfo, playersRoles))
                }
            })
        })
    })
    return timelineMap
}

// 알리바이 모순 검사
function checkAlibiValidation(PlayerTimelineMap, player, timeKey, sectionKey, alibi, crimeInfo, playersRoles){
    // 시간:section 내의 장소 2인이상 모순 검사
    const placeCheck = Object.values(PlayerTimelineMap).flatMap(timeline => timeline[timeKey][sectionKey]).filter(ali=>ali.place === alibi.place)
    if (placeCheck.length >= 2) return false;

    // 시간:section 내의 동일 도구 중복 소유 검사
    const itemCheck = Object.values(PlayerTimelineMap).flatMap(timeline=>timeline[timeKey][sectionKey]).filter(ali=>ali.item && a.item.item_id === alibi.item?.item_id)
    if (itemCheck.length >= 1) return false

    // 범행 장소 동행자 금지
    if (timeKey === crimeInfo.crimeTime && sectionKey === crimeInfo.timeSection){
        const player_role = playersRoles.find(pr=>pr.player === player)
        if(alibi.place === crimeInfo.crimePlace && player_role !== crimeInfo.crimeRole) return false
        if(alibi.item?.item_id === crimeInfo.crimeItem.item_id && player_role !== crimeInfo.crimeRole) return false
    }
    return true    
}

// 위험알리바이 주입
function assignDangerAlibi(playerTimelineMap, playersRoles, crimeInfo, items_in_use){
    const criminal = playersRoles.find(pr=>pr.role === criminal.crimeRole).player
}



function createPlayerTimelineMap(players,crimeInfo){
    const playerTimelineMap = []
    const playerCnt = players.length
    const endTimeRange = pickMaxAlibiHour(crimeInfo)
    const startTimeRange = endTimeRange-5

    // 플레이어별 빈 알리바이 타임라인 생성
    for(let i=1; i <= players.length; i++){
        const playerTimeline = {}
        for (let hour =startTimeRange; hour<=endTimeRange; hour++){
            playerTimeline[hour]={
                section02: {},
                section24: {},
                section46: {}
            }
        }
        playerTimelineMap.push({
            playerId: players[i]._id,
            alibi: playerTimeline
        })
    }
    return playerTimelineMap
}

function pickMaxAlibiHour(crimeInfo){
    // 범행 시각 후보 생성
    const crimeTime = crimeInfo.crimeTime
    const candidates = [crimeTime, crimeTime+1, crimeTime+2];
    const validCandidates = candidates.filter(time => time >= 13 && time <=24)
    const maxTime = validCandidates[Math.floor(Math.random() * validCandidates.length)]
    return maxTime
}

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