import { useState, useEffect, useRef } from "react";
import useAuthStore from "../../store/authStore";
import styles from "./MyPage.module.css";
import Avatar from "../../components/common/Avatar/Avatar";


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
            console.log(error)
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

    const history = [
        {
            date: "26-08-03",
            result: "승",
            role: "시민",
            room: "어쩌구 살인사건",
            killer: "한도윤",
            detail: "승리",
        },
        {
            date: "26-08-01",
            result: "패",
            role: "범인",
            room: "블랙우드의 밤",
            killer: "윤서진",
            detail: "패배",
        },
        {
            date: "26-08-01",
            result: "승",
            role: "범인",
            room: "완벽한 범죄",
            killer: "이하린",
            detail: "승리",
        },
        {
            date: "26-07-31",
            result: "승",
            role: "시민",
            room: "빨리고고",
            killer: "박정원",
            detail: "완전해결",
        },
        {
            date: "26-07-30",
            result: "패",
            role: "시민",
            room: "레드호텔 사건",
            killer: "김민수",
            detail: "패배",
        },
    ];


    return (
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
                        <strong>27승</strong>
                    </div>

                    <div className={styles.recordCard}>
                        <span>완전해결</span>
                        <strong>4회</strong>
                    </div>

                </div>

                {/* 하단 */}
                <div className={styles.roleRecord}>

                    <div className={styles.roleCard}>
                        <h3>시민</h3>

                        <p>18승 / 28판</p>

                        <strong>승률 64%</strong>
                    </div>

                    <div className={styles.roleCard}>
                        <h3>범인</h3>

                        <p>9승 / 14판</p>

                        <strong>승률 64%</strong>
                    </div>

                </div>

            </section>

            {/* ================= 최근 플레이 기록 ================= */}
            <section className={styles.card}>
                <h2>최근 플레이 기록</h2>

                <div className={styles.historyTable}>
                    <div className={styles.historyHeader}>
                        <span>날짜</span>
                        <span>결과</span>
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

                            <span
                                className={
                                    game.result === "승"
                                        ? styles.win
                                        : styles.lose
                                }
                            >
                                {game.result}
                            </span>

                            <span>{game.role}</span>

                            <span>{game.room}</span>

                            <span>{game.killer}</span>

                            <span>{game.detail}</span>
                        </div>
                    ))}

                </div>
            </section>
        </div>
    );
}

export default MyPage;