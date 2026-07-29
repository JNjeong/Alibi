import { Navigate } from "react-router-dom"
import useAuthStore from "../store/authStore"

const ProtectedRoute = ({ children }) => {
    const isAuthenticated = useAuthStore(
        (state) => state.isAuthenticated
    )

    if (!isAuthenticated) {
        return <Navigate to="/" replace />
    }

    return children
}

export default ProtectedRoute

// 브라우저 접속 시 토큰을 확인하고 있으면 로그인 페이지로 가서 토큰 유효성 검사
// 로그인이 되어 있으면 주소창에 / 접속시 자동으로 메인페이지로 이동
// 로그인이 되어 있지 않으면 주소창에 /main 입력해도 / (로그인 페이지)로 이동