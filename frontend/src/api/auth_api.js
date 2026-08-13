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

// ==== 마이 페이지 관련 ====

// 프로필 수정
export const updateProfile = async (nickname) => {
    const response = await api.patch(
        "/auth/profile",
        {
            nickname,
        })

    return response.data
}

// 현재 비밀번호 확인
export const checkPassword = async (currentPassword) => {
    const response = await api.patch(
        "/auth/password/check",
        {
            currentPassword,
        }
    )

    return response.data
}

// 비밀번호 변경
export const changePassword = async (newPassword) => {
    const response = await api.patch(
        "/auth/password",
        {
            newPassword,
        }
    )

    return response.data
}

// 최근 플레이 조회
export const getMyGames = async () => {
    const response = await api.get("/auth/my-games")
    return response.data
}

// ==== 관리자 페이지 ====

// 전체 회원 조회 
export const getAllUsersForAdmin = async () => {
    const response = await api.get("/auth/admin/users")

    return response.data
}

// 회원 권한 변경
export const updateUserRole = async (userId, role) => {
    const response = await api.patch(
        `/auth/${userId}/role`,
        {
            role,
        }
    )

    return response.data
}

// 로그 조회
export const getLogs = async () => {
    const response = await api.get("/auth/logs")

    return response.data
}

// 관리자 대시보드
export const getDashboard = async () => {
    const response = await api.get("/auth/dashboard")
    return response.data
}

