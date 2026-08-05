// 사건 브리핑 화면 오른쪽
import "./brief.css"
import mockGame from "../../../data/mockgame"

function LocationMap() {
    const rooms = mockGame.places

    return (
        <section className="location-map">
            <h2 className="map-title">저택 지도</h2>

            <div className="map-grid">
                {rooms.map((room) => (
                    <div
                        className={`room-card ${room.crimeScene ? "crime-room" : ""}`}
                        key={room.id}
                    >
                        <span>{room.name}</span>
                    </div>
                ))}
            </div>
        </section>
    )
}

export default LocationMap