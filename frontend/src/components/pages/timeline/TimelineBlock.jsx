import "./timeline.css"
import EventCard from "./EventCard"

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

    const timeSlots = game.rulesSnapshot.timeSlots

    const timeline = timeSlots.map(slot => {
        const record = viewer.timeline.find(
            item => item.timeId === slot.id
        )

        if (!record) {
            return {
                time: slot.label,
                empty: true
            }
        }

        const place = game.mapSnapshot.places.find(
            p => p.id === record.placeId
        )

        const item = game.mapSnapshot.itemsInUse.find(
            i => i.id === record.itemId
        )

        return {
            time: slot.label,
            empty: false,
            room: place?.name ?? "",
            color: placeColors[record.placeId] ?? "gray",
            tool: item?.name ?? "도구 X",
            companion:
                record.companionPlayerIds?.join(", ") ||
                "동행인 X"
        }
    })

    const hourLabels = timeSlots.filter(slot =>
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
                        개인 타임라인 :
                        {timeSlots[0].label}
                        {" ~ "}
                        {timeSlots[timeSlots.length - 1].label}                    </h2>
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
                                {item.time}
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
            {/* <h3 className="event-title">주요 사건</h3>

            <div className="event-grid">
                {events.map((event) => (
                    <EventCard
                        key={event.id}
                        event={event}
                    />
                ))}
            </div> */}
        </section>
    )
}

export default TimelineBlock