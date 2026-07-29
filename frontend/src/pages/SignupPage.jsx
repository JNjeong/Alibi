import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { signup } from "../api/auth_api.js";

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
        <div>
            <h1>회원가입</h1>

            <form onSubmit={handleSubmit}>
                <input
                    name="username"
                    placeholder="아이디"
                    value={form.username}
                    onChange={handleChange}
                />

                <input
                    type="password"
                    name="password"
                    placeholder="비밀번호"
                    value={form.password}
                    onChange={handleChange}
                />

                <input
                    type="password"
                    name="confirmPassword"
                    placeholder="비밀번호 확인"
                    value={form.confirmPassword}
                    onChange={handleChange}
                />

                <input
                    name="nickname"
                    placeholder="닉네임"
                    value={form.nickname}
                    onChange={handleChange}
                />

                <button type="submit">
                    회원가입
                </button>
            </form>
        </div>
    );
};

export default SignupPage;