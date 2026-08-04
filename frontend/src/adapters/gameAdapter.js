// 백엔드 데이터 > 현재 게임 상태를 프론트엔드에서 사용하기 위한 어댑터

const { getGame } = require('../../backend/src/services/game_service')

const gameAdapter = async () => {
  const game = await getGame()
  return game
}

module.exports = { gameAdapter }