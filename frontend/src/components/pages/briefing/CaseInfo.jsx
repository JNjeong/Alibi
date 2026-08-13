// 사건 브리핑 화면 왼쪽
import "./brief.css"

function CaseInfo({ crimeInfo, places = [] }) {
    const discoveredPlaceName = places.find(
        place => place.id === crimeInfo.discoveredPlaceId
    )?.name || "미공개"

    return (
        <aside className="case-info">
            <div className="case-card">
                <div className="subpage-card-heading">
                    <div>
                        <span className="section-label">CASE SUMMARY</span>
                        <h2>사건 개요</h2>
                    </div>
                    <span className="case-status-dot">조사 중</span>
                </div>

                <div className="victim-summary">
                    <span aria-hidden="true">{crimeInfo.victimName?.slice(0, 1) || "?"}</span>
                    <div>
                        <small>피해자</small>
                        <strong>
                            {crimeInfo.victimName}
                            {crimeInfo.victimAge && ` · ${crimeInfo.victimAge}세`}
                        </strong>
                        <p>{crimeInfo.victimOccupation}</p>
                    </div>
                </div>

                <dl className="case-fact-list">
                    <div><dt>발견 시각</dt><dd>{crimeInfo.discoveredAt}</dd></div>
                    <div><dt>발견 장소</dt><dd>{discoveredPlaceName}</dd></div>
                    <div><dt>사인</dt><dd>{crimeInfo.causeOfDeath}</dd></div>
                </dl>

                <div className="case-description">
                    <span>사건 기록</span>
                    <p>{crimeInfo.victimDescription || "피해자와 사건 현장에 대한 추가 조사가 진행 중입니다."}</p>
                </div>
            </div>

            <div className="objective">
                <span className="section-label">FINAL OBJECTIVE</span>
                <h2 className="objective-title">최종 목표</h2>
                <p>다섯 라운드의 기록과 힌트를 조합해 네 가지 정답을 모두 찾으세요.</p>
                <ol className="objective-text">
                    {[
                        ["01", "범인"],
                        ["02", "범행 시각"],
                        ["03", "범행 장소"],
                        ["04", "범행 도구"],
                    ].map(([number, label]) => (
                        <li key={number}><span>{number}</span><strong>{label}</strong></li>
                    ))}
                </ol>
            </div>
        </aside>
    )
}

export default CaseInfo
