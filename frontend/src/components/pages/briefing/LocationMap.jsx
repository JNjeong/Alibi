// 사건 브리핑 화면 오른쪽
import "./brief.css"

const FEATURE_LABELS = {
    sharp: "예리함 · 자상 가능",
    blunt: "둔중함 · 타격 가능",
    poison: "독성 · 중독 가능",
    asphyxia: "압박성 · 질식 가능",
}

function LocationMap({ rooms = [], tools = [] }) {
    return (
        <section className="location-map">
            <div className="subpage-card-heading">
                <div>
                    <span className="section-label">MANSION LOCATIONS</span>
                    <h2 className="map-title">저택 장소 목록</h2>
                </div>
                <span className="location-count">{rooms.length}곳</span>
            </div>

            <div className="map-grid">
                {rooms.map((room, index) => (
                    <div
                        className="room-card"
                        key={room.id}
                    >
                        <span className="room-number">{String(index + 1).padStart(2, "0")}</span>
                        <strong>{room.name}</strong>
                        <small>{room.floor || "저택 내부"}</small>
                    </div>
                ))}
            </div>

            <section className="tool-catalog" aria-labelledby="tool-catalog-title">
                <div className="subpage-card-heading">
                    <div>
                        <span className="section-label">KNOWN TOOLS</span>
                        <h2 id="tool-catalog-title" className="map-title">도구와 특징</h2>
                    </div>
                    <span className="location-count">{tools.length}개</span>
                </div>

                <p className="tool-catalog-guide">
                    아래 목록은 사건 시작부터 공개되는 도구 정보입니다. 3라운드 특징 힌트와 비교해 범행 도구 후보를 좁히세요.
                </p>

                <div className="tool-grid">
                    {tools.map((tool) => {
                        const locationName = rooms.find(
                            room => room.id === tool.defaultLocationId
                        )?.name || "위치 미상"

                        return (
                            <article className="tool-card" key={tool.id}>
                                <strong>{tool.name}</strong>
                                <span>{FEATURE_LABELS[tool.category] || tool.category || "특징 미상"}</span>
                                <small>기본 위치 · {locationName}</small>
                            </article>
                        )
                    })}
                </div>
            </section>
        </section>
    )
}

export default LocationMap
