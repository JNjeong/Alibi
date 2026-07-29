import axios from "axios"

const api = axios.create({
    baseURL: "http://localhost:5000/api",
    headers: {
        "Content-Type" : "application/json"
    }
})


// 요청이 나갈 떄마다 JWT 자동 추가
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token")

    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }

    return config
})

export default api