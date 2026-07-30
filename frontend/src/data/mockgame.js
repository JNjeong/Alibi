/*
 * ALIBI 메인 화면 개발용 목업 데이터
 *
 * 실제 API 연결 시 이 파일 전체를 서버 응답으로 교체할 수 있도록
 * 장소/인물/도구 원본 풀과 한 판의 게임 상태를 분리 
 * 화면에는 solution이 노출 되지 않음
 * 개발 / 검증 / frontend 단독 작업 및 테스트 용도
 */

export const TIME_SLOTS = Array.from({ length: 18 }, (_, index) => {
  const totalMinutes = 15 * 60 + index * 20
  const hour = String(Math.floor(totalMinutes / 60)).padStart(2, "0")
  const minute = String(totalMinutes % 60).padStart(2, "0")

  return {
    id: `time_${hour}${minute}`,
    label: `${hour}:${minute}`,
    index,
  }
})

export const MAP_STORY = "오래된 저택에는 오랫동안 외부에 알려지지 않은 이야기가 하나 있었다.\n\n저택의 주인은 오랜 시간 동안 막대한 재산과 여러 사업을 일구었고, 그 과정에서 수많은 사람들과 관계를 맺었다.\n\n가족, 오랜 친구, 사업 파트너, 고용인, 거래처 사람들까지.\n\n겉으로 보기에는 모두가 서로를 잘 알고 있는 것처럼 보였지만, 실제로는 그렇지 않았다.\n\n누군가는 돈 때문에 이곳에 왔고,\n\n누군가는 과거의 일 때문에 이곳에 왔으며,\n\n누군가는 아직 밝혀지지 않은 목적을 가지고 저택을 찾았다.\n\n그날 밤에도 저택에서는 평소와 다르지 않은 만찬이 준비되고 있었다.\n\n사람들은 각자의 이유로 저택 곳곳을 오갔다.\n\n응접실에서 이야기를 나누는 사람.\n\n서재에서 오래된 서류를 살펴보는 사람.\n\n주방에서 음식을 준비하는 사람.\n\n온실에서 식물을 돌보는 사람.\n\n와인 저장고에서 술을 고르는 사람.\n\n그리고 다른 사람들이 보지 못하는 곳에서 자신만의 일을 처리하는 사람.\n\n누구도 그날 밤이 마지막이 될 것이라고 생각하지 않았다.\n\n그러나 어느 순간,\n\n저택 안에서 한 사람이 살해당했다.\n\n처음에는 사고라고 생각했다.\n\n하지만 현장을 살펴본 사람들은 곧 이것이 사고가 아니라는 사실을 깨달았다.\n\n누군가 의도적으로 한 사람의 목숨을 빼앗았다.\n\n문제는 저택 안에 있던 사람들이 모두 서로 다른 이야기를 하고 있다는 것이었다.\n\n\"나는 그 시간에 그곳에 없었어.\"\n\n\"그 사람을 본 적 없어.\"\n\n\"나는 계속 이 방에 있었어.\"\n\n\"그 물건은 처음부터 거기에 있었어.\"\n\n이상한 점은 한두 가지가 아니었다.\n\n누군가의 증언과 실제 물건의 위치가 맞지 않았고,\n\n서로의 기억도 조금씩 어긋나 있었다.\n\n하지만 모든 거짓말이 살인을 숨기기 위한 것은 아니었다.\n\n누군가는 자신의 비밀을 숨기기 위해 거짓말하고,\n\n누군가는 다른 사람에게 들키고 싶지 않은 행동을 감추기 위해 거짓말한다.\n\n그리고 단 한 명은 살인을 저질렀기 때문에 반드시 진실을 숨겨야 한다.\n\n저택에 모인 사람들 가운데 누가 범인인지 아무도 알지 못한다.\n\n범인은 자신의 행동을 숨기려 할 것이고,\n\n다른 사람들은 자신의 알리바이를 증명하면서 동시에 서로의 말을 의심해야 한다.\n\n저택 곳곳에 남겨진 물건.\n\n서로 엇갈리는 증언.\n\n누군가가 기억하지 못하는 몇 분의 시간.\n\n그리고 아무렇지 않게 지나쳤던 사소한 행동 하나.\n\n모든 것이 단서가 될 수 있다.\n\n이제 여러분에게 주어진 것은 하나의 저택과,\n\n그곳에 있었던 사람들의 기억뿐이다.\n\n진실을 찾아라.\n\n거짓말을 찾아라.\n\n그리고 살인자를 찾아라."

export const MAP_PLACES = [
  {
    "place_id": "map_GrandHall",
    "place_name": "그랜드 홀",
    "place_action": [
      "주변 둘러보기",
      "샹들리에 바라보기",
      "계단 오르기",
      "계단 내려오기",
      "벽시계 확인하기",
      "장식장 정리하기",
      "꽃병 살펴보기",
      "창문 열기",
      "주변 서성이기",
      "겉옷 입기"
    ]
  },
  {
    "place_id": "map_ReceptionRoom",
    "place_name": "응접실",
    "place_action": [
      "소파에 앉기",
      "차 마시기",
      "잡지 읽기",
      "신문 확인하기",
      "손님 맞이하기",
      "창밖 바라보기",
      "꽃병 매만지기",
      "커튼 열기",
      "시간 확인하기",
      "손님 기다리기"
    ]
  },
  {
    "place_id": "map_Study",
    "place_name": "서재",
    "place_action": [
      "계약서 읽기",
      "회계장부 확인하기",
      "책 읽기",
      "서랍 정리하기",
      "금고 확인하기",
      "메모 작성하기",
      "전화하기",
      "편지 봉투 정리하기",
      "책장 둘러보기",
      "서류 파쇄하기"
    ]
  },
  {
    "place_id": "map_Hallway",
    "place_name": "1층복도",
    "place_action": [
      "걸어가기",
      "창밖보기",
      "액자 감상하기",
      "화분 옮기기",
      "바닥 청소하기",
      "창문 열기",
      "조명 켜기",
      "카펫 정리하기",
      "머뭇거리며 서성이기",
      "창틀 먼지 쓸기"
    ]
  },
  {
    "place_id": "map_DiningRoom",
    "place_name": "식당",
    "place_action": [
      "식사하기",
      "디저트먹기",
      "밥상뒤엎기",
      "식탁 닦기",
      "와인 따르기",
      "물 마시기",
      "식기 가져오기",
      "냅킨 정리하기",
      "촛불 켜기",
      "그릇 치우기"
    ]
  },
  {
    "place_id": "map_Kitchen",
    "place_name": "주방",
    "place_action": [
      "커피 내리기",
      "물 마시기",
      "요리하기",
      "냉장고 열기",
      "컵 씻기",
      "접시 정리하기",
      "칼 꺼내기",
      "음식 데우기",
      "쓰레기 버리기",
      "야식 훔치기"
    ]
  },
  {
    "place_id": "map_Greenhouse",
    "place_name": "온실",
    "place_action": [
      "딸기 뜯어먹기",
      "김사과씨 찾기",
      "가지치기",
      "비료 확인하기",
      "원예가위 사용하기",
      "온도 조절하기",
      "삽 정리하기",
      "식물 관찰하기",
      "꽃 손질하기",
      "벌레 잡기"
    ]
  },
  {
    "place_id": "map_Ballroom",
    "place_name": "무도회장",
    "place_action": [
      "피아노 연주하기",
      "피아노 조율하기",
      "와인 마시기",
      "춤 연습하기",
      "장식품 정리하기",
      "무대 둘러보기",
      "거울 보기",
      "디저트 챙기기",
      "의자 옮기기",
      "드레스/의복 입어보기"
    ]
  },
  {
    "place_id": "map_BiliardRoom",
    "place_name": "당구실",
    "place_action": [
      "당구치기",
      "당구공 정리하기",
      "큐 정리하기",
      "바 테이블 이용하기",
      "음료 마시기",
      "점수 기록하기",
      "카드놀이 하기",
      "음악 듣기",
      "자... 게임을 시작하지 외치기",
      "점수 사기치기"
    ]
  },
  {
    "place_id": "map_MasterBedroom",
    "place_name": "안방",
    "place_action": [
      "침대 정리하기",
      "이불 빨래하기",
      "옷 갈아입기",
      "옷장 열기",
      "화장하기",
      "거울 보기",
      "협탁 서랍 열기",
      "휴식하기",
      "침대에 앉기",
      "XX (※본 게임은 19세 이상 사용자들의 플레이를 권장합니다.)"
    ]
  },
  {
    "place_id": "map_GuestRoom",
    "place_name": "손님방",
    "place_action": [
      "짐 정리하기",
      "여행가방 열기",
      "옷 갈아입기",
      "침대 정리하기",
      "누워서 휴식하기",
      "책 읽기",
      "휴대폰 충전하기",
      "메모 작성하기",
      "쉬기",
      "배개 정리하기"
    ]
  },
  {
    "place_id": "map_WineCellar",
    "place_name": "와인저장고",
    "place_action": [
      "와인 고르기",
      "와인병 꺼내기",
      "와인 테이스팅하기",
      "디캔터 사용하기",
      "와인잔 가져가기",
      "선반 정리하기",
      "병 닦기",
      "라벨 확인하기",
      "상자 옮기기",
      "문 잠그기"
    ]
  }
]

// PLACE는 화면 구조에 맞게 변환한 UI용 데이터입니다. (floor, shortName 필드 추가)
const PLACE = {
  "map_GrandHall": {
    "floor": "1F",
    "shortName": "홀"
  },
  "map_ReceptionRoom": {
    "floor": "1F",
    "shortName": "응접실"
  },
  "map_Study": {
    "floor": "1F",
    "shortName": "서재"
  },
  "map_Hallway": {
    "floor": "1F",
    "shortName": "복도"
  },
  "map_DiningRoom": {
    "floor": "1F",
    "shortName": "식당"
  },
  "map_Kitchen": {
    "floor": "1F",
    "shortName": "주방"
  },
  "map_Greenhouse": {
    "floor": "1F",
    "shortName": "온실"
  },
  "map_Ballroom": {
    "floor": "1F",
    "shortName": "무도회장"
  },
  "map_BiliardRoom": {
    "floor": "1F",
    "shortName": "당구실"
  },
  "map_MasterBedroom": {
    "floor": "2F",
    "shortName": "안방"
  },
  "map_GuestRoom": {
    "floor": "2F",
    "shortName": "손님방"
  },
  "map_WineCellar": {
    "floor": "B1",
    "shortName": "저장고"
  }
}

// PLACES는 기존 화면 컴포넌트가 사용하던 필드 구조로 변환한 화면용 데이터
// .map()를 통해 PLACE 객체에서 floor, shortName을 가져와서 추가
// MAP_PLACES 배열을 변환하여 PLACES 배열을 생성
export const PLACES = MAP_PLACES.map((place) => ({
  id: place.place_id,
  name: place.place_name,
  floor: PLACE[place.place_id]?.floor ?? "",
  shortName: PLACE[place.place_id]?.shortName ?? place.place_name,
  actions: [...place.place_action],
}))

// 테스트용 role_char00(김사과)은 제외한 실제 인물 후보 20명
export const CHARACTERS = [
  { id: "role_char01", name: "윤서진", occupation: "유산 관리 변호사", motive: "유언장 위조 의혹이 공개되면 변호사 자격과 명성을 잃는다." },
  { id: "role_char02", name: "한도윤", occupation: "가정의", motive: "피해자가 불법 처방과 진료 기록 조작을 폭로하려 했다." },
  { id: "role_char03", name: "박정원", occupation: "수석 정원사", motive: "피해자가 횡령 의혹을 이유로 해고와 고발을 예고했다." },
  { id: "role_char04", name: "최유진", occupation: "저택 집사", motive: "저택 관리비 유용 사실을 피해자가 알아냈다." },
  { id: "role_char05", name: "강민석", occupation: "가문 재무담당", motive: "비자금 장부를 숨기지 못하면 형사 책임을 질 상황이었다." },
  { id: "role_char06", name: "오세라", occupation: "예술품 감정사", motive: "위작을 진품으로 감정한 사실을 피해자가 공개하려 했다." },
  { id: "role_char07", name: "이준호", occupation: "피해자의 조카", motive: "상속 대상에서 제외될 가능성을 통보받았다." },
  { id: "role_char08", name: "김하진", occupation: "피해자 비서", motive: "기밀 문서 유출 사실이 드러나면 모든 책임을 떠안을 처지였다." },
  { id: "role_char09", name: "문태성", occupation: "경호 책임자", motive: "보안 공백과 금품 수수 사실을 피해자가 해고 사유로 삼았다." },
  { id: "role_char10", name: "차은별", occupation: "피아니스트", motive: "피해자가 후원 중단과 과거 계약 위반 공개를 통보했다." },
  { id: "role_char11", name: "서지훈", occupation: "가문 기록관리인", motive: "가문 기록을 조작해 금품을 받은 사실이 들킬 위기였다." },
  { id: "role_char12", name: "백승현", occupation: "와인 수입업자", motive: "납품 사기와 가짜 빈티지 거래를 피해자가 고발하려 했다." },
  { id: "role_char13", name: "정수빈", occupation: "전속 셰프", motive: "식자재 리베이트와 장부 누락을 피해자가 확인했다." },
  { id: "role_char14", name: "임도현", occupation: "저택 보수 건축가", motive: "부실 공사와 공사비 과다 청구 자료를 피해자가 확보했다." },
  { id: "role_char15", name: "홍예린", occupation: "탐사 기자", motive: "취재원을 보호하려다 불법 녹음과 협박에 연루되었다." },
  { id: "role_char16", name: "남기훈", occupation: "골동품상", motive: "도난품을 저택에 판매한 사실을 피해자가 되돌려 받으려 했다." },
  { id: "role_char17", name: "송미라", occupation: "가정부", motive: "피해자가 가족의 채무를 빌미로 고용을 끝내려 했다." },
  { id: "role_char18", name: "배현우", occupation: "전속 운전기사", motive: "차량을 사적으로 사용하고 운행 기록을 조작한 사실이 발각되었다." },
  { id: "role_char19", name: "조아라", occupation: "재단 이사", motive: "재단 자금의 사적 유용을 피해자가 이사회에 보고하려 했다." },
  { id: "role_char20", name: "류시아", occupation: "사진작가", motive: "비공개 사진 판매와 현상 약품 관리 문제가 드러날 위기였다." },
]


export const TOOLS = [
  { id: "item_tool01", name: "은제 편지칼", category: "예리함", defaultLocationId: "map_Study" },
  { id: "item_tool02", name: "황동 촛대", category: "둔기", defaultLocationId: "map_DiningRoom" },
  { id: "item_tool03", name: "크리스탈 디캔터", category: "둔기", defaultLocationId: "map_WineCellar" },
  { id: "item_tool04", name: "조각용 망치", category: "둔기", defaultLocationId: "map_GuestRoom" },
  { id: "item_tool05", name: "정원용 전지가위", category: "예리함", defaultLocationId: "map_Greenhouse" },
  { id: "item_tool06", name: "셰프 나이프", category: "예리함", defaultLocationId: "map_Kitchen" },
  { id: "item_tool07", name: "고농도 수면제", category: "약물", defaultLocationId: "map_GuestRoom" },
  { id: "item_tool08", name: "의료용 주사기", category: "약물", defaultLocationId: "map_GuestRoom" },
  { id: "item_tool09", name: "실크 커튼끈", category: "질식", defaultLocationId: "map_GrandHall" },
  { id: "item_tool10", name: "피아노 와이어", category: "질식", defaultLocationId: "map_Ballroom" },
  { id: "item_tool11", name: "청동 말 조각상", category: "둔기", defaultLocationId: "map_ReceptionRoom" },
  { id: "item_tool12", name: "독성 원예 약품", category: "약물", defaultLocationId: "map_Greenhouse" },
  { id: "item_tool13", name: "대리석 문진", category: "둔기", defaultLocationId: "map_Study" },
  { id: "item_tool14", name: "사냥용 단검", category: "예리함", defaultLocationId: "map_MasterBedroom" },
  { id: "item_tool15", name: "와인 코르크스크루", category: "예리함", defaultLocationId: "map_WineCellar" },
  { id: "item_tool16", name: "장식 지팡이 칼", category: "예리함", defaultLocationId: "map_ReceptionRoom" },
  { id: "item_tool17", name: "유리 재떨이", category: "둔기", defaultLocationId: "map_BiliardRoom" },
  { id: "item_tool18", name: "사진 현상액", category: "약물", defaultLocationId: "map_GuestRoom" },
  { id: "item_tool19", name: "가죽 허리띠", category: "질식", defaultLocationId: "map_GuestRoom" },
  { id: "item_tool20", name: "전기 연장 코드", category: "질식", defaultLocationId: "map_Hallway" },
]

// 테스트용 참가자 10명
const PARTICIPANTS = [
  { id: "player_01", userId: "user_dawon", nickname: "다원", characterId: "role_char01", color: "#e6c77a", isMe: true },
  { id: "player_02", userId: "user_seojin", nickname: "서진", characterId: "role_char02", color: "#8cc7ff" },
  { id: "player_03", userId: "user_seungyeon", nickname: "승연", characterId: "role_char03", color: "#7ee2b8" },
  { id: "player_04", userId: "user_seongwoo", nickname: "성우", characterId: "role_char04", color: "#d8a0ff" },
  { id: "player_05", userId: "user_minsuk", nickname: "민석", characterId: "role_char05", color: "#ff9d8f" },
  { id: "player_06", userId: "user_sera", nickname: "세라", characterId: "role_char06", color: "#ffb4d3" },
  { id: "player_07", userId: "user_junho", nickname: "준호", characterId: "role_char07", color: "#97d5e8" },
  { id: "player_08", userId: "user_hajin", nickname: "하진", characterId: "role_char08", color: "#d0e17a" },
  { id: "player_09", userId: "user_taesung", nickname: "태성", characterId: "role_char09", color: "#ffbd7a" },
  { id: "player_10", userId: "user_eunbyeol", nickname: "은별", characterId: "role_char10", color: "#a9a7ff" },
]


// 테스트용 참가자 10명의 시간대별 이동 경로
const TIMELINE_PATHS = {
  player_01: ["map_ReceptionRoom", "map_ReceptionRoom", "map_GrandHall", "map_GrandHall", "map_Study", "map_Study", "map_Hallway", "map_Hallway", "map_DiningRoom", "map_DiningRoom", "map_Kitchen", "map_Kitchen", "map_Greenhouse", "map_Greenhouse", "map_Ballroom", "map_Ballroom", "map_GrandHall", "map_GrandHall"],
  player_02: ["map_GuestRoom", "map_GuestRoom", "map_Study", "map_Study", "map_ReceptionRoom", "map_ReceptionRoom", "map_Kitchen", "map_Kitchen", "map_DiningRoom", "map_DiningRoom", "map_Hallway", "map_Hallway", "map_MasterBedroom", "map_MasterBedroom", "map_GrandHall", "map_GrandHall", "map_WineCellar", "map_WineCellar"],
  player_03: ["map_Greenhouse", "map_Greenhouse", "map_Hallway", "map_Hallway", "map_GrandHall", "map_GrandHall", "map_Greenhouse", "map_Greenhouse", "map_Kitchen", "map_Kitchen", "map_DiningRoom", "map_DiningRoom", "map_ReceptionRoom", "map_ReceptionRoom", "map_BiliardRoom", "map_BiliardRoom", "map_ReceptionRoom", "map_ReceptionRoom"],
  player_04: ["map_GrandHall", "map_GrandHall", "map_ReceptionRoom", "map_ReceptionRoom", "map_Hallway", "map_Hallway", "map_DiningRoom", "map_DiningRoom", "map_Kitchen", "map_Kitchen", "map_WineCellar", "map_WineCellar", "map_Ballroom", "map_Ballroom", "map_Ballroom", "map_Ballroom", "map_Ballroom", "map_Ballroom"],
  player_05: ["map_Study", "map_Study", "map_BiliardRoom", "map_BiliardRoom", "map_GrandHall", "map_GrandHall", "map_DiningRoom", "map_DiningRoom", "map_WineCellar", "map_WineCellar", "map_GuestRoom", "map_GuestRoom", "map_Hallway", "map_Study", "map_Study", "map_Hallway", "map_Hallway", "map_Hallway"],
  player_06: ["map_Ballroom", "map_Ballroom", "map_ReceptionRoom", "map_ReceptionRoom", "map_Study", "map_Study", "map_GrandHall", "map_GrandHall", "map_BiliardRoom", "map_BiliardRoom", "map_DiningRoom", "map_DiningRoom", "map_WineCellar", "map_WineCellar", "map_GuestRoom", "map_GuestRoom", "map_GuestRoom", "map_GuestRoom"],
  player_07: ["map_MasterBedroom", "map_MasterBedroom", "map_GuestRoom", "map_GuestRoom", "map_ReceptionRoom", "map_ReceptionRoom", "map_Study", "map_Study", "map_GrandHall", "map_GrandHall", "map_BiliardRoom", "map_BiliardRoom", "map_DiningRoom", "map_DiningRoom", "map_Kitchen", "map_Kitchen", "map_Kitchen", "map_Kitchen"],
  player_08: ["map_Kitchen", "map_Kitchen", "map_DiningRoom", "map_DiningRoom", "map_WineCellar", "map_WineCellar", "map_Hallway", "map_Hallway", "map_ReceptionRoom", "map_ReceptionRoom", "map_Study", "map_Study", "map_Greenhouse", "map_Greenhouse", "map_GrandHall", "map_GrandHall", "map_GrandHall", "map_GrandHall"],
  player_09: ["map_Hallway", "map_Hallway", "map_GrandHall", "map_GrandHall", "map_BiliardRoom", "map_BiliardRoom", "map_MasterBedroom", "map_MasterBedroom", "map_GuestRoom", "map_GuestRoom", "map_Ballroom", "map_Ballroom", "map_Kitchen", "map_Kitchen", "map_DiningRoom", "map_DiningRoom", "map_DiningRoom", "map_DiningRoom"],
  player_10: ["map_WineCellar", "map_WineCellar", "map_Ballroom", "map_Ballroom", "map_DiningRoom", "map_DiningRoom", "map_GuestRoom", "map_GuestRoom", "map_MasterBedroom", "map_MasterBedroom", "map_GrandHall", "map_GrandHall", "map_BiliardRoom", "map_BiliardRoom", "map_ReceptionRoom", "map_ReceptionRoom", "map_BiliardRoom", "map_BiliardRoom"],
}

// 테스트용 참가자 10명의 도구 소지 기록

const TOOL_POSSESSIONS = [
  { id: "ownership_01", toolId: "item_tool01", playerId: "player_05", fromIndex: 12, toIndex: 14, reason: "서재 서랍에서 가져감" },
  { id: "ownership_02", toolId: "item_tool02", playerId: "player_04", fromIndex: 3, toIndex: 5, reason: "식당 장식품을 정리함" },
  { id: "ownership_03", toolId: "item_tool05", playerId: "player_03", fromIndex: 6, toIndex: 9, reason: "온실 가지치기에 사용함" },
  { id: "ownership_04", toolId: "item_tool07", playerId: "player_02", fromIndex: 10, toIndex: 12, reason: "피해자의 처방약을 확인함" },
  { id: "ownership_05", toolId: "item_tool03", playerId: "player_10", fromIndex: 9, toIndex: 12, reason: "만찬용 와인을 준비함" },
]

// 테스트용 참가자 10명의 특수 이벤트 기록
const SPECIAL_EVENTS = {
  "player_01-time_1620": { activity: "유언장 초안의 수정 흔적을 확인했다.", flags: ["victimArgument"] },
  "player_01-time_1920": { activity: "김하진과 온실의 화분 기록을 대조했다.", flags: ["sharedEvent"] },
  "player_02-time_1820": { activity: "피해자의 처방약 봉투를 몰래 확인했다.", flags: ["toolPossession"] },
  "player_03-time_1700": { activity: "전지가위로 장미 가지를 정리했다.", flags: ["toolPossession"] },
  "player_04-time_1600": { activity: "식당에서 가져온 촛대를 닦아 제자리에 두었다.", flags: ["toolPossession"] },
  "player_05-time_1900": { activity: "복도에서 서재 쪽을 살피며 혼자 머물렀다.", flags: ["aloneNearWindow"] },
  "player_05-time_1920": { activity: "피해자를 공격한 뒤 장부 일부를 회수했다.", flags: ["crime", "suspiciousAlibi"] },
  "player_05-time_1940": { activity: "편지칼을 닦고 서류함 뒤에 숨겼다.", flags: ["crime", "toolPossession"] },
  "player_06-time_1840": { activity: "가짜 감정서가 든 봉투를 식탁 아래 감췄다.", flags: ["suspiciousAlibi"] },
  "player_07-time_1720": { activity: "상속 제외 통보서를 읽고 피해자에게 항의했다.", flags: ["victimArgument"] },
  "player_08-time_1920": { activity: "다원과 함께 화분 관리 기록을 대조했다.", flags: ["sharedEvent"] },
  "player_09-time_1740": { activity: "비어 있는 손님방에서 보안 기록을 고쳤다.", flags: ["aloneNearWindow"] },
  "player_10-time_1800": { activity: "피해자 몰래 디캔터의 와인을 따라 마셨다.", flags: ["toolPossession"] },
}

// 테스트용 참가자 10명의 시간대별 이동 경로를 기반으로 타임라인을 생성하는 함수
const getPlace = (placeId) => PLACES.find((place) => place.id === placeId)

// 참가자가 특정 시간대에 도구를 소지하고 있는지 확인하는 함수
const getPossession = (playerId, slotIndex) =>
  TOOL_POSSESSIONS.find(
    (ownership) =>
      ownership.playerId === playerId &&
      slotIndex >= ownership.fromIndex &&
      slotIndex <= ownership.toIndex,
  )

  // 참가자별 타임라인을 생성하는 함수
const buildTimeline = (participant, participantIndex) =>
  TIME_SLOTS.map((slot, slotIndex) => {
    const placeId = TIMELINE_PATHS[participant.id][slotIndex]
    const place = getPlace(placeId)
    const specialEvent = SPECIAL_EVENTS[`${participant.id}-${slot.id}`]
    const possession = getPossession(participant.id, slotIndex)
    const companions = PARTICIPANTS.filter(
      (other) =>
        other.id !== participant.id &&
        TIMELINE_PATHS[other.id][slotIndex] === placeId,
    ).map((other) => other.id)

    return {
      timeId: slot.id,
      placeId,
      activity:
        specialEvent?.activity ??
        place.actions[(slotIndex + participantIndex) % place.actions.length],
      companionIds: companions,
      toolId: possession?.toolId ?? null,
      flags: specialEvent?.flags ?? [],
      isPrivate: true,
    }
  })

  // 참가자별 캐릭터 정보와 타임라인을 포함한 플레이어 데이터를 생성
const PLAYERS = PARTICIPANTS.map((participant, participantIndex) => {
  const character = CHARACTERS.find((item) => item.id === participant.characterId)

  return {
    ...participant,
    character,
    timeline: buildTimeline(participant, participantIndex),
    questionCount: participant.id === "player_01" ? 1 : 0,
    statementSubmitted: participant.id !== "player_08" && participant.id !== "player_10",
  }
})


// 테스트용 피해자 이동 경로 및 타임라인
const VICTIM_PATH = [
  "map_MasterBedroom", "map_MasterBedroom", "map_ReceptionRoom", "map_ReceptionRoom",
  "map_Study", "map_Study", "map_DiningRoom", "map_DiningRoom",
  "map_GrandHall", "map_GrandHall", "map_Study", "map_Study",
  "map_Study", "map_Study",
]

// 피해자 타임라인을 생성하는 함수
const VICTIM_TIMELINE = TIME_SLOTS.map((slot, index) => {
  if (index > 13) {
    return {
      timeId: slot.id,
      placeId: null,
      activity: "사망 이후",
      status: "deceased",
    }
  }


  // 피해자 이동 경로에 따라 장소와 활동을 설정
  const placeId = VICTIM_PATH[index]
  const place = getPlace(placeId)

  return {
    timeId: slot.id,
    placeId,
    activity:
      index === 12
        ? "재무담당자에게 장부를 가져오라는 메모를 보냈다."
        : index === 13
          ? "비자금 장부를 확인하기 위해 서재에서 기다렸다."
          : place.actions[index % place.actions.length],
    status: index === 13 ? "crime" : "alive",
  }
})

// 테스트용 공식 발언 및 질문 데이터
const OFFICIAL_STATEMENTS = [
  {
    id: "statement_01",
    type: "statement",
    round: 1,
    authorId: "player_01",
    timeLabel: "16:20",
    content: "16:20경 서재에서 유언장 초안을 확인했습니다.",
    status: "verified",
    createdAt: "20:02",
  },
  {
    id: "statement_02",
    type: "statement",
    round: 1,
    authorId: "player_03",
    timeLabel: "17:00",
    content: "17:00부터 온실에서 전지가위로 장미를 정리했습니다.",
    status: "verified",
    createdAt: "20:03",
  },
  {
    id: "statement_03",
    type: "statement",
    round: 1,
    authorId: "player_07",
    timeLabel: "17:20",
    content: "17:20경 서재에서 피해자와 상속 문제로 말다툼했습니다.",
    status: "verified",
    createdAt: "20:04",
  },
  {
    id: "statement_04",
    type: "statement",
    round: 2,
    authorId: "player_05",
    timeLabel: "19:00–19:40",
    content: "19:00부터 19:40까지 와인 저장고에서 혼자 장부를 확인했습니다.",
    status: "contradiction",
    createdAt: "20:10",
  },
  {
    id: "statement_05",
    type: "statement",
    round: 2,
    authorId: "player_08",
    timeLabel: "19:20",
    content: "19:20에는 다원과 온실에서 화분 기록을 확인했습니다.",
    status: "verified",
    createdAt: "20:11",
  },
]

const OFFICIAL_QUESTIONS = [
  {
    id: "question_01",
    type: "question",
    round: 2,
    authorId: "player_03",
    targetId: "player_10",
    questionType: "saw",
    timeLabel: "18:40",
    content: "18:40에 와인 저장고에서 민석을 봤습니까?",
    status: "answered",
    createdAt: "20:12",
    answer: {
      id: "answer_01",
      type: "answer",
      authorId: "player_10",
      content: "못 봤습니다. 그 시각 저장고에는 저 혼자 있었습니다.",
      status: "verified",
      createdAt: "20:13",
    },
  },
  {
    id: "question_02",
    type: "question",
    round: 2,
    authorId: "player_01",
    targetId: "player_05",
    questionType: "owned",
    timeLabel: "19:20",
    content: "19:20에 은제 편지칼을 소유하고 있었습니까?",
    status: "pending",
    createdAt: "20:14",
    answer: null,
  },
]


// 공식 발언과 질문/답변을 합쳐서 시간순으로 정렬한 피드 데이터
// 질문에 답변이 있는 경우, 질문과 답변을 순서대로 포함
const OFFICIAL_FEED = [
  ...OFFICIAL_STATEMENTS,
  ...OFFICIAL_QUESTIONS.flatMap((question) =>
    question.answer
      ? [
          question,
          {
            ...question.answer,
            round: question.round,
            targetId: question.authorId,
            timeLabel: question.timeLabel,
            parentId: question.id,
          },
        ]
      : [question],
  ),
].sort((a, b) => a.createdAt.localeCompare(b.createdAt))


// BOARD_EVIDENCE는 공식 발언과 질문/답변을 기반으로, 각 참가자가 제출한 증거를 시간대별로 정리한 데이터
const BOARD_EVIDENCE = {
  "time_1620-player_01": { placeId: "map_Study", label: "서재", sourceType: "statement", sourceId: "statement_01", status: "verified" },
  "time_1700-player_03": { placeId: "map_Greenhouse", label: "온실", sourceType: "statement", sourceId: "statement_02", status: "verified", toolId: "item_tool05" },
  "time_1720-player_07": { placeId: "map_Study", label: "서재", sourceType: "statement", sourceId: "statement_03", status: "verified" },
  "time_1900-player_05": { placeId: "map_WineCellar", label: "저장고", sourceType: "statement", sourceId: "statement_04", status: "contradiction" },
  "time_1920-player_05": { placeId: "map_WineCellar", label: "저장고", sourceType: "statement", sourceId: "statement_04", status: "contradiction" },
  "time_1940-player_05": { placeId: "map_WineCellar", label: "저장고", sourceType: "statement", sourceId: "statement_04", status: "contradiction" },
  "time_1920-player_08": { placeId: "map_Greenhouse", label: "온실", sourceType: "statement", sourceId: "statement_05", status: "verified" },
}


// BOARD_NOTES는 참가자가 직접 작성한 메모를 시간대별로 정리한 데이터
export const mockGame = {
  id: "game_mock_0729",
  roomCode: "ALB-7241",
  title: "블랙우드 저택 살인사건",
  status: "playing",
  currentPlayerId: "player_01",
  createdAt: "2026-07-29T19:30:00+09:00",
  timeSlots: TIME_SLOTS,
  places: PLACES,
  characterPool: CHARACTERS,
  toolPool: TOOLS,
  players: PLAYERS,
  victim: {
    id: "victim_01",
    name: "윤태건",
    age: 67,
    occupation: "블랙우드 재단 이사장",
    description: "저택과 재단의 모든 재산을 관리하던 인물. 만찬 직전 여러 사람에게 중요한 통보를 했다.",
    timeline: VICTIM_TIMELINE,
  },
  caseProfile: {
    story: MAP_STORY,
    discoveredAt: "21:00",
    discoveredPlaceId: "map_Hallway",
    causeOfDeath: "가슴 부위의 예리한 자상",
    locationCandidateIds: [
      "map_Study",
      "map_Greenhouse",
      "map_WineCellar",
      "map_Ballroom",
      "map_BiliardRoom",
      "map_MasterBedroom",
    ],
    weaponCandidateIds: [
      "item_tool01",
      "item_tool02",
      "item_tool03",
      "item_tool05",
      "item_tool07",
    ],
    forensicWindowIds: TIME_SLOTS.slice(6, 15).map((slot) => slot.id),
    finalWindowIds: TIME_SLOTS.slice(12, 15).map((slot) => slot.id),
  },
  rounds: [
    { number: 1, title: "자유 행적 진술", description: "18개 슬롯 중 행적 1개 공개", status: "completed", submitted: 10, total: 10 },
    { number: 2, title: "장소·동행 진술", description: "후보 장소와 시간, 동행 관계 공개", status: "current", submitted: 8, total: 10 },
    { number: 3, title: "도구 소지 진술", description: "소지했던 도구 1개 공개", status: "locked", submitted: 0, total: 10 },
    { number: 4, title: "핵심 시간대 진술", description: "포렌식 범위 안의 핵심 행적 공개", status: "locked", submitted: 0, total: 10 },
    { number: 5, title: "최종 알리바이 진술", description: "최종 3개 슬롯 안의 행적을 마지막으로 공개", status: "locked", submitted: 0, total: 10 },
  ],
  currentRound: 2,
  roundEndsInSeconds: 8 * 60 + 42,
  hints: [
    {
      id: "hint_round1",
      round: 1,
      title: "범행 가능 장소",
      status: "revealed",
      content: "범행 장소는 공개된 6곳 중 하나입니다.",
      valueIds: ["map_Study", "map_Greenhouse", "map_WineCellar", "map_Ballroom", "map_BiliardRoom", "map_MasterBedroom"],
    },
    {
      id: "hint_round2",
      round: 2,
      title: "피해자 마지막 목격",
      status: "locked",
      content: "2라운드 종료 후 피해자의 마지막 목격 장소와 시각이 공개됩니다.",
      valueIds: ["map_Study", "time_1900"],
    },
    {
      id: "hint_round3",
      round: 3,
      title: "포렌식 시간대",
      status: "locked",
      content: "3라운드 종료 후 연속된 9개 슬롯이 공개됩니다.",
      valueIds: TIME_SLOTS.slice(6, 15).map((slot) => slot.id),
    },
    {
      id: "hint_round4",
      round: 4,
      title: "범행 도구 후보",
      status: "locked",
      content: "4라운드 종료 후 범행 가능 도구 5개가 공개됩니다.",
      valueIds: ["item_tool01", "item_tool02", "item_tool03", "item_tool05", "item_tool07"],
    },
    {
      id: "hint_round5",
      round: 5,
      title: "최종 핵심 시간",
      status: "locked",
      content: "5라운드 종료 후 연속된 최종 3개 슬롯이 공개됩니다.",
      valueIds: TIME_SLOTS.slice(12, 15).map((slot) => slot.id),
    },
  ],
  officialStatements: OFFICIAL_STATEMENTS,
  officialQuestions: OFFICIAL_QUESTIONS,
  officialFeed: OFFICIAL_FEED,
  boardEvidence: BOARD_EVIDENCE,
  boardNotes: {
    "time_1900-player_05": "19:00~19:40 진술이 은별의 답변과 맞지 않는다.",
    "time_1920-player_01": "하진이 같은 장소에 있었다고 공식 진술함.",
  },
  toolPossessions: TOOL_POSSESSIONS,
  chatMessages: [
    { id: "chat_01", authorId: "player_04", content: "일단 1라운드 진술부터 시간순으로 보죠.", createdAt: "20:08" },
    { id: "chat_02", authorId: "player_10", content: "18:40 저장고에는 저 혼자 있었어요.", createdAt: "20:12" },
    { id: "chat_03", authorId: "player_03", content: "그럼 민석 님 진술이 이상한데요?", createdAt: "20:13" },
    { id: "chat_04", authorId: "player_05", content: "시간을 잘못 기억했을 수도 있습니다.", createdAt: "20:14" },
    { id: "chat_05", authorId: "player_01", content: "19:20 온실에는 하진 님과 제가 같이 있었습니다.", createdAt: "20:15" },
    { id: "chat_06", authorId: "player_08", content: "맞아요. 화분 관리 기록을 같이 확인했어요.", createdAt: "20:15" },
    { id: "chat_07", authorId: "player_09", content: "피해자를 마지막으로 본 사람부터 확인하면 어때요?", createdAt: "20:16" },
    { id: "chat_08", authorId: "player_02", content: "저는 18:20 이후 피해자를 보지 못했습니다.", createdAt: "20:17" },
  ],
  rules: {
    maxPlayersAtSamePlace: 3,
    maxCompanions: 2,
    maxQuestionsPerPlayer: 2,
    toolTransferLimit: 4,
  },
  generationMeta: {
    participantCount: PARTICIPANTS.length,
    rolePoolCount: CHARACTERS.length,
    placeCount: PLACES.length,
    toolPoolCount: TOOLS.length,
    slotCount: TIME_SLOTS.length,
    hardValidation: {
      valid: true,
      errors: [],
      checkedAt: "2026-07-29T19:29:58+09:00",
    },
  },
  // 개발용 정답: 일반 플레이 화면 컴포넌트에서는 참조하지 않습니다.
  solution: {
    criminalId: "player_05",
    crimeTimeId: "time_1920",
    crimePlaceId: "map_Study",
    crimeToolId: "item_tool01",
  },
}

export default mockGame
