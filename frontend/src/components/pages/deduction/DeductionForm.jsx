import "./deduction.css"
import { useState } from "react";
import DeductionSelect from "./DeductionSelect"
import mockGame from "../../../data/mockgame"

// mock
const suspects = mockGame.characterPool.map(
    suspect => suspect.name
)
const times = mockGame.timeSlots.map(
    time => time.label
)
const places = mockGame.places.map(
    place => place.name
)
const weapons = mockGame.toolPool.map(
    tool => tool.name
)


function DeductionForm({ onTabChange }) {
    const [deduction, setDeduction] = useState({
        suspect: "",
        time: "",
        place: "",
        weapon: ""
    })

    // 제출하면 수정 불가
    const [submitted, setSubmitted] = useState(false)

    const isValid = // 제출 가능?
        deduction.suspect &&
        deduction.time &&
        deduction.place &&
        deduction.weapon

    const handleChange = (key, value) =>
        setDeduction(prev => ({
            ...prev,
            [key]: value
        }))

    const handleSubmit = () => {
        if (!isValid) return
        setSubmitted(true)
        alert("최종 추리가 제출되었습니다.")
    }

    return (
        <section className="deduction-form">
            <div className="deduction-header">
                <span className="section-label">
                    FINAL ACCUSATION
                </span>
                <h1>
                    당신의 최종 추리
                </h1>
                <p>
                    4가지를 모두 맞히면 완전 해결 달성으로 개인 기록에 저장됩니다.
                </p>
            </div>

            <div className="deduction-grid">
                <DeductionSelect
                    number="01"
                    title="범인"
                    value={deduction.suspect}
                    options={suspects}
                    disabled={submitted}
                    onChange={(value) =>
                        handleChange("suspect", value)
                    }
                />

                <DeductionSelect
                    number="02"
                    title="범행 시간"
                    value={deduction.time}
                    options={times}
                    disabled={submitted}
                    onChange={(value) =>
                        handleChange("time", value)
                    }
                />

                <DeductionSelect
                    number="03"
                    title="범행 장소"
                    value={deduction.place}
                    options={places}
                    disabled={submitted}
                    onChange={(value) =>
                        handleChange("place", value)
                    }
                />

                <DeductionSelect
                    number="04"
                    title="범행 도구"
                    value={deduction.weapon}
                    options={weapons}
                    disabled={submitted}
                    onChange={(value) =>
                        handleChange("weapon", value)
                    }
                />
            </div>

            <div className="deduction-actions">
                <button
                    className="note-btn"
                    onClick={() => onTabChange("board")}
                >
                    추리 보드 다시 보기
                </button>
                <button
                    className="deduction-submit-btn"
                    disabled={!isValid || submitted}
                    onClick={handleSubmit}
                >
                    {submitted ? "제출 완료" : "최종 추리 제출"}
                </button>
            </div>
        </section>
    )
}

export default DeductionForm