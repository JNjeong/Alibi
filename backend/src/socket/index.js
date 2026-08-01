import { Server } from "socket.io"

import { registerRoomHandlers } from "./roomHandlers.js"

export const initSocket = (server, app) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  })

  registerRoomHandlers(io)

  app.set("io", io)

  return io
}
