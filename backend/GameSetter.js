

export function setGame(numbOfPlayers=10, mapinfo){
    // 플레이어 수 설정
    const players = numbOfPlayers
    const map_places = mapinfo

    // 플레이어 데이터맵

    // 플레이어 가변데이터맵
    
    // 기타 알리바이 랜덤배치

    // 라운드별 힌트 생성 함수

    // 동일 알리바이 제출 금지



    return ""
}


// 범행생성 함수
export function createCrime(){
    // 범행 시각 생성 (13시~23시)
    const crimeTime = Math.floor(Math.random() * 11) +13

    // 범행 시각 섹션 생성
    const timeSection = ["section02","section24","section46"]
    const crimeTimeSection = timeSection[(Math.floor(Math.random()*timeSection.length))]

    
}