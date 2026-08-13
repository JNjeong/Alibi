/** 시연 빌드의 게임 인원과 질문 횟수는 클라이언트와 서버가 함께 쓰는 규칙입니다. */
export const MIN_GAME_PLAYERS = 2
export const MAX_GAME_PLAYERS = 10
export const MAX_QUESTIONS_PER_PLAYER = 5
export const MAX_QUESTIONS_PER_PLAYER_PER_ROUND = 1

export const getGamePlayerLimits = () => {
  return {
    minPlayers: MIN_GAME_PLAYERS,
    maxPlayers: MAX_GAME_PLAYERS,
  }
}
