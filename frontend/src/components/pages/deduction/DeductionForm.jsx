import "./deduction.css"
import { useState } from "react"
import DeductionSelect from "./DeductionSelect"

import { createGameDeduction } from "../../../api"
import { createClientRequestId } from "../../../api"

function DeductionForm({ game, onTabChange }) {
    const suspects = game.players.map(player => ({
        label: player.character.name,
        value: player.userId
    }))

    const times = (game.rules?.timeSlots ?? []).map(slot => ({
        label: slot.label,
        value: slot.id,
        slot
    }))

    const places = (game.places ?? []).map(place => ({
        label: place.name,
        value: place.id
    }))

    const weapons = (game.toolPool ?? []).map(item => ({
        label: item.name,
        value: item.id
    }))

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

    const handleSubmit = async () => {
        if (!isValid) return

        const selectedTime = times.find(
            (t) => t.value === deduction.time
        )

        const payload = {
            criminalPlayerId: deduction.suspect,
            crimeTime: selectedTime?.slot.time,
            crimeSection: selectedTime?.slot.section,
            crimePlaceId: deduction.place,
            crimeItemId: deduction.weapon,
            clientRequestId: createClientRequestId("deduction")
        }

        await createGameDeduction(
            game.id,
            payload
        )
        setSubmitted(true)
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