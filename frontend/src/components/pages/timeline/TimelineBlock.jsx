import "./timeline.css"
import EventCard from "./EventCard";

function TimelineBlock() {
    const timeline = [ // length: 타임라인바 비율
        { room: "응접실", color: "gray", length: 1 },
        { room: "서재", color: "red", length: 2 },
        { room: "온실", color: "green", length: 1 },
        { room: "서재", color: "red", length: 2 },
        { room: "복도", color: "gray", length: 1 },
        { room: "창고", color: "dark", length: 1 }
    ];

    const events = [
        {
            id: 1,
            time: "15:30 ~ 15:50",
            place: "서재",
            color: "red",
            text: "유언장 초본을 확인하고 문서를 정리했다."
        },
        {
            id: 2,
            time: "16:10 ~ 16:30",
            place: "응접실",
            color: "gray",
            text: "피해자와 대화를 나누었다."
        },
        {
            id: 3,
            time: "17:00 ~ 17:20",
            place: "온실",
            color: "green",
            text: "혼자 온실을 둘러보았다."
        },
        {
            id: 4,
            time: "18:20 ~ 18:40",
            place: "복도",
            color: "dark",
            text: "누군가와 스쳐 지나갔다."
        }
    ];

    return (
        <section className="timeline-panel">

            <span className="section-label">
                YOUR TIMELINE
            </span>

            <div className="timeline-title-row">

                <div>
                    <h2 className="section-title">
                        개인 타임라인 : 15:00~21:00
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
                    <span>15:00</span>
                    <span>16:00</span>
                    <span>17:00</span>
                    <span>18:00</span>
                    <span>19:00</span>
                    <span>20:00</span>
                    <span>21:00</span>
                </div>

                <div className="timeline-track">
                    {timeline.map((item, index) => (
                        <div
                            key={index}
                            className={`timeline-segment ${item.color}`}
                            style={{ flex: item.length }}
                        >
                            <span>{item.room}</span>
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
    );
}

export default TimelineBlock;