import "./deduction.css"
import { useState } from "react"
import DeductionSelect from "./DeductionSelect"

function DeductionForm({ game, onTabChange, onSubmit }) {
    const suspects = game.players.map(player => ({
        // 최종 추리에서도 로그인 닉네임을 먼저 보여주고 역할명은 괄호로 보조합니다.
        label: `${player.nickname} (${player.character.name})`,
        value: player.userId
    }))

    // 5라운드 종료 후 공개된 최종 5개 슬롯만 선택지에 표시합니다.
    const finalTimeIds = new Set(game.caseProfile.finalWindowIds || [])
    const times = (game.rules?.timeSlots ?? [])
        .filter(slot => finalTimeIds.has(slot.id))
        .map(slot => ({
        label: slot.label,
        value: slot.id,
        slot
        }))

    const finalPlaceIds = new Set(game.caseProfile.locationCandidateIds || [])
    const places = (game.places ?? [])
        .filter(place => finalPlaceIds.has(place.id))
        .map(place => ({
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

    // 제출 여부의 원본은 서버 viewer 상태입니다. 로컬 값은 요청 중 중복 클릭만 막습니다.
    const submitted = Boolean(game.viewer?.hasSubmittedDeduction)
    const [submitting, setSubmitting] = useState(false)
    const [message, setMessage] = useState("")
    const deductionOpen = game.phase === "deduction"

    const isValid = // 제출 가능?
        deductionOpen &&
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
        if (!isValid || submitted || submitting) return

        const selectedTime = times.find(
            (t) => t.value === deduction.time
        )

        const payload = {
            criminalPlayerId: deduction.suspect,
            crimeTime: selectedTime?.slot.time,
            crimeSection: selectedTime?.slot.section,
            crimePlaceId: deduction.place,
            crimeItemId: deduction.weapon,
        }

        try {
            setSubmitting(true)
            setMessage("")
            await onSubmit(payload)
            setMessage("최종 추리가 저장되었습니다. 다른 참가자의 제출을 기다립니다.")
        } catch (error) {
            setMessage(error.response?.data?.message || "최종 추리를 저장하지 못했습니다.")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <section className="deduction-form">
            <div className="deduction-header">
                <div>
                    <span className="section-label">YOUR ANSWER</span>
                    <h2>네 가지 정답 선택</h2>
                    <p>모두 맞히면 완전 해결로 개인 기록에 저장됩니다.</p>
                </div>
                <span className={`deduction-lock-state ${deductionOpen ? "is-open" : ""}`}>
                    {deductionOpen ? "제출 가능" : "5라운드 종료 후 공개"}
                </span>
                {!deductionOpen && (
                    <div className="form-stage-notice">
                        <strong>최종 추리가 아직 열리지 않았습니다.</strong>
                        <span>5라운드 모순 검사와 마지막 힌트 공개가 끝나면 자동으로 활성화됩니다.</span>
                    </div>
                )}
            </div>

            <div className="deduction-grid">
                <DeductionSelect
                    number="01"
                    title="범인"
                    value={deduction.suspect}
                    options={suspects}
                    disabled={submitted || !deductionOpen}
                    onChange={(value) =>
                        handleChange("suspect", value)
                    }
                />

                <DeductionSelect
                    number="02"
                    title="범행 시간"
                    value={deduction.time}
                    options={times}
                    disabled={submitted || !deductionOpen}
                    onChange={(value) =>
                        handleChange("time", value)
                    }
                />

                <DeductionSelect
                    number="03"
                    title="범행 장소"
                    value={deduction.place}
                    options={places}
                    disabled={submitted || !deductionOpen}
                    onChange={(value) =>
                        handleChange("place", value)
                    }
                />

                <DeductionSelect
                    number="04"
                    title="범행 도구"
                    value={deduction.weapon}
                    options={weapons}
                    disabled={submitted || !deductionOpen}
                    onChange={(value) =>
                        handleChange("weapon", value)
                    }
                />
            </div>

            <div className="deduction-actions">
                <button
                    type="button"
                    className="note-btn"
                    onClick={() => onTabChange("board")}
                >
                    추리 보드 다시 보기
                </button>
                {message && <p>{message}</p>}
                <button
                    type="button"
                    className="deduction-submit-btn"
                    disabled={!isValid || submitted || submitting}
                    onClick={handleSubmit}
                >
                    {submitted ? "제출 완료" : submitting ? "저장 중..." : "최종 추리 제출"}
                </button>
            </div>
        </section>
    )
}

export default DeductionForm
