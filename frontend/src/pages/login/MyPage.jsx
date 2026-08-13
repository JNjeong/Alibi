import { useState, useEffect } from "react";
import useAuthStore from "../../store/authStore";
import styles from "./MyPage.module.css";
import Avatar from "../../components/common/Avatar/Avatar";
import Header from "../../components/lobby/Header"
import { getMyGames } from "../../api/auth_api";


function MyPage() {
    const user = useAuthStore((state) => state.user);

    const [isEditing, setIsEditing] = useState(false);
    const [nickname, setNickname] = useState("");

    const updateProfile = useAuthStore((state) => state.updateProfile)

    const [passwordVerified, setPasswordVerified] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const checkPassword = useAuthStore((state) => state.checkPassword);
    const changePassword = useAuthStore((state) => state.changePassword)

    // 시간 년-월-일 로 가공하는 함수
    const formatDate = (date) => {
        const d = new Date(date);

        const year = String(d.getFullYear()).slice(2);
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    };

    const handleSave = async () => {
        if(!nickname.trim()){
            alert("닉네임을 입력해주세요")
            return
        }
        try {
            // 닉네임 변경
            if (nickname !== user.nickname) {
                await updateProfile(nickname);
            }

            const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

            // 비밀번호 변경
            if (passwordVerified && newPassword) {

                if (!passwordRegex.test(newPassword)) {
                    alert("비밀번호는 영문과 숫자를 포함한 8자 이상이어야 합니다.");
                    return;
                }

                if (newPassword !== confirmPassword) {
                    alert("새 비밀번호가 일치하지 않습니다.");
                    return;
                }

                await changePassword(newPassword);
            }
            setIsEditing(false)

            alert("프로필이 수정되었습니다.")

                // 초기화
            setCurrentPassword("")
            setNewPassword("")
            setConfirmPassword("")
            setPasswordVerified(false)
            setIsEditing(false)

        } catch (error){
            alert(error.response?.data?.message ?? "수정에 실패했습니다.")
            console.error(error)
        }
    }

    const handlePasswordCheck = async () => {

        if (!currentPassword.trim()) {
            alert("현재 비밀번호를 입력해주세요.");
            return;
        }

        try {

            await checkPassword(currentPassword);

            alert("비밀번호가 확인되었습니다.");

            setPasswordVerified(true);

        } catch (error) {

            setPasswordVerified(false);

            setCurrentPassword("");

            alert(error.response?.data?.message ?? "비밀번호 확인에 실패했습니다.");
        }
    };

    useEffect(() => {
        if (user) {
            setNickname(user.nickname);
        }
    }, [user]);

    useEffect(() => {

        const fetchMyGames = async () => {

            try {

                const data = await getMyGames();

                const myGames = data.games.map((game) => {

                    const myResult = game.playerResults.find(
                        (player) =>
                            String(player.userId) === String(user._id)
                    )
                    const killerPlayer = game.gameId?.players?.find(
                        (player) =>
                            String(player.userId) === String(game.solution.criminalPlayerId)
                    )

                    return {
                        date: formatDate(game.finishedAt),
                        role: myResult?.isKiller ? "범인" : "시민",
                        room: game.gameId?.roomSnapshot?.title ?? "-",
                        killer: killerPlayer?.nickname ?? "-",
                        result:
                            !myResult
                                ? "-"
                                : !myResult.isKiller && myResult.isCorrect
                                    ? "완전해결"
                                    : myResult.win
                                        ? "승리"
                                        : "패배",
                    };
                });
                setHistory(myGames);

            } catch (error) {

                console.error("최근 게임 기록 조회 실패:", error);

            }

        };

        fetchMyGames();

    }, [user]);

    const [history, setHistory] = useState([]);

    return (
        <>
            <Header />
            <div className={styles.page}>
                <h1 className={styles.title}>마이페이지</h1>

                {/* ================= 프로필 ================= */}
                <section className={styles.card}>
                    <h2>프로필</h2>

                    <div className={styles.profileInfo}>
                        <Avatar
                            user={user}
                            size={70}
                        />

                        <div className={styles.userInfo}>
                            <h3>{user?.nickname}</h3>
                            <p>{user?.username}</p>
                            
                            {isEditing && (
                                <>
                                    <div className={styles.profileSection}>
                                        <label>닉네임</label>

                                        <input
                                            className={styles.input}
                                            value={nickname}
                                            onChange={(e) => setNickname(e.target.value)}
                                        />
                                    </div>

                                    <hr className={styles.divider} />

                                    <div className={styles.profileSection}>
                                        <label>현재 비밀번호</label>

                                        <div className={styles.passwordRow}>
                                            <input
                                                type="password"
                                                className={styles.input}
                                                value={currentPassword}
                                                onChange={(e) =>
                                                    setCurrentPassword(e.target.value)
                                                }
                                            />

                                            <button
                                                className={styles.checkButton}
                                                onClick={handlePasswordCheck}
                                            >
                                                확인
                                            </button>

                                        </div>
                                    </div>

                                    {passwordVerified && (
                                        <>
                                            <hr className={styles.divider} />

                                            <div className={styles.profileSection}>
                                                <label>새 비밀번호</label>

                                                <input
                                                    type="password"
                                                    className={styles.input}
                                                    value={newPassword}
                                                    onChange={(e) =>
                                                        setNewPassword(e.target.value)
                                                    }
                                                />

                                                <label>새 비밀번호 확인</label>

                                                <input
                                                    type="password"
                                                    className={styles.input}
                                                    value={confirmPassword}
                                                    onChange={(e) =>
                                                        setConfirmPassword(e.target.value)
                                                    }
                                                />
                                            </div>
                                        </>
                                    )}

                                </>
                            )}
                        </div>
                    </div>

                    {!isEditing ? (
                        <button
                            className={styles.editButton}
                            onClick={() => setIsEditing(true)}
                        >
                            프로필 수정
                        </button>
                    ) : (
                        <div className={styles.buttonGroup}>
                            <button
                                className={styles.cancelButton}
                                onClick={() => {
                                    setNickname(user?.nickname ?? "");

                                    setCurrentPassword("");
                                    setNewPassword("");
                                    setConfirmPassword("");

                                    setPasswordVerified(false);

                                    setIsEditing(false);
                                }}
                            >
                                취소
                            </button>

                            <button
                                className={styles.saveButton}
                                onClick={handleSave}
                            >
                                저장
                            </button>
                        </div>
                    )}
                </section>

                {/* ================= 게임 전적 ================= */}
                <section className={styles.card}>
                    <h2>게임 전적</h2>

                    {/* 상단 */}
                    <div className={styles.recordTop}>

                        <div className={styles.recordCard}>
                            <span>총 승리</span>
                            <strong>{user?.winCnt ?? 0}승</strong>
                        </div>

                        <div className={styles.recordCard}>
                            <span>완전해결</span>
                            <strong>{user?.perfectSolveCnt ?? 0}회</strong>
                        </div>

                    </div>

                    {/* 하단 */}
                    <div className={styles.roleRecord}>

                        <div className={styles.roleCard}>
                            <h3>시민</h3>
                            <p> {user?.citizenWinCnt ?? 0}승 / {user?.citizenPlayCnt ?? 0}판 </p>
                            <strong>
                                승률{" "}
                                {user?.citizenPlayCnt
                                    ? Math.round(
                                        (user.citizenWinCnt / user.citizenPlayCnt) * 100
                                    )
                                    : 0
                                }%
                            </strong>
                        </div>

                        <div className={styles.roleCard}>
                            <h3>범인</h3>

                            <p>
                                {user?.killerWinCnt ?? 0}승 / {user?.killerPlayCnt ?? 0}판
                            </p>

                            <strong>
                                승률{" "}
                                {user?.killerPlayCnt
                                    ? Math.round(
                                        (user.killerWinCnt / user.killerPlayCnt) * 100
                                    )
                                    : 0
                                }%
                            </strong>
                        </div>

                    </div>

                </section>

                {/* ================= 최근 플레이 기록 ================= */}
                <section className={styles.card}>

                    <h2>최근 플레이 기록</h2>

                    <div className={styles.historyTable}>

                        <div className={styles.historyHeader}>
                            <span>날짜</span>
                            <span>역할</span>
                            <span>방 이름</span>
                            <span>범인</span>
                            <span>최종 결과</span>
                        </div>

                        {history.map((game, index) => (
                            <div
                                key={index}
                                className={styles.historyRow}
                            >
                                <span>{game.date}</span>

                                <span>{game.role}</span>

                                <span>{game.room}</span>

                                <span>{game.killer}</span>

                                <span
                                    className={
                                        game.result === "승리" ||
                                        game.result === "완전해결"
                                            ? styles.win
                                            : styles.lose
                                    }
                                >
                                    {game.result}
                                </span>
                            </div>
                        ))}

                    </div>

                </section>
            </div>
        </>
    );
    
}

export default MyPage;
