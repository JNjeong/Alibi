import api from "./axios"

// 회원가입
export const signup = async (userData) => {
    const response = await api.post("/auth/signup", userData)
    return response.data
}


// 로그인
export const login = async (loginData) => {
    const response = await api.post("/auth/login", loginData)
    return response.data
}


// 정보 조회
export const getMe = async () => {
    const response = await api.get("/auth/me")
    return response.data
}