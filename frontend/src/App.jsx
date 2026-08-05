import { useEffect } from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"

import SignupPage from "./pages/login/SignupPage"
import LoginPage from "./pages/login/LoginPage"

// 로비
import LobbyPage from "./pages/lobby/LobbyPage"
import WaitingRoomPage from "./pages/waiting/WaitingRoomPage"
import ResultPage from "./pages/result/ResultPage"

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

// 메인 게임 페이지
import MainGamePage from "./pages/game/MainGamePage"
import { GameProvider } from "./game/GameContext"

// 관리자 페이지
import AdminRoute from "./components/Route/AdminRoute"
import AdminPage from "./pages/Admin/AdminPage"

import useAuthStore from "./store/authStore"

import socket from "./socket/socket"

// 마이페이지
import MyPage from "./pages/login/MyPage";

function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth)
  const loading = useAuthStore((state) => state.loading)

  // 소켓 연결 
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(()=>{
    const handleConnect = () =>{
      console.log("프론트 소켓 연결 성공!")
    }
    
    const handleDisconnect =()=>{
      console.log("프론트 소켓 연결 해제")
    }

    const handleConnectError = (error) => {
      console.error("프론트 소켓 연결 에러:", error)
    }

    socket.on("connect", handleConnect)
    socket.on("disconnect", handleDisconnect)
    socket.on("connect_error", handleConnectError)

    return () =>{
      socket.off("connect" , handleConnect)
      socket.off("disconnect",handleDisconnect)
      socket.off("connect_error",handleConnectError)
    }
  },[])

  // 로그인된 사용자만 Socket.IO 연결
useEffect(() => {
  // 인증 확인이 끝나기 전에는 기다림
  if (loading) {
    return
  }

  if (isAuthenticated) {
    const token = localStorage.getItem("token")

    // 소켓 연결 시 백엔드로 보낼 JWT
    socket.auth = {
      token,
    }

    if (!socket.connected) {
      socket.connect()
    }

    return
  }

  // 로그아웃 상태라면 소켓 연결 해제
  if (socket.connected) {
    socket.disconnect()
  }
}, [loading, isAuthenticated])

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

        {/* 대기실 */}
        <Route
          path="/waiting-room/:roomId"
          element={
            <ProtectedRoute>
              <WaitingRoomPage />
            </ProtectedRoute>
          }
        />

        {/* 게임 */}
        <Route
          path="/game/:gameId"
          element={
            <ProtectedRoute>
              <GameProvider>
                <MainGamePage />
              </GameProvider>
            </ProtectedRoute>
          }
        />



        {/* 게임 결과 */}
        <Route
          path="/result/:roomId"
          element={
            <ProtectedRoute>
              <ResultPage />
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