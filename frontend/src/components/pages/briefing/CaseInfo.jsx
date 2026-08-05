// 사건 브리핑 화면 왼쪽
import "./brief.css"

function CaseInfo() {
    return (
        <aside className="case-info">
            <h2 className="case-title">김사과 씨 살인사건</h2>

            <div className="case-card">
                <h3>사건 개요</h3>
                <p>피해자: 김사과 (22세)</p>
                <p>2026년 7월 25일 오후 9시.</p>
                <p>저택에서 피해자가 숨진 채 발견되었습니다.</p>
                <p>모든 플레이어는 용의자이며 자신의 알리바이를 가지고 있습니다.</p>
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