// 사건 브리핑 화면
import "./brief.css"
import GamePageHeader from "../../common/GamePageHeader"
import CaseInfo from "./CaseInfo"
import LocationMap from "./LocationMap"

function CaseBriefing({ game, onTabChange }) {
    const crimeInfo = game?.caseProfile

    if (!crimeInfo) {
        return <div>불러오는 중...</div>
    }

    return (
        <section className="game-subpage case-briefing">
            <GamePageHeader
                eyebrow="CASE BRIEFING"
                title={crimeInfo.title}
                description="사건의 공개 정보와 저택의 12개 장소를 먼저 확인하세요. 정답 정보는 포함되지 않습니다."
            >
                <span className="game-page-badge is-danger">살인 사건</span>
                <span className="game-page-badge">공개 정보</span>
            </GamePageHeader>

            <div className="briefing-workspace">
                <CaseInfo crimeInfo={crimeInfo} places={game.places} />
                <div className="right-panel">
                    {/* 실제 Game의 12개 장소만 사용하며 정답 장소 표시는 하지 않습니다. */}
                    <LocationMap rooms={game.places} tools={game.toolPool} />

                    <div className="briefing-footer">
                        <p>사건 정보를 확인했다면 본인에게만 공개되는 역할과 실제 행적을 확인하세요.</p>
                        <button
                            type="button"
                            className="next-btn"
                            onClick={() => onTabChange("timeline")}
                        >
                            개인 타임라인 확인
                            <span>→</span>
                        </button>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default CaseBriefing
