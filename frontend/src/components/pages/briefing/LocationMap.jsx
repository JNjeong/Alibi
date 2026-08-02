// 사건 브리핑 화면 오른쪽
import "./brief.css";


const rooms = [
    "서재", "복도", "침실", "다락",
    "거실", "계단", "욕실", "발코니",
    "식당", "주방", "창고", "정원"

]

function LocationMap() {
    return (
        <section className="location-map">
            <h2 className="map-title">저택 지도</h2>

            <div className="map-grid">
                {rooms.map((room) => (
                    <div className="room-card" key={room}>
                        <span>{room}</span>
                    </div>
                ))}
            </div>

        </section>

    )
}

export default LocationMap;