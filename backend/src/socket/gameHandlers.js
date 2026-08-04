/**
 * gameHandlers.js
 * -----------------------------------------------------------------------------
 * 역할
 * - 게임 전용 Socket.IO 이벤트를 등록합니다.
 * - game:join으로 같은 gameId 참가자만 실시간 방에 입장시킵니다.
 * - game:round:check 요청을 game_service.js로 넘겨 한 번만 검사합니다.
 * - 검사 결과, 새 힌트, 다음 라운드 정보를 같은 게임 참가자에게 방송합니다.
 *
 * 주의
 * - Socket 이벤트는 Express Controller가 직접 받지 않습니다.
 * - 흐름은 gameHandlers.js → game_service.js → 준홍님 검사 함수 → DB 저장입니다.
 * - socket.userId는 기존 roomHandlers.js의 io.use JWT 미들웨어가 넣어야 합니다.
 */

import {
  checkRoundContradictionsAndAdvance,
  getGameForUser,
} from "../services/game_service.js"

// 프론트가 선택적으로 callback을 넘겼을 때만 ACK를 보내는 공통 함수입니다.
const reply = (callback, payload) => {
  if (typeof callback === "function") {
    callback(payload)
  }
}

// service 오류를 Socket용 안전한 payload로 바꿉니다.
const makeSocketError = (error) => ({
  message: error.message || "게임 Socket 처리 중 오류가 발생했습니다.",
  code: error.code || "GAME_SOCKET_ERROR",
  status: error.status || 500,
})

// initSocket()에서 한 번 호출해 게임 이벤트 리스너를 등록합니다.
export const registerGameHandlers = (io) => {
  io.on("connection", (socket) => {
    /**
     * Front → Back: game:join
     * payload: { gameId }
     *
     * 참가자 검증 후 game:${gameId} 방에 입장시킵니다.
     * room:${roomId}에도 입장시키는 이유는 기존 room:chat 자유 채팅을 게임 중 재사용하기 위해서입니다.
     */
    socket.on("game:join", async ({ gameId } = {}, callback) => {
      try {
        const clientView = await getGameForUser({
          gameId,
          userId: socket.userId,
        })

        socket.join(`game:${gameId}`)
        socket.join(`room:${clientView.game.roomId}`)
        socket.data.gameId = gameId

        // game:state는 해당 사용자 자신의 역할·타임라인을 포함하므로 본인에게만 보냅니다.
        socket.emit("game:state", clientView)

        reply(callback, {
          ok: true,
          gameId,
          revision: clientView.game.revision,
        })
      } catch (error) {
        const payload = makeSocketError(error)
        socket.emit("game:error", payload)
        reply(callback, { ok: false, error: payload })
      }
    })

    /**
     * Front → Back: game:round:check
     * payload: { gameId, round, clientRequestId }
     *
     * 모든 클라이언트가 조건 충족 후 요청할 수 있지만 service의
     * phase: active → checking 원자적 선점에 성공한 한 요청만 실제 검사를 실행합니다.
     */
    socket.on(
      "game:round:check",
      async ({ gameId, round, clientRequestId } = {}, callback) => {
        try {
          const result = await checkRoundContradictionsAndAdvance({
            gameId,
            userId: socket.userId,
            round,
            clientRequestId,
          })

          io.to(`game:${gameId}`).emit("game:round:checked", result)

          reply(callback, {
            ok: true,
            gameId,
            checkedRound: result.checkedRound,
            revision: result.revision,
          })
        } catch (error) {
          const payload = makeSocketError(error)

          // 409는 다른 클라이언트가 먼저 검사한 정상적인 경쟁 상황일 수 있습니다.
          // 요청자에게만 오류를 보내 다른 참가자 화면을 불필요하게 흔들지 않습니다.
          socket.emit("game:error", payload)
          reply(callback, { ok: false, error: payload })
        }
      }
    )

    // 연결 종료 시 메모리에 보관한 현재 gameId 참조만 정리합니다.
    socket.on("disconnect", () => {
      socket.data.gameId = null
    })
  })
}
