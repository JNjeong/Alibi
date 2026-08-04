import { useState } from "react"
import "./statement.css"
import StatementBlock from "./StatementBlock"

function StatementForm() {
    const [statements, setStatements] = useState([
        {
            id: 1,
            start: "",
            end: "",
            place: "",
            companion: "",
            tool: "",
            memo: ""
        }
    ])

    const handleChange = (id, field, value) => {
        setStatements(
            statements.map(statement =>
                statement.id === id
                    ? { ...statement, [field]: value }
                    : statement
            )
        )
    }

    const handleSubmit = () => {
        if (!validation.submit) return

        alert("공식 진술이 제출되었습니다.")
    }

    const addStatement = () => {
        if (statements.length >= 6) return
        setStatements([
            ...statements,
            {
                id: Date.now(),
                start: "",
                end: "",
                place: "",
                companion: "",
                tool: "",
                memo: ""
            }
        ])
    }

    const deleteStatement = (id) => {
        setStatements(
            statements.filter(statement => statement.id !== id)
        )
    }

    // 알리바이 진술 검증
    const validation = {
        required: statements.every(statement =>
            statement.start &&
            statement.end &&
            statement.place
        ),

        timeOrder: statements.every(statement =>
            statement.start < statement.end
        ),

        overlap: !statements.some((current, index) =>
            statements.some((next, nextIndex) =>
                index !== nextIndex &&
                current.start < next.end &&
                current.end > next.start
            )
        ),

        submit: false
    }

    validation.submit =
        validation.required &&
        validation.timeOrder &&
        validation.overlap

    return (
        <section className="statement-form">
            <div className="statement-header">
                <div>
                    <span className="section-label">
                        STRUCTURED STATEMENT
                    </span>

                    <h2 className="section-title">
                        공식 알리바이 진술
                    </h2>

                    <p className="statement-desc">
                        해당 구간의 행적을 진술 형태로 작성해주세요.
                    </p>
                </div>

                <div className="statement-status">
                    <span
                        className={`status ${validation.submit
                            ? "success" : "error"}`}
                    >
                        {validation.submit
                            ? "구간 검증 통과"
                            : "입력 확인 필요"}
                    </span>

                    <span className="progress">
                        {statements.length} / 6
                    </span>
                </div>
            </div>

            <div className="statement-list">
                {statements.map((statement, index) => (
                    <StatementBlock
                        key={statement.id}
                        index={index}
                        statement={statement}
                        onChange={handleChange}
                        onDelete={deleteStatement}
                    />
                ))}
            </div>

            <button
                className="add-statement-btn"
                onClick={addStatement}
            >
                + 행적 블록 추가
            </button>

            <div className="statement-actions">
                {/* <button className="save-btn">
                    임시 저장
                </button> */}

                <button
                    className="submit-btn"
                    onClick={handleSubmit}
                    disabled={!validation.submit}
                >
                    공식 진술 제출
                </button>
            </div>
        </section>
    )
}

export default StatementForm