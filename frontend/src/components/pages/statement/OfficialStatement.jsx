// 공식 알리바이 진술

import StatementSidebar from "./StatementSidebar"
import StatementForm from "./StatementForm"
import LiveCheck from "./LiveCheck"
import "./statement.css"
import { useState } from "react"

function OfficialStatement({ game }) {
    // const [validation, setValidation] = useState({
    //     required: true,
    //     timeOrder: true,
    //     overlap: true,
    //     submit: true
    // })

    return (
        <div className="official-statement">
            <StatementSidebar />
            <StatementForm
                game={game}
                setValidation={setValidation}
            />
            <LiveCheck
            // validation={validation}
            />
        </div>
    )
}

export default OfficialStatement