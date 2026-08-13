import styles from "./AdminSidebar.module.css";

function AdminSidebar({ menu, setMenu }) {

    return (
        <nav className={styles.menu}>

            <button
                className={`${styles.button} ${menu === "dashboard" ? styles.active : ""}`}
                onClick={() => setMenu("dashboard")}
            >
                📊 대시보드
            </button>

            <button
                className={`${styles.button} ${menu === "users" ? styles.active : ""}`}
                onClick={() => setMenu("users")}
            >
                👥 회원 관리
            </button>

            <button
                className={`${styles.button} ${menu === "games" ? styles.active : ""}`}
                onClick={() => setMenu("games")}
            >
                🎮 게임 관리
            </button>

            <button
                className={`${styles.button} ${menu === "logs" ? styles.active : ""}`}
                onClick={() => setMenu("logs")}
            >
                📄 로그 확인
            </button>

        </nav>
    );
}

export default AdminSidebar;