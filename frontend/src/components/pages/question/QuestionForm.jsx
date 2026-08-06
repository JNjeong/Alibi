// 공식 질문 작성
import { useEffect, useState } from "react"
import "./question.css"
import { getQuestionTemplates } from "./getQuestionTemplates"
import {
    createGameQuestion,
    createClientRequestId
} from "../../../api"

function QuestionForm({
    game,
    selectedPlayer,
    setAnswer,
    history,
    setHistory
}) {
    const questionCount =
        history.filter(
            record => record.recordType === "question"
        ).length
    const questionTemplates = getQuestionTemplates(game)
    const [selectedType, setSelectedType] = useState("place")
    const current = questionTemplates[selectedType]
    const [selectedValues, setSelectedValues] = useState([])


    useEffect(() => {
        setSelectedValues(
            current.fields.map(field => field.options[0])
        );
    }, [selectedType])

    const question = current.template.replace(
        /\{(\d+)\}/g,
        (_, i) => {
            const value = selectedValues[i]
            if (typeof value === "object") {
                return value.label
            }
            return value ?? ""
        }
    )

    const questionTypeMap = {
        place: "PRESENCE",
        companion: "WITNESS",
        possess: "ITEM_POSSESSION"
    }

    const handleTypeChange = (type) => {
        setSelectedType(type);
    }

    const handleSelectChange = (index, value) => {
        const values = [...selectedValues];
        values[index] = value;
        setSelectedValues(values)
    }

    const renderPreview = () => {
        const parts = current.template.split(/(\{\d+\})/g);

        return parts.map((part, index) => {
            const match = part.match(/\{(\d+)\}/);

            if (!match) {
                return <span key={index}>{part}</span>;
            }

            const fieldIndex = Number(match[1]);
            const field = current.fields[fieldIndex];

            return (
                <select
                    key={index}
                    value={selectedValues[fieldIndex]?.value ?? ""}
                    onChange={(e) => {
                        const option = field.options.find(
                            option => option.value === e.target.value
                        )

                        handleSelectChange(fieldIndex, option)
                    }}
                >
                    {field.options.map(option => (
                        <option
                            key={option.value}
                            value={option.value}
                        >
                            {option.label}
                        </option>
                    ))}
                </select>
            )
        })
    }

    const handleSubmit = async () => {
        if (questionCount >= 2) {
            alert("공식 질문은 최대 2번까지 가능합니다.")
            return
        }

        try {
            const selectedTime = selectedValues[0]

            const payload = {
                round: game.currentRound,
                questionType: questionTypeMap[selectedType],
                targetPlayerId: selectedPlayer.userId,
                time: selectedTime.time,
                section: selectedTime.section,
                clientRequestId: createClientRequestId("question")
            }

            if (selectedType === "place")
                payload.placeId = selectedValues[1].value
            if (selectedType === "companion")
                payload.subjectPlayerId = selectedValues[1].value
            if (selectedType === "possess")
                payload.itemId = selectedValues[1].value

            const result = await createGameQuestion(
                game.id,
                payload
            )

            const newQuestion = {
                id: result.record._id,
                recordType: "question",
                player: selectedPlayer.nickname,
                question,
                answer: null
            }

            setHistory([...history, newQuestion])
            setAnswer(newQuestion)
        }
        catch (err) {
            console.error(err)
            alert("질문 전송 실패")
        }
    }

    if (!selectedPlayer) return null

    return (
        <section className="question-form">
            <span className="section-label">QUESTION BUILD</span>

            <h2 className="question-title">공식 질문 작성</h2>

            <div className="question-card">
                <div className="form-group">
                    <label>질문 대상</label>

                    <div className="selected-player">
                        <div className="player-avatar">
                            {selectedPlayer.nickname[0]}
                        </div>

                        <span>{selectedPlayer.nickname}</span>
                    </div>
                </div>

                <div className="form-group">
                    <label>질문 유형</label>

                    <div className="type-list">
                        {Object.values(questionTemplates).map(type => (
                            <button
                                key={type.id}
                                type="button"
                                className={`type-btn ${selectedType === type.id ? "active" : ""
                                    }`}
                                onClick={() => handleTypeChange(type.id)}
                            >
                                {type.title}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="preview-card">
                    <p className="preview-title">질문</p>
                    <div className="preview-question">
                        {renderPreview()}
                    </div>
                </div>

                <button
                    className="submit-question"
                    onClick={handleSubmit}
                    disabled={
                        !selectedPlayer ||
                        questionCount >= 2
                    }
                >
                    {questionCount >= 2 ? "질문 종료" : "질문 보내기"}
                </button>
            </div>
        </section>
    )
}

export default QuestionForm