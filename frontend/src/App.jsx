import { useEffect } from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"

import SignupPage from "./pages/login/SignupPage"
import LoginPage from "./pages/login/LoginPage"

// 로비
import LobbyPage from "./pages/lobby/LobbyPage"

// 라우트 보호
import ProtectedRoute from "./components/Route/ProtectedRoute"
import PublicRoute from "./components/Route/PublicRoute"

// 게임 페이지
import GameLayout from "./components/layout/GameLayout"
import CaseBriefing from "./components/pages/briefing/CaseBriefing"
import PrivateTimeline from "./components/pages/timeline/PrivateTimeline"
import OfficialStatement from "./components/pages/statement/OfficialStatement"
import OfficialQuestion from "./components/pages/question/OfficialQuestion"
import FinalDeduction from "./components/pages/deduction/FinalDeduction"

// 관리자 페이지
import AdminRoute from "./components/Route/AdminRoute"
import AdminPage from "./pages/Admin/AdminPage"

import useAuthStore from "./store/authStore"

// 마이페이지
import MyPage from "./pages/login/MyPage";

function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth)
  const loading = useAuthStore((state) => state.loading)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  if (loading) {
    return <div>~ 로딩 중 ~</div>
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* 회원가입 */}
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <SignupPage />
            </PublicRoute>
          }
        />

        {/* 로그인 */}
        <Route
          path="/"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />

        {/* 로비 */}
        <Route
          path="/lobby"
          element={
            <ProtectedRoute>
              <LobbyPage />
            </ProtectedRoute>
          }
        />

        {/* 관리자 페이지 */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          }
        />

        {/* 마이 페이지 */}
        <Route
          path="/mypage"
          element={
            <ProtectedRoute>
              <MyPage />
            </ProtectedRoute>}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App