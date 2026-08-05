// 사건 브리핑 화면 왼쪽
import "./brief.css"

function CaseInfo({ crimeInfo }) {
    return (
        <aside className="case-info">
            <h2 className="case-title">{crimeInfo.title}</h2>

            <div className="case-card">
                <h3>사건 개요</h3>
                <p>
                    피해자: {crimeInfo.victimName}
                    {crimeInfo.victimAge && ` (${crimeInfo.victimAge}세)`}
                </p>

                <p>
                    직업: {crimeInfo.victimOccupation}
                </p>

                <p>
                    발견 시각: {crimeInfo.discoveredAt}
                </p>

                <p>
                    사인: {crimeInfo.causeOfDeath}
                </p>

                <p>
                    {crimeInfo.victimDescription}
                </p>
            </div>

            <div className="objective">
                <h3 className="objective-title">최종 목표</h3>
                <ul className="objective-text">
                    <li>범인</li>
                    <li>범행 시각</li>
                    <li>범행 장소</li>
                    <li>범행 도구</li>
                </ul>
            </div>
        </aside>
    )
}

export default CaseInfo