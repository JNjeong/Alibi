import { BrowserRouter, Routes, Route } from "react-router-dom";

import SignupPage from "./pages/SignupPage";
import LoginPage from "./pages/LoginPage";
import MainPage from "./pages/MainPage";
import MainGamePage from "./pages/MainGamePage";

import ProtectedRoute from "./components/ProtectedRoute"
import PublicRoute from "./components/PublicRoute"

// 게임 페이지 import
import GameLayout from "./components/layout/GameLayout"
import CaseBriefing from "./components/pages/briefing/CaseBriefing";
import PrivateTimeline from "./components/pages/timeline/PrivateTimeline"
import OfficialStatement from "./components/pages/statement/OfficialStatement";
import OfficialQuestion from "./components/pages/question/OfficialQuestion"
import FinalDeduction from "./components/pages/deduction/FinalDeduction"


import useAuthStore from "./store/authStore"
import { useEffect } from "react";

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
          path="/main"
          element={
            <ProtectedRoute>
              <MainPage />
            </ProtectedRoute>}
        />

         <Route
          path="/main-game"
          element={
            <PublicRoute>
              <MainGamePage />
            </PublicRoute>}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;