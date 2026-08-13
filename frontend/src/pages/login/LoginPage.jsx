import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, getMe } from "../../api/auth_api";
import useAuthStore from "../../store/authStore";
import styles from "./LoginPage.module.css";

const LoginPage = () => {
    const navigate = useNavigate()
    const setToken = useAuthStore((state) => state.setToken)
    const setUser = useAuthStore((state) => state.setUser)

    const [form, setForm] = useState({
        username: "",
        password: "",
    })

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value,
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        try {
            const result = await login(form)

            // 1. 토큰 저장
            setToken(result.token)

            // 2. 사용자 정보 조회
            const user = await getMe()

            // 3. Store에 사용자 저장
            setUser(user)

            alert("로그인 성공!")

            // 4. 로비 페이지로 이동
            // 관리자면 관리자 페이지, 일반 사용자면 로비
navigate(user.role === "admin" ? "/admin" : "/lobby")

        } catch (error) {
            alert(
                error.response?.data?.message ||
                "로그인에 실패했습니다."
            )
        }
    }

    return (
        <div className={styles.page}>
            <h1 className={styles.logo}>
                ALIBI
            </h1>

            <p className={styles.subtitle}>
                언제나 진실은 하나
            </p>

            <div className={styles.card}>
                <h2 className={styles.title}>
                    로그인
                </h2>

                <form
                    className={styles.form}
                    onSubmit={handleSubmit}
                >
                    <input
                        className={styles.input}
                        name="username"
                        placeholder="아이디"
                        value={form.username}
                        onChange={handleChange}
                    />

                    <input
                        className={styles.input}
                        type="password"
                        name="password"
                        placeholder="비밀번호"
                        value={form.password}
                        onChange={handleChange}
                    />

                    <button
                        className={styles.loginButton}
                        type="submit"
                    >
                        로그인
                    </button>
                </form>

                <div className={styles.signupArea}>
                    계정이 없으신가요?

                    <button
                        className={styles.signupButton}
                        type="button"
                        onClick={() => navigate("/signup")}
                    >
                        회원가입
                    </button>
                </div>
            </div>
        </div>
    )
}

export default LoginPage;