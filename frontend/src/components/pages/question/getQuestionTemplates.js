export const getQuestionTemplates = (game) => {
    const times = (game.rules?.timeSlots ?? []).map(time => ({
        label: time.label,
        value: `${time.time}_${time.section}`,
        time: time.time,
        section: time.section
    }))

    const places = (game.places ?? []).map(place => ({
        label: place.name,
        value: place.id
    })
    )

    const players = game.players.map(
        player => ({
            label: player.nickname,
            value: player.userId
        })
    )

    const items = (game.toolPool ?? []).map(item => ({
        label: item.name,
        value: item.id
    })
    )

    return {
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
}