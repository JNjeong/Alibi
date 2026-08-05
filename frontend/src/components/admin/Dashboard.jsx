import { useEffect, useState } from "react"
import { getDashboard } from "../../api/auth_api"
import styles from "./Dashboard.module.css"

function Dashboard() {
    const [dashboard, setDashboard] = useState({
        totalUsers: 0,
        adminCount: 0,
        onlineUsers: 0,
        playingGames: 0,
        recentLogs: [],
    })

    useEffect(() => {

        const fetchDashboard = async () => {
            try {
                const data = await getDashboard();
                setDashboard(data);
            } catch (error) {
                console.error(error);
            }
        }
        fetchDashboard();
    }, []);

    return (

        <div className={styles.wrapper}>
            <h2 className={styles.title}>
                📊 대시보드
            </h2>

            <div className={styles.cardContainer}>
                <div className={styles.card}>
                    <h3>전체 회원수</h3>
                    <p>{dashboard.totalUsers}명</p>
                </div>

                <div className={styles.card}>
                    <h3>현재 접속자</h3>
                    <p>{dashboard.onlineUsers}명</p>
                </div>

                <div className={styles.card}>
                    <h3>진행 중인 게임</h3>
                    <p>{dashboard.playingGames}개</p>
                </div>

                <div className={styles.card}>
                    <h3>관리자 계정</h3>
                    <p>{dashboard.adminCount}명</p>
                </div>
            </div>

            <h3 className={styles.subTitle}>
                최근 활동
            </h3>

            <table className={styles.table}>

                <thead>
                    <tr>
                        <th>시간</th>
                        <th>유형</th>
                        <th>아이디</th>
                        <th>닉네임</th>
                        <th>내용</th>
                    </tr>
                </thead>

                <tbody>

                    {dashboard.recentLogs.map((log) => (

                        <tr key={log._id}>
                            <td>
                                {new Date(log.createdAt).toLocaleString("ko-KR")}
                            </td>
                            <td>{log.type}</td>
                            <td>{log.username}</td>
                            <td>{log.nickname}</td>
                            <td>{log.content}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export default Dashboard