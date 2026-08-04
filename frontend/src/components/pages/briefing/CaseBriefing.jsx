// 사건 브리핑 화면
import "./brief.css";
import CaseInfo from "./CaseInfo"
import LocationMap from "./LocationMap"

function CaseBriefing() {
    return (
        <div className="case-briefing">
            {/* 사건 브리핑 화면 */}
            <CaseInfo />
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