// 공식 질문 작성
import { useEffect, useState } from "react";
import "./question.css";
import { questionTemplates } from "./questionTemplates";

function QuestionForm({
    players,
    setPlayers,
    selectedPlayer,
    setAnswer,
    history,
    setHistory
}) {

    const [selectedType, setSelectedType] = useState("place");
    const current = questionTemplates[selectedType];
    const [selectedValues, setSelectedValues] = useState([]);

    useEffect(() => {
        setSelectedValues(
            current.fields.map(field => field.options[0])
        );
    }, [selectedType]);

    const question = current.template.replace(
        /\{(\d+)\}/g,
        (_, i) => selectedValues[i] ?? ""
    );

    const handleTypeChange = (type) => {
        setSelectedType(type);
    };

    const handleSelectChange = (index, value) => {
        const values = [...selectedValues];
        values[index] = value;
        setSelectedValues(values);
    };

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
                    value={selectedValues[fieldIndex] || ""}
                    onChange={(e) =>
                        handleSelectChange(fieldIndex, e.target.value)
                    }
                >
                    {field.options.map(option => (
                        <option key={option} value={option}>
                            {option}
                        </option>
                    ))}
                </select>
            );
        });
    };

    const handleSubmit = () => {
        if (history.length >= 3) {
            alert("공식 질문은 최대 3번까지 가능합니다.");
            return;
        }

        alert(`${selectedPlayer.name}에게\n\n${question}`);

        setAnswer({
            player: selectedPlayer.name,
            question
        });
    };

    return (
        <section className="question-form">
            <span className="section-label">QUESTION BUILD</span>

            <h2 className="question-title">공식 질문 작성</h2>

            <div className="question-card">

                <div className="form-group">
                    <label>질문 대상</label>

                    <div className="selected-player">
                        <div className="player-avatar">
                            {selectedPlayer.name[0]}
                        </div>

                        <span>{selectedPlayer.name}</span>
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
                    disabled={history.length >= 3}
                >
                    {history.length >= 3 ? "질문 종료" : "질문 보내기"}
                </button>

            </div>
        </section>
    );
}

export default QuestionForm;