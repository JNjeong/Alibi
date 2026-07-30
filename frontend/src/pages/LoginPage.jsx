import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, getMe } from "../api/auth_api";
import useAuthStore from "../store/authStore";

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

            setToken(result.token)      // 1.토큰 저장

            const user = await getMe()  // 2.사용자 정보 조회

            setUser(user)               // 3.Store에 사용자 저장

            alert("로그인 성공!")

            navigate("/lobby") // 4.로비 페이지로 이동

        } catch (error) {
            alert(
                error.response?.data?.message ||
                "로그인에 실패했습니다."
            )
        }
    }

    return (
        <div>
            <h1>로그인</h1>

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

                <button type="submit">
                    로그인
                </button>
            </form>

            <p>계정이 없으신가요?</p>
            <button type="submit" onClick={()=> navigate("/signup")}>
                    회원가입
            </button>
        </div>
    )
}

export default LoginPage;