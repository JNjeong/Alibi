import { BrowserRouter, Routes, Route } from "react-router-dom";

import SignupPage from "./pages/login/SignupPage";
import LoginPage from "./pages/login/LoginPage";
// 로비
import LobbyPage from "./pages/lobby/LobbyPage";

import ProtectedRoute from "./components/Route/ProtectedRoute"
import PublicRoute from "./components/Route/PublicRoute"

// 게임 페이지 import
import GameLayout from "./components/layout/GameLayout"
import CaseBriefing from "./components/pages/briefing/CaseBriefing";
import PrivateTimeline from "./components/pages/timeline/PrivateTimeline"
import OfficialStatement from "./components/pages/statement/OfficialStatement";
import OfficialQuestion from "./components/pages/question/OfficialQuestion"
import FinalDeduction from "./components/pages/deduction/FinalDeduction"


import useAuthStore from "./store/authStore"
import { useEffect } from "react";

// 관리자 페이지
import AdminRoute from "./components/Route/AdminRoute";
import AdminPage from "./pages/Admin/AdminPage"


function App() {

  const checkAuth = useAuthStore((state) => state.checkAuth)
  const loading = useAuthStore((state) => state.loading)

  useEffect(() => {
    checkAuth()
  }, [])

  if (loading) {
    return <div> ~ 로딩 중 ~ </div>
  }
  
    return (
        <BrowserRouter>
            <Routes>
                <Route
                    path="/signup"
                    element={
                      <PublicRoute>
                        <SignupPage />
                      </PublicRoute>}
                />
                <Route
                    path="/"
                    element={
                      <PublicRoute>
                        <LoginPage />
                      </PublicRoute>}
                />
                <Route
                    path="/lobby"
                    element={
                      <ProtectedRoute>
                        <LobbyPage />
                      </ProtectedRoute>}
                />
                <Route
                    path="/admin"
                    element={
                      <AdminRoute>
                        <AdminPage />
                      </AdminRoute>}
                />
            </Routes>
        </BrowserRouter>
    );
}

export default App;