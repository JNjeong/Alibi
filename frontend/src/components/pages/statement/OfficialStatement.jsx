/**
 * OfficialStatement.jsx
 * -----------------------------------------------------------------------------
 * 역할
 * - 현재 라운드 규칙과 공개 힌트를 보여주고 공식 진술 한 건을 받습니다.
 * - 실제 저장 함수는 GameContext의 onSubmit 하나만 사용합니다.
 */

import "./statement.css"
import GamePageHeader from "../../common/GamePageHeader"
import StatementForm from "./StatementForm"
import StatementSidebar from "./StatementSidebar"

function OfficialStatement({
    game,
    submissionStatus,
    onSubmit,
}) {
    return (
        <section className="game-subpage official-statement-page">
            <GamePageHeader
                eyebrow="OFFICIAL STATEMENT"
                title="공식 진술"
                description="시간·장소·동행·도구를 구조화해 제출합니다. 제출된 내용은 모든 참가자에게 공개되고 모순 검사에 사용됩니다."
            >
                <span className="game-page-badge is-gold">ROUND {game.currentRound}</span>
                <span className={`game-page-badge ${game.stage === "statement" ? "is-live" : ""}`}>
                    {game.stageLabel}
                </span>
            </GamePageHeader>

            <div className="statement-workspace">
                <StatementSidebar
                    game={game}
                    submissionStatus={submissionStatus}
                />
                <StatementForm game={game} onSubmit={onSubmit} />
            </div>
        </section>
    )
}

export default OfficialStatement
