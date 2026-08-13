// 최종 추리
import "./deduction.css"
import GamePageHeader from "../../common/GamePageHeader"
import DeductionForm from "./DeductionForm"
import SubmissionStatus from "./SubmissionStatus"

function FinalDeduction({ game, onTabChange, onSubmit }) {
    return (
        <section className="game-subpage final-deduction-page">
            <GamePageHeader
                eyebrow="FINAL ACCUSATION"
                title="최종 추리"
                description="공개된 기록과 힌트를 종합해 범인·시간·장소·도구를 선택하세요. 제출 후에는 수정할 수 없습니다."
            >
                <span className={`game-page-badge ${game.phase === "deduction" ? "is-danger" : ""}`}>
                    {game.phase === "deduction" ? "최종 제출 진행 중" : "아직 잠김"}
                </span>
            </GamePageHeader>

            <div className="final-deduction">
                <DeductionForm
                    game={game}
                    onTabChange={onTabChange}
                    onSubmit={onSubmit}
                />
                <SubmissionStatus game={game} />
            </div>
        </section>
    )
}

export default FinalDeduction
