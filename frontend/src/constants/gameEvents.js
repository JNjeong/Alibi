// socket 이벤트명 상수화 작업
// 게임 시작, 라운드 시작, 라운드 종료, 게임 종료, 진술 제출, 진술 검증, 진술 결과, 질문 제출, 질문 검증, 질문 결과
// 게임 이벤트를 상수화하여 코드의 가독성과 유지보수성을 높임
export const GAME_EVENTS = {
  GAME_START: "game:start",
  ROUND_START: "round:start",
  ROUND_END: "round:end",
  GAME_END: "game:end",
  STATEMENT_SUBMIT: "statement:submit",
  STATEMENT_VERIFY: "statement:verify",
  STATEMENT_RESULT: "statement:result",
  QUESTION_SUBMIT: "question:submit",
  QUESTION_VERIFY: "question:verify",
  QUESTION_RESULT: "question:result",
}
