/**
 * gameHandlers.js
 * -----------------------------------------------------------------------------
 * 역할
 * - 게임 전용 Socket.IO room 입장/퇴장만 관리합니다.
 * - 라운드 진행과 모순검사는 v6에서 서버 service/timer가 자동 처리합니다.
 * - 구형 game:round:check 수동 검사 이벤트는 제거했습니다.
 */

import {
  getGameForUser,
  makePublicGameError,
} from "../services/game_service.js"
import { loadRoomChatMessages } from "./roomHandlers.js"

const reply = (callback, payload) => {
  if (typeof callback === "function") callback(payload)
}

const makeSocketError = (error) =>
  makePublicGameError(error, "게임 실시간 처리 중 오류가 발생했습니다.")

const leavePreviousGameRooms = (socket) => {
  const previousGameId = socket.data.gameId
  const previousRoomId = socket.data.gameRoomId

  if (previousGameId) socket.leave(`game:${previousGameId}`)
  if (previousRoomId) socket.leave(`room:${previousRoomId}`)

  socket.data.gameId = null
  socket.data.gameRoomId = null
}

export const registerGameHandlers = (io) => {
  io.on("connection", (socket) => {
    socket.on("game:join", async ({ gameId } = {}, callback) => {
      try {
        await io.gameTimer?.catchUp(gameId)

        const clientView = await getGameForUser({
          gameId,
          userId: socket.userId,
        })

        // 같은 소켓이 이전 게임 room에 남아 오래된 이벤트를 받지 않도록 정리합니다.
        if (String(socket.data.gameId || "") !== String(gameId)) {
          leavePreviousGameRooms(socket)
        }

        socket.join(`game:${gameId}`)
        socket.join(`room:${clientView.game.roomId}`)
        socket.data.gameId = String(gameId)
        socket.data.gameRoomId = String(clientView.game.roomId)

        // 역할/개인 타임라인이 포함된 상태이므로 본인에게만 전송합니다.
        socket.emit("game:state", clientView)
        socket.emit("game:chat:history", {
          messages: await loadRoomChatMessages(clientView.game.roomId),
        })

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

    socket.on("game:leave", (_payload, callback) => {
      leavePreviousGameRooms(socket)
      reply(callback, { ok: true })
    })

    socket.on("disconnect", () => {
      socket.data.gameId = null
      socket.data.gameRoomId = null
    })
  })
}
