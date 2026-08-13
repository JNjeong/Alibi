import axios from "axios"

// 배포·터널 주소는 코드 수정 없이 VITE_SERVER_URL로 바꿀 수 있습니다.
// 값이 없으면 로컬 개발 서버를 사용합니다.
const SERVER_URL = (import.meta.env.VITE_SERVER_URL || "http://localhost:5000")
    .replace(/\/$/, "")

const api = axios.create({
    baseURL: `${SERVER_URL}/api`,
    headers: {
        "Content-Type" : "application/json"
    }
})


// 요청이 나갈 때마다 JWT 자동 추가
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token")

    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }

    return config
})

export default api
