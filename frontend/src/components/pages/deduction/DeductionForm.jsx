import "./deduction.css"
import { useState } from "react";
import DeductionSelect from "./DeductionSelect";

function DeductionForm() {
    const suspects = [
        "윤서진",
        "한도윤",
        "박정원",
        "최유진",
        "차은별",
        "강민석",
        "김하린",
        "서지훈"
    ];

    const times = [
        "17:10",
        "17:20",
        "17:30",
        "17:40",
        "17:50",
        "18:00"
    ];

    const places = [
        "응접실",
        "서재",
        "1층 복도",
        "식당",
        "주방",
        "온실"
    ];

    const weapons = [
        "고농도 수면제",
        "의료용 주사기",
        "독성 원예 약품",
        "은제 편지칼",
        "정원용 전지가위",
        "실크 커튼 끈"
    ];

    const [deduction, setDeduction] = useState({
        suspect: "",
        time: "",
        place: "",
        weapon: ""
    });

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
                    onChange={(value) =>
                        setDeduction({
                            ...deduction,
                            suspect: value
                        })
                    }
                />

                <DeductionSelect
                    number="02"
                    title="범행 시간"
                    value={deduction.time}
                    options={times}
                    onChange={(value) =>
                        setDeduction({
                            ...deduction,
                            time: value
                        })
                    }
                />

                <DeductionSelect
                    number="03"
                    title="범행 장소"
                    value={deduction.place}
                    options={places}
                    onChange={(value) =>
                        setDeduction({
                            ...deduction,
                            place: value
                        })
                    }
                />

                <DeductionSelect
                    number="04"
                    title="범행 도구"
                    value={deduction.weapon}
                    options={weapons}
                    onChange={(value) =>
                        setDeduction({
                            ...deduction,
                            weapon: value
                        })
                    }
                />
            </div>

            <div className="deduction-actions">
                <button className="note-btn">
                    추리 노트 다시 보기
                </button>
                <button className="deduction-submit-btn">
                    최종 추리 제출
                </button>
            </div>
        </section>
    );
}

export default DeductionForm;