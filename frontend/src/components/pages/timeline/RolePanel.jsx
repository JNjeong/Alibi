// 역할
import "./timeline.css"

function RolePanel({ game, viewer }) {
    const role = viewer.role

    // role_name : "김사과(의사)"
    const [name, occupation] = role.role_name.split(/[()]/)

    return (
        <aside className="role-panel">
            <span className="section-label">
                PRIVATE ROLE
            </span>

            <div className="role-badges">
                <span className="badge">
                    역할 {role.role_id.slice(-2)}
                </span>
            </div>

            <div className="role-profile">
                <div className="profile-circle">
                    {name[0]}
                </div>
                <h2>{name}</h2>
                <p>{occupation}</p>
            </div>

            <div className="info-card danger">
                <span className="card-title">
                    사건 배경
                </span>
                <p>
                    준비 중...
                </p>
            </div>

            <div className="info-card">
                <span className="card-title">
                    플레이어 정보
                </span>
                <p>
                    준비 중...
                </p>
            </div>
        </aside>
    )
}

export default RolePanel