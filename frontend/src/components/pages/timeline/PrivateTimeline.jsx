/**
 * PrivateTimeline.jsx
 * -----------------------------------------------------------------------------
 * 역할
 * - GameContext가 이미 받아 둔 로그인 사용자의 역할과 18개 타임라인을 표시합니다.
 * - 별도 API 호출이나 하드코딩 gameId를 사용하지 않아 새로고침 복원 흐름이 하나입니다.
 */

import RolePanel from "./RolePanel"
import TimelineBlock from "./TimelineBlock"
import "./timeline.css"

function PrivateTimeline({ game, currentPlayer }) {
    const nickname = currentPlayer?.nickname || "플레이어"
    const isKiller = Boolean(game.viewer?.isKiller)

    return (
        <section className="tab-page private-timeline-page">
            <header className="timeline-page-heading">
                <div>
                    <span className="eyebrow">PRIVATE CASE RECORD</span>
                    <h2>{nickname}님의 개인 타임라인</h2>
                    <p>서버가 생성한 실제 행적입니다. 이 정보는 본인에게만 공개됩니다.</p>
                </div>
                <div className="timeline-heading-badges" aria-label="개인 정보 상태">
                    <span className="timeline-private-badge">비공개</span>
                    <span className={`timeline-identity-badge ${isKiller ? "is-killer" : "is-citizen"}`}>
                        {isKiller ? "범인" : "일반인"}
                    </span>
                </div>
            </header>

            <div className="private-timeline-container">
                <RolePanel viewer={game.viewer} currentPlayer={currentPlayer} />
                <TimelineBlock game={game} viewer={game.viewer} />
            </div>
        </section>
    )
}

export default PrivateTimeline
