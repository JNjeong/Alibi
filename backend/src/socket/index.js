import { Server } from "socket.io"

import { registerRoomHandlers } from "./roomHandlers.js"
import { registerChatHandlers } from "./lobby_chatHandlers.js"

export const initSocket = (server, app) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  })

  registerRoomHandlers(io)
  registerChatHandlers(io)

  app.set("io", io)

  return io
}
