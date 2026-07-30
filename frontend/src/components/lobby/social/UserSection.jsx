
import useAuthStore from "../../../store/authStore"
import UserList from "./UserList"


function UserSection() {
  const user = useAuthStore((state) => state.user)
  const displayName = user?.nickname || "사용자"
  const username = user?.username || "-"

  return (
    <section className="user-section">
      {/* <div className="section-title-row">
        <h2>내 정보</h2>
        <span>온라인</span>
      </div>
      
      <div className="current-user-card">
        <div className="current-user-avatar">
          {displayName.slice(0, 1).toUpperCase()}
        </div>

        <div>
          <strong>{displayName}</strong>
          <p>@{username}</p>
        </div>
      </div> */}

      <UserList />


      <p className="social-panel-note">
        친구 목록과 초대 기능은 이후 이 영역에 추가할 예정...
      </p>
    </section>
  )
}

export default UserSection
