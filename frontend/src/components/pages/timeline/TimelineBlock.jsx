import "./timeline.css"
import EventCard from "./EventCard"
import mockGame from "../../../data/mockgame"

function TimelineBlock() {
    const me = mockGame.players.find(player => player.isMe)

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

    const slotData = mockGame.timeSlots.map(slot => {
        const timeline = me.timeline.find(
            item => item.timeId === slot.id
        )

        if (!timeline) {
            return {
                time: slot.label,
                empty: true
            }
        }

        const place = mockGame.places.find(
            p => p.id === timeline.placeId
        )

        const tool = mockGame.toolPool.find(
            t => t.id === timeline.toolId
        )

        const companion = mockGame.players.find(
            p => p.character.id === timeline.companionId
        )

        return {
            empty: false,
            time: slot.label,
            place: place?.shortName,
            color: placeColors[timeline.placeId],
            tool: tool?.name ?? "도구 X",
            companion:
                companion?.character.name ??
                "동행인 X",
        }
    })

    const timeline = []


    me.timeline.forEach(item => {
        const currentTime = mockGame.timeSlots.find(
            t => t.id === item.timeId
        )?.label

        const place = mockGame.places.find(
            p => p.id === item.placeId
        )

        const tool = mockGame.toolPool.find(
            t => t.id === item.toolId
        )

        const companion = item.companionIds
            .map(id => {
                const player = mockGame.players.find(
                    p => p.id === id
                )
                return player?.character.name
            })
            .filter(Boolean)
            .join(", ")

        const last = timeline[timeline.length - 1]

        // 같은 장소면 합치기
        if (
            last &&
            last.room === place?.shortName &&
            last.tool === (tool?.name ?? "도구 X") &&
            last.companion === (companion || "동행인 X")
        ) {
            last.length += 1
            last.end = currentTime
        }
        else {
            timeline.push({
                room: place?.shortName ?? "",
                color: placeColors[item.placeId] ?? "gray",
                tool: tool?.name ?? "도구 X",
                companion: companion || "동행인 X",
                start: currentTime,
                end: currentTime,
                length: 1,
            })
        }

        return {
            room: place?.shortName ?? "",
            color: placeColors[item.placeId] ?? "gray",
            length: 1,
        }
    })

    const events = me.timeline
        .filter(item => item.flags.length > 0)
        .map(item => {
            const place = mockGame.places.find(
                p => p.id === item.placeId
            )

            const time = mockGame.timeSlots.find(
                t => t.id === item.timeId
            )

            return {
                id: item.timeId,
                time: time?.label ?? "",
                place: place?.name ?? "",
                color: item.flags.includes("crime")
                    ? "red"
                    : "gray",
                text: item.activity,
            }
        })

    const hourLabels = mockGame.timeSlots.filter(slot =>
        slot.label.endsWith(":00")
    )

    return (
        <section className="timeline-panel">
            <span className="section-label">
                YOUR TIMELINE
            </span>
            <div className="timeline-title-row">
                <div>
                    <h2 className="section-title">
                        개인 타임라인 :  {mockGame.timeSlots[0].label} ~ {mockGame.timeSlots[mockGame.timeSlots.length - 1].label}
                    </h2>
                    <p className="timeline-desc">
                        서버에 저장된 실제 일정입니다.
                    </p>
                </div>
                <button className="secret-btn">
                    비공개
                </button>
            </div>

            <div className="timeline-scale">
                <div className="time-labels">
                    {hourLabels.map(slot => (
                        <span
                            key={slot.id}
                            style={{
                                gridColumn: `span 3`
                            }}
                        >
                            {slot.label}
                        </span>
                    ))}
                </div>

                <div className="timeline-track">
                    {timeline.map((item, index) => (
                        <div
                            key={index}
                            className={`timeline-segment ${item.color}`}
                            style={{
                                gridColumn: `span ${item.length}`
                            }}
                        >
                            <div className="timeline-room">
                                {item.room}
                            </div>
                            <div className="timeline-time">
                                {item.start} ~ {item.end}
                            </div>

                            <div className="timeline-tool">
                                {item.tool}
                            </div>

                            <div className="timeline-companion">
                                {item.companion}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <h3 className="event-title">주요 사건</h3>

            <div className="event-grid">
                {events.map((event) => (
                    <EventCard
                        key={event.id}
                        event={event}
                    />
                ))}
            </div>
        </section>
    )
}

export default TimelineBlock