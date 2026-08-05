// 역할
import "./timeline.css"
import mockGame from "../../../data/mockgame"

function RolePanel() {
    // 나 찾기
    const me = mockGame.players.find(player => player.isMe)
    const isCriminal =
        me.id === mockGame.solution.criminalId

    return (
        <aside className="role-panel">
            <span className="section-label">
                PRIVATE ROLE
            </span>

            <div className="role-badges">
                <span className={`badge ${isCriminal ? "danger" : "red"}`}>
                    {isCriminal ? "범인" : "일반인"}
                </span>
                <span className="badge">역할 {me.character.id.slice(-2)}/{mockGame.characterPool.length}</span>
            </div>

            <div className="role-profile">
                <div className="profile-circle">
                    {me.character.name[0]}
                </div>
                <h2>{me.character.name}</h2>
                <p>{me.character.occupation}</p>
            </div>

            <div className="info-card danger">
                <span className="card-title">
                    사건 배경
                </span>
                <p>
                    {me.character.motive}
                </p>
            </div>

            <div className="info-card">
                <span className="card-title">
                    플레이어 정보
                </span>
                <p>
                    사건 당시 유언장을 수정하거나
                    확인해야 할 일정이 있었다.
                </p>
            </div>
        </aside>
    )
}

export default RolePanel