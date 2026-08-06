function StatementBlock({ statement, index, onChange, onDelete, game }) {
    const players = game.players
    const tools = game.mapSnapshot.itemsInUse
    const places = game.mapSnapshot.places
    const times = game.rulesSnapshot.timeSlots

    return (
        <div className="statement-block">
            <div className="block-header">
                <h3>행적 #{index + 1}</h3>
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
                    <select
                        value={statement.start}
                        onChange={(e) =>
                            onChange(statement.id, "start", e.target.value)
                        }
                    >
                        <option value="">선택</option>
                        {times.map((time) => (
                            <option
                                key={time.id}
                                value={time.label}
                            >
                                {time.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="input-group">
                    <label>종료 시간</label>
                    <select
                        value={statement.end}
                        onChange={(e) =>
                            onChange(statement.id, "end", e.target.value)
                        }
                    >
                        <option value="">선택</option>
                        {times.map((time) => (
                            <option
                                key={time.id}
                                value={time.label}
                            >
                                {time.label}
                            </option>
                        ))}
                    </select>
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
                        {places.map((place) => (
                            <option
                                key={place.id}
                                value={place.id}
                            >
                                {place.name}
                            </option>
                        ))}
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
                            <option
                                key={player.userId}
                                value={player.userId}
                            >
                                {player.nickname}
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
                            <option
                                key={tool.id}
                                value={tool.id}
                            >
                                {tool.name}
                            </option>
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