import mongoose from "mongoose";

const MapSchema = new mongoose.Schema({
    map_story: {type:String, default: "오래된 저택에는 오랫동안 외부에 알려지지 않은 이야기가 하나 있었다.\n\n저택의 주인은 오랜 시간 동안 막대한 재산과 여러 사업을 일구었고, 그 과정에서 수많은 사람들과 관계를 맺었다.\n\n가족, 오랜 친구, 사업 파트너, 고용인, 거래처 사람들까지.\n\n겉으로 보기에는 모두가 서로를 잘 알고 있는 것처럼 보였지만, 실제로는 그렇지 않았다.\n\n누군가는 돈 때문에 이곳에 왔고,\n\n누군가는 과거의 일 때문에 이곳에 왔으며,\n\n누군가는 아직 밝혀지지 않은 목적을 가지고 저택을 찾았다.\n\n그날 밤에도 저택에서는 평소와 다르지 않은 만찬이 준비되고 있었다.\n\n사람들은 각자의 이유로 저택 곳곳을 오갔다.\n\n응접실에서 이야기를 나누는 사람.\n\n서재에서 오래된 서류를 살펴보는 사람.\n\n주방에서 음식을 준비하는 사람.\n\n온실에서 식물을 돌보는 사람.\n\n와인 저장고에서 술을 고르는 사람.\n\n그리고 다른 사람들이 보지 못하는 곳에서 자신만의 일을 처리하는 사람.\n\n누구도 그날 밤이 마지막이 될 것이라고 생각하지 않았다.\n\n그러나 어느 순간,\n\n저택 안에서 한 사람이 살해당했다.\n\n처음에는 사고라고 생각했다.\n\n하지만 현장을 살펴본 사람들은 곧 이것이 사고가 아니라는 사실을 깨달았다.\n\n누군가 의도적으로 한 사람의 목숨을 빼앗았다.\n\n문제는 저택 안에 있던 사람들이 모두 서로 다른 이야기를 하고 있다는 것이었다.\n\n\"나는 그 시간에 그곳에 없었어.\"\n\n\"그 사람을 본 적 없어.\"\n\n\"나는 계속 이 방에 있었어.\"\n\n\"그 물건은 처음부터 거기에 있었어.\"\n\n이상한 점은 한두 가지가 아니었다.\n\n누군가의 증언과 실제 물건의 위치가 맞지 않았고,\n\n서로의 기억도 조금씩 어긋나 있었다.\n\n하지만 모든 거짓말이 살인을 숨기기 위한 것은 아니었다.\n\n누군가는 자신의 비밀을 숨기기 위해 거짓말하고,\n\n누군가는 다른 사람에게 들키고 싶지 않은 행동을 감추기 위해 거짓말한다.\n\n그리고 단 한 명은 살인을 저질렀기 때문에 반드시 진실을 숨겨야 한다.\n\n저택에 모인 사람들 가운데 누가 범인인지 아무도 알지 못한다.\n\n범인은 자신의 행동을 숨기려 할 것이고,\n\n다른 사람들은 자신의 알리바이를 증명하면서 동시에 서로의 말을 의심해야 한다.\n\n저택 곳곳에 남겨진 물건.\n\n서로 엇갈리는 증언.\n\n누군가가 기억하지 못하는 몇 분의 시간.\n\n그리고 아무렇지 않게 지나쳤던 사소한 행동 하나.\n\n모든 것이 단서가 될 수 있다.\n\n이제 여러분에게 주어진 것은 하나의 저택과,\n\n그곳에 있었던 사람들의 기억뿐이다.\n\n진실을 찾아라.\n\n거짓말을 찾아라.\n\n그리고 살인자를 찾아라."},
    map_places: {
        type:[{
            place_id: {type:String},
            place_name:{type:String},
            place_action: {type:[String]}
        }],
        defualt: [
            {
                place_id:"map_GrandHall",
                place_name:"그랜드 홀",
                place_action:["주변 둘러보기","샹들리에 바라보기","계단 오르기","계단 내려오기","벽시계 확인하기","장식장 정리하기","꽃병 살펴보기","창문 열기","주변 서성이기","겉옷 입기"]
            },{
                place_id:"map_ReceptionRoom",
                place_name:"응접실",
                place_action:["소파에 앉기","차 마시기","잡지 읽기","신문 확인하기","손님 맞이하기","창밖 바라보기","꽃병 매만지기","커튼 열기","시간 확인하기","손님 기다리기"]
            },{
                place_id:"map_Study",
                place_name:"서재",
                place_action:["계약서 읽기","회계장부 확인하기","책 읽기","서랍 정리하기","금고 확인하기","메모 작성하기","전화하기","편지 봉투 정리하기","책장 둘러보기","서류 파쇄하기"]
            },{
                place_id:"map_Hallway",
                place_name:"1층복도",
                place_action:["걸어가기","창밖보기","액자 감상하기","화분 옮기기","바닥 청소하기","창문 열기","조명 켜기","카펫 정리하기","머뭇거리며 서성이기","창틀 먼지 쓸기"]
            },{
                place_id:"map_DiningRoom",
                place_name: "식당",
                place_action:["식사하기","디저트먹기","밥상뒤엎기","식탁 닦기","와인 따르기","물 마시기","식기 가져오기","냅킨 정리하기","촛불 켜기","그릇 치우기"]
            },{
                place_id:"map_Kitchen",
                place_name:"주방",
                place_action:["커피 내리기","물 마시기","요리하기","냉장고 열기","컵 씻기","접시 정리하기","칼 꺼내기","음식 데우기","쓰레기 버리기","야식 훔치기"]
            },{
                place_id:"map_Greenhouse",
                place_name:"온실",
                place_action:["딸기 뜯어먹기","김사과씨 찾기","가지치기","비료 확인하기","원예가위 사용하기","온도 조절하기","삽 정리하기","식물 관찰하기","꽃 손질하기","벌레 잡기"]
            },{
                place_id:"map_Ballroom",
                place_name:"무도회장",
                place_action:["피아노 연주하기","피아노 조율하기","와인 마시기","춤 연습하기","장식품 정리하기","무대 둘러보기","거울 보기","디저트 챙기기","의자 옮기기","드레스/의복 입어보기"]
            },{
                place_id:"map_BiliardRoom",
                place_name:"당구실",
                place_action:["당구치기","당구공 정리하기","큐 정리하기","바 테이블 이용하기","음료 마시기","점수 기록하기","카드놀이 하기","음악 듣기","자... 게임을 시작하지 외치기","점수 사기치기"]
            },{
                place_id:"map_MasterBedroom",
                place_name:"안방",
                place_action:["침대 정리하기","이불 빨래하기","옷 갈아입기","옷장 열기","화장하기","거울 보기","협탁 서랍 열기","휴식하기","침대에 앉기","XX (※본 게임은 19세 이상 사용자들의 플레이를 권장합니다.)"]
            },{
                place_id:"map_GuestRoom",
                place_name:"손님방",
                place_action:["짐 정리하기","여행가방 열기","옷 갈아입기","침대 정리하기","누워서 휴식하기","책 읽기","휴대폰 충전하기","메모 작성하기","쉬기","배개 정리하기"]
            },{
                place_id:"map_WineCellar",
                place_name:"와인저장고",
                place_action:["와인 고르기","와인병 꺼내기","와인 테이스팅하기","디캔터 사용하기","와인잔 가져가기","선반 정리하기","병 닦기","라벨 확인하기","상자 옮기기","문 잠그기"]
            },
        ]
    },
    roles:{
        type:[{
            role_id:{type:String},
            role_name:{type:String},
            role_motiv:{type:String}
        }],
        default:[
            {
                role_id: "role_char00",
                role_name:"김사과(AI 수업 참여중인 학원생)",
                role_motiv:"집가고 싶지만 집에 가지 못한다"
            },{
                role_id: "role_char01",
                role_name:"윤서진(유산 관리 변호사)",
                role_motiv:"유언장 위조 의혹이 공개되면 변호사 자격과 명성을 잃는다"
            },{
                role_id: "role_char02",
                role_name:"한도윤(가정의)",
                role_motiv:"피해자가 불법 처방과 진료 기록 조작을 폭로하려 했다."
            },{
                role_id: "role_char03",
                role_name:"박정원(수석 정원사)",
                role_motiv:"피해자가 횡령 의혹을 이유로 해고와 고발을 예고했다."
            },{
                role_id: "role_char04",
                role_name:"최유진(저택 집사)",
                role_motiv:"저택 관리비 유용 사실을 피해자가 알아냈다."
            },{
                role_id: "role_char05",
                role_name:"강민석(가문 재무담당)",
                role_motiv:"비자금 장부를 숨기지 못하면 형사 책임을 질 상황이었다"
            },{
                role_id: "role_char06",
                role_name:"오세라(예술품 감정사)",
                role_motiv:"위작을 진품으로 감정한 사실을 피해자가 공개하려 했다."
            },{
                role_id: "role_char07",
                role_name:"이준호(피해자의 조카)",
                role_motiv:"상속 대상에서 제외될 가능성을 통보받았다."
            },{
                role_id: "role_char08",
                role_name:"김하진(피해자 비서)",
                role_motiv:"기밀 문서 유출 사실이 드러나면 모든 책임을 떠안을 처지였다"
            },{
                role_id: "role_char09",
                role_name:"문태성(경호 책임자)",
                role_motiv:"보안 공백과 금품 수수 사실을 피해자가 해고 사유로 삼았다."
            },{
                role_id: "role_char10",
                role_name:"차은별(피아니스트)",
                role_motiv:"피해자가 후원 중단과 과거 계약 위반 공개를 통보했다."
            },{
                role_id: "role_char11",
                role_name:"서지훈(가문 기록관리인)",
                role_motiv:"가문 기록을 조작해 금품을 받은 사실이 들킬 위기였다."
            },{
                role_id: "role_char12",
                role_name:"백승현(와인 수입업자)",
                role_motiv:"납품 사기와 가짜 빈티지 거래를 피해자가 고발하려 했다."
            },{
                role_id: "role_char13",
                role_name:"정수빈(전속 셰프)",
                role_motiv:"식자재 리베이트와 장부 누락을 피해자가 확인했다."
            },{
                role_id: "role_char14",
                role_name:"임도현(저택 보수 건축가)",
                role_motiv:"부실 공사와 공사비 과다 청구 자료를 피해자가 확보했다."
            },{
                role_id: "role_char15",
                role_name:"홍예린(탐사 기자)",
                role_motiv:"취재원을 보호하려다 불법 녹음과 협박에 연루되었다."
            },{
                role_id: "role_char16",
                role_name:"남기훈(골동품상)",
                role_motiv:"도난품을 저택에 판매한 사실을 피해자가 되돌려 받으려 했다."
            },{
                role_id: "role_char17",
                role_name:"송미라(가정부)",
                role_motiv:"피해자가 가족의 채무를 빌미로 고용을 끝내려 했다."
            },{
                role_id: "role_char18",
                role_name:"배현우(전속 운전기사)",
                role_motiv:"차량을 사적으로 사용하고 운행 기록을 조작한 사실이 발각되었다."
            },{
                role_id: "role_char19",
                role_name:"조아라(재단 이사)",
                role_motiv:"재단 자금의 사적 유용을 피해자가 이사회에 보고하려 했다."
            },{
                role_id: "role_char20",
                role_name:"류시아(사진작가)",
                role_motiv:"비공개 사진을 판매한 사실과 현상 약품 관리 문제가 드러날 위기였다."
            }
        ]
    },
    items:{
        type:[{
            item_id:{type:String},
            item_name:{type:String},
            item_feature:{type:String},
            item_location:{type:String}
        }],
        default:[
            {
                item_id:"item_tool01",
                item_name:"은제 편지칼",
                item_featrue:"sharp",
                item_location:"map_Study"
            },{
                item_id:"item_tool02",
                item_name:"황동 촛대",
                item_featrue:"blunt",
                item_location:"map_DiningRoom"
            },{
                item_id:"item_tool03",
                item_name:"크리스탈 디캔터",
                item_featrue:"blunt",
                item_location:"map_WineCellar"
            },{
                item_id:"item_tool04",
                item_name:"조각용 망치",
                item_featrue:"blunt",
                item_location:"map_GuestRoom"
            },{
                item_id:"item_tool05",
                item_name:"정원용 전지가위",
                item_featrue:"sharp",
                item_location:"map_Greenhouse"
            },{
                item_id:"item_tool06",
                item_name:"셰프 나이프",
                item_featrue:"sharp",
                item_location:"map_Kitchen"
            },{
                item_id:"item_tool07",
                item_name:"고농도 수면제",
                item_featrue:"poison",
                item_location:"map_GuestRoom"
            },{
                item_id:"ite_tool08",
                item_name:"의료용 주사기",
                item_featrue:"poison",
                item_location:"map_GuestRoom"
            },{
                item_id:"item_tool09",
                item_name:"실크 커튼끈",
                item_featrue:"asphyxia",
                item_location:"map_GrandHall"
            },{
                item_id:"item_tool10",
                item_name:"피아노 와이어",
                item_featrue:"asphyxia",
                item_location:"map_Ballroom"
            },{
                item_id:"item_tool11",
                item_name:"청동 말 조각상",
                item_featrue:"blunt",
                item_location:"map_ReceptionRoom"
            },{
                item_id:"item_tool12",
                item_name:"독성 원예 약품",
                item_featrue:"poison",
                item_location:"map_Greenhouse"
            },{
                item_id:"item_tool13",
                item_name:"대리선 문진",
                item_featrue:"blunt",
                item_location:"map_Study"
            },{
                item_id:"item_tool14",
                item_name:"사냥용 단검",
                item_featrue:"sharp",
                item_location:"map_MasterBedroom"
            },{
                item_id:"item_tool15",
                item_name:"와인 코르크스크루",
                item_featrue:"sharp",
                item_location:"map_WineCellar"
            },{
                item_id:"item_tool16",
                item_name:"장식 지팡이 칼",
                item_featrue:"sharp",
                item_location:"map_ReceptionRoom"
            },{
                item_id:"item_tool17",
                item_name:"유리 재떨이",
                item_featrue:"blunt",
                item_location:"map_BiliardRoom"
            },{
                item_id:"item_tool18",
                item_name:"사진 현상액",
                item_featrue:"poison",
                item_location:"map_GuestRoom"
            },{
                item_id:"item_tool19",
                item_name:"가죽 허리띠",
                item_featrue:"asphyxia",
                item_location:"map_GuestRoom"
            },{
                item_id:"item_tool20",
                item_name:"전기 연장 코드",
                item_featrue:"asphyxia",
                item_location:"map_Hallway"
            },
        ]
    }
})

const Map = mongoose.model("Map", MapSchema)
export default Map