import "./statement.css"

function LiveCheck({ validation }) {
    return (
        <aside className="live-check">
            <span className="section-label">
                LIVE CHECK
            </span>

            <h2 className="section-title">
                실시간 검증
            </h2>

            <div className="check-list">
                <CheckItem
                    title="필수 항목"
                    success={validation.required}
                    successText="모든 항목이 입력되었습니다."
                    failText="비어 있는 항목이 있습니다."
                />

                <CheckItem
                    title="시간 순서"
                    success={validation.timeOrder}
                    successText="시간 순서가 올바릅니다."
                    failText="종료 시간이 시작 시간보다 빠릅니다."
                />

                <CheckItem
                    title="시간 중복"
                    success={validation.overlap}
                    successText="중복되는 시간이 없습니다."
                    failText="겹치는 시간대가 존재합니다."
                />
            </div>

            <div className="submit-info">
                <h3>제출 안내</h3>

                <p>
                    제출 후에는 공식 알리바이로 기록되며
                    게임 진행 중 수정할 수 없습니다.
                </p>
            </div>
            {/* <button
                className="submit-btn"
                disabled={!validation.submit}
            >
                공식 알리바이 진술 제출
            </button> */}
        </aside>
    )
}

function CheckItem({
    title,
    success,
    successText,
    failText
}) {
    return (
        <div className={`check-item ${success ? "success" : "danger"}`}>
            <span>{success ? "✔" : "✖"}</span>
            <div>
                <h4>{title}</h4>
                <p>{success ? successText : failText}</p>
            </div>
        </div>
    )
}

export default LiveCheck