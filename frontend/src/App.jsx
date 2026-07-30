import { BrowserRouter, Routes, Route } from "react-router-dom";

import SignupPage from "./pages/SignupPage";
import LoginPage from "./pages/LoginPage";
// import MainPage from "./pages/MainPage";

// 로비
import LobbyPage from "./pages/lobby/LobbyPage";

import ProtectedRoute from "./components/ProtectedRoute"
import PublicRoute from "./components/PublicRoute"

import useAuthStore from "./store/authStore"
import { useEffect } from "react";

function App() {

  const checkAuth = useAuthStore((state) => state.checkAuth)
  const loading = useAuthStore((state) => state.loading)

  useEffect(() => {
    checkAuth()
  }, [])

  if(loading) {
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
                {/* <Route
                    path="/main"
                    element={
                      <ProtectedRoute>
                        <MainPage />
                      </ProtectedRoute>}
                /> */}
                <Route
                    path="/lobby"
                    element={
                      <ProtectedRoute>
                        <LobbyPage />
                      </ProtectedRoute>}
                />
            </Routes>
        </BrowserRouter>
    );
}

export default App;