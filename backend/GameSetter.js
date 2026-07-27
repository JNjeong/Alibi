

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
    const crimeTime = Math.floor(Math.random() * 11) +13

    // 범행 시각 섹션 생성
    const timeSection = ["section02","section24","section46"]
    const crimeTimeSection = timeSection[(Math.floor(Math.random()*timeSection.length))]

    // 범행 역할, 장소, 도구 설정
    const crimePlace = pickOneRandomly(map_places)
    const crimeRole = pickOneRandomly(roles)
    const crimeItem = pickOneRandomly(items)
    
    return {crimeInfo: {crimeTime, timeSection, crimePlace, crimeRole, crimeItem
    }}
}

export function createPlayerTimeline(user, map_places, roles, items){
    // 범인 정보 반영

    // 위험 알리바이 1개 생성

    // 해당 시각에 해당 장소?
    // 살해특징 물품 소지?
    // 10 그시각 장소에 2 2  도구1 2 

    // 랜덤알리바이 생성 및 검사

}

function pickOneRandomly(arr){
    return arr[Math.floor(Math.random()*arr.length)]
}

// 알리바이 생성

// 알리바이 모순 검사
function checkAlibiValidation(){

}
// 장소별로 최대 2명
// 동일시간대 도구 중복소유 여부
// 범행장소에 동행자 없음