// 게임 이벤트 등록, 해제, 재접속 관련 hook
import { useEffect } from 'react'
import { useGame } from '../context/GameContext'
import { getGameSocket } from '../api/socket'

export const useGameSocket = (gameId) => {
  const { game, setGame } = useGame()

  useEffect(() => {
    const socket = getGameSocket(gameId)
    // 이벤트 등록 예시
    socket.on('gameUpdate', (updatedGame) => {
      setGame(updatedGame)
    })
    // 컴포넌트 언마운트 시 이벤트 해제
    return () => {
      socket.off('gameUpdate')
    }
  }, [gameId, setGame])
} 
