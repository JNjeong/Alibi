//phaseEndsAt 과 serverNow을 비교하여 남은 시간을 계산하는 hook
import { useState, useEffect } from 'react'
import { useGame } from '../context/GameContext'

export const useServerCountdown = (phaseEndsAt) => {
  const { game } = useGame()
  const [countdown, setCountdown] = useState(null)

  useEffect(() => {
    if (!phaseEndsAt || !game?.serverNow) return
    const updateCountdown = () => {
      const now = new Date(game.serverNow).getTime()
      const endsAt = new Date(phaseEndsAt).getTime()
      setCountdown(Math.max(0, endsAt - now))
    }
    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [phaseEndsAt, game])

  return countdown
}