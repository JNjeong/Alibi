import { create } from "zustand";
import { getMe, updateProfile, changePassword as changePasswordAPI, checkPassword as checkPasswordAPI, } from "../api/auth_api"

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

        } catch {
            localStorage.removeItem("token")

            set({
                token: null,
                user: null,
                isAuthenticated: false,
                loading: false,
            })
        }
    },

    updateProfile: async (nickname) => {
        const data = await updateProfile(nickname)

        set({
            user: data.user,
        })

        return data
    },

    checkPassword: async (currentPassword) => {
    return await checkPasswordAPI(currentPassword);
    },

    changePassword: async (newPassword) => {
        return await changePasswordAPI(newPassword);
    }

}))


export default useAuthStore
