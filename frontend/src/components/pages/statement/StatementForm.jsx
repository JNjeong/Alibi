/**
 * 현재 라운드의 공식 진술 한 건을 구조화된 JSON으로 만듭니다.
 * 자유 문장만 보내지 않고 시간·장소·도구를 ID로 보내야 서버가 모순을 검사할 수 있습니다.
 */

import { useEffect, useMemo, useState } from "react"
import "./statement.css"

const EMPTY_FORM = {
    timeId: "",
    placeId: "",
    companionPlayerId: "",
    itemId: "",
    action: "",
}

function StatementForm({ game, onSubmit }) {
    const [form, setForm] = useState(EMPTY_FORM)
    const [submitting, setSubmitting] = useState(false)
    const [message, setMessage] = useState("")
    const round = game.rounds.find(item => item.number === game.currentRound)
    const isItemRound = round?.requiredStatementType === "ITEM_POSSESSION"
    const alreadySubmitted = Boolean(game.viewer?.hasSubmittedStatement)
    const canSubmitNow = game.stage === "statement"
    const appliedHint = game.hints.find(
        hint => hint.appliesToRound === game.currentRound && hint.status === "revealed"
    )

    // 새 라운드가 시작되면 이전 입력만 초기화합니다. 서버 제출 기록은 그대로 유지됩니다.
    useEffect(() => {
        setForm(EMPTY_FORM)
        setMessage("")
    }, [game.currentRound])

    const availableTimes = useMemo(() => {
        if (appliedHint?.type !== "HOUR_RANGE") return game.rules.timeSlots
        const allowedIds = new Set(appliedHint.valueIds)
        return game.rules.timeSlots.filter(slot => allowedIds.has(slot.id))
    }, [appliedHint, game.rules.timeSlots])

    const availablePlaces = useMemo(() => {
        if (appliedHint?.type !== "PLACE_IDS") return game.places
        const allowedIds = new Set(appliedHint.rawValues.map(String))
        return game.places.filter(place => allowedIds.has(place.id))
    }, [appliedHint, game.places])

    const companions = game.players.filter(
        player => player.userId !== game.viewer.userId
    )
    const selectedTime = game.rules.timeSlots.find(slot => slot.id === form.timeId)
    const selectedPlace = availablePlaces.find(place => place.id === form.placeId)
    const availableActions = selectedPlace?.actions || []
    const isValid = Boolean(
        selectedTime &&
        (isItemRound ? form.itemId : form.placeId && form.action)
    )

    const update = (key, value) => {
        setForm(previous => ({ ...previous, [key]: value }))
    }

    const handleSubmit = async (event) => {
        event.preventDefault()
        if (!isValid || alreadySubmitted || submitting || !canSubmitNow) return

        const payload = {
            statementType: isItemRound ? "ITEM_POSSESSION" : "ALIBI",
            time: selectedTime.time,
            section: selectedTime.section,
            ...(isItemRound
                ? {
                    itemId: form.itemId,
                }
                : {
                    placeId: form.placeId,
                    companionPlayerIds: form.companionPlayerId
                        ? [form.companionPlayerId]
                        : [],
                    action: form.action.trim(),
                }),
        }

        try {
            setSubmitting(true)
            setMessage("")
            await onSubmit(payload)
            setMessage("공식 진술이 저장되었습니다. 전원 제출 후 자동으로 모순을 검사합니다.")
        } catch (error) {
            setMessage(error.response?.data?.message || "공식 진술을 저장하지 못했습니다.")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <section className="statement-form">
            <div className="statement-header">
                <div>
                    <span className="section-label">STRUCTURED STATEMENT</span>
                    <h2 className="section-title">{round?.title || "공식 진술"}</h2>
                    <p className="statement-desc">{round?.description}</p>
                    {appliedHint && <p className="statement-applied-hint">적용 힌트 · {appliedHint.title}</p>}
                </div>
                <div className="statement-status">
                    <span className={`status ${alreadySubmitted ? "success" : "error"}`}>
                        {alreadySubmitted ? "제출 완료" : "제출 전"}
                    </span>
                </div>
            </div>

            {!canSubmitNow && (
                <div className="form-stage-notice">
                    <strong>현재는 {game.stageLabel} 단계입니다.</strong>
                    <span>공식 진술 제출 단계가 아니므로 입력이 잠겨 있습니다.</span>
                </div>
            )}

            <form className="statement-block" onSubmit={handleSubmit}>
                <div className="statement-grid">
                    <div className="input-group">
                        <label>시간</label>
                        <select value={form.timeId} onChange={event => update("timeId", event.target.value)} disabled={alreadySubmitted || !canSubmitNow}>
                            <option value="">선택</option>
                            {availableTimes.map(slot => <option key={slot.id} value={slot.id}>{slot.label}</option>)}
                        </select>
                    </div>

                    {isItemRound ? (
                        <>
                            <div className="input-group">
                                <label>도구</label>
                                <select value={form.itemId} onChange={event => update("itemId", event.target.value)} disabled={alreadySubmitted || !canSubmitNow}>
                                    <option value="">선택</option>
                                    {game.toolPool.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                                </select>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="input-group">
                                <label>장소</label>
                                <select
                                    value={form.placeId}
                                    onChange={event => {
                                        update("placeId", event.target.value)
                                        update("action", "")
                                    }}
                                    disabled={alreadySubmitted || !canSubmitNow}
                                >
                                    <option value="">선택</option>
                                    {availablePlaces.map(place => <option key={place.id} value={place.id}>{place.name}</option>)}
                                </select>
                            </div>
                            <div className="input-group">
                                <label>동행인</label>
                                <select value={form.companionPlayerId} onChange={event => update("companionPlayerId", event.target.value)} disabled={alreadySubmitted || !canSubmitNow}>
                                    <option value="">혼자</option>
                                    {companions.map(player => <option key={player.userId} value={player.userId}>{player.nickname}</option>)}
                                </select>
                            </div>
                        </>
                    )}
                </div>

                {!isItemRound && (
                    <div className="input-group">
                        <label>행동</label>
                        <select
                            value={form.action}
                            onChange={event => update("action", event.target.value)}
                            disabled={alreadySubmitted || !canSubmitNow || !form.placeId}
                        >
                            <option value="">선택</option>
                            {availableActions.map(action => (
                                <option key={action} value={action}>{action}</option>
                            ))}
                        </select>
                    </div>
                )}

                {message && <p className="form-response-message" role="status">{message}</p>}
                <div className="statement-actions">
                    <button className="submit-btn" type="submit" disabled={!isValid || alreadySubmitted || submitting || !canSubmitNow}>
                        {alreadySubmitted ? "제출 완료" : !canSubmitNow ? "제출 시간 종료" : submitting ? "저장 중..." : "공식 진술 제출"}
                    </button>
                </div>
            </form>
        </section>
    )
}

export default StatementForm
