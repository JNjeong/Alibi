// 게임 진행 관련 모든 REST 요청 처리 
// 공식 진술, 질문, 답변은 객체를 JSON 형식으로  backend에 전달
// - 문자열, 숫자, boolean, ID 로 구성된 구조화 데이터로 multipart/form-data나 한 덩어리 문자열 보다 JSON이 검증, 저장, 디버깅 등 에 유리
// Content-Type : application/json


import api from "./axios.js"


// createClientRequestId : 클라이언트 요청 ID 생성
// - prefix : 요청 ID 앞에 붙일 문자열, 기본값 "game_request"
// - 반환값 : prefix + "_" + UUID 또는 timestamp + random string
// - UUID는 브라우저에서 지원하지 않을 수 있으므로, 지원하지 않으면 timestamp + random string으로 대체
//  - 예시 : "game_request_123e4567-e89b-12d3-a456-426614174000" 또는 "game_request_1690000000000_abcd1234"
// Math.random().toString(36).slice(2,10) : 0~1 사이의 난수를 36진수 문자열로 변환 후, 앞의 "0." 제거하고, 2번째 문자부터 10번째 문자까지 추출
export const createClientRequestId = (prefix = "game_request") => {
    const uuid = globalThis.crypto?.randomUUID?.()

    if (uuid) {
        return `${prefix}_${uuid}`
    }

    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,10)}`      
}

// GET /api/games/:gameId
// 최초 게임 진입, 새로고침 때 서버 최신상태 가져오기
export const getGame = async (gameId) => {
    const response = await api.get(`/games/${gameId}`)
    return response.data
}

// POST /api/games/:gameID/statements
// 공식 진술 제출
// - gameId : 게임 ID
// - statementPayload : 공식 진술 객체, JSON 형식
// - 반환값 : 서버에서 생성된 공식 진술 객체, JSON 형식
export const createGameStatement = async (gameId, statementPayload) => {
  const response = await api.post(
    `/games/${gameId}/statements`,
    statementPayload
  )

  return response.data
}

// POST /api/games/:gameId/questions
// - gameId : 게임 ID
// - questionPayload : 질문 객체, JSON 형식
// - 반환값 : 서버에서 생성된 질문 객체, JSON 형식
export const createGameQuestion = async (gameId, questionPayload) => {
  const response = await api.post(
    `/games/${gameId}/questions`,
    questionPayload
  )

  return response.data
}

// POST /api/games/:gameId/questions/:questionId/answer
export const answerGameQuestion = async (gameId, questionId, answerPayload) => {
    const response = await api.post(
        `/games/${gameId}/questions/${questionId}/answer`,
        answerPayload
    )

    return response.data
}

// POST /api/games/:gameId/deductions
export const createGameDeduction = async (gameId, deductionPayload) => {
    const response = await api.post(
        `/games/${gameId}/deductions`,
        deductionPayload
    )

    return response.data
}