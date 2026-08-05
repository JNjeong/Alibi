// 사건 브리핑 화면
import "./brief.css"
import { useEffect, useState } from "react"
import { getGame } from "../../../api"
import CaseInfo from "./CaseInfo"
import LocationMap from "./LocationMap"

function CaseBriefing() {
    const [crimeInfo, setCrimeInfo] = useState(null)

    useEffect(() => {
        const loadGame = async () => {
            try {
                const data = await getGame("test123")
                // test123 / gameId를 context나 URL 파라미터로 받아오도록 수정
                setCrimeInfo(data.game.CaseBriefing)
            }
            catch (err) {
                console.error(err)
            }
        }

        loadGame()
    }, [])

    if (!crimeInfo)
        return <div>불러오는 중...</div>

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