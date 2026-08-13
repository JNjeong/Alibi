/** 자기 자신에게만 공개되는 역할 카드입니다. */
import "./timeline.css"

function RolePanel({ viewer, currentPlayer }) {
    const role = viewer?.role || {}
    const matched = String(role.role_name || "알 수 없는 용의자").match(/^(.+?)\((.+)\)$/)
    const roleName = matched?.[1] || role.role_name || "알 수 없는 용의자"
    const occupation = matched?.[2] || "용의자"
    const nickname = currentPlayer?.nickname || "플레이어"
    const isKiller = Boolean(viewer?.isKiller)

    return (
        <aside className="role-panel">
            <div className={`identity-banner ${isKiller ? "is-killer" : "is-citizen"}`}>
                <span>당신의 정체</span>
                <strong>{isKiller ? "범인" : "일반인"}</strong>
                <p>
                    {isKiller
                        ? "당신이 이 사건의 범인입니다. 정체와 실제 행적을 숨기세요."
                        : "당신은 일반인입니다. 네 가지 사건 정답을 모두 찾아내세요."}
                </p>
            </div>

            <div className="role-profile">
                <div className="profile-circle">{nickname.slice(0, 1)}</div>
                <div>
                    <span className="profile-caption">PLAYER</span>
                    <h2>{nickname}</h2>
                    <p>@{currentPlayer?.username || "user"}</p>
                </div>
            </div>

            <div className="role-assignment-card">
                <span>배정 역할</span>
                <strong>{roleName}</strong>
                <small>{occupation}</small>
            </div>

            <div className="info-card danger">
                <span className="card-title">숨겨야 할 동기</span>
                <p>{role.role_motiv || "피해자와의 관계를 다른 사람들에게 들키고 싶지 않습니다."}</p>
            </div>

            <div className="info-card">
                <span className="card-title">승리 조건</span>
                <p>
                    {isKiller
                        ? "정답을 모두 맞힌 일반인이 4명 이하가 되도록 의심을 피하세요."
                        : "범인·범행 시간·장소·도구 네 가지를 모두 맞히세요."}
                </p>
            </div>
        </aside>
    )
}

export default RolePanel
