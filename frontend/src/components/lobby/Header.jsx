import { useState } from "react"
import { useNavigate } from "react-router-dom"
import useAuthStore from "../../store/authStore"
import styles from "./Header.module.css"
import Avatar from "../common/Avatar/Avatar"

function Header() {
  const navigate = useNavigate()

  // 마이페이지 프로필 드롭다운 설정
  const [isOpen, setIsOpen] = useState(false)

  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  const displayName =
    user?.nickname ||
    user?.username ||
    "사용자"

  const avatarText =
    displayName.slice(0, 1).toUpperCase()

  const handleLogout = () => {
    logout()
    navigate("/", { replace: true })
  }

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <h1 className={styles.logo}>
          <span className={styles.logoAccent}>
            A
          </span>
          LIBI
        </h1>

        <span
          className={styles.divider}
          aria-hidden="true"
        />

        <span className={styles.pageName}>
          로비
        </span>
      </div>

      

      <div className={styles.right}>

        <Avatar
          user={user}
          size={42}
        />
        {/* <div
          className={styles.avatar}
          aria-hidden="true"
        >
          {avatarText}
        </div> */}

        <div className={styles.profileMenu}>

            <button
              type="button"
              className={styles.userButton}
              onClick={() => setIsOpen(!isOpen)}
            >
            <span>{displayName}</span>

            <span
              className={styles.chevron}
              aria-hidden="true"
            >
              ⌄
            </span>
          </button>

          {isOpen && (
              <div className={styles.dropdown}>

                <button
                  className={styles.dropdownItem}
                  onClick={() => navigate("/mypage")}>
                    👤 마이페이지
                </button>

                <button
                  className={styles.dropdownItem}
                  onClick={handleLogout}>
                    🚪 로그아웃
                </button>
                
              </div>
            )}
        </div>

        <span
          className={`${styles.divider} ${styles.rightDivider}`}
          aria-hidden="true"
        />

        {/* <button
          type="button"
          className={styles.logoutButton}
          onClick={handleLogout}
          aria-label="로그아웃"
          title="로그아웃"
        >
          ↪
        </button> */}
      </div>
    </header>
  )
}

export default Header