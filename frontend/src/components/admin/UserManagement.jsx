import { useEffect, useState } from "react";

import { getAllUsersForAdmin, updateUserRole } from "../../api/auth_api";
import styles from "./UserManagement.module.css";

function UserManagement() {
    const [users, setUsers] = useState([])
    const [search, setSearch] = useState("");

    useEffect(() => {
        const fetchUsers = async() => {
            try{
                const data = await getAllUsersForAdmin()

                console.log(data)

                setUsers(data.users)
            }catch (error) {
                console.log(error)
            }
        }
        fetchUsers()

        const interval = setInterval(fetchUsers, 20000)
        return () => clearInterval(interval)
    }, [])

    const handleRoleChange = async (userId, currentRole) => {
    try {
        const newRole =
            currentRole === "admin" ? "user" : "admin";

        await updateUserRole(userId, newRole);

        const data = await getAllUsersForAdmin();

        setUsers(data.users);

        alert("권한이 변경되었습니다.");
    } catch (error) {
        alert(
            error.response?.data?.message ??
            "권한 변경에 실패했습니다."
        );
    }
};

    return (
        <div className={styles.wrapper}>
            <input
                type="text"
                placeholder="아이디 또는 닉네임 검색"
                className={styles.searchInput}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />

            <table className={styles.table}>

                <thead>
                    <tr>
                        <th>아이디</th>
                        <th>닉네임</th>
                        <th>권한</th>
                        <th>최근접속</th>
                        <th>가입일</th>
                        <th>관리</th>
                    </tr>
                </thead>

                <tbody>
                    {users
                        .filter((user) => {
                            const keyword = search.toLowerCase();

                            return (
                                user.username.toLowerCase().includes(keyword) ||
                                user.nickname.toLowerCase().includes(keyword)
                            );
                        }).map((user) => (
                        <tr key={user._id}>
                        <td>{user.username}</td>
                        <td>{user.nickname}</td>
                        <td>{user.role}</td>

                        <td>
                            {user.lastLoginAt
                                ? new Date(user.lastLoginAt).toLocaleString("ko-KR")
                                : "-"}
                        </td>

                        <td>
                            {new Date(user.createdAt).toLocaleDateString("ko-KR")}
                        </td>


                        <td>
                            <button
                                onClick={() =>
                                    handleRoleChange(user._id, user.role)
                                }
                                className={styles.roleButton}
                            >
                                {user.role === "admin"
                                    ? "일반회원"
                                    : "관리자"}
                            </button>
                        </td>
                    </tr>
                    ))}
                </tbody>

            </table>

        </div>
    )
}

export default UserManagement