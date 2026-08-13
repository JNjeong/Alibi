/** 내가 받은 미답변 질문에 서버로 YES/NO를 제출합니다. */
import { useState } from "react"
import "./question.css"

function AnswerPanel({ questions, onSubmit, canAnswer, stageLabel }) {
    const [answeringId, setAnsweringId] = useState("")
    const [message, setMessage] = useState("")

    const handleAnswer = async (questionId, answer) => {
        if (!canAnswer) return

        try {
            setAnsweringId(questionId)
            setMessage("")
            await onSubmit(questionId, answer)
        } catch (error) {
            setMessage(error.response?.data?.message || "공식 답변을 저장하지 못했습니다.")
        } finally {
            setAnsweringId("")
        }
    }

    return (
        <aside className="answer-panel">
            <div className="subpage-card-heading">
                <div>
                    <span className="section-label">ANSWER</span>
                    <h2 className="section-title">내가 답할 질문</h2>
                </div>
                <span className={`pending-answer-count ${questions.length ? "has-pending" : ""}`}>
                    {questions.length}건
                </span>
            </div>
            {!canAnswer && questions.length > 0 && (
                <div className="empty-answer">현재 단계: {stageLabel}. 공식 답변 단계에서 버튼이 열립니다.</div>
            )}

            {questions.length === 0 ? (
                <div className="empty-answer">아직 해야 할 답변이 없습니다.</div>
            ) : questions.map(question => (
                <div className="answer-card" key={question.id}>
                    <span className="answer-card-label">YES / NO로 답변</span>
                    <div className="answer-question">{question.content}</div>
                    <div className="answer-buttons">
                        <button
                            type="button"
                            className="yes-btn"
                            disabled={Boolean(answeringId) || !canAnswer}
                            onClick={() => handleAnswer(question.id, true)}
                        >예</button>
                        <button
                            type="button"
                            className="no-btn"
                            disabled={Boolean(answeringId) || !canAnswer}
                            onClick={() => handleAnswer(question.id, false)}
                        >아니오</button>
                    </div>
                </div>
            ))}
            {message && <p className="form-response-message" role="status">{message}</p>}
        </aside>
    )
}

export default AnswerPanel
