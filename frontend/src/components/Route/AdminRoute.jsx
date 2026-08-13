import { Navigate } from "react-router-dom";
import useAuthStore from "../../store/authStore";

const AdminRoute = ({children}) => {
    const isAuthenticated = useAuthStore(
        (state) => state.isAuthenticated
    )

    const user = useAuthStore((state) => state.user)

    // 로그인이 안된 경우
    if(!isAuthenticated) {
        return <Navigate to="/" replace />
    }

    // 일반 사용자인 경우
    if(user?.role !== "admin") {
        return <Navigate to ="/lobby" replace />
    }

    return children
}

export default AdminRoute