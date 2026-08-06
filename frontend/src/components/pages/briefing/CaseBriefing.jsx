// 사건 브리핑 화면
import "./brief.css"
import CaseInfo from "./CaseInfo"
import LocationMap from "./LocationMap"

function CaseBriefing({ game }) {
    const crimeInfo = game?.caseProfile

    if (!crimeInfo) {
        return <div>불러오는 중...</div>
    }

    return (
        <div className="case-briefing">
            {/* 사건 브리핑 화면 */}
            <CaseInfo crimeInfo={crimeInfo} />
            <div className="right-panel">
                <LocationMap />

                <div className="briefing-footer">
                    <button className="next-btn">
                        다음 역할 확인 →
                    </button>
                </div>
            </div>
        </div >
    )
}

export default CaseBriefing