import "./timeline.css"

function TimelineBlock({ game, viewer }) {
    const placeColors = {
        map_ReceptionRoom: "gray",
        map_Study: "red",
        map_Greenhouse: "green",
        map_Hallway: "blue",
        map_DiningRoom: "orange",
        map_Kitchen: "green",
        map_GrandHall: "purple",
        map_Ballroom: "purple",
        map_BiliardRoom: "blue",
        map_MasterBedroom: "red",
        map_GuestRoom: "gray",
        map_WineCellar: "brown",
    }

    const timeSlots = game.rules?.timeSlots ?? []

    const timeline = timeSlots.map(slot => {
        const record = viewer?.timeline?.find(
            item => item.timeId === slot.id
        )

        if (!record) {
            return {
                id: slot.id,
                hour: slot.time,
                time: slot.label,
                empty: true
            }
        }

        const place = game.places?.find(
            p => p.id === record.placeId
        )

        const item = game.toolPool?.find(
            i => i.id === record.toolId
        )

        const companionNames = (record.companionIds || [])
            .map(id => game.players.find(player => player.userId === id)?.nickname)
            .filter(Boolean)

        return {
            id: slot.id,
            hour: slot.time,
            time: slot.label,
            empty: false,
            room: place?.name ?? "",
            color: placeColors[record.placeId] ?? "gray",
            tool: item?.name ?? "소지 도구 없음",
            hasTool: Boolean(item),
            action: record.activity || "행동 기록 없음",
            companion: companionNames.join(", ") || "동행인 없음",
            isCrime: Boolean(viewer?.isKiller && record.activity === "피해자 살인")
        }
    })

    // 18개 슬롯을 한 줄에 압축하지 않고 6개 hour 카드로 묶어 읽기 쉽게 표시합니다.
    const hourGroups = timeline.reduce((groups, item) => {
        const hourKey = String(item.hour)
        const existing = groups.find(group => group.hourKey === hourKey)

        if (existing) {
            existing.items.push(item)
        } else {
            groups.push({
                hourKey,
                label: `${String(item.hour).padStart(2, "0")}:00`,
                items: [item]
            })
        }

        return groups
    }, [])

    return (
        <section className="timeline-panel">
            <div className="timeline-title-row">
                <div>
                    <span className="section-label">YOUR TIMELINE</span>
                    <h2 className="section-title">6시간 실제 행적</h2>
                    <p className="timeline-desc">
                        {timeSlots[0]?.label} ~ {timeSlots[timeSlots.length - 1]?.label} · 총 {timeSlots.length}개 슬롯
                    </p>
                </div>
                <div className="timeline-legend">
                    <span><i className="legend-place" />장소</span>
                    <span><i className="legend-tool" />도구</span>
                    <span><i className="legend-companion" />동행</span>
                </div>
            </div>

            <div className="timeline-hour-grid">
                {hourGroups.map(group => (
                    <article className="timeline-hour-card" key={group.hourKey}>
                        <header>
                            <strong>{group.label}</strong>
                            <span>20분 단위 3개 행적</span>
                        </header>

                        <div className="timeline-event-list">
                            {group.items.map(item => (
                                <div
                                    key={item.id}
                                    className={`timeline-event ${item.color || "gray"} ${item.isCrime ? "is-crime-event" : ""}`}
                                >
                                    <time>{item.time}</time>
                                    {item.empty ? (
                                        <div className="timeline-event-main">
                                            <strong>기록 없음</strong>
                                            <p>이 시간대의 행적을 찾지 못했습니다.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="timeline-event-main">
                                                <div className="timeline-event-title">
                                                    <strong>{item.room}</strong>
                                                    {item.isCrime && <span>범행</span>}
                                                </div>
                                                <p>{item.action}</p>
                                            </div>
                                            <div className="timeline-event-meta">
                                                <span className={item.hasTool ? "has-value" : ""}>도구 · {item.tool}</span>
                                                <span>동행 · {item.companion}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </article>
                ))}
            </div>
        </section>
    )
}

export default TimelineBlock
