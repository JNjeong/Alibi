export const questionTemplates = {
    place: {
        id: "place",
        title: "시각 장소 확인",
        fields: [
            {
                type: "time",
                options: ["17:00", "17:20", "17:40", "18:00", "18:20", "18:40"]
            },
            {
                type: "place",
                options: ["거실", "주방", "서재", "현관", "복도", "정원"]
            }
        ],
        template: "당신은 {0}에 {1}에 있었습니까?"
    },

    companion: {
        id: "companion",
        title: "시각 동행 확인",
        fields: [
            {
                type: "time",
                options: ["17:00", "17:20", "17:40", "18:00", "18:20", "18:40"]
            },
            {
                type: "player",
                options: ["한도윤", "박정민", "최유진", "김태현"]
            }
        ],
        template: "당신은 {0}에 {1}와 함께 있었습니까?"
    },

    admit: {
        id: "admit",
        title: "동행 인정 여부",
        fields: [
            {
                type: "player",
                options: ["한도윤", "박정민", "최유진"]
            }
        ],
        template: "당신은 {0}와 동행한 사실을 인정합니까?"
    },

    witness: {
        id: "witness",
        title: "도구 목격 여부",
        fields: [
            {
                type: "time",
                options: ["17:00", "17:20", "17:40", "18:00", "18:20", "18:40"]
            },
            {
                type: "item",
                options: ["칼", "휴대폰", "열쇠", "망치"]
            }
        ],
        template: "당신은 {0}에 {1}을(를) 목격했습니까?"
    },

    possess: {
        id: "possess",
        title: "도구 직접 소지",
        fields: [
            {
                type: "item",
                options: ["칼", "휴대폰", "열쇠", "망치"]
            }
        ],
        template: "당신은 {0}을(를) 직접 소지하고 있었습니까?"
    },

    keep: {
        id: "keep",
        title: "이전 주장 유지",
        fields: [],
        template: "당신은 이전 공식 주장을 유지합니까?"
    }
};