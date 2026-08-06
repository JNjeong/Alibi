import { Server } from "socket.io"

import { registerRoomHandlers } from "./roomHandlers.js"
import { registerChatHandlers } from "./lobby_chatHandlers.js"
import { registerGameHandlers } from "./gameHandlers.js"

export const initSocket = (server, app) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  })

  registerRoomHandlers(io)
  registerChatHandlers(io)
  registerGameHandlers(io)

  app.set("io", io)

  return io
}
