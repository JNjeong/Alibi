import { useEffect, useState } from "react";

import { getLogs } from "../../api/auth_api";

import styles from "./LogManagement.module.css";

function LogPage() {

    const [logs, setLogs] = useState([]);

    useEffect(() => {

        const fetchLogs = async () => {

            try {

                const data = await getLogs();

                setLogs(data.logs);

            } catch (error) {

                console.error(error);

            }

        };

        fetchLogs();

        const interval = setInterval(fetchLogs, 20000)
        return () => clearInterval(interval)

    }, []);

    return (

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
                {logs.map((log) => (

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
    )
}

export default LogPage;
