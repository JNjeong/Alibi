function StatementSidebar() {
    const rounds = [
        { id: 1, time: "15:00 ~ 16:00", status: "진행 중", active: true },
        { id: 2, time: "16:00 ~ 17:00", status: "대기" },
        { id: 3, time: "17:00 ~ 18:00", status: "대기" },
        { id: 4, time: "18:00 ~ 19:30", status: "대기" },
        { id: 5, time: "19:30 ~ 21:00", status: "대기" }
    ];

    return (
        <aside className="statement-sidebar">

            <div className="sidebar-header">
                <span className="sidebar-round">
                    ROUND 1 / 5
                </span>

                <h2>진술 진행</h2>
            </div>

            <div className="round-list">
                {rounds.map((round) => (
                    <div
                        key={round.id}
                        className={`round-card ${round.active ? "active" : ""}`}
                    >
                        <span className="round-title">
                            ROUND {round.id}
                        </span>

                        <span className="round-time">
                            {round.time}
                        </span>

                        <span className="round-status">
                            {round.status}
                        </span>
                    </div>
                ))}
            </div>

            <div className="public-time">
                <span>공개 구간</span>

                <h3>15:00 ~ 16:00</h3>

                <p>60분 구간</p>
            </div>

        </aside>
    );
}

export default StatementSidebar;