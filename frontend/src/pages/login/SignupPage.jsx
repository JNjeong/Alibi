import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { signup } from "../../api/auth_api.js";
import styles from "./SignupPage.module.css";

const SignupPage = () => {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        username: "",
        password: "",
        confirmPassword: "",
        nickname: "",
    });

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            await signup(form);

            alert("회원가입이 완료되었습니다.");

            navigate("/");
        } catch (error) {
            alert(
                error.response?.data?.message ||
                    "회원가입에 실패했습니다."
            );
        }
    };

    return (
        <div className={styles.page}>

        <h1 className={styles.logo}>ALIBI</h1>

        <p className={styles.subtitle}>
            새로운 플레이어 등록
        </p>

        <div className={styles.card}>

            <h2 className={styles.title}>
                회원가입
            </h2>

            <form className={styles.form} onSubmit={handleSubmit}>

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
                    placeholder="비밀번호는 영문,숫자 포함 8자 이상"
                    value={form.password}
                    onChange={handleChange}
                />

                <input
                    className={styles.input}
                    type="password"
                    name="confirmPassword"
                    placeholder="비밀번호 확인"
                    value={form.confirmPassword}
                    onChange={handleChange}
                />

                <input
                    className={styles.input}
                    name="nickname"
                    placeholder="닉네임"
                    value={form.nickname}
                    onChange={handleChange}
                />

                <button
                    className={styles.signupButton}
                    type="submit"
                >
                    회원가입
                </button>

            </form>

        </div>

    </div>
    );
};

export default SignupPage;