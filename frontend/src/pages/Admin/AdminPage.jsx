import useAuthStore from "../../store/authStore"
import {useState} from "react"
import AdminSidebar from "../../components/admin/AdminSidebar"
import Dashboard from "../../components/admin/Dashboard"
import UserManagement from "../../components/admin/UserManagement"
import GameManagement from "../../components/admin/GameManagement"
import LogManagement from "../../components/admin/LogManagement"
import styles from "./AdminPage.module.css";

const AdminPage = () => {
    const user = useAuthStore((state) => state.user)

    const [menu, setMenu] = useState("dashboard")

    return (
        <>
            <div className={styles.page}>

                <h1 className={styles.title}>관리자 페이지</h1>

                <p className={styles.subtitle}>
                    ALIBI Administration
                </p>

                <div className={styles.container}>

                    <aside className={styles.sidebar}>
                        <AdminSidebar
                            menu={menu}
                            setMenu={setMenu}
                        />
                    </aside>

                    <main className={styles.content}>
                        {menu === "dashboard" && <Dashboard />}
                        {menu === "users" && <UserManagement />}
                        {menu === "games" && <GameManagement />}
                        {menu === "logs" && <LogManagement />}
                    </main>

                </div>

            </div>
        </>
    )
}

export default AdminPage