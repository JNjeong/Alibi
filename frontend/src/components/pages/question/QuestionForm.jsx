/**
 * 공식 질문을 PRESENCE/WITNESS/ITEM_POSSESSION 세 원자형 JSON 중 하나로 만듭니다.
 * YES/NO 한 번으로 답할 수 있어야 모순 검사가 결정적으로 동작합니다.
 */

import { useEffect, useState } from "react"
import "./question.css"

const EMPTY = {
    questionType: "PRESENCE",
    timeId: "",
    placeId: "",
    subjectPlayerId: "",
    itemId: "",
}

function QuestionForm({ game, selectedPlayer, onSubmit }) {
    const [form, setForm] = useState(EMPTY)
    const [submitting, setSubmitting] = useState(false)
    const [message, setMessage] = useState("")
    const questionCount = game.viewer.questionCount || 0
    const maxQuestions = game.rules.maxQuestionsPerPlayer || 5
    const canSubmitNow = game.stage === "question"
    const alreadySubmittedThisRound = Boolean(
        game.submissionStatus?.players?.find(
            player => player.userId === game.viewer.userId
        )?.questionSubmitted
    )
    const targetQuestionCount =
        game.submissionStatus?.targetQuestionCounts?.[selectedPlayer?.userId] || 0
    const maxTargetQuestions =
        game.submissionStatus?.maxQuestionsPerTargetPerRound || 2
    const targetLimitReached = targetQuestionCount >= maxTargetQuestions
    const selectedTime = game.rules.timeSlots.find(slot => slot.id === form.timeId)
    const witnessCandidates = game.players.filter(
        player => player.userId !== selectedPlayer?.userId
    )

    useEffect(() => {
        setMessage("")
    }, [selectedPlayer?.userId])

    const update = (key, value) => {
        setForm(previous => ({ ...previous, [key]: value }))
    }
    const isValid = Boolean(
        selectedPlayer &&
        selectedTime &&
        (form.questionType === "ITEM_POSSESSION"
            ? form.itemId
            : form.questionType === "WITNESS"
                ? form.subjectPlayerId
                : form.placeId)
    )

    const handleSubmit = async (event) => {
        event.preventDefault()
        if (
            !isValid ||
            submitting ||
            questionCount >= maxQuestions ||
            alreadySubmittedThisRound ||
            !canSubmitNow ||
            targetLimitReached
        ) return

        const payload = {
            questionType: form.questionType,
            targetPlayerId: selectedPlayer.userId,
            time: selectedTime.time,
            section: selectedTime.section,
            ...(form.questionType === "ITEM_POSSESSION"
                ? { itemId: form.itemId }
                : form.questionType === "WITNESS"
                    ? { subjectPlayerId: form.subjectPlayerId }
                    : { placeId: form.placeId }),
        }

        try {
            setSubmitting(true)
            setMessage("")
            await onSubmit(payload)
            setMessage("공식 질문을 전송했습니다. 대상자의 답변을 기다려주세요.")
        } catch (error) {
            setMessage(error.response?.data?.message || "공식 질문을 보내지 못했습니다.")
        } finally {
            setSubmitting(false)
        }
    }

    if (!selectedPlayer) return null

    return (
        <section className="question-form">
            <div className="subpage-card-heading">
                <div>
                    <span className="section-label">QUESTION BUILD</span>
                    <h2 className="question-title">공식 질문 작성</h2>
                </div>
                <span className={`question-form-state ${canSubmitNow ? "is-open" : ""}`}>
                    {canSubmitNow ? "작성 가능" : "작성 잠김"}
                </span>
            </div>
            {!canSubmitNow && (
                <div className="form-stage-notice">
                    <strong>현재는 {game.stageLabel} 단계입니다.</strong>
                    <span>공식 질문 단계가 시작되면 질문을 보낼 수 있습니다.</span>
                </div>
            )}
            {targetLimitReached && <p className="form-limit-alert">이 참가자는 이번 라운드 질문 제한에 도달했습니다.</p>}
            {alreadySubmittedThisRound && <p className="form-limit-alert">이번 라운드의 공식 질문을 제출했습니다. 다른 참가자의 제출을 기다려주세요.</p>}

            <form className="question-card" onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>질문 대상</label>
                    <div className="selected-player">
                        <div className="player-avatar">{selectedPlayer.nickname[0]}</div>
                        <span>{selectedPlayer.nickname}</span>
                    </div>
                </div>

                <div className="form-group">
                    <label>질문 유형</label>
                    <div className="type-list">
                        {[
                            ["PRESENCE", "장소 확인"],
                            ["WITNESS", "동행 확인"],
                            ["ITEM_POSSESSION", "도구 소지"],
                        ].map(([value, label]) => (
                            <button
                                type="button"
                                key={value}
                                className={`type-btn ${form.questionType === value ? "active" : ""}`}
                                onClick={() => update("questionType", value)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="form-group">
                    <label>시간</label>
                    <select value={form.timeId} onChange={event => update("timeId", event.target.value)}>
                        <option value="">선택</option>
                        {game.rules.timeSlots.map(slot => <option key={slot.id} value={slot.id}>{slot.label}</option>)}
                    </select>
                </div>

                {form.questionType === "PRESENCE" && (
                    <div className="form-group">
                        <label>장소</label>
                        <select value={form.placeId} onChange={event => update("placeId", event.target.value)}>
                            <option value="">선택</option>
                            {game.places.map(place => <option key={place.id} value={place.id}>{place.name}</option>)}
                        </select>
                    </div>
                )}

                {form.questionType === "WITNESS" && (
                    <div className="form-group">
                        <label>함께 있었는지 확인할 사람</label>
                        <select value={form.subjectPlayerId} onChange={event => update("subjectPlayerId", event.target.value)}>
                            <option value="">선택</option>
                            {witnessCandidates.map(player => <option key={player.userId} value={player.userId}>{player.nickname}</option>)}
                        </select>
                    </div>
                )}

                {form.questionType === "ITEM_POSSESSION" && (
                    <div className="form-group">
                        <label>도구</label>
                        <select value={form.itemId} onChange={event => update("itemId", event.target.value)}>
                            <option value="">선택</option>
                            {game.toolPool.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </select>
                    </div>
                )}

                {message && <p className="form-response-message" role="status">{message}</p>}
                <button className="submit-question" type="submit" disabled={!isValid || submitting || questionCount >= maxQuestions || alreadySubmittedThisRound || !canSubmitNow || targetLimitReached}>
                    {questionCount >= maxQuestions
                        ? `질문 ${maxQuestions}회 사용 완료`
                        : alreadySubmittedThisRound
                            ? "이번 라운드 제출 완료"
                            : targetLimitReached
                                ? "대상 질문 제한 도달"
                                : !canSubmitNow
                                    ? "질문 시간 아님"
                                    : submitting
                                        ? "전송 중..."
                                        : "질문 보내기"}
                </button>
            </form>
        </section>
    )
}

export default QuestionForm
