function StatementBlock({ statement, onChange, onDelete }) {

    const players = [
        "에드워드",
        "에밀리",
        "제임스",
        "빅토리아",
        "헨리",
        "소피아",
        "루카스",
        "샬럿"
    ];

    const tools = [
        "열쇠",
        "촛대",
        "손전등",
        "편지",
        "유언장",
        "독약",
        "권총",
        "단검"
    ];
    return (
        <div className="statement-block">

            <div className="block-header">
                <h3>행적 #{statement.id}</h3>

                <button
                    className="delete-btn"
                    onClick={() => onDelete(statement.id)}
                >
                    삭제
                </button>
            </div>

            <div className="statement-grid">

                <div className="input-group">
                    <label>시작 시간</label>
                    <input
                        type="time"
                        value={statement.start}
                        onChange={(e) =>
                            onChange(statement.id, "start", e.target.value)
                        }
                    />
                </div>

                <div className="input-group">
                    <label>종료 시간</label>
                    <input
                        type="time"
                        value={statement.end}
                        onChange={(e) =>
                            onChange(statement.id, "end", e.target.value)
                        }
                    />
                </div>

                <div className="input-group">
                    <label>장소</label>
                    <select
                        value={statement.place}
                        onChange={(e) =>
                            onChange(statement.id, "place", e.target.value)
                        }
                    >
                        <option value="">선택</option>
                        <option>응접실</option>
                        <option>서재</option>
                        <option>식당</option>
                        <option>주방</option>
                        <option>온실</option>
                        <option>복도</option>
                        <option>창고</option>
                    </select>
                </div>

                <div className="input-group">
                    <label>동행인</label>
                    <select
                        value={statement.companion}
                        onChange={(e) =>
                            onChange(statement.id, "companion", e.target.value)
                        }
                    >
                        <option value="">선택 안 함</option>
                        {players.map((player) => (
                            <option key={player} value={player}>
                                {player}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="input-group">
                    <label>도구</label>
                    <select
                        value={statement.tool}
                        onChange={(e) =>
                            onChange(statement.id, "tool", e.target.value)
                        }
                    >
                        <option value="">선택 안 함</option>
                        {tools.map((tool) => (
                            <option key={tool} value={tool}>{tool}</option>
                        ))}
                    </select>
                </div>

            </div>

            <div className="input-group">
                <label>공개 메모</label>

                <textarea
                    rows="4"
                    placeholder="다른 플레이어에게 공개되는 진술입니다."
                    value={statement.memo}
                    onChange={(e) =>
                        onChange(statement.id, "memo", e.target.value)
                    }
                />
            </div>

        </div>
    )
}

export default StatementBlock