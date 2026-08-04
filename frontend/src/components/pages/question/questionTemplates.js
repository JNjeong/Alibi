import mockGame from "../../../data/mockgame"

const times = mockGame.timeSlots.map(t => t.label)
const places = mockGame.places.map(p => p.name)
const players = mockGame.characterPool.map(c => c.name)
const items = mockGame.toolPool.map(t => t.name)

export const questionTemplates = {
    place: {
        id: "place",
        title: "시각 장소 확인",
        fields: [
            {
                type: "time",
                options: times
            },
            {
                type: "place",
                options: places
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
                options: times
            },
            {
                type: "player",
                options: players
            }
        ],
        template: "당신은 {0}에 {1}와 함께 있었습니까?"
    },

    possess: {
        id: "possess",
        title: "도구 직접 소지",
        fields: [
            {
                type: "time",
                options: times
            },
            {
                type: "item",
                options: items
            }
        ],
        template: "당신은 {0}에 {1}을(를) 직접 소지하고 있었습니까?"
    }
}