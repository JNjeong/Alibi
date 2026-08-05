import useAuthStore from "../../store/authStore"
import {useState} from "react"
import AdminSidebar from "../../components/admin/AdminSidebar"
import Dashboard from "../../components/admin/Dashboard"
import UserManagement from "../../components/admin/UserManagement"
import GameManagement from "../../components/admin/GameManagement"
import LogManagement from "../../components/admin/LogManagement"
import styles from "./AdminPage.module.css"

import {
    PanelGroup,
    Panel,
    PanelResizeHandle,
} from "react-resizable-panels";

const AdminPage = () => {
    const user = useAuthStore((state) => state.user)

    const [menu, setMenu] = useState("dashboard")
    // const [search, setSearch] = useState("")    // 회원 조회

    const logout = useAuthStore((state) => state.logout)
    const handleLogout = () => {
    logout()
    navigate("/", { replace: true })
    }
    
    return (
        <>
            <div className={styles.page}>

                <h1 className={styles.title}>관리자 페이지</h1>

                <p className={styles.subtitle}>
                    ALIBI Administration
                </p>

                <button
                    type="button"
                    className={styles.logoutButton}
                    onClick={handleLogout}
                    aria-label="로그아웃"
                    title="로그아웃"
                    >
                    ↪
                </button>

                <PanelGroup
                    direction="horizontal"
                    autoSaveId="admin-layout"
                    className={styles.container}
                >

                    <Panel
                        defaultSize={18}
                        minSize={15}
                        maxSize={28}
                    >

                        <aside className={styles.sidebar}>
                            <AdminSidebar
                                menu={menu}
                                setMenu={setMenu}
                            />
                        </aside>

                    </Panel>

                    <PanelResizeHandle className={styles.resizeHandle} />

                    <Panel>

                        <main className={styles.content}>
                            {menu === "dashboard" && <Dashboard />}
                            {menu === "users" && <UserManagement />}
                            {menu === "games" && <GameManagement />}
                            {menu === "logs" && <LogManagement />}
                        </main>

                    </Panel>

                </PanelGroup>

            </div>
        </>
    )
}

export default AdminPage