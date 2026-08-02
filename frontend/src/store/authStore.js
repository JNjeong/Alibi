import { create } from "zustand";
import { getMe } from "../api/auth_api"

const useAuthStore = create((set) => ({
    token: localStorage.getItem("token"),
    user: null,
    isAuthenticated: false,
    loading: true,

    setToken: (token) => {
        localStorage.setItem("token", token)

        set({
            token,
        })
    },

    setUser: (user) => {
        set({
            user,
            isAuthenticated: true,
        })
    },

    logout: () => {
        localStorage.removeItem("token")

        set({
            token: null,
            user: null,
            isAuthenticated: false,
        })
    },

    setLoading: (loading) => {
        set({
            loading,
        })
    },

    checkAuth: async () => {
        const token = localStorage.getItem("token")

        if (!token) {
            set({
                loading: false,
                isAuthenticated: false,
            })

            return
        }

        try {
            const user = await getMe()

            set({
                token,
                user,
                isAuthenticated: true,
                loading: false,
            })

        } catch (error) {
            localStorage.removeItem("token")

            set({
                token: null,
                user: null,
                isAuthenticated: false,
                loading: false,
            })
        }
    },

}))


export default useAuthStore