import { Server } from "socket.io"

import { registerRoomHandlers } from "./roomHandlers.js"
import { registerChatHandlers } from "./lobby_chatHandlers.js"
import { registerGameHandlers } from "./gameHandlers.js"
import { createGameTimerManager } from "../services/game_timer_service.js"

export const initSocket = (server, app) => {
  const io = new Server(server, {
    cors: {
      // Cloudflare 임시 터널 주소가 실행할 때마다 바뀌므로 시연 중에는 모두 허용합니다.
      origin: "*",
      methods: ["GET", "POST"],
    },
  })

  const onlineUsers = new Map()

  io.on("connection", (socket) => {
    const userId = String(socket.userId)

    onlineUsers.set(
      userId,
      (onlineUsers.get(userId) || 0) + 1
    )

    socket.on("disconnect", ()=> {
      const count = onlineUsers.get(userId) || 0

      if (count <= 1) {
        onlineUsers.delete(userId)
      }else{
        onlineUsers.set(userId, count -1)
      }

    })
  })

  registerRoomHandlers(io)
  registerChatHandlers(io)
  registerGameHandlers(io)

  app.set("io", io)
  app.set("onlineUsers", onlineUsers)
  const gameTimer = createGameTimerManager(io)
  io.gameTimer = gameTimer
  app.set("gameTimer", gameTimer)

  // 시연 중에는 과거 DB의 playing 게임을 자동 복구하지 않습니다.
  // 새로 시작한 게임만 roomHandlers에서 gameTimer.schedule(gameId) 됩니다.

  return io
}
