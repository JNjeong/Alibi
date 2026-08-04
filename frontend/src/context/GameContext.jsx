// bootstrap 조회, socket 연결, active game 조회, result 조회, 제출함수 제공 
// 게임 상태를 관리하는 context

import React, { createContext, useContext, useState, useEffect } from 'react'
import { gameAdapter } from '../adapters/gameAdapter'

// 게임 상태를 관리하는 context 생성
const GameContext = createContext()

// 게임 상태를 관리하는 커스텀 훅
export const useGame = () => useContext(GameContext)

// 게임 상태를 관리하는 provider 컴포넌트
export const GameProvider = ({ children }) => {
  const [game, setGame] = useState(null)

  // 게임 상태를 초기화하는 useEffect
  useEffect(() => {
    const fetchGame = async () => {
      const gameData = await gameAdapter()
      setGame(gameData)
    }
    fetchGame()
  }, [])

  // 게임 상태를 context로 제공
  // GameContext.Provider를 사용하여 game과 setGame을 제공
  // children 컴포넌트는 GameProvider로 감싸진 컴포넌트들 
  return (
    <GameContext.Provider value={{ game, setGame }}>
      {children}
    </GameContext.Provider>
  )
}
