// 역할

import "./timeline.css"

function RolePanel() {
    return (
        <aside className="role-panel">
            <span className="section-label">
                PRIVATE ROLE
            </span>

            <div className="role-badges">
                <span className="badge red">일반인</span>
                <span className="badge">역할 07/20</span>
            </div>

            <div className="role-profile">
                <div className="profile-circle">
                    윤
                </div>
                <h2>윤서진</h2>
                <p>유산관리 변호사</p>
            </div>

            <div className="info-card danger">
                <span className="card-title">
                    그를 알게 된 배경
                </span>
                <p>
                    유언장 위조 의혹이 제기되던 변호사.
                    사건 당일에도 피해자와 접촉했다.
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