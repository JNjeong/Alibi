import { Navigate } from "react-router-dom"
import useAuthStore from "../../store/authStore"

const PublicRoute = ({ children }) => {
    const isAuthenticated = useAuthStore(
        (state) => state.isAuthenticated
    )

    const user = useAuthStore((state) => state.user)

    if (isAuthenticated) {
        if (user?.role === "admin") {
            return <Navigate to="/admin" replace />
        }

        return <Navigate to="/lobby" replace />
    }

    return children
}

export default PublicRoute