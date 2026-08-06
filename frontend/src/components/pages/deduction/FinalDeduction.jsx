// 최종 추리
import "./deduction.css"
import DeductionForm from "./DeductionForm"
import SubmissionStatus from "./SubmissionStatus"

function FinalDeduction({ game, onTabChange }) {
    return (
        <div className="final-deduction">
            {/* 최종 추리 화면 */}
            <DeductionForm
                game={game}
                onTabChange={onTabChange}
            />
            <SubmissionStatus game={game} />
        </div>
    )
}

export default FinalDeduction