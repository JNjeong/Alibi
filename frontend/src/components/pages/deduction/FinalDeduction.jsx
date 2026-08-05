// 최종 추리
import "./deduction.css";
import DeductionForm from "./DeductionForm"
import SubmissionStatus from "./SubmissionStatus"

function FinalDeduction({ onTabChange }) {
    return (
        <div className="final-deduction">
            {/* 최종 추리 화면 */}
            <DeductionForm onTabChange={onTabChange} />
            <SubmissionStatus />
        </div>
    )
}

export default FinalDeduction