// 서버 이벤트에 따른 공유 상태 변경

// action.type에 따라 state를 변경하는 reducer 함수
// SET_GAME: game 상태를 action.payload로 변경
export const gameReducer = (state, action) => {
  switch (action.type) {
    case 'SET_GAME':
      return { ...state, game: action.payload }
    default:
      return state
  }
}