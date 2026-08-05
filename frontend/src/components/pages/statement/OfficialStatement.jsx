// 공식 알리바이 진술
import StatementSidebar from "./StatementSidebar"
import StatementForm from "./StatementForm"
import LiveCheck from "./LiveCheck"
import "./statement.css";

function OfficialStatement() {
    const validation = {
        required: true,
        timeOrder: true,
        overlap: true,
        submit: true
    }
    // const validation = {
    //     required,
    //     timeOrder,
    //     overlap,
    //     submit: required && timeOrder && overlap
    // }
    return (
        <div className="official-statement">
            <StatementSidebar />
            <StatementForm />
            <LiveCheck validation={validation} />
        </div>
    )
}

export default OfficialStatement